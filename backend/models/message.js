const mongoose = require("mongoose");
const { ALLOWED } = require("../utils/emojis");

const MessageSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true, enum: ALLOWED },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

MessageSchema.index({ session: 1, sentAt: 1 });

const Message = mongoose.model("Message", MessageSchema);

module.exports = { Message };
