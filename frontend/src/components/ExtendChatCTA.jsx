import React from 'react';

// Slides up to replace the keyboard once remaining = 0.
export default function ExtendChatCTA({ onExtend, price = '$0.99' }) {
  return (
    <div
      role="region"
      aria-label="Chat expired"
      className="w-full bg-paper border-t border-ink/10 px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)] animate-[sheet-up_0.32s_cubic-bezier(0.2,0.9,0.3,1.2)]"
    >
      <div className="flex items-center justify-center gap-2">
        <span aria-hidden="true" className="text-[24px]">⏳</span>
        <div className="text-center">
          <div className="display-italic text-[22px] text-ink leading-tight">Time's up</div>
          <p className="text-[12px] text-ink-mute uppercase tracking-[0.18em] font-semibold">
            keep going?
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onExtend}
        className="mt-4 w-full py-4 rounded-2xl bg-ink text-cream font-semibold text-[16px] focus-pink shadow-[var(--shadow-pop)] active:translate-y-[1px] inline-flex items-center justify-center gap-2"
      >
        Extend 2 more min <span aria-hidden="true">·</span> {price}{' '}
        <span aria-hidden="true">💸</span>
      </button>
      <p className="mt-2 text-center text-[11px] text-ink-mute">
        demo · simulated payment, nothing is actually charged
      </p>
    </div>
  );
}
