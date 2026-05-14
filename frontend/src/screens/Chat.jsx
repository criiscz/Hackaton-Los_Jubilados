import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Countdown from '../components/Countdown';
import EmojiKeyboard from '../components/EmojiKeyboard';
import ExtendChatCTA from '../components/ExtendChatCTA';
import PaymentModal from '../components/PaymentModal';
import { useCountdown } from '../hooks/useCountdown';
import { api } from '../api/client';

export default function Chat() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(undefined);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [messages, setMessages] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.getMatch(matchId).then((m) => setMatch(m || null));
  }, [matchId]);

  // Compute the scheduled start time. Until we hit it, the chat sits in a
  // waiting room — no chat:join, no keyboard, no timer.
  const scheduledAt = match && match.when ? new Date(match.when).getTime() : null;

  useEffect(() => {
    if (!match) return undefined;
    if (!scheduledAt || scheduledAt <= Date.now()) {
      setUnlocked(true);
      return undefined;
    }
    setUnlocked(false);
    const ms = scheduledAt - Date.now();
    const t = setTimeout(() => setUnlocked(true), ms);
    return () => clearTimeout(t);
  }, [match, scheduledAt]);

  // Only subscribe + join once unlocked.
  useEffect(() => {
    if (!match || !unlocked) return undefined;
    setStartedAt(Date.now());
    const unsubscribe = api.subscribeToChat(matchId, (partnerMsg) => {
      setMessages((m) => [...m, partnerMsg]);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [match, unlocked, matchId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const { mmss, progress, urgent, expired } = useCountdown(unlocked ? startedAt : null, 120);

  const send = (emojiEntry) => {
    if (!unlocked || expired) return;
    const optimistic = {
      id: `tmp_${Date.now()}`,
      sender: 'me',
      emoji: emojiEntry.char,
      at: Date.now(),
      pending: true,
    };
    setMessages((m) => [...m, optimistic]);
    api.sendMessage(matchId, emojiEntry.char).then((confirmed) => {
      setMessages((m) =>
        m.map((x) => (x.id === optimistic.id ? { ...confirmed, pending: false } : x)),
      );
    });
  };

  const onPaySuccess = async () => {
    setPayOpen(false);
    await api.payExtend(matchId);
    setStartedAt(Date.now());
  };

  if (match === undefined) {
    return (
      <div className="w-full min-h-[100dvh] md:min-h-[760px] flex items-center justify-center bg-cream">
        <span className="display-italic text-ink-mute text-2xl">loading…</span>
      </div>
    );
  }

  if (match === null) {
    return (
      <div className="w-full min-h-[100dvh] md:min-h-[760px] flex items-center justify-center bg-cream text-center px-6">
        <div>
          <div className="text-[64px]" aria-hidden="true">
            💨
          </div>
          <h2 className="display-italic text-[28px] text-ink mt-2">That date evaporated</h2>
          <p className="mt-2 text-ink-soft text-sm">Match not found or already ended.</p>
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="mt-5 px-5 py-3 rounded-2xl bg-ink text-cream font-semibold focus-pink"
          >
            Back to feed
          </button>
        </div>
      </div>
    );
  }

  const partner = match.candidate;

  if (!unlocked) {
    return (
      <WaitingRoom
        partner={partner}
        scheduledAt={scheduledAt}
        onBack={() => navigate('/feed')}
      />
    );
  }

  return (
    <div className="relative w-full min-h-[100dvh] md:min-h-[760px] flex flex-col lg:grid lg:grid-cols-[360px_1fr] lg:gap-0 bg-cream overflow-hidden">
      {/* Desktop rail: big timer + big partner. NO back button (lives in column header). */}
      <aside className="hidden lg:flex flex-col items-center justify-between p-8 bg-gradient-to-b from-paper to-cream-deep/40 border-r border-ink/[0.06]">
        <div className="w-full flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-cream-deep flex items-center justify-center text-[60px] shadow-[var(--shadow-soft)]">
            <span aria-hidden="true">{partner?.emoji}</span>
          </div>
          <div className="mt-3 display-italic text-[28px] text-ink leading-tight">
            {partner?.name}
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-mute font-semibold flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-mint" aria-hidden="true" /> in chat
          </div>
          {partner?.bio && (
            <p className="mt-2 text-[12px] text-ink-mute italic max-w-[260px]">"{partner.bio}"</p>
          )}
        </div>
        <Countdown mmss={mmss} progress={progress} urgent={urgent} expired={expired} size={240} />
        <p className="text-[12px] uppercase tracking-[0.22em] text-ink-mute font-semibold text-center">
          two minutes. make them count.
        </p>
      </aside>

      {/* Right column: header + (mobile timer) + messages + keyboard */}
      <section className="relative flex flex-col flex-1 min-h-0">
        <header className="relative z-10 flex items-center gap-3 px-4 md:px-6 pt-4 pb-3 border-b border-ink/[0.06]">
          <button
            type="button"
            onClick={() => navigate('/feed')}
            aria-label="Back to feed"
            className="w-10 h-10 rounded-full bg-paper border border-ink/10 text-ink text-lg flex items-center justify-center focus-pink"
          >
            ←
          </button>
          <div className="lg:hidden w-11 h-11 rounded-full bg-cream-deep flex items-center justify-center text-[26px]">
            <span aria-hidden="true">{partner?.emoji}</span>
          </div>
          <div className="flex-1 min-w-0 lg:hidden">
            <div className="display-italic text-[20px] text-ink leading-tight truncate">
              {partner?.name}
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-mute font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-mint" aria-hidden="true" /> in chat
            </div>
          </div>
          <div className="hidden lg:block text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
            live match · {partner?.name}
          </div>
        </header>

        {/* Mobile timer anchor */}
        <div className="lg:hidden relative z-10 flex flex-col items-center pt-5 pb-2">
          <Countdown
            mmss={mmss}
            progress={progress}
            urgent={urgent}
            expired={expired}
            size={170}
          />
          <p className="mt-2 text-[12px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
            two minutes. make them count.
          </p>
        </div>

        {/* messages — bubble-less, lane-tinted */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-0 py-2">
          {messages.length === 0 ? (
            <div className="text-center text-ink-mute text-[13px] py-8 px-6">
              throw the first emoji. the rest writes itself.
            </div>
          ) : (
            messages.map((m) => <MessageRow key={m.id} msg={m} />)
          )}
        </div>

        {/* keyboard or extend CTA */}
        {expired ? (
          <ExtendChatCTA onExtend={() => setPayOpen(true)} />
        ) : (
          <EmojiKeyboard onSend={send} disabled={expired} />
        )}
      </section>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onSuccess={onPaySuccess}
        amount="$0.99"
      />
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
        className={`text-[40px] md:text-[44px] leading-none ${msg.pending ? 'opacity-70' : ''}`}
        aria-label={`${mine ? 'you sent' : 'you received'} ${msg.emoji}`}
      >
        {msg.emoji}
      </span>
    </div>
  );
}

// Waiting room — visible while now < scheduledAt. The chat surface (keyboard,
// timer, chat:join) only activates when the scheduled time arrives.
function WaitingRoom({ partner, scheduledAt, onBack }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const remainingMs = Math.max(0, scheduledAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const days = Math.floor(remainingSec / 86400);
  const hours = Math.floor((remainingSec % 86400) / 3600);
  const minutes = Math.floor((remainingSec % 3600) / 60);
  const seconds = remainingSec % 60;

  const long = remainingSec >= 3600;
  const pad = (n) => String(n).padStart(2, '0');
  const compact = long
    ? `${days > 0 ? `${days}d ` : ''}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  const when = new Date(scheduledAt);
  const whenLabel = when.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="relative w-full min-h-[100dvh] md:min-h-[760px] flex flex-col items-center justify-center text-center bg-cream paper-grain px-6 py-10">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to feed"
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-paper border border-ink/10 text-ink text-lg flex items-center justify-center focus-pink"
      >
        ←
      </button>

      <div className="text-[11px] uppercase tracking-[0.28em] text-ink-mute font-semibold">
        chat locked until
      </div>
      <div className="display-italic text-[22px] text-ink mt-2">{whenLabel}</div>

      <div className="mt-6 w-[200px] h-[200px] md:w-[240px] md:h-[240px] rounded-full bg-paper border border-ink/10 shadow-[var(--shadow-card)] flex flex-col items-center justify-center paper-grain relative">
        <div className="text-[10px] uppercase tracking-[0.24em] text-ink-mute font-semibold">
          starts in
        </div>
        <div
          className="display-italic text-ink leading-none mt-1"
          style={{ fontSize: long ? 36 : 56 }}
        >
          {compact}
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-mute font-semibold mt-2">
          {long ? `${days > 0 ? 'days·' : ''}h·m·s` : 'm:s'}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-cream-deep flex items-center justify-center text-[32px]">
          <span aria-hidden="true">{partner?.emoji || '💌'}</span>
        </div>
        <div className="text-left">
          <div className="display-italic text-[22px] text-ink leading-tight">
            {partner?.name || 'Match'}
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-mute font-semibold">
            waiting for the moment
          </div>
        </div>
      </div>

      <p className="mt-6 text-[13px] text-ink-soft max-w-[320px]">
        The keyboard, the timer and the actual session unlock exactly when the clock hits zero.
        Come back early if you must — the door won't open a second sooner.
      </p>

      <button
        type="button"
        onClick={onBack}
        className="mt-8 px-5 py-3 rounded-2xl bg-cream-deep text-ink font-semibold focus-pink"
      >
        Back to feed
      </button>
    </div>
  );
}
