import React from 'react';

// Desktop-only sunset gutter frame. On mobile (<768px) it's a pass-through.
// Wraps the active screen inside a 420×900 "phone" surface on desktop with
// a candy sunset gradient gutter behind it.
export default function PhoneFrame({ children }) {
  return (
    <div className="min-h-screen w-full md:bg-gradient-to-br md:from-pink md:via-coral md:to-sunset md:py-10 md:px-6">
      <div className="relative mx-auto w-full max-w-full md:max-w-[420px] md:h-[900px] md:rounded-[44px] md:overflow-hidden md:shadow-[0_60px_120px_-40px_rgba(27,13,26,0.55)] md:ring-1 md:ring-black/10 bg-cream">
        {/* desktop notch decoration */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-3 left-1/2 -translate-x-1/2 h-[22px] w-[110px] rounded-full bg-ink z-30"
        />
        <div className="relative h-screen md:h-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
