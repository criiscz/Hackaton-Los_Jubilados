import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import ScheduleModal from '../components/ScheduleModal';
import { api, DEMO_PROFILE } from '../api/client';

export default function Feed() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [idx, setIdx] = useState(0);
  const [jiggling, setJiggling] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduled, setScheduled] = useState([]);

  useEffect(() => {
    let saved = null;
    try {
      const raw = sessionStorage.getItem('matchmoji:profile');
      if (raw) saved = JSON.parse(raw);
    } catch {}
    if (!saved) {
      saved = { ...DEMO_PROFILE };
      try {
        sessionStorage.setItem('matchmoji:profile', JSON.stringify(saved));
        sessionStorage.setItem('matchmoji:demo', '1');
      } catch {}
    }
    setProfile(saved);
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
    const match = await api.scheduleMatch({
      candidateId: current.id,
      when: when?.toISOString?.() || when,
    });
    setScheduled((s) => [...s, match]);
    advance();
  };

  return (
    <div className="relative w-full min-h-[100dvh] md:min-h-[760px] flex flex-col lg:grid lg:grid-cols-[1fr_320px] lg:gap-0 bg-cream overflow-hidden">
      {/* main column */}
      <section className="relative flex flex-col flex-1 min-h-0">
        {/* top strip */}
        <header className="relative z-10 px-5 md:px-8 pt-6 pb-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
              hi
            </div>
            <div className="display-italic text-[26px] md:text-[30px] text-ink leading-tight">
              {profile?.name || 'you'}{' '}
              <span aria-hidden="true" className="not-italic">
                {profile?.emoji || '✨'}
              </span>
            </div>
          </div>
          <div className="lg:hidden">
            <ScheduledStack scheduled={scheduled} onOpen={(m) => navigate(`/chat/${m.id}`)} />
          </div>
        </header>

        {/* card stack */}
        <main className="relative flex flex-col items-center justify-center px-5 pt-2 pb-[210px] md:pb-[180px] flex-1">
          {!current ? (
            <EmptyState />
          ) : (
            <div className="relative w-full max-w-[340px] md:max-w-[380px] mx-auto">
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
          <div className="absolute bottom-0 left-0 right-0 z-20 pb-[max(env(safe-area-inset-bottom),22px)] pt-4 lg:pr-[320px]">
            <div className="flex items-center justify-center gap-7">
              <ActionButton
                variant="pass"
                ariaLabel="Pass"
                onClick={onPass}
                symbol="✖"
                hint="pass"
              />
              <ActionButton
                variant="match"
                ariaLabel="Match with this person"
                onClick={onMatch}
                symbol="💗"
                hint="match"
              />
            </div>
          </div>
        )}
      </section>

      {/* desktop side rail */}
      <aside className="hidden lg:flex flex-col gap-4 p-6 border-l border-ink/[0.06] bg-gradient-to-b from-paper to-cream">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
            your dates
          </div>
          <h3 className="display-italic text-[22px] text-ink leading-tight">Coming up</h3>
        </div>
        <ScheduledList scheduled={scheduled} onOpen={(m) => navigate(`/chat/${m.id}`)} />
        <div className="mt-auto rounded-2xl bg-cream-deep/70 p-4 paper-grain relative">
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
            how it works
          </div>
          <ol className="mt-2 space-y-1.5 text-[13px] text-ink-soft list-decimal pl-4">
            <li>Swipe or tap to match.</li>
            <li>Pick a time. 2 minutes only.</li>
            <li>Chat in emojis. Pay to extend.</li>
          </ol>
        </div>
      </aside>

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
      <h2 className="display-italic text-[28px] text-ink leading-tight mt-2">No one for now</h2>
      <p className="mt-2 text-[14px] text-ink-soft">
        Come back later — the universe is loading spicy picks.
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
          next
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
        className={`w-[76px] h-[76px] md:w-[84px] md:h-[84px] rounded-full flex items-center justify-center text-[34px] md:text-[38px] focus-pink active:translate-y-[2px] border border-ink/10 ${styles}`}
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
      aria-label="Open next scheduled chat"
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
        {scheduled.length} {scheduled.length === 1 ? 'date' : 'dates'}
      </span>
    </button>
  );
}

function ScheduledList({ scheduled, onOpen }) {
  if (!scheduled?.length) {
    return (
      <p className="text-[13px] text-ink-mute">
        Match with someone to schedule your first 2-minute chat.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {scheduled.map((m) => {
        const when = m.when ? new Date(m.when) : null;
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onOpen(m)}
              aria-label={`Open chat with ${m.candidate?.name}`}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-paper border border-ink/10 hover:border-pink/40 focus-pink text-left transition-colors"
            >
              <span
                aria-hidden="true"
                className="w-11 h-11 rounded-full bg-cream-deep flex items-center justify-center text-[22px]"
              >
                {m.candidate?.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="display-italic text-[18px] text-ink leading-tight truncate">
                  {m.candidate?.name}
                </div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-ink-mute font-semibold">
                  {when
                    ? when.toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'soon'}
                </div>
              </div>
              <span aria-hidden="true" className="text-ink-mute">
                →
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
