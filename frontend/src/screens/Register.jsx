import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chip from '../components/Chip';
import EmojiPicker from '../components/EmojiPicker';
import FloatingEmoji from '../components/FloatingEmoji';
import { INTERESTS } from '../constants/interests';

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [interest, setInterest] = useState('');
  const [emoji, setEmoji] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const emailValid = !email || emailRx.test(email);
  const allValid = name.trim().length >= 2 && emailRx.test(email) && interest && emoji;

  const submit = (e) => {
    e.preventDefault();
    if (!allValid) return;
    try {
      sessionStorage.setItem(
        'matchmoji:profile',
        JSON.stringify({ name, email, interest, emoji }),
      );
    } catch {}
    navigate('/');
  };

  return (
    <div className="relative w-full h-full overflow-y-auto bg-cream paper-grain">
      <FloatingEmoji count={7} palette={['💗', '🔥', '🍑', '✨', '💋', '🫦', '🪩']} />

      <form
        onSubmit={submit}
        className="relative z-10 max-w-[440px] mx-auto px-5 pt-10 pb-32"
        noValidate
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ink-mute font-semibold">
          <span className="inline-block w-2 h-2 rounded-full bg-pink" aria-hidden="true" /> nuevo
          perfil
        </div>

        <h1 className="mt-3 display-italic text-[64px] leading-[0.9] text-ink">
          Match<span className="text-pink">moji</span>
          <span
            aria-hidden="true"
            className="inline-block ml-1 align-baseline text-[44px] rotate-[12deg] not-italic"
            style={{ transformOrigin: 'bottom left' }}
          >
            🍑
          </span>
        </h1>
        <p className="mt-3 text-[15px] text-ink-soft leading-snug">
          Solo emojis. Solo 2 minutos. Solo química.
        </p>

        <div className="mt-7 space-y-5">
          <Field label="¿Cómo te llamas?">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              autoComplete="given-name"
              placeholder="Tu nombre"
              className="w-full rounded-2xl bg-paper border border-ink/10 px-4 py-3.5 text-ink text-[17px] font-medium focus-pink"
            />
          </Field>

          <Field
            label="¿Tu email?"
            hint={email && !emailValid && emailTouched ? 'Eso no parece un email' : null}
            error={email && !emailValid && emailTouched}
          >
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="tu@correo.com"
              className={`w-full rounded-2xl bg-paper border px-4 py-3.5 text-ink text-[17px] font-medium focus-pink ${
                email && !emailValid && emailTouched ? 'border-danger' : 'border-ink/10'
              }`}
            />
          </Field>

          <div>
            <Label>¿Qué te gusta?</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip
                  key={i.id}
                  active={interest === i.id}
                  onClick={() => setInterest(i.id)}
                  ariaLabel={`prefiero ${i.label}`}
                >
                  <span aria-hidden="true">{i.emoji}</span> {i.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <Label>Tu emoji firma</Label>
            <p className="mt-1 text-[12px] text-ink-mute">
              será tu identidad en la app. elige con cariño.
            </p>
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                aria-label={emoji ? `cambiar emoji firma (actual ${emoji})` : 'elegir emoji firma'}
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
                    perfecto. <br />
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="underline font-semibold text-ink focus-pink rounded"
                    >
                      cambiar
                    </button>
                  </>
                ) : (
                  <>
                    toca el círculo para <br /> elegir el tuyo
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* sticky CTA */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="max-w-[440px] mx-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)]">
          <button
            type="button"
            onClick={submit}
            disabled={!allValid}
            className="pointer-events-auto w-full py-4 rounded-2xl bg-ink text-cream font-semibold text-[17px] focus-pink shadow-[var(--shadow-pop)] disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-[1px]"
          >
            Empezar a matchear ✨
          </button>
        </div>
      </div>

      <EmojiPicker
        open={pickerOpen}
        value={emoji}
        onChange={setEmoji}
        onClose={() => setPickerOpen(false)}
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
