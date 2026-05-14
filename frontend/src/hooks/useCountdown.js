import { useEffect, useRef, useState } from 'react';

// Derives remaining time from startedAt + durationSec − now().
// Survives re-renders and tab throttling (always reads Date.now()).
// `setInterval` updates mm:ss text every 500ms; rAF updates progress for smooth ring.
export function useCountdown(startedAt, durationSec = 120) {
  const [remaining, setRemaining] = useState(() => compute(startedAt, durationSec));
  const [progress, setProgress] = useState(() => 1 - compute(startedAt, durationSec) / durationSec);
  const rafRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!startedAt) return undefined;

    const tickText = () => setRemaining(compute(startedAt, durationSec));
    const tickRing = () => {
      const r = compute(startedAt, durationSec);
      setProgress(1 - r / durationSec);
      if (r > 0) rafRef.current = requestAnimationFrame(tickRing);
    };

    tickText();
    intervalRef.current = setInterval(tickText, 500);
    rafRef.current = requestAnimationFrame(tickRing);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [startedAt, durationSec]);

  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const mmss = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const expired = remaining <= 0;
  const urgent = remaining > 0 && remaining <= 15;

  return { remaining, mmss, progress, expired, urgent };
}

function compute(startedAt, durationSec) {
  if (!startedAt) return durationSec;
  const elapsed = (Date.now() - startedAt) / 1000;
  return Math.max(0, durationSec - elapsed);
}
