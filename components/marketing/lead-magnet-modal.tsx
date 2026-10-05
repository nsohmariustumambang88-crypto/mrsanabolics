'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useSubscribe } from './use-subscribe';

export function LeadMagnetModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { email, setEmail, consent, setConsent, busy, done, error, submit } = useSubscribe('newsletter');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsent(true);
    await submit(e);
    if (done) {
      setTimeout(() => setIsOpen(false), 2000);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-lg bg-pigment-indigo px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-pigment-indigo/90 transition-colors"
      >
        📖 Free Guide
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-paper p-6 sm:p-8 shadow-xl">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 text-ink-faint hover:text-ink"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="mb-2 font-display text-2xl font-semibold text-ink">
          Get Your Free Guide
        </h2>
        <p className="mb-6 text-sm text-ink-soft">
          Complete guide to buying steroids online safely. Includes supplier verification checklist, red flags, and authentication tips.
        </p>

        {done ? (
          <div className="rounded-lg bg-pigment-verdigris/10 p-4 text-center">
            <p className="font-semibold text-pigment-verdigris">
              ✓ Check your email!
            </p>
            <p className="text-sm text-ink-soft mt-1">
              Your guide is on the way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
                className="w-full rounded border border-rule bg-paper-sunk px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-pigment-indigo focus:outline-none disabled:opacity-50"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={busy}
                className="rounded"
              />
              <span className="text-ink-soft">
                I agree to receive emails about steroid education and safety
              </span>
            </label>

            {error && (
              <p className="text-xs text-pigment-madder">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy || !email || !consent}
              className="w-full rounded bg-pigment-indigo px-4 py-2 font-semibold text-white hover:bg-pigment-indigo/90 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Sending...' : 'Get Free Guide'}
            </button>

            <p className="text-xs text-ink-faint text-center">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
