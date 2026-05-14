import React, { useState } from 'react';

// Stub payment modal — fake CC fields, 700ms loader, fake success.
// NOTE: Chat surface MUST stay emoji-only. The payment modal is its own dialog
// and is the only place text inputs appear in this app.
export default function PaymentModal({ open, onClose, onSuccess, amount = '$0.99' }) {
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [exp, setExp] = useState('12/29');
  const [cvc, setCvc] = useState('123');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    if (!card || card.replace(/\s/g, '').length < 12) {
      setBusy(false);
      setErr('Invalid card');
      return;
    }
    setBusy(false);
    onSuccess && onSuccess();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pay to extend chat"
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-ink/55 backdrop-blur-sm animate-[fade-up_0.2s_ease-out]"
      onClick={busy ? undefined : onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full md:max-w-[420px] bg-paper rounded-t-[28px] md:rounded-[28px] p-6 shadow-[var(--shadow-card)] animate-[sheet-up_0.32s_cubic-bezier(0.2,0.9,0.3,1.2)]"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-mute font-semibold">
              extend chat
            </div>
            <h3 className="display-italic text-[30px] text-ink leading-tight mt-1">
              {amount} for <span className="text-pink">2 more min</span>
            </h3>
          </div>
          <div className="text-[34px] leading-none">💸</div>
        </div>

        <fieldset disabled={busy} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.16em] text-ink-mute font-semibold">
              Card number
            </span>
            <input
              inputMode="numeric"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              className="mt-1 w-full rounded-xl bg-cream border border-ink/10 px-4 py-3 text-ink font-medium focus-pink"
              placeholder="0000 0000 0000 0000"
            />
          </label>
          <div className="flex gap-3">
            <label className="block flex-1">
              <span className="text-[11px] uppercase tracking-[0.16em] text-ink-mute font-semibold">
                Expires
              </span>
              <input
                value={exp}
                onChange={(e) => setExp(e.target.value)}
                placeholder="MM/YY"
                className="mt-1 w-full rounded-xl bg-cream border border-ink/10 px-4 py-3 text-ink font-medium focus-pink"
              />
            </label>
            <label className="block w-24">
              <span className="text-[11px] uppercase tracking-[0.16em] text-ink-mute font-semibold">
                CVC
              </span>
              <input
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                inputMode="numeric"
                placeholder="123"
                className="mt-1 w-full rounded-xl bg-cream border border-ink/10 px-4 py-3 text-ink font-medium focus-pink"
              />
            </label>
          </div>
        </fieldset>

        {err && (
          <div role="alert" className="mt-3 text-coral text-sm font-semibold">
            {err}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-cream-deep text-ink font-semibold focus-pink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-ink text-cream font-semibold focus-pink shadow-[var(--shadow-pop)] disabled:opacity-70 inline-flex items-center justify-center gap-2"
          >
            {busy ? <Spinner /> : <>Pay {amount}</>}
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-ink-mute">
          demo · no real card will be processed
        </p>
      </form>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="w-4 h-4 rounded-full border-2 border-cream/60 border-t-cream animate-[spin_0.7s_linear_infinite]"
    />
  );
}
