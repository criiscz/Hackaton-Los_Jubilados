const fs = require("fs");
const path = require("path");
const { tokenize } = require("./emojis");

const CSV_PATH = path.join(
  __dirname,
  "..",
  "chemestry",
  "emoji_chemistry_combinations.csv"
);

const parseCsv = (raw) => {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = lines.shift();
  if (!header || !header.startsWith("combo")) {
    throw new Error(
      "Unexpected CSV header in emoji_chemistry_combinations.csv"
    );
  }
  const combos = new Map();
  for (const line of lines) {
    const [comboRaw, tier, matchPctRaw, category, meaning] = line.split(",");
    const tokens = tokenize(comboRaw);
    if (!tokens || tokens.length !== 3) {
      throw new Error(`Invalid combo in CSV: ${comboRaw}`);
    }
    const key = tokens.join("");
    combos.set(key, {
      combo: key,
      tokens,
      tier,
      matchPct: Number(matchPctRaw),
      category,
      meaning,
    });
  }
  return combos;
};

const combos = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));

const scoreSequence = (emojiSequence) => {
  const hits = [];
  for (let i = 0; i + 3 <= emojiSequence.length; i += 1) {
    const key = emojiSequence[i] + emojiSequence[i + 1] + emojiSequence[i + 2];
    const combo = combos.get(key);
    if (combo) {
      hits.push({
        combo: key,
        matchPct: combo.matchPct,
        tier: combo.tier,
        category: combo.category,
        meaning: combo.meaning,
        index: i,
      });
    }
  }
  if (hits.length === 0) return { score: 0, hits: [] };
  const score = hits.reduce((sum, h) => sum + h.matchPct, 0) / hits.length;
  return { score: Math.round(score * 100) / 100, hits };
};

module.exports = { scoreSequence, combos };
