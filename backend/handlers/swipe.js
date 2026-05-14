const mongoose = require("mongoose");
const { User } = require("../models/user");
const { Like } = require("../models/like");
const { Match } = require("../models/match");
const { send, sendError } = require("../utils/ws");
const { sendToUser } = require("./state");

const swipe = async (socket, payload = {}) => {
  const { targetId, action } = payload;
  if (!mongoose.isValidObjectId(targetId)) {
    return sendError(socket, "swipe", "Invalid targetId");
  }
  if (targetId === socket.userId) {
    return sendError(socket, "swipe", "Cannot swipe on yourself");
  }
  if (!["like", "pass"].includes(action)) {
    return sendError(socket, "swipe", "action must be 'like' or 'pass'");
  }

  const target = await User.findById(targetId);
  if (!target) return sendError(socket, "swipe", "Target user not found");

  await Like.findOneAndUpdate(
    { from: socket.userId, to: targetId },
    { from: socket.userId, to: targetId, action },
    { upsert: true, new: true }
  );

  let match = null;
  if (action === "like") {
    const reverse = await Like.findOne({
      from: targetId,
      to: socket.userId,
      action: "like",
    });
    if (reverse) {
      const existing = await Match.findOne({
        users: { $all: [socket.userId, targetId] },
      });
      match =
        existing || (await Match.create({ users: [socket.userId, targetId] }));
      if (!existing) {
        sendToUser(targetId, {
          type: "match:new",
          matchId: match._id.toString(),
          user: (await User.findById(socket.userId)).toPublicJSON(),
        });
      }
    }
  }

  send(socket, {
    type: "swipe:ok",
    targetId,
    action,
    match: match
      ? { matchId: match._id.toString(), user: target.toPublicJSON() }
      : null,
  });
};

module.exports = { swipe };
