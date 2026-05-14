import React, { useState } from 'react';
import { SAFE_EMOJIS, SPICY_EMOJIS } from '../constants/emojiKeyboard';

// Chat input keyboard. Two tabs (Soft / Spicy). Tap = send instantly.
// ONLY <button> keys — no <input>/<textarea>. This is the only input affordance.
export default function EmojiKeyboard({ onSend, disabled = false }) {
  const [tab, setTab] = useState('soft');
  const list = tab === 'soft' ? SAFE_EMOJIS : SPICY_EMOJIS;

  return (
    <div
      className="relative w-full bg-paper border-t border-ink/10 shadow-[0_-12px_28px_-18px_rgba(27,13,26,0.25)]"
      aria-disabled={disabled}
    >
      <div className="flex items-center justify-center gap-2 pt-3 pb-1">
        <KeyboardTab label="Soft"      active={tab === 'soft'}  onClick={() => setTab('soft')}  disabled={disabled} />
        <KeyboardTab label="Spicy 🌶"   active={tab === 'spicy'} onClick={() => setTab('spicy')} disabled={disabled} />
      </div>

      <div
        className={`grid grid-cols-5 gap-2 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] ${
          disabled ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        {list.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-label={`send ${e.label}`}
            disabled={disabled}
            onClick={() => onSend(e)}
            className="aspect-square rounded-2xl bg-cream border border-ink/10 text-[30px] leading-none flex items-center justify-center focus-pink transition-transform active:scale-90 active:animate-[bounce-send_0.4s_cubic-bezier(0.2,0.9,0.3,1.2)] hover:border-pink/40"
          >
            <span aria-hidden="true">{e.char}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function KeyboardTab({ label, active, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 rounded-full text-[12px] font-semibold border focus-pink whitespace-nowrap ${
        active ? 'bg-ink text-cream border-ink' : 'bg-paper text-ink border-ink/10'
      }`}
    >
      {label}
    </button>
  );
}
