const validator = require("validator");
const { User } = require("../models/user");
const {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
} = require("../utils/auth");
const { ALLOWED_SET } = require("../utils/emojis");
const { send, sendError } = require("../utils/ws");
const { setUserSocket } = require("./state");

const register = async (socket, payload = {}) => {
  const { email, password, name, description = "", profileEmoji } = payload;

  if (!email || !validator.isEmail(email)) {
    return sendError(socket, "register", "Valid email required");
  }
  if (!password || password.length < 6) {
    return sendError(
      socket,
      "register",
      "Password must be at least 6 characters"
    );
  }
  if (!name || !name.trim()) {
    return sendError(socket, "register", "Name required");
  }
  if (!profileEmoji || !ALLOWED_SET.has(profileEmoji)) {
    return sendError(
      socket,
      "register",
      "profileEmoji must be one of the allowed emojis"
    );
  }
  if (typeof description !== "string" || description.length > 280) {
    return sendError(
      socket,
      "register",
      "Description must be a string up to 280 chars"
    );
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return sendError(socket, "register", "Email already in use");
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    name: name.trim(),
    description,
    profileEmoji,
  });

  const token = signToken(user._id);
  socket.userId = user._id.toString();
  setUserSocket(socket.userId, socket);

  send(socket, { type: "register:ok", token, user: user.toPublicJSON() });
};

const auth = async (socket, payload = {}) => {
  const { token, email, password } = payload;

  if (token) {
    const userId = verifyToken(token);
    if (!userId) return sendError(socket, "auth", "Invalid or expired token");
    const user = await User.findById(userId);
    if (!user) return sendError(socket, "auth", "User not found");
    socket.userId = user._id.toString();
    setUserSocket(socket.userId, socket);
    return send(socket, { type: "auth:ok", token, user: user.toPublicJSON() });
  }

  if (!email || !password) {
    return sendError(socket, "auth", "token, or email + password required");
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return sendError(socket, "auth", "Invalid credentials");
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return sendError(socket, "auth", "Invalid credentials");

  const newToken = signToken(user._id);
  socket.userId = user._id.toString();
  setUserSocket(socket.userId, socket);
  send(socket, { type: "auth:ok", token: newToken, user: user.toPublicJSON() });
};

module.exports = { register, auth };
