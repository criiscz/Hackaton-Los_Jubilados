import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import ScheduleModal from '../components/ScheduleModal';
import { api } from '../api/client';

export default function Feed() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [idx, setIdx] = useState(0);
  const [jiggling, setJiggling] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduled, setScheduled] = useState([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('matchmoji:profile');
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
    api.getCandidates().then(setCandidates);
    api.getScheduled().then(setScheduled);
  }, []);

  const current = candidates[idx];
  const next = candidates[idx + 1];

  const advance = () => setIdx((i) => i + 1);

  const onPass = () => advance();

  const onMatch = () => {
    setJiggling(true);
    setTimeout(() => {
      setJiggling(false);
      setScheduleOpen(true);
    }, 600);
  };

  const onSchedule = async (when) => {
    if (!current) return;
    setScheduleOpen(false);
    const match = await api.scheduleMatch({ candidateId: current.id, when: when?.toISOString?.() || when });
    setScheduled((s) => [...s, match]);
    advance();
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-cream">
      {/* top strip */}
      <header className="relative z-10 px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
            hola
          </div>
          <div className="display-italic text-[26px] text-ink leading-tight">
            {profile?.name || 'tú'}{' '}
            <span aria-hidden="true" className="not-italic">
              {profile?.emoji || '✨'}
            </span>
          </div>
        </div>
        <ScheduledStack scheduled={scheduled} onOpen={(m) => navigate(`/chat/${m.id}`)} />
      </header>

      {/* card stack */}
      <main className="relative flex flex-col items-center justify-center px-5 pt-2 pb-[210px] h-[calc(100%-72px)]">
        {!current ? (
          <EmptyState />
        ) : (
          <div className="relative w-full max-w-[340px] mx-auto">
            {next && (
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 translate-y-3 rotate-[-4deg] opacity-90 pointer-events-none"
                style={{ filter: 'blur(0.5px)' }}
              >
                <GhostCard candidate={next} />
              </div>
            )}
            <MatchCard
              key={current.id}
              candidate={current}
              index={idx}
              jiggling={jiggling}
              onSwipeLeft={onPass}
              onSwipeRight={onMatch}
            />
          </div>
        )}
      </main>

      {/* action bar */}
      {current && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-[max(env(safe-area-inset-bottom),22px)] pt-4">
          <div className="flex items-center justify-center gap-7">
            <ActionButton
              variant="pass"
              ariaLabel="No, paso"
              onClick={onPass}
              symbol="✖"
              hint="paso"
            />
            <ActionButton
              variant="match"
              ariaLabel="Match con esta persona"
              onClick={onMatch}
              symbol="💗"
              hint="match"
            />
          </div>
        </div>
      )}

      <ScheduleModal
        open={scheduleOpen}
        candidate={current}
        onClose={() => setScheduleOpen(false)}
        onConfirm={onSchedule}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center max-w-[280px] mx-auto py-12">
      <div className="text-[72px]" aria-hidden="true">
        🌵
      </div>
      <h2 className="display-italic text-[28px] text-ink leading-tight mt-2">
        Nadie por ahora
      </h2>
      <p className="mt-2 text-[14px] text-ink-soft">
        Vuelve más tarde — el universo está cargando candidatos picantes.
      </p>
    </div>
  );
}

function GhostCard({ candidate }) {
  return (
    <div className="w-full bg-paper rounded-[28px] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="dotted-seam" aria-hidden="true" />
      <div className="px-6 pt-6 pb-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
          siguiente
        </div>
        <div className="mt-3 flex items-center justify-center text-[100px] leading-none h-[180px]">
          {candidate.emoji}
        </div>
        <div className="text-center display-italic text-[28px] text-ink">{candidate.name}</div>
      </div>
    </div>
  );
}

function ActionButton({ variant, ariaLabel, onClick, symbol, hint }) {
  const styles =
    variant === 'match'
      ? 'bg-mint text-ink shadow-[0_18px_30px_-12px_rgba(111,224,184,0.65)]'
      : 'bg-coral text-ink shadow-[0_18px_30px_-12px_rgba(255,122,107,0.55)]';
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={`w-[76px] h-[76px] rounded-full flex items-center justify-center text-[34px] focus-pink active:translate-y-[2px] border border-ink/10 ${styles}`}
      >
        <span aria-hidden="true">{symbol}</span>
      </button>
      <span className="text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
        {hint}
      </span>
    </div>
  );
}

function ScheduledStack({ scheduled, onOpen }) {
  if (!scheduled?.length) return null;
  const visible = scheduled.slice(-3);
  return (
    <button
      type="button"
      onClick={() => visible[visible.length - 1] && onOpen(visible[visible.length - 1])}
      aria-label="Ir al próximo chat agendado"
      className="flex items-center gap-2 bg-paper border border-ink/10 rounded-full pl-2 pr-3 py-1.5 focus-pink shadow-[var(--shadow-soft)]"
    >
      <span className="flex -space-x-2.5" aria-hidden="true">
        {visible.map((m, i) => (
          <span
            key={m.id}
            className="w-7 h-7 rounded-full bg-cream-deep border-2 border-paper flex items-center justify-center text-[14px]"
            style={{ zIndex: i + 1 }}
          >
            {m.candidate?.emoji || '💌'}
          </span>
        ))}
      </span>
      <span className="text-[11px] uppercase tracking-[0.18em] text-ink font-semibold">
        {scheduled.length} citas
      </span>
    </button>
  );
}
