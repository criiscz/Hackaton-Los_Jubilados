const mongoose = require("mongoose");

const ChatSessionSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true,
    },
    scheduledAt: { type: Date, required: true },
    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    extensions: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["scheduled", "active", "expired", "ended"],
      default: "scheduled",
    },
    joinedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    chemistryScore: { type: Number, default: null },
    chemistryHits: { type: Array, default: [] },
  },
  { timestamps: true }
);

const ChatSession = mongoose.model("ChatSession", ChatSessionSchema);

module.exports = { ChatSession };
