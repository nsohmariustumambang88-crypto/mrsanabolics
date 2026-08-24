'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { useSubscribe } from '@/components/marketing/use-subscribe';
import { CONSENT } from '@/lib/marketing/consent';

/*
  The close. The page ends anchored: one full-bleed bath, one claim, one action — and the
  action is to read a certificate, because that is the thing this catalogue actually offers
  that a competitor cannot copy-paste.
*/

export function Newsletter() {
  /* Was a local boolean that pretended to subscribe. It now writes a real consent record. */
  const { email, setEmail, consent, setConsent, busy, done: sent, error, submit } =
    useSubscribe('newsletter');

  return (
    <section className="relative overflow-hidden border-b border-rule bg-field-indigo">
      <MarbleBath
        className="absolute inset-0 h-full w-full opacity-40"
        seed={5507}
        density={0.55}
        animate={false}
        pigments={[
          '--pig-indigo',
          '--pig-indigo-lift',
          '--pig-madder',
          '--pig-saffron',
          '--pig-verdigris',
        ]}
      />

      <div className="relative mx-auto grid max-w-[86rem] gap-12 px-4 py-14 text-field-foreground sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-10 lg:py-28">
        <div>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            Read the certificate
            <br />
            before you buy.
          </h2>
          <p className="measure-tight mt-6 text-base leading-relaxed text-field-foreground/80">
            Every batch carries an independent assay, filed against the number printed on the
            vial. You do not have to take our word for the concentration — that is the entire
            point.
          </p>
          <Link
            href="/faq"
            className="group mt-8 inline-flex items-center gap-2.5 rounded-full bg-paper px-6 py-3.5 text-sm font-medium text-ink transition-colors duration-300 hover:bg-paper-raised"
          >
            How testing works
            <ArrowRight
              className="h-4 w-4"
              strokeWidth={1.75}
            />
          </Link>
        </div>

        <div className="lg:justify-self-end lg:pt-4">
          <div className="w-full max-w-md border border-field-foreground/20 bg-pigment-lampblack/20 p-7">
            <h3 className="font-display text-lg font-semibold tracking-[-0.025em]">
              Batch release notes
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-field-foreground/75">
              One message when a batch clears testing, with its certificate attached. No
              campaigns, no restock spam.
            </p>

            {sent ? (
              <p className="mt-6 flex items-center gap-2 text-sm">
                <Check className="h-4 w-4" strokeWidth={2} />
                Added — watch for the next release note.
              </p>
            ) : (
              <form onSubmit={submit} className="mt-6" noValidate>
                <label htmlFor="close-email" className="sr-only">
                  Email address
                </label>
                <div className="flex items-stretch border-b border-field-foreground/35 focus-within:border-primary-foreground">
                  <input
                    id="close-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-transparent py-2.5 text-sm text-field-foreground outline-none placeholder:text-field-foreground/50"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'close-email-error' : undefined}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex items-center px-2 transition-opacity hover:opacity-70 disabled:opacity-40"
                    aria-label="Subscribe"
                  >
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>

                {/*
                  The checkbox is the consent record. Its label is the exact sentence stored
                  against the subscriber, imported from one place so the two cannot drift —
                  see lib/marketing/consent.ts.
                */}
                <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-field-foreground/80">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-pigment-saffron"
                  />
                  {CONSENT.newsletter}
                </label>

                {error && (
                  <p
                    id="close-email-error"
                    className="mt-2 text-xs text-pigment-saffron"
                  >
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
