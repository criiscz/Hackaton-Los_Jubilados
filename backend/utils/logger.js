const REDACT_KEYS = new Set(["password", "token", "passwordHash"]);
const MAX_STR = 120;

const previewPayload = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > MAX_STR ? `${value.slice(0, MAX_STR)}…` : value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(previewPayload);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (REDACT_KEYS.has(k)) {
      out[k] = "[redacted]";
    } else {
      out[k] = previewPayload(v);
    }
  }
  return out;
};

const log = (tag, ...args) => {
  console.log(`[${new Date().toISOString()}] [${tag}]`, ...args);
};

module.exports = { log, previewPayload };
