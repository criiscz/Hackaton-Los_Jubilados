import React from 'react';

// Single-select pill chip used for interest selector and quick time slots.
export default function Chip({ active, onClick, children, ariaLabel, size = 'md' }) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full font-semibold border transition-all focus-pink';
  const sizes = {
    sm: 'px-3 py-1.5 text-[13px]',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-[15px]',
  };
  const styles = active
    ? 'bg-ink text-cream border-ink shadow-[0_8px_20px_-10px_rgba(27,13,26,0.6)]'
    : 'bg-paper text-ink border-ink/10 hover:border-ink/30';

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${styles}`}
    >
      {children}
    </button>
  );
}
