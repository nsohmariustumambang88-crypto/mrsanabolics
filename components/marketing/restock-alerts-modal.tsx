'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { useSubscribe } from './use-subscribe';
import { CONSENT } from '@/lib/marketing/consent';
import { BullMark } from '@/components/brand/bull-mark';

export function RestockAlertsModal() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { email, setEmail, consent, setConsent, submit, done, error } = useSubscribe('newsletter');

  React.useEffect(() => {
    const hasShown = sessionStorage.getItem('restock-alerts-shown');
    if (!hasShown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem('restock-alerts-shown', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (consent && email) {
      await submit();
      if (done) {
        setIsOpen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white p-8">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="mb-6 flex justify-center">
          <BullMark title="MrAnabolics" className="w-16" />
        </div>

        <h2 className="mb-2 text-center text-2xl font-bold">Restock Alerts</h2>
        <p className="mb-6 text-center text-sm text-gray-600">
          Be first to hear when something is back in stock, and when new flavours and drops land. One email, only when there's something worth saying.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 focus:border-black focus:outline-none"
          />

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 cursor-pointer"
            />
            <span className="text-sm text-gray-600">{CONSENT.newsletter}</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!consent || !email || done}
            className="w-full rounded-full bg-black py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {done ? 'Subscribed!' : 'Subscribe'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          For adults 21 and over. We never sell your information.
        </p>
      </div>
    </div>
  );
}
