import React, { useEffect, useMemo, useRef, useState } from 'react';

// "Calendar Hell" — a faithful port of GoulartNogueira/BadUI's calendar-hell
// (https://github.com/GoulartNogueira/BadUI/tree/master/calendar-hell).
//
// The cursed rules:
//   1. Year is a <select> whose options are years 1900–2099 spelled out in
//      English ("nineteen ninety-five"). No numerals. No typing.
//   2. Month is a <input type="range"> slider with values 0–11. No dropdown.
//   3. There are four nav buttons around the slider:
//        ⏮ First — jump to January 1900.
//        ◀ Prev  — rotates the WEEKDAY COLUMN HEADERS backward by 6 (which is
//                  +1 mod 7).
//        ▶ Next  — rotates the weekday column headers forward by 1.
//        ⏭ Last  — jump to December 2099.
//      Prev and Next never actually change the month. Both shift the header
//      labels in the same direction. The user is gaslit.
//   4. The day cells stay in their real calendar positions; only the column
//      LABELS rotate. Picking the right day requires ignoring the labels.
//
// We still let users finish: after 25 clicks an escape link appears that
// swaps in a plain <input type="date">. 18+ validation lives in Register.

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ONES = ['', 'one','two','three','four','five','six','seven','eight','nine'];
const TEENS = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['', '','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

const TAUNTS = [
  'one click closer.',
  'are we there yet?',
  'this is the picker now.',
  'somebody designed this on purpose.',
  'time is a flat circle ◯',
  'try not to cry.',
  'days unmoved. labels stirred.',
];

function twoDigit(n) {
  if (n === 0) return '';
  if (n < 10) return 'oh ' + ONES[n];
  if (n < 20) return TEENS[n - 10];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : TENS[t] + '-' + ONES[o];
}

function yearToWords(y) {
  if (y >= 1900 && y <= 1999) {
    const rest = twoDigit(y - 1900);
    return rest ? 'nineteen ' + rest : 'nineteen hundred';
  }
  if (y >= 2000 && y <= 2009) {
    const o = y - 2000;
    return o === 0 ? 'two thousand' : 'two thousand ' + ONES[o];
  }
  if (y >= 2010 && y <= 2099) {
    return 'twenty ' + twoDigit(y - 2000);
  }
  return String(y);
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function firstWeekday(y, m) {
  return new Date(y, m, 1).getDay();
}
function pad(n) {
  return String(n).padStart(2, '0');
}

export default function CursedDatePicker({ open, value, onChange, onClose }) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [offset, setOffset] = useState(0); // weekday-column rotation (BadUI's gimmick)
  const [selected, setSelected] = useState(() => (value ? new Date(value + 'T00:00:00') : null));
  const [clicks, setClicks] = useState(0);
  const [taunt, setTaunt] = useState(TAUNTS[0]);
  const [escape, setEscape] = useState(false);

  // Reset when reopening.
  useEffect(() => {
    if (open) {
      setYear(today.getFullYear());
      setMonth(today.getMonth());
      setOffset(0);
      setClicks(0);
      setTaunt(TAUNTS[0]);
      setEscape(false);
      setSelected(value ? new Date(value + 'T00:00:00') : null);
    }
  }, [open, value, today]);

  const yearOptions = useMemo(() => {
    const arr = [];
    for (let y = 1900; y <= 2099; y++) arr.push(y);
    return arr;
  }, []);

  if (!open) return null;

  const bumpClicks = () => {
    setClicks((c) => c + 1);
    setTaunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
  };

  const onFirst = () => {
    setYear(1900);
    setMonth(0);
    bumpClicks();
  };
  const onLast = () => {
    setYear(2099);
    setMonth(11);
    bumpClicks();
  };
  // Per the BadUI source: prev rotates labels back 6 (= +1), next rotates +1.
  // Both shift labels in the same direction. Days are unaffected.
  const onPrev = () => {
    setOffset((o) => (o + 7 - 6) % 7);
    bumpClicks();
  };
  const onNext = () => {
    setOffset((o) => (o + 1) % 7);
    bumpClicks();
  };

  const labels = WEEKDAYS.map((_, i) => WEEKDAYS[(i + offset) % 7]);
  const days = daysInMonth(year, month);
  const first = firstWeekday(year, month);

  const isFutureMonth =
    year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());

  const confirm = () => {
    if (!selected) return;
    const iso = `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}`;
    onChange(iso);
    onClose && onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Calendar Hell date picker"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/45 backdrop-blur-sm animate-[fade-up_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full md:max-w-[460px] bg-paper rounded-t-[28px] md:rounded-[28px] p-6 shadow-[var(--shadow-card)] animate-[sheet-up_0.32s_cubic-bezier(0.2,0.9,0.3,1.2)] paper-grain"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
              date of birth · /r/badUIbattles
            </div>
            <h3 className="display-italic text-[30px] leading-[0.95] text-ink mt-1">
              Calendar <span className="text-pink">Hell™</span>
            </h3>
            <p className="text-[12px] text-ink-soft mt-1 italic">{taunt}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calendar"
            className="w-10 h-10 rounded-full bg-cream-deep text-ink text-lg leading-none focus-pink"
          >
            ✕
          </button>
        </div>

        {!escape ? (
          <>
            {/* Year: spelled-out English dropdown */}
            <label className="block mt-4">
              <span className="text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
                year
              </span>
              <select
                value={year}
                onChange={(e) => {
                  setYear(Number(e.target.value));
                  bumpClicks();
                }}
                aria-label="select year (spelled out)"
                className="mt-1 w-full rounded-2xl bg-cream border border-ink/10 px-4 py-3 text-ink text-[16px] font-medium focus-pink capitalize"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {yearToWords(y)}
                  </option>
                ))}
              </select>
            </label>

            {/* Month: slider with four nav buttons */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
                  month · slide it
                </span>
                <span className="display-italic text-[18px] text-ink">{MONTHS[month]}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <NavBtn label="jump to january 1900" onClick={onFirst} glyph="⏮" />
                <NavBtn label="rotate weekday headers backward (not the month, sorry)" onClick={onPrev} glyph="◀" />
                <input
                  type="range"
                  min={0}
                  max={11}
                  step={1}
                  value={month}
                  aria-label="month slider"
                  onChange={(e) => {
                    setMonth(Number(e.target.value));
                    bumpClicks();
                  }}
                  className="flex-1 accent-pink h-8"
                />
                <NavBtn label="rotate weekday headers forward (also not the month)" onClick={onNext} glyph="▶" />
                <NavBtn label="jump to december 2099" onClick={onLast} glyph="⏭" />
              </div>
            </div>

            {/* counter + picked */}
            <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-ink-mute font-semibold">
              <span>🤡 clicks · {clicks}</span>
              {selected && (
                <span className="text-ink normal-case tracking-normal font-medium">
                  picked:{' '}
                  <span className="display-italic">
                    {selected.toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </span>
              )}
            </div>

            {/* week header — rotated by `offset` */}
            <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] uppercase tracking-[0.18em] text-ink-mute font-semibold text-center">
              {labels.map((w, i) => (
                <div key={i} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            {/* day grid — unaffected by offset on purpose */}
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: first }).map((_, i) => (
                <div key={`b${i}`} aria-hidden="true" />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const d = i + 1;
                const date = new Date(year, month, d);
                const isSel =
                  selected &&
                  selected.getFullYear() === year &&
                  selected.getMonth() === month &&
                  selected.getDate() === d;
                const inFuture = date.getTime() > today.getTime();
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={inFuture}
                    onClick={() => setSelected(date)}
                    aria-label={`select day ${d}`}
                    aria-pressed={Boolean(isSel)}
                    className={`aspect-square rounded-xl text-[15px] font-semibold focus-pink transition-transform active:scale-95 ${
                      isSel
                        ? 'bg-ink text-cream shadow-[var(--shadow-pop)]'
                        : inFuture
                        ? 'bg-cream/60 text-ink-mute/40 cursor-not-allowed'
                        : 'bg-cream text-ink hover:bg-cream-deep'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {isFutureMonth && (
              <p className="mt-3 text-[12px] text-coral font-semibold text-center">
                🛸 future months. cool, but unhelpful.
              </p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-cream-deep text-ink font-semibold focus-pink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!selected}
                className="flex-1 py-3 rounded-2xl bg-ink text-cream font-semibold focus-pink shadow-[var(--shadow-pop)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Lock it in 🗓️
              </button>
            </div>

            {clicks >= 25 && (
              <button
                type="button"
                onClick={() => setEscape(true)}
                className="mt-3 w-full text-center text-[11px] text-ink-mute underline decoration-pink decoration-2 underline-offset-2 focus-pink rounded"
              >
                defeated? type it like a normal person →
              </button>
            )}
          </>
        ) : (
          <div className="mt-5">
            <p className="text-[13px] text-ink-soft italic">
              fine. you win. plain old input below 👇
            </p>
            <input
              type="date"
              max={today.toISOString().slice(0, 10)}
              value={
                selected
                  ? `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(
                      selected.getDate(),
                    )}`
                  : ''
              }
              onChange={(e) => {
                const v = e.target.value;
                setSelected(v ? new Date(v + 'T00:00:00') : null);
              }}
              className="mt-3 w-full rounded-2xl bg-cream border border-ink/10 px-4 py-3.5 text-ink text-[17px] font-medium focus-pink"
            />

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEscape(false)}
                className="flex-1 py-3 rounded-2xl bg-cream-deep text-ink font-semibold focus-pink"
              >
                Back to the chaos
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!selected}
                className="flex-1 py-3 rounded-2xl bg-ink text-cream font-semibold focus-pink shadow-[var(--shadow-pop)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NavBtn({ glyph, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-xl bg-cream-deep text-ink text-[14px] font-bold focus-pink active:translate-y-[1px]"
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}
