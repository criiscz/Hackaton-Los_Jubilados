const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 10;
const TOKEN_TTL = "7d";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
};

const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

const signToken = (userId) =>
  jwt.sign({ sub: userId.toString() }, getSecret(), { expiresIn: TOKEN_TTL });

const verifyToken = (token) => {
  try {
    const payload = jwt.verify(token, getSecret());
    return payload.sub || null;
  } catch (err) {
    return null;
  }
};

module.exports = { hashPassword, comparePassword, signToken, verifyToken };
