import { useRef, useState } from 'react';

// Lightweight touch swipe detector for MatchCard.
// Threshold 80px in either direction.
// Caller passes onSwipeLeft / onSwipeRight; tap detection stays separate.
export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 80 } = {}) {
  const start = useRef(null);
  const [delta, setDelta] = useState({ dx: 0, dy: 0 });
  const [swiping, setSwiping] = useState(false);

  const reset = () => {
    start.current = null;
    setDelta({ dx: 0, dy: 0 });
    setSwiping(false);
  };

  const onTouchStart = (e) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    setSwiping(true);
  };

  const onTouchMove = (e) => {
    if (!start.current) return;
    const t = e.touches[0];
    setDelta({ dx: t.clientX - start.current.x, dy: t.clientY - start.current.y });
  };

  const onTouchEnd = () => {
    if (!start.current) return;
    const { dx } = delta;
    if (dx <= -threshold && onSwipeLeft) onSwipeLeft();
    else if (dx >= threshold && onSwipeRight) onSwipeRight();
    reset();
  };

  const onTouchCancel = () => reset();

  return {
    dx: delta.dx,
    dy: delta.dy,
    swiping,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
}
