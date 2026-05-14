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
  const scrollRef = useRef(null);

  useEffect(() => {
    api.getMatch(matchId).then((m) => setMatch(m || null));
  }, [matchId]);

  useEffect(() => {
    if (!match) return undefined;
    const unsubscribe = api.subscribeToChat(matchId, (partnerMsg) => {
      setMessages((m) => [...m, partnerMsg]);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [match, matchId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const { mmss, progress, urgent, expired } = useCountdown(startedAt, 120);

  const send = (emojiEntry) => {
    if (expired) return;
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

  const onPaySuccess = () => {
    setPayOpen(false);
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

  return (
    <div className="relative w-full min-h-[100dvh] md:min-h-[760px] flex flex-col lg:grid lg:grid-cols-[360px_1fr] lg:gap-0 bg-cream overflow-hidden">
      {/* Desktop rail: partner + timer */}
      <aside className="hidden lg:flex flex-col items-center justify-between p-8 bg-gradient-to-b from-paper to-cream-deep/40 border-r border-ink/[0.06]">
        <div className="w-full flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/feed')}
            aria-label="Back to feed"
            className="w-10 h-10 rounded-full bg-paper border border-ink/10 text-ink text-lg flex items-center justify-center focus-pink"
          >
            ←
          </button>
          <div className="w-11 h-11 rounded-full bg-cream-deep flex items-center justify-center text-[26px]">
            <span aria-hidden="true">{partner?.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="display-italic text-[20px] text-ink leading-tight truncate">
              {partner?.name}
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-mute font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-mint" aria-hidden="true" /> in chat
            </div>
          </div>
        </div>
        <Countdown mmss={mmss} progress={progress} urgent={urgent} expired={expired} size={240} />
        <p className="text-[12px] uppercase tracking-[0.22em] text-ink-mute font-semibold text-center">
          two minutes. make them count.
        </p>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden relative z-10 flex items-center gap-3 px-4 pt-4 pb-3 border-b border-ink/[0.06]">
        <button
          type="button"
          onClick={() => navigate('/feed')}
          aria-label="Back to feed"
          className="w-10 h-10 rounded-full bg-paper border border-ink/10 text-ink text-lg flex items-center justify-center focus-pink"
        >
          ←
        </button>
        <div className="w-11 h-11 rounded-full bg-cream-deep flex items-center justify-center text-[26px]">
          <span aria-hidden="true">{partner?.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="display-italic text-[20px] text-ink leading-tight truncate">
            {partner?.name}
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-mute font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-mint" aria-hidden="true" /> in chat
          </div>
        </div>
      </header>

      {/* Chat column */}
      <section className="relative flex flex-col flex-1 min-h-0">
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
