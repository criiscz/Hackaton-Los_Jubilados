const { User } = require("../models/user");
const { Like } = require("../models/like");
const { send } = require("../utils/ws");

const list = async (socket, payload = {}) => {
  const limit = Math.min(Number(payload.limit) || 20, 50);
  const acted = await Like.find({ from: socket.userId }, { to: 1 }).lean();
  const excludeIds = acted.map((l) => l.to);
  excludeIds.push(socket.userId);

  const users = await User.find({ _id: { $nin: excludeIds } })
    .sort({ createdAt: -1 })
    .limit(limit);

  send(socket, {
    type: "discover:list",
    profiles: users.map((u) => u.toPublicJSON()),
  });
};

module.exports = { list };
