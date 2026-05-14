const mongoose = require("mongoose");
const { ALLOWED } = require("../utils/emojis");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: "", maxlength: 280 },
    profileEmoji: { type: String, required: true, enum: ALLOWED },
  },
  { timestamps: true }
);

UserSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description,
    profileEmoji: this.profileEmoji,
  };
};

const User = mongoose.model("User", UserSchema);

module.exports = { User };
