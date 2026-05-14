const { Match } = require("../models/match");
const { send } = require("../utils/ws");

const list = async (socket) => {
  const matches = await Match.find({ users: socket.userId })
    .populate({ path: "users", select: "name description profileEmoji" })
    .sort({ createdAt: -1 });

  send(socket, {
    type: "matches:list",
    matches: matches.map((m) => {
      const other = m.users.find((u) => u._id.toString() !== socket.userId);
      return {
        matchId: m._id.toString(),
        createdAt: m.createdAt,
        user: other
          ? {
              id: other._id.toString(),
              name: other.name,
              description: other.description,
              profileEmoji: other.profileEmoji,
            }
          : null,
      };
    }),
  });
};

module.exports = { list };
