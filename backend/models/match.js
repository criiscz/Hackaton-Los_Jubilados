const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema(
  {
    users: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      validate: (v) => Array.isArray(v) && v.length === 2,
      required: true,
    },
  },
  { timestamps: true }
);

MatchSchema.index({ users: 1 });

const Match = mongoose.model("Match", MatchSchema);

module.exports = { Match };
