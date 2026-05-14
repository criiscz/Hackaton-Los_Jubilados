import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmojiKeyboard from '../components/EmojiKeyboard';

// Demo interaction shown on the landing route (/).
// Auto-plays a scripted emoji conversation between "Luna" and the visitor.
// The visitor can also tap the keyboard — every message counts toward 10.
// At 10 messages we redirect to /register so the visitor converts.

const SCRIPT = [
  { sender: 'them', emoji: '👋' },
  { sender: 'me',   emoji: '😊' },
  { sender: 'them', emoji: '😏' },
  { sender: 'me',   emoji: '🔥' },
  { sender: 'them', emoji: '😘' },
  { sender: 'me',   emoji: '😍' },
  { sender: 'them', emoji: '🫦' },
  { sender: 'me',   emoji: '💋' },
  { sender: 'them', emoji: '🥒' },
  { sender: 'me',   emoji: '💦' },
];

const LUNA = { id: 'demo_luna', name: 'Luna', emoji: '🦋', rizz: 92 };

const MESSAGE_LIMIT = 10;

export default function DemoChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const scriptIdx = useRef(0);
  const scrollRef = useRef(null);
  const goneRef = useRef(false);

  const count = messages.length;

  // Auto-play every ~1.7s if the visitor hasn't taken over with taps.
  useEffect(() => {
    if (count >= MESSAGE_LIMIT) return undefined;
    const t = setTimeout(() => {
      if (scriptIdx.current >= SCRIPT.length) return;
      const next = SCRIPT[scriptIdx.current];
      scriptIdx.current += 1;
      setMessages((m) => [...m, { id: `s_${Date.now()}`, ...next }]);
    }, count === 0 ? 700 : 1700);
    return () => clearTimeout(t);
  }, [count]);

  // Gate: at 10 messages, route to /register.
  useEffect(() => {
    if (count >= MESSAGE_LIMIT && !goneRef.current) {
      goneRef.current = true;
      const t = setTimeout(() => navigate('/register'), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [count, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendUserEmoji = (entry) => {
    setMessages((m) => [
      ...m,
      { id: `u_${Date.now()}`, sender: 'me', emoji: entry.char },
    ]);
  };

  return (
    <div className="relative w-full min-h-[100dvh] md:min-h-[760px] flex flex-col lg:grid lg:grid-cols-[1.1fr_1.4fr] lg:gap-0 bg-cream">
      {/* hero / brand panel — visible on lg+, collapses above keyboard on smaller */}
      <aside className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-pink/8 via-coral/8 to-sunset/10 border-r border-ink/[0.06]">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-ink-mute font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-pink" aria-hidden="true" /> live demo
          </div>
          <h1 className="mt-4 display-italic text-[88px] leading-[0.88] text-ink">
            Match<span className="text-pink">moji</span>
            <span
              aria-hidden="true"
              className="inline-block ml-2 align-baseline text-[56px] rotate-[12deg] not-italic"
              style={{ transformOrigin: 'bottom left' }}
            >
              🍑
            </span>
          </h1>
          <p className="mt-4 text-[17px] text-ink-soft leading-snug max-w-[360px]">
            Emoji-only dating. Two-minute chats. Watch the vibe between Luna and a stranger play
            out below.
          </p>
          <ul className="mt-6 space-y-2 text-[14px] text-ink-soft">
            <li className="flex items-center gap-2">
              <span aria-hidden="true">🔥</span> No small talk — just feelings, fast.
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true">⏳</span> 120 seconds per match.
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true">🫦</span> Pay to keep going. Maybe.
            </li>
          </ul>
        </div>
        <div>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-ink text-cream font-semibold focus-pink shadow-[var(--shadow-pop)]"
          >
            Skip the demo, sign up →
          </button>
          <p className="mt-2 text-[12px] text-ink-mute">
            you'll auto-jump in {Math.max(0, MESSAGE_LIMIT - count)} more message
            {MESSAGE_LIMIT - count === 1 ? '' : 's'}
          </p>
        </div>
      </aside>

      {/* chat panel */}
      <section className="relative flex flex-col flex-1 min-h-0">
        {/* header */}
        <header className="relative z-10 flex items-center gap-3 px-4 md:px-6 pt-4 pb-3 border-b border-ink/[0.06]">
          <div className="w-11 h-11 rounded-full bg-cream-deep flex items-center justify-center text-[26px]">
            <span aria-hidden="true">{LUNA.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="display-italic text-[20px] text-ink leading-tight truncate">
              {LUNA.name}
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-mute font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-mint" aria-hidden="true" /> live demo
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-[12px] font-semibold text-ink/80 underline decoration-pink decoration-2 underline-offset-4 focus-pink rounded"
          >
            sign up →
          </button>
        </header>

        {/* counter strip */}
        <div className="px-5 md:px-7 pt-3 pb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
          <span>watching the vibe</span>
          <span className="flex items-baseline gap-0.5">
            <span className="display-italic text-[18px] text-ink">{Math.min(count, MESSAGE_LIMIT)}</span>
            <span className="text-ink-mute text-[12px]">/ {MESSAGE_LIMIT}</span>
          </span>
        </div>
        <div className="mx-5 md:mx-7 h-1.5 rounded-full bg-ink/[0.06] overflow-hidden">
          <div
            className="h-full bg-pink transition-[width] duration-500 ease-out"
            style={{ width: `${Math.min(100, (count / MESSAGE_LIMIT) * 100)}%` }}
          />
        </div>

        {/* messages — bubble-less, lane-tinted */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-0 py-2">
          {messages.length === 0 ? (
            <div className="text-center text-ink-mute text-[13px] py-8 px-6">
              hang on, Luna is typing… (just kidding, she's tapping)
            </div>
          ) : (
            messages.map((m) => <MessageRow key={m.id} msg={m} />)
          )}
        </div>

        {/* keyboard — visitor can also tap */}
        <EmojiKeyboard onSend={sendUserEmoji} disabled={count >= MESSAGE_LIMIT} />

        {count >= MESSAGE_LIMIT && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-30 flex items-center justify-center bg-ink/40 backdrop-blur-sm animate-[fade-up_0.2s_ease-out]"
          >
            <div className="bg-paper rounded-[24px] p-6 max-w-[360px] text-center shadow-[var(--shadow-card)] mx-5">
              <div className="text-[44px]" aria-hidden="true">💌</div>
              <h2 className="display-italic text-[28px] text-ink leading-tight mt-1">
                Like the vibe?
              </h2>
              <p className="mt-2 text-[14px] text-ink-soft">
                Sign up to start your own 2-minute chats.
              </p>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="mt-4 w-full py-3.5 rounded-2xl bg-ink text-cream font-semibold focus-pink shadow-[var(--shadow-pop)]"
              >
                Take me to sign-up →
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MessageRow({ msg }) {
  const mine = msg.sender === 'me';
  return (
    <div
      className={`w-full flex ${mine ? 'justify-end' : 'justify-start'} ${
        mine ? 'bg-cream-deep/60' : 'bg-pink-soft/35'
      } border-b border-dotted border-ink/10 px-5 md:px-7 py-2.5 animate-[fade-up_0.18s_ease-out]`}
    >
      <span
        className="text-[40px] md:text-[44px] leading-none"
        aria-label={`${mine ? 'you sent' : 'Luna sent'} ${msg.emoji}`}
      >
        {msg.emoji}
      </span>
    </div>
  );
}
