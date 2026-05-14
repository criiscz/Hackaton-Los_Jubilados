const { User } = require("../models/user");
const { ALLOWED_SET } = require("../utils/emojis");
const { send, sendError } = require("../utils/ws");

const get = async (socket) => {
  const user = await User.findById(socket.userId);
  if (!user) return sendError(socket, "profile:get", "User not found");
  send(socket, { type: "profile", user: user.toPublicJSON() });
};

const update = async (socket, payload = {}) => {
  const { name, description, profileEmoji } = payload;
  const updates = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof description === "string") {
    if (description.length > 280)
      return sendError(socket, "profile:update", "Description too long");
    updates.description = description;
  }
  if (profileEmoji !== undefined) {
    if (!ALLOWED_SET.has(profileEmoji)) {
      return sendError(
        socket,
        "profile:update",
        "profileEmoji must be one of the allowed emojis"
      );
    }
    updates.profileEmoji = profileEmoji;
  }
  if (Object.keys(updates).length === 0) {
    return sendError(socket, "profile:update", "No valid fields to update");
  }
  const user = await User.findByIdAndUpdate(socket.userId, updates, {
    new: true,
  });
  send(socket, { type: "profile:updated", user: user.toPublicJSON() });
};

module.exports = { get, update };
