import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chip from '../components/Chip';
import EmojiPicker from '../components/EmojiPicker';
import FloatingEmoji from '../components/FloatingEmoji';
import CursedDatePicker from '../components/CursedDatePicker';
import { INTERESTS } from '../constants/interests';
import { wsApi } from '../api/client';

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ageFromIso(iso) {
  if (!iso) return null;
  const dob = new Date(iso + 'T00:00:00');
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

function prettyDob(iso) {
  if (!iso) return null;
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [interest, setInterest] = useState('');
  const [dob, setDob] = useState('');
  const [emoji, setEmoji] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dobOpen, setDobOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const emailValid = !email || emailRx.test(email);
  const age = ageFromIso(dob);
  const dobValid = age !== null && age >= 18 && age <= 120;
  const allValid =
    name.trim().length >= 2 && emailRx.test(email) && interest && emoji && dobValid;

  const submit = async (e) => {
    e && e.preventDefault();
    if (!allValid || submitting) return;
    setSubmitError(null);
    setSubmitting(true);

    // Deterministic stub password (the form does not collect one; backend
    // expects ≥8 chars). Tied to email so re-registration is idempotent.
    const password = `mm_${btoa(email).slice(0, 14)}`;
    const description = `${INTERESTS.find((i) => i.id === interest)?.label || interest} · ${emoji}`;

    let backendUser = null;
    try {
      const res = await wsApi.register({
        email,
        password,
        name,
        description,
        profileEmoji: emoji,
      });
      backendUser = res.user || null;
    } catch (err) {
      // Backend may reject (duplicate email, offline, etc.) — surface in UI
      // and still let the user enter the app with a local profile.
      setSubmitError(err.message || 'Backend rejected the signup.');
    }

    try {
      sessionStorage.setItem(
        'matchmoji:profile',
        JSON.stringify({
          id: backendUser?.id || backendUser?._id || `local_${Date.now()}`,
          name,
          email,
          interest,
          dob,
          emoji,
        }),
      );
      sessionStorage.removeItem('matchmoji:demo');
    } catch {}

    setSubmitting(false);
    navigate('/feed');
  };

  return (
    <div className="relative w-full min-h-[100dvh] md:min-h-[760px] overflow-y-auto bg-cream paper-grain lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-0">
      <FloatingEmoji count={7} palette={['💗', '🔥', '🍑', '✨', '💋', '🫦', '🪩']} />

      {/* Hero panel — visible lg+ on the left */}
      <aside className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-pink/8 via-coral/8 to-sunset/10 border-r border-ink/[0.06] relative z-10">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-ink-mute font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-pink" aria-hidden="true" /> new
            profile
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
            Emojis only. Two minutes. Pure chemistry.
          </p>
          <ul className="mt-6 space-y-3 text-[15px] text-ink-soft">
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5">✨</span> Sign up in under 30 seconds.
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5">🔥</span> Pick a signature emoji — your
              face in the app.
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5">⏳</span> Match, schedule, chat for 120s.
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="self-start text-[13px] font-semibold text-ink/80 underline decoration-pink decoration-2 underline-offset-4 focus-pink rounded"
        >
          ← back to demo
        </button>
      </aside>

      {/* Form panel */}
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-[460px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-32 lg:pt-16 lg:pb-24 lg:max-w-[520px]"
        noValidate
      >
        {/* mobile-only header strip */}
        <div className="lg:hidden flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ink-mute font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-pink" aria-hidden="true" /> new
            profile
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Back to the demo"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink/80 underline decoration-pink decoration-2 underline-offset-4 focus-pink rounded"
          >
            ← demo
          </button>
        </div>

        <h1 className="lg:hidden mt-3 display-italic text-[60px] md:text-[68px] leading-[0.9] text-ink">
          Match<span className="text-pink">moji</span>
          <span
            aria-hidden="true"
            className="inline-block ml-1 align-baseline text-[44px] rotate-[12deg] not-italic"
            style={{ transformOrigin: 'bottom left' }}
          >
            🍑
          </span>
        </h1>
        <p className="lg:hidden mt-3 text-[15px] text-ink-soft leading-snug">
          Emojis only. Two minutes. Pure chemistry.
        </p>

        <div className="hidden lg:flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ink-mute font-semibold">
          <span className="inline-block w-2 h-2 rounded-full bg-pink" aria-hidden="true" /> create
          your profile
        </div>
        <h2 className="hidden lg:block mt-3 display-italic text-[36px] text-ink leading-tight">
          Tell us who <span className="text-pink">you are</span>.
        </h2>

        <div className="mt-7 space-y-5">
          <Field label="Your name?">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              autoComplete="given-name"
              placeholder="Your name"
              className="w-full rounded-2xl bg-paper border border-ink/10 px-4 py-3.5 text-ink text-[17px] font-medium focus-pink"
            />
          </Field>

          <Field
            label="Your email?"
            hint={email && !emailValid && emailTouched ? "That doesn't look like an email" : null}
            error={email && !emailValid && emailTouched}
          >
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="you@email.com"
              className={`w-full rounded-2xl bg-paper border px-4 py-3.5 text-ink text-[17px] font-medium focus-pink ${
                email && !emailValid && emailTouched ? 'border-danger' : 'border-ink/10'
              }`}
            />
          </Field>

          <div>
            <Label>Who interests you?</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip
                  key={i.id}
                  active={interest === i.id}
                  onClick={() => setInterest(i.id)}
                  ariaLabel={`into ${i.label}`}
                >
                  <span aria-hidden="true">{i.emoji}</span> {i.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <Label>Date of birth</Label>
            <p className="mt-1 text-[12px] text-ink-mute">
              must be 18+. picker is, uh… an experience.
            </p>
            <button
              type="button"
              onClick={() => setDobOpen(true)}
              aria-label={dob ? `change date of birth (current ${prettyDob(dob)})` : 'open date of birth picker'}
              className={`mt-2 w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left focus-pink transition-colors ${
                dob ? 'bg-cream-deep border-pink/30' : 'bg-paper border-ink/10 hover:border-ink/30'
              }`}
            >
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="text-[26px]">
                  🗓️
                </span>
                <span>
                  {dob ? (
                    <>
                      <span className="block display-italic text-[18px] text-ink leading-tight">
                        {prettyDob(dob)}
                      </span>
                      <span className="block text-[11px] uppercase tracking-[0.18em] text-ink-mute font-semibold">
                        you are {age} · {age >= 18 ? 'cleared' : 'too young'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block display-italic text-[18px] text-ink leading-tight">
                        Open Calendar Hell™
                      </span>
                      <span className="block text-[11px] uppercase tracking-[0.18em] text-ink-mute font-semibold">
                        one click per month · enjoy
                      </span>
                    </>
                  )}
                </span>
              </span>
              <span aria-hidden="true" className="text-ink-mute">
                →
              </span>
            </button>
            {dob && !dobValid && (
              <span className="mt-1.5 block text-[12px] font-semibold text-danger">
                {age !== null && age < 18
                  ? "You must be at least 18."
                  : "That date doesn't add up."}
              </span>
            )}
          </div>

          <div>
            <Label>Your signature emoji</Label>
            <p className="mt-1 text-[12px] text-ink-mute">
              this is your identity in the app. pick with love.
            </p>
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                aria-label={
                  emoji ? `change signature emoji (current ${emoji})` : 'pick signature emoji'
                }
                className={`w-[96px] h-[96px] rounded-full flex items-center justify-center text-[54px] focus-pink transition-transform active:scale-95 ${
                  emoji
                    ? 'bg-cream-deep shadow-[var(--shadow-card)] ring-2 ring-pink/30'
                    : 'bg-paper border-2 border-dashed border-ink/20 text-ink-mute text-[28px]'
                }`}
              >
                {emoji || '+'}
              </button>
              <div className="text-[13px] text-ink-soft">
                {emoji ? (
                  <>
                    perfect. <br />
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="underline font-semibold text-ink focus-pink rounded"
                    >
                      change
                    </button>
                  </>
                ) : (
                  <>
                    tap the circle to <br /> pick yours
                  </>
                )}
              </div>
            </div>
          </div>

          {submitError && (
            <div role="alert" className="text-[12px] font-semibold text-coral">
              {submitError} (entering the app with a local profile.)
            </div>
          )}

          {/* CTA on desktop is inline; on mobile we use a sticky bar */}
          <div className="hidden lg:flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={submit}
              disabled={!allValid || submitting}
              className="flex-1 py-4 rounded-2xl bg-ink text-cream font-semibold text-[17px] focus-pink shadow-[var(--shadow-pop)] disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-[1px]"
            >
              {submitting ? 'Registering…' : 'Start matching ✨'}
            </button>
          </div>
        </div>
      </form>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="max-w-[460px] mx-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)]">
          <button
            type="button"
            onClick={submit}
            disabled={!allValid || submitting}
            className="pointer-events-auto w-full py-4 rounded-2xl bg-ink text-cream font-semibold text-[17px] focus-pink shadow-[var(--shadow-pop)] disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-[1px]"
          >
            {submitting ? 'Registering…' : 'Start matching ✨'}
          </button>
        </div>
      </div>

      <EmojiPicker
        open={pickerOpen}
        value={emoji}
        onChange={setEmoji}
        onClose={() => setPickerOpen(false)}
      />

      <CursedDatePicker
        open={dobOpen}
        value={dob}
        onChange={setDob}
        onClose={() => setDobOpen(false)}
      />
    </div>
  );
}

function Label({ children }) {
  return (
    <span className="text-[11px] uppercase tracking-[0.18em] text-ink-mute font-semibold">
      {children}
    </span>
  );
}

function Field({ label, children, hint, error }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <span
          className={`block mt-1.5 text-[12px] font-semibold ${
            error ? 'text-danger' : 'text-ink-mute'
          }`}
        >
          {hint}
        </span>
      )}
    </label>
  );
}
