const { send } = require("../utils/ws");

const userSockets = new Map();
const sessionTimers = new Map();

const setUserSocket = (userId, socket) => {
  const key = userId.toString();
  const existing = userSockets.get(key);
  if (existing && existing !== socket) {
    send(existing, {
      type: "session:replaced",
      message: "Logged in from another connection",
    });
  }
  userSockets.set(key, socket);
};

const clearUserSocket = (userId, socket) => {
  const key = userId.toString();
  if (userSockets.get(key) === socket) {
    userSockets.delete(key);
  }
};

const sendToUser = (userId, message) => {
  const socket = userSockets.get(userId.toString());
  if (socket) send(socket, message);
  return Boolean(socket);
};

const setSessionTimer = (sessionId, timer) => {
  const key = sessionId.toString();
  const existing = sessionTimers.get(key);
  if (existing) clearTimeout(existing);
  sessionTimers.set(key, timer);
};

const clearSessionTimer = (sessionId) => {
  const key = sessionId.toString();
  const existing = sessionTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    sessionTimers.delete(key);
  }
};

module.exports = {
  userSockets,
  setUserSocket,
  clearUserSocket,
  sendToUser,
  sessionTimers,
  setSessionTimer,
  clearSessionTimer,
};
