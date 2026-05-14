import React, { useMemo } from 'react';

// Ambient background drift — emoji glyphs floating slowly at low opacity.
// CSS-only animation, halted by prefers-reduced-motion at the global rule.
export default function FloatingEmoji({ count = 6, palette }) {
  const items = useMemo(() => {
    const pool = palette || ['💗', '🔥', '🍑', '✨', '💋', '🫦', '🪩', '🦋'];
    return Array.from({ length: count }, (_, i) => {
      const ch = pool[i % pool.length];
      const top = Math.random() * 88 + 4;
      const left = Math.random() * 88 + 4;
      const size = 32 + Math.random() * 36;
      const dur = 10 + Math.random() * 10;
      const delay = -Math.random() * dur;
      const rot = (Math.random() - 0.5) * 28;
      const dx = (Math.random() - 0.5) * 60;
      const dy = (Math.random() - 0.5) * 50;
      return { ch, top, left, size, dur, delay, rot, dx, dy, key: i };
    });
  }, [count, palette]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((it) => (
        <span
          key={it.key}
          className="absolute opacity-[0.18] select-none"
          style={{
            top: `${it.top}%`,
            left: `${it.left}%`,
            fontSize: `${it.size}px`,
            animation: `drift ${it.dur}s ease-in-out ${it.delay}s infinite`,
            '--rot': `${it.rot}deg`,
            '--dx': `${it.dx}px`,
            '--dy': `${it.dy}px`,
          }}
        >
          {it.ch}
        </span>
      ))}
    </div>
  );
}
