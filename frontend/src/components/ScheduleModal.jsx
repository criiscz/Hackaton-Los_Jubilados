import React, { useMemo, useState } from 'react';
import Chip from './Chip';

// Quick chip presets + custom datetime-local for the 2-minute chat schedule.
export default function ScheduleModal({ open, candidate, onClose, onConfirm }) {
  const presets = useMemo(() => {
    const now = new Date();
    const in5 = new Date(now.getTime() + 5 * 60 * 1000);
    const tonight = new Date(now);
    tonight.setHours(21, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);
    return [
      { id: 'in5',     label: 'En 5 min',       date: in5 },
      { id: 'tonight', label: 'Esta noche 21:00', date: tonight },
      { id: 'tomorrow', label: 'Mañana 20:00',  date: tomorrow },
    ];
  }, [open]);

  const [selected, setSelected] = useState('in5');
  const [custom, setCustom] = useState('');

  if (!open) return null;

  const chosen =
    custom && selected === 'custom' ? new Date(custom) : presets.find((p) => p.id === selected)?.date;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Programar cita de 2 minutos"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/45 backdrop-blur-sm animate-[fade-up_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full md:max-w-[440px] bg-paper rounded-t-[28px] md:rounded-[28px] p-6 shadow-[var(--shadow-card)] animate-[sheet-up_0.32s_cubic-bezier(0.2,0.9,0.3,1.2)] paper-grain"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
              match con {candidate?.name || '...'}
            </div>
            <h3 className="display-italic text-[34px] leading-[0.95] text-ink mt-1">
              ¿Cuándo nos <span className="text-pink">vemos?</span>
            </h3>
            <p className="text-[13px] text-ink-soft mt-1">
              dos minutos. solo emojis. sin presión.
            </p>
          </div>
          <div
            aria-hidden="true"
            className="text-[44px] leading-none rotate-[8deg] select-none"
            style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.18))' }}
          >
            {candidate?.emoji || '💌'}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {presets.map((p) => (
            <Chip key={p.id} active={selected === p.id} onClick={() => setSelected(p.id)}>
              {p.label}
            </Chip>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink-mute font-semibold">
            o elige tú
          </span>
          <input
            type="datetime-local"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setSelected('custom');
            }}
            className="mt-1 w-full rounded-xl bg-cream border border-ink/10 px-4 py-3 text-ink font-medium focus-pink"
          />
        </label>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-cream-deep text-ink font-semibold focus-pink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(chosen)}
            disabled={!chosen || Number.isNaN(chosen?.getTime?.())}
            className="flex-1 py-3 rounded-2xl bg-ink text-cream font-semibold focus-pink disabled:opacity-40 disabled:cursor-not-allowed shadow-[var(--shadow-pop)]"
          >
            Listo 🗓️
          </button>
        </div>
      </div>
    </div>
  );
}
