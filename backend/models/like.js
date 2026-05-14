const mongoose = require("mongoose");

const LikeSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: { type: String, enum: ["like", "pass"], required: true },
  },
  { timestamps: true }
);

LikeSchema.index({ from: 1, to: 1 }, { unique: true });

const Like = mongoose.model("Like", LikeSchema);

module.exports = { Like };
