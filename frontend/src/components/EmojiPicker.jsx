import React, { useState } from 'react';
import { SAFE_EMOJIS, SPICY_EMOJIS } from '../constants/emojiKeyboard';

// Extended catalog for signature emoji selection (registration only).
const EXTRA_MOODS = [
  { id: 'naturaleza', label: 'Naturaleza', items: ['🦋', '🌻', '🐚', '🍒', '🍑', '🌶️', '🐝', '🌙', '🌶', '🌿'] },
  { id: 'simbolo',    label: 'Símbolo',    items: ['🪩', '✨', '🛸', '👾', '🎀', '🍭', '🪐', '⚡', '🩰', '🧿'] },
  { id: 'animales',   label: 'Animales',   items: ['🐍', '🦊', '🐯', '🦄', '🦦', '🐙', '🦩', '🐉', '🐺', '🦝'] },
  { id: 'comida',     label: 'Comida',     items: ['🍓', '🍷', '🍯', '🥑', '🥥', '🌽', '🧁', '🍩', '🥮', '🍙'] },
];

const GROUPS = [
  { id: 'safe',  label: 'Suaves',     items: SAFE_EMOJIS.map((e) => e.char) },
  { id: 'spicy', label: 'Picantes 🌶', items: SPICY_EMOJIS.map((e) => e.char) },
  ...EXTRA_MOODS,
];

export default function EmojiPicker({ value, onChange, onClose, open }) {
  const [active, setActive] = useState('safe');
  if (!open) return null;

  const group = GROUPS.find((g) => g.id === active) || GROUPS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Elige tu emoji firma"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/40 backdrop-blur-sm animate-[fade-up_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-[440px] bg-paper rounded-t-[28px] md:rounded-[28px] p-5 shadow-[var(--shadow-card)] animate-[sheet-up_0.32s_cubic-bezier(0.2,0.9,0.3,1.2)] paper-grain relative"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
              Tu identidad
            </div>
            <h3 className="display-italic text-[26px] text-ink leading-tight">
              Elige <span className="text-pink">tu emoji</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar selector"
            className="w-10 h-10 rounded-full bg-cream-deep text-ink text-lg leading-none focus-pink"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setActive(g.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border focus-pink whitespace-nowrap ${
                active === g.id
                  ? 'bg-ink text-cream border-ink'
                  : 'bg-paper text-ink border-ink/10'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto pb-1">
          {group.items.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => {
                onChange(char);
                onClose && onClose();
              }}
              aria-label={`elegir ${char}`}
              className={`aspect-square rounded-2xl text-[32px] leading-none flex items-center justify-center bg-cream border focus-pink transition-transform active:scale-95 ${
                value === char ? 'border-pink ring-2 ring-pink/40' : 'border-ink/10'
              }`}
            >
              {char}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
