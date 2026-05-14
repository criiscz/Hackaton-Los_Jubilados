// Canonical emoji set for the Matchmoji chat keyboard.
// Two groups (10 + 10). The chat surface MUST only send emojis from this list —
// it is also the single source of truth for input validation and analytics.

export const SAFE_EMOJIS = [
  { char: '😊', id: 'happy',     label: 'feliz / saludo amistoso' },
  { char: '😂', id: 'laughing',  label: 'me río / qué gracioso' },
  { char: '🤔', id: 'thinking',  label: 'pensando / no estoy seguro' },
  { char: '👍', id: 'thumbs_up', label: 'sí / de acuerdo' },
  { char: '👎', id: 'thumbs_down', label: 'no / no me gusta' },
  { char: '❤️', id: 'heart',     label: 'me encanta / te quiero' },
  { char: '😢', id: 'sad',       label: 'triste / lo siento' },
  { char: '😮', id: 'surprised', label: 'sorprendido / wow' },
  { char: '🙏', id: 'please',    label: 'por favor / gracias' },
  { char: '👋', id: 'wave',      label: 'hola / adiós' },
];

export const SPICY_EMOJIS = [
  { char: '😏', id: 'smirk',     label: 'sonrisa pícara / coqueteo' },
  { char: '😉', id: 'wink',      label: 'guiño / indirecta' },
  { char: '😘', id: 'kiss_face', label: 'beso / cariño' },
  { char: '🥒', id: 'cucumber',  label: 'pepino' },
  { char: '😍', id: 'heart_eyes', label: 'te ves increíble' },
  { char: '🔥', id: 'fire',      label: 'estás ardiente' },
  { char: '💋', id: 'kiss_mark', label: 'marca de beso' },
  { char: '👀', id: 'eyes',      label: 'mirándote / fijándome' },
  { char: '🫦', id: 'biting_lip', label: 'mordida de labio / sugerente' },
  { char: '💦', id: 'droplets',  label: 'reacción picante' },
];

export const EMOJI_KEYBOARD = [...SAFE_EMOJIS, ...SPICY_EMOJIS];

export const ALLOWED_EMOJI_CHARS = new Set(EMOJI_KEYBOARD.map((e) => e.char));

export const isAllowedEmoji = (char) => ALLOWED_EMOJI_CHARS.has(char);
