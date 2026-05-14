import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Countdown from '../components/Countdown';
import EmojiKeyboard from '../components/EmojiKeyboard';
import ExtendChatCTA from '../components/ExtendChatCTA';
import PaymentModal from '../components/PaymentModal';
import { useCountdown } from '../hooks/useCountdown';
import { api, mockApi } from '../api/client';

export default function Chat() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(undefined); // undefined = loading, null = not found
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [messages, setMessages] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const scrollRef = useRef(null);
  const partnerTriggered = useRef(false);

  useEffect(() => {
    api.getMatch(matchId).then((m) => setMatch(m || null));
  }, [matchId]);

  // Partner sends a hello ~9s in.
  useEffect(() => {
    if (!match) return undefined;
    if (partnerTriggered.current) return undefined;
    partnerTriggered.current = true;
    const t = setTimeout(() => {
      const msg = mockApi.receivePartnerMessage(matchId, '👋');
      setMessages((m) => [...m, msg]);
    }, 9000);
    return () => clearTimeout(t);
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
    partnerTriggered.current = false;
  };

  if (match === undefined) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-cream">
        <span className="display-italic text-ink-mute text-2xl">cargando…</span>
      </div>
    );
  }

  if (match === null) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-cream text-center px-6">
        <div>
          <div className="text-[64px]" aria-hidden="true">
            💨
          </div>
          <h2 className="display-italic text-[28px] text-ink mt-2">Esa cita se evaporó</h2>
          <p className="mt-2 text-ink-soft text-sm">El match no existe o ya terminó.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-5 px-5 py-3 rounded-2xl bg-ink text-cream font-semibold focus-pink"
          >
            Volver al feed
          </button>
        </div>
      </div>
    );
  }

  const partner = match.candidate;

  return (
    <div className="relative w-full h-full flex flex-col bg-cream overflow-hidden">
      {/* header */}
      <header className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-3 border-b border-ink/[0.06]">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Volver al feed"
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
            <span className="w-1.5 h-1.5 rounded-full bg-mint" aria-hidden="true" /> en chat
          </div>
        </div>
      </header>

      {/* timer anchor */}
      <div className="relative z-10 flex flex-col items-center pt-5 pb-2">
        <Countdown mmss={mmss} progress={progress} urgent={urgent} expired={expired} size={170} />
        <p className="mt-2 text-[12px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
          2 minutos. que cuenten.
        </p>
      </div>

      {/* messages — bubble-less, lane-tinted */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-0 py-2">
        {messages.length === 0 ? (
          <div className="text-center text-ink-mute text-[13px] py-8 px-6">
            tira el primer emoji. lo demás se cuenta solo.
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
      } border-b border-dotted border-ink/10 px-5 py-2.5 animate-[fade-up_0.18s_ease-out]`}
    >
      <span
        className={`text-[44px] leading-none ${msg.pending ? 'opacity-70' : ''}`}
        aria-label={`${mine ? 'enviaste' : 'recibiste'} ${msg.emoji}`}
      >
        {msg.emoji}
      </span>
    </div>
  );
}
