import React, { useEffect, useState } from 'react';
import { subscribeConnection } from '../api/client';

// Floating live pill: shows backend WS reachability + last data tick.
// Bottom-left, low-key. Tap to peek at the URL.
export default function ConnectionPill() {
  const [conn, setConn] = useState({ status: 'idle', url: null, lastPongAt: null });
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeConnection(setConn), []);

  const label = LABELS[conn.status] || conn.status;
  const dot = DOT_COLORS[conn.status] || 'bg-ink-mute';
  const tone = TONE[conn.status] || 'bg-paper text-ink';

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[100] flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Backend connection: ${label}`}
        className={`pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold border border-ink/10 shadow-[var(--shadow-soft)] focus-pink ${tone}`}
      >
        <span className={`inline-block w-2 h-2 rounded-full ${dot} ${conn.status === 'open' ? 'animate-[pulse_1.4s_ease-in-out_infinite]' : ''}`} aria-hidden="true" />
        backend · {label}
      </button>
      {open && (
        <div className="pointer-events-auto bg-paper border border-ink/10 rounded-2xl px-3 py-2 text-[11px] text-ink-soft shadow-[var(--shadow-card)] max-w-[280px]">
          <div className="font-semibold uppercase tracking-[0.18em] text-ink-mute mb-0.5">
            ws endpoint
          </div>
          <div className="break-all">{conn.url || '—'}</div>
          {conn.lastPongAt && (
            <div className="mt-1.5 text-ink-mute">
              last frame {Math.max(0, Math.round((Date.now() - conn.lastPongAt) / 1000))}s ago
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const LABELS = {
  idle: 'idle',
  connecting: 'connecting…',
  open: 'live',
  closed: 'offline',
  error: 'error',
};

const DOT_COLORS = {
  idle: 'bg-ink-mute',
  connecting: 'bg-sunset',
  open: 'bg-mint',
  closed: 'bg-ink-mute',
  error: 'bg-danger',
};

const TONE = {
  idle: 'bg-paper text-ink',
  connecting: 'bg-paper text-ink',
  open: 'bg-mint/20 text-ink',
  closed: 'bg-paper text-ink-mute',
  error: 'bg-danger/15 text-ink',
};
