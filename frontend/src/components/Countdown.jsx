import React from 'react';

// Massive conic-gradient progress ring around mm:ss.
// `progress` is 0-1 (elapsed fraction). `urgent` triggers coral ring + shake + heartbeat.
export default function Countdown({ mmss, progress, urgent, expired, size = 220 }) {
  const ringFrom = urgent ? '#FF7A6B' : '#FF2D87';
  const ringTo = urgent ? '#E53170' : '#FFB347';
  const trackOpacity = 0.12;
  const pct = Math.max(0, Math.min(1, progress)) * 360;

  const ringStyle = {
    width: size,
    height: size,
    background: `conic-gradient(from -90deg, ${ringFrom} 0deg, ${ringTo} ${pct}deg, rgba(27,13,26,${trackOpacity}) ${pct}deg 360deg)`,
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        role="img"
        aria-label={expired ? "time's up" : `${mmss} remaining`}
        className={`rounded-full p-[14px] ${urgent ? 'animate-[heartbeat_1.1s_ease-in-out_infinite]' : ''}`}
        style={ringStyle}
      >
        <div className="rounded-full bg-paper w-full h-full flex flex-col items-center justify-center shadow-[var(--shadow-card)] relative paper-grain">
          <span
            className={`display-italic text-ink leading-none ${urgent ? 'animate-[urgent-shake_0.35s_linear_infinite]' : ''}`}
            style={{ fontSize: size * 0.36 }}
          >
            {mmss}
          </span>
          <span className="text-[10px] mt-2 uppercase tracking-[0.22em] text-ink-mute font-semibold">
            {expired ? "time's up" : 'remaining'}
          </span>
        </div>
      </div>
    </div>
  );
}
