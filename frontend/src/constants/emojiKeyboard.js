// Canonical emoji set for the Matchmoji chat keyboard.
// Two groups (10 + 10). The chat surface MUST only send emojis from this list —
// it is also the single source of truth for input validation and analytics.

export const SAFE_EMOJIS = [
  { char: '😊', id: 'happy',       label: 'happy' },
  { char: '😂', id: 'laughing',    label: 'laugh' },
  { char: '🤔', id: 'thinking',    label: 'thinking' },
  { char: '👍', id: 'thumbs_up',   label: 'thumbs up' },
  { char: '👎', id: 'thumbs_down', label: 'thumbs down' },
  { char: '❤️', id: 'heart',       label: 'heart' },
  { char: '😢', id: 'sad',         label: 'sad' },
  { char: '😮', id: 'surprised',   label: 'surprise' },
  { char: '🙏', id: 'please',      label: 'thanks' },
  { char: '👋', id: 'wave',        label: 'wave' },
];

export const SPICY_EMOJIS = [
  { char: '😏', id: 'smirk',       label: 'smirk' },
  { char: '😉', id: 'wink',        label: 'wink' },
  { char: '😘', id: 'kiss_face',   label: 'kiss' },
  { char: '🥒', id: 'cucumber',    label: 'cucumber' },
  { char: '😍', id: 'heart_eyes',  label: 'heart eyes' },
  { char: '🔥', id: 'fire',        label: 'fire' },
  { char: '💋', id: 'kiss_mark',   label: 'kiss mark' },
  { char: '👀', id: 'eyes',        label: 'eyes' },
  { char: '🫦', id: 'biting_lip',  label: 'bite lip' },
  { char: '💦', id: 'droplets',    label: 'sweat drops' },
];

export const EMOJI_KEYBOARD = [...SAFE_EMOJIS, ...SPICY_EMOJIS];

export const ALLOWED_EMOJI_CHARS = new Set(EMOJI_KEYBOARD.map((e) => e.char));

export const isAllowedEmoji = (char) => ALLOWED_EMOJI_CHARS.has(char);
