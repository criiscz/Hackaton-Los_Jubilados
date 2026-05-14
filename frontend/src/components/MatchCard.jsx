import React, { useRef, useState } from 'react';
import LabiaBadge from './LabiaBadge';
import { useSwipe } from '../hooks/useSwipe';

// Swipeable Tinder-style card with restrained sticker aesthetic:
// paper-grain noise overlay, dotted seams top + bottom, ±2° rotation.
export default function MatchCard({
  candidate,
  index = 0,
  jiggling = false,
  onSwipeLeft,
  onSwipeRight,
}) {
  const rot = index % 2 === 0 ? 1.8 : -1.8;
  const [exitDir, setExitDir] = useState(null);
  const cardRef = useRef(null);

  const swipe = useSwipe({
    onSwipeLeft: () => {
      setExitDir('left');
      setTimeout(() => onSwipeLeft && onSwipeLeft(), 220);
    },
    onSwipeRight: () => {
      setExitDir('right');
      setTimeout(() => onSwipeRight && onSwipeRight(), 220);
    },
  });

  const dragX = swipe.swiping ? swipe.dx : 0;
  const dragRot = swipe.swiping ? dragX / 18 : 0;
  const exit = exitDir
    ? `translateX(${exitDir === 'left' ? -460 : 460}px) rotate(${exitDir === 'left' ? -18 : 18}deg)`
    : null;

  const transform = exit ?? `translateX(${dragX}px) rotate(${rot + dragRot}deg)`;

  return (
    <article
      ref={cardRef}
      className={`relative w-full max-w-[340px] mx-auto bg-paper rounded-[28px] paper-grain shadow-[var(--shadow-card)] overflow-hidden touch-pan-y select-none ${
        jiggling ? 'animate-[jiggle-match_0.6s_ease-in-out]' : ''
      }`}
      style={{
        transform,
        transition: exit
          ? 'transform 0.22s ease-out, opacity 0.22s ease-out'
          : swipe.swiping
          ? 'none'
          : 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
        opacity: exit ? 0 : 1,
        '--mm-rot': `${rot}deg`,
      }}
      onTouchStart={swipe.onTouchStart}
      onTouchMove={swipe.onTouchMove}
      onTouchEnd={swipe.onTouchEnd}
      onTouchCancel={swipe.onTouchCancel}
    >
      <div className="dotted-seam" aria-hidden="true" />

      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
          <span>perfil #{String(index + 1).padStart(2, '0')}</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-mint" aria-hidden="true" /> en línea
          </span>
        </div>

        <div className="mt-5 flex items-center justify-center">
          <div
            className="relative w-[180px] h-[180px] rounded-full bg-cream flex items-center justify-center text-[120px] leading-none"
            style={{ boxShadow: 'inset 0 0 0 6px rgba(255,179,71,0.18)' }}
            aria-label={`emoji firma ${candidate.emoji}`}
          >
            <span>{candidate.emoji}</span>
          </div>
        </div>

        <div className="mt-5 text-center">
          <h2 className="display-italic text-[40px] leading-[0.95] text-ink">
            {candidate.name}
          </h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            quiere{' '}
            <span className="font-semibold text-ink">
              {candidate.interest === 'todes' ? 'a todes' : candidate.interest}
            </span>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <LabiaBadge score={candidate.labia} />
          <div className="flex items-center gap-1 text-[22px]" aria-label="vibra reciente">
            {(candidate.vibe || []).slice(0, 3).map((v, i) => (
              <span key={i} className="opacity-80">
                {v}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 -mx-6 dotted-seam" aria-hidden="true" />

        <div className="mt-4 text-center text-[12px] text-ink-mute uppercase tracking-[0.18em] font-semibold">
          desliza · toca · decide
        </div>
      </div>

      {/* swipe feedback labels */}
      {swipe.swiping && Math.abs(swipe.dx) > 24 && (
        <div
          aria-hidden="true"
          className={`absolute top-6 ${
            swipe.dx > 0 ? 'right-5' : 'left-5'
          } display-italic text-[28px] px-3 py-1 rounded-xl border-2 ${
            swipe.dx > 0
              ? 'text-mint-deep border-mint rotate-[-8deg]'
              : 'text-coral border-coral rotate-[8deg]'
          }`}
          style={{ opacity: Math.min(1, Math.abs(swipe.dx) / 120) }}
        >
          {swipe.dx > 0 ? 'match!' : 'paso'}
        </div>
      )}
    </article>
  );
}
