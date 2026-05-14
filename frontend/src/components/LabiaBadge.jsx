import React from 'react';

// 5-flame meter for charisma score 0-100.
// Compact pill: 🔥🔥🔥🔥· 78
export default function LabiaBadge({ score = 0 }) {
  const filled = Math.max(0, Math.min(5, Math.round(score / 20)));
  const flames = Array.from({ length: 5 }, (_, i) => i < filled);

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full bg-paper border border-ink/10 px-3 py-1.5 shadow-[var(--shadow-soft)]"
      title={`Labia: ${score}/100`}
      aria-label={`Labia score ${score} de 100`}
    >
      <span className="flex items-center gap-0.5 text-[15px] leading-none" aria-hidden="true">
        {flames.map((on, i) => (
          <span key={i} className={on ? '' : 'opacity-20 grayscale'}>
            🔥
          </span>
        ))}
      </span>
      <span className="display-italic text-[15px] text-ink leading-none">{score}</span>
      <span className="text-[11px] uppercase tracking-[0.12em] text-ink-mute font-semibold leading-none">
        labia
      </span>
    </span>
  );
}
