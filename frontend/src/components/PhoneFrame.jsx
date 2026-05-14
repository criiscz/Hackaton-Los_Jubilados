import React from 'react';
import ConnectionPill from './ConnectionPill';

// Responsive app shell.
//   - Mobile (<md): full-bleed; the active screen owns the viewport.
//   - Desktop (≥md): sunset gradient page bg; content sits inside a centered
//     rounded surface (max 1100px) with soft shadow. No phone cage / no notch.
//
// Individual screens decide their own internal layout (single-column on
// mobile, multi-column on desktop where it helps).
export default function PhoneFrame({ children }) {
  return (
    <div className="min-h-screen w-full bg-cream md:bg-[radial-gradient(120%_120%_at_0%_0%,#FFB5D4_0%,#FF7A6B_42%,#FFB347_100%)] md:py-10 md:px-6 lg:py-14">
      <div className="mx-auto w-full md:max-w-[1100px]">
        <div className="relative w-full bg-cream md:rounded-[36px] md:overflow-hidden md:shadow-[0_60px_140px_-40px_rgba(27,13,26,0.55)] md:ring-1 md:ring-black/[0.06] min-h-[100dvh] md:min-h-[760px]">
          {children}
        </div>
      </div>
      <ConnectionPill />
    </div>
  );
}
