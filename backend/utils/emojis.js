const ALLOWED = [
  "😊",
  "😂",
  "🤔",
  "👍",
  "👎",
  "❤️",
  "😢",
  "😮",
  "🙏",
  "👋",
  "😏",
  "😉",
  "😘",
  "🥒",
  "😍",
  "🔥",
  "💋",
  "👀",
  "🫦",
  "💦",
];

const ALLOWED_SET = new Set(ALLOWED);

const SORTED_BY_LENGTH = [...ALLOWED].sort((a, b) => b.length - a.length);

const tokenize = (input) => {
  if (typeof input !== "string") return null;
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    let matched = null;
    for (const emoji of SORTED_BY_LENGTH) {
      if (input.startsWith(emoji, i)) {
        matched = emoji;
        break;
      }
    }
    if (!matched) return null;
    tokens.push(matched);
    i += matched.length;
  }
  return tokens;
};

const isAllowed = (emoji) => ALLOWED_SET.has(emoji);

module.exports = { ALLOWED, ALLOWED_SET, tokenize, isAllowed };
