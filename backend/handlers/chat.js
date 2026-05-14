const mongoose = require("mongoose");
const { Match } = require("../models/match");
const { ChatSession } = require("../models/chatSession");
const { Message } = require("../models/message");
const { ALLOWED_SET } = require("../utils/emojis");
const { scoreSequence } = require("../utils/chemistry");
const { send, sendError } = require("../utils/ws");
const { sendToUser, setSessionTimer, clearSessionTimer } = require("./state");

const chatDurationMs = () =>
  Number(process.env.CHAT_DURATION_MS) || 5 * 60 * 1000;
const maxExtensions = () => Number(process.env.MAX_EXTENSIONS) || 3;

const getMatchPeerId = (match, userId) =>
  match.users.find((u) => u.toString() !== userId.toString())?.toString();

const loadSessionForUser = async (sessionId, userId) => {
  if (!mongoose.isValidObjectId(sessionId))
    return { error: "Invalid sessionId" };
  const session = await ChatSession.findById(sessionId);
  if (!session) return { error: "Session not found" };
  const match = await Match.findById(session.match);
  if (!match) return { error: "Match not found" };
  if (!match.users.some((u) => u.toString() === userId.toString())) {
    return { error: "Not a participant" };
  }
  return { session, match, peerId: getMatchPeerId(match, userId) };
};

const endSession = async (sessionId, reason) => {
  clearSessionTimer(sessionId);
  const session = await ChatSession.findById(sessionId);
  if (!session || session.status === "ended" || session.status === "expired")
    return;

  const messages = await Message.find({ session: sessionId }).sort({
    sentAt: 1,
  });
  const sequence = messages.map((m) => m.emoji);
  const result = scoreSequence(sequence);

  session.status = reason === "expired" ? "expired" : "ended";
  session.chemistryScore = result.score;
  session.chemistryHits = result.hits;
  await session.save();

  const match = await Match.findById(session.match);
  if (!match) return;
  const payload = {
    type: "chat:ended",
    sessionId: session._id.toString(),
    reason,
    chemistry: {
      score: result.score,
      hits: result.hits,
      messageCount: messages.length,
    },
  };
  for (const userId of match.users) sendToUser(userId, payload);
};

const scheduleAutoExpire = (session) => {
  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining <= 0) {
    endSession(session._id, "expired");
    return;
  }
  const timer = setTimeout(() => endSession(session._id, "expired"), remaining);
  setSessionTimer(session._id, timer);
};

const schedule = async (socket, payload = {}) => {
  const { matchId, scheduledAt } = payload;
  if (!mongoose.isValidObjectId(matchId))
    return sendError(socket, "chat:schedule", "Invalid matchId");
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime()))
    return sendError(socket, "chat:schedule", "Invalid scheduledAt");

  const match = await Match.findById(matchId);
  if (!match) return sendError(socket, "chat:schedule", "Match not found");
  if (!match.users.some((u) => u.toString() === socket.userId)) {
    return sendError(socket, "chat:schedule", "Not a participant");
  }

  const session = await ChatSession.create({
    match: match._id,
    scheduledAt: when,
    status: "scheduled",
  });

  const announcement = {
    type: "chat:scheduled",
    sessionId: session._id.toString(),
    matchId: match._id.toString(),
    scheduledAt: when.toISOString(),
    scheduledBy: socket.userId,
  };
  for (const userId of match.users) sendToUser(userId, announcement);
};

const join = async (socket, payload = {}) => {
  const { sessionId } = payload;
  const ctx = await loadSessionForUser(sessionId, socket.userId);
  if (ctx.error) return sendError(socket, "chat:join", ctx.error);
  const { session, match, peerId } = ctx;

  if (session.status === "ended" || session.status === "expired") {
    return sendError(socket, "chat:join", "Session is closed", {
      status: session.status,
    });
  }

  const already = session.joinedUsers.some(
    (u) => u.toString() === socket.userId
  );
  if (!already) {
    session.joinedUsers.push(socket.userId);
  }

  let started = false;
  if (session.joinedUsers.length === 2 && session.status === "scheduled") {
    const now = new Date();
    session.startedAt = now;
    session.expiresAt = new Date(now.getTime() + chatDurationMs());
    session.status = "active";
    started = true;
  }
  await session.save();

  send(socket, {
    type: "chat:joined",
    sessionId: session._id.toString(),
    status: session.status,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    extensions: session.extensions,
    waitingForPeer: session.joinedUsers.length < 2,
  });

  if (started) {
    scheduleAutoExpire(session);
    const startedMsg = {
      type: "chat:started",
      sessionId: session._id.toString(),
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
    };
    for (const userId of match.users) sendToUser(userId, startedMsg);
  } else if (peerId) {
    sendToUser(peerId, {
      type: "chat:peer-joined",
      sessionId: session._id.toString(),
      userId: socket.userId,
    });
  }
};

const message = async (socket, payload = {}) => {
  const { sessionId, emoji } = payload;
  if (!emoji || !ALLOWED_SET.has(emoji)) {
    return sendError(
      socket,
      "chat:message",
      "emoji must be one of the allowed emojis"
    );
  }
  const ctx = await loadSessionForUser(sessionId, socket.userId);
  if (ctx.error) return sendError(socket, "chat:message", ctx.error);
  const { session, peerId } = ctx;

  if (session.status !== "active") {
    return sendError(socket, "chat:message", "Session is not active", {
      status: session.status,
    });
  }
  if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
    await endSession(session._id, "expired");
    return sendError(socket, "chat:message", "Session has expired");
  }

  const saved = await Message.create({
    session: session._id,
    from: socket.userId,
    emoji,
    sentAt: new Date(),
  });

  const wireMsg = {
    type: "chat:message",
    sessionId: session._id.toString(),
    messageId: saved._id.toString(),
    from: socket.userId,
    emoji,
    sentAt: saved.sentAt,
  };
  send(socket, { ...wireMsg, self: true });
  if (peerId) sendToUser(peerId, wireMsg);
};

const extend = async (socket, payload = {}) => {
  const { sessionId } = payload;
  const ctx = await loadSessionForUser(sessionId, socket.userId);
  if (ctx.error) return sendError(socket, "chat:extend", ctx.error);
  const { session, match } = ctx;

  if (session.status !== "active") {
    return sendError(
      socket,
      "chat:extend",
      "Can only extend an active session"
    );
  }
  if (session.extensions >= maxExtensions()) {
    return sendError(socket, "chat:extend", "Maximum extensions reached", {
      maxExtensions: maxExtensions(),
    });
  }

  const base =
    session.expiresAt && session.expiresAt > new Date()
      ? session.expiresAt
      : new Date();
  session.expiresAt = new Date(base.getTime() + chatDurationMs());
  session.extensions += 1;
  await session.save();
  scheduleAutoExpire(session);

  const extendedMsg = {
    type: "chat:extended",
    sessionId: session._id.toString(),
    expiresAt: session.expiresAt,
    extensions: session.extensions,
    extendedBy: socket.userId,
  };
  for (const userId of match.users) sendToUser(userId, extendedMsg);
};

const end = async (socket, payload = {}) => {
  const { sessionId } = payload;
  const ctx = await loadSessionForUser(sessionId, socket.userId);
  if (ctx.error) return sendError(socket, "chat:end", ctx.error);
  await endSession(ctx.session._id, "ended");
};

module.exports = { schedule, join, message, extend, end };
