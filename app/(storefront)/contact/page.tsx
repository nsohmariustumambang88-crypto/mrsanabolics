'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, MessageSquare, Clock, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ENQUIRY_SUBJECTS, MIN_MESSAGE_LENGTH } from '@/lib/crm/subjects';
import { useSiteSettings } from '@/components/providers/settings-provider';

/*
  The subjects come from lib/crm/subjects.ts, which the API route validates against too. A local
  copy here would be a second source of truth, and the drift shows up as a visitor picking an
  option the server then rejects as unknown.
*/
const SUBJECTS = ENQUIRY_SUBJECTS;

/*
  The support address comes from site settings, so an administrator changes it in one place and
  it changes here. `channels` is therefore built inside the component rather than at module
  scope. An unset address falls back to the one the site shipped with rather than rendering a
  blank line — a contact page with no way to make contact is worse than a stale address.
*/
const channelsFor = (supportEmail: string, supportPhone: string) => [
  {
    icon: Mail,
    title: 'Write to us',
    body: supportEmail || 'support@mrsanabolics.com',
    note: 'Answered around the clock, 7 days a week.',
  },
  ...(supportPhone
    ? [
        {
          icon: MessageSquare,
          title: 'Call us',
          body: supportPhone,
          note: 'Any time, day or night.',
        },
      ]
    : []),
  /* Support is staffed around the clock, at the owner's direction (October 2026). */
  {
    icon: Clock,
    title: 'Hours',
    body: '24 hours a day, 7 days a week',
    note: 'There is always someone on support, so a new message is picked up straight away, day or night, weekends included.',
  },
  {
    icon: MessageSquare,
    title: 'Batch questions',
    body: 'Include the lot number from your vial',
    note: 'It is printed beneath the expiry date.',
  },
];

type Errors = Partial<Record<'name' | 'email' | 'message', string>>;

export default function ContactPage() {
  const [values, setValues] = React.useState({
    name: '',
    email: '',
    subject: SUBJECTS[0],
    message: '',
  });
  const { supportEmail, supportPhone } = useSiteSettings();
  const channels = React.useMemo(
    () => channelsFor(supportEmail, supportPhone),
    [supportEmail, supportPhone]
  );
  const [errors, setErrors] = React.useState<Errors>({});
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  /* Honeypot: hidden from people, filled by bots. Never read by a human. */
  const [company, setCompany] = React.useState('');

  const set = (key: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!values.name.trim()) next.name = 'Tell us who to reply to.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      next.email = 'That address is missing an @ or a domain.';
    if (values.message.trim().length < MIN_MESSAGE_LENGTH)
      next.message = 'A little more detail helps us answer in one reply.';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSending(true);
    setFailure(null);

    try {
      const response = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, company, path: window.location.pathname }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        /*
          Say what went wrong and keep everything they typed. Clearing a message someone spent
          five minutes on because the network blinked is the worst thing this form could do.
        */
        setFailure(data?.error ?? 'That did not send. Try again in a moment.');
        return;
      }

      setSent(true);
    } catch {
      setFailure('That did not send — check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            Get in touch
          </h1>
          <p className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            Questions about an order, a batch, or a certificate. If you are asking about a
            specific vial, the lot number gets you an answer fastest. Common questions are
            already answered in the{' '}
            <Link
              href="/faq"
              className="underline decoration-rule-strong underline-offset-4 transition-colors hover:text-pigment-indigo hover:decoration-pigment-indigo"
            >
              questions page
            </Link>
            .
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10">
          <div className="grid gap-px bg-rule lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="bg-card p-6 sm:p-8 lg:p-10">
              {sent ? (
                <div className="border border-rule bg-paper-sunk p-8 text-center">
                  <Check
                    className="mx-auto h-7 w-7 text-pigment-verdigris"
                    strokeWidth={2}
                  />
                  <h2 className="mt-5 font-display text-xl font-semibold tracking-[-0.025em]">
                    Message accepted
                  </h2>
                  <p className="measure-tight mx-auto mt-2 text-sm leading-relaxed text-ink-soft">
                    It is in the support queue. You have not been added to any mailing list —
                    writing in is not a subscription.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setFailure(null);
                      setValues({ name: '', email: '', subject: SUBJECTS[0], message: '' });
                    }}
                    className="mt-6 text-sm text-pigment-indigo underline underline-offset-4"
                  >
                    Write another
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} noValidate className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field
                      id="name"
                      label="Your name"
                      value={values.name}
                      onChange={set('name')}
                      error={errors.name}
                      placeholder="Alex Rivera"
                    />
                    <Field
                      id="email"
                      label="Email"
                      type="email"
                      value={values.email}
                      onChange={set('email')}
                      error={errors.email}
                      placeholder="you@domain.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium">
                      What is this about
                    </label>
                    <select
                      id="subject"
                      value={values.subject}
                      onChange={set('subject')}
                      className="mt-2 w-full border-b border-rule-strong bg-transparent py-2.5 text-sm outline-none focus:border-pigment-indigo"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={6}
                      value={values.message}
                      onChange={set('message')}
                      placeholder="Include the lot number if you are asking about a specific batch."
                      aria-invalid={errors.message ? true : undefined}
                      aria-describedby={errors.message ? 'message-error' : undefined}
                      className={cn(
                        'mt-2 w-full resize-y border border-rule-strong bg-transparent p-3 text-sm outline-none placeholder:text-ink-faint focus:border-pigment-indigo',
                        errors.message && 'border-destructive'
                      )}
                    />
                    {errors.message && (
                      <p id="message-error" className="mt-2 text-xs text-destructive">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* Off-screen rather than display:none — some bots skip hidden inputs. */}
                  <div
                    aria-hidden
                    className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
                  >
                    <label htmlFor="company">Company</label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>

                  {failure && (
                    <p role="alert" className="text-sm text-destructive">
                      {failure}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="rounded-full bg-pigment-indigo px-7 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift disabled:opacity-60"
                  >
                    {sending ? 'Sending…' : 'Send message'}
                  </button>
                </form>
              )}
            </div>

            <aside className="bg-card p-6 sm:p-8 lg:p-10">
              <ul className="space-y-8">
                {channels.map(({ icon: Icon, title, body, note }) => (
                  <li key={title}>
                    <Icon
                      className="h-[1.15rem] w-[1.15rem] text-pigment-indigo"
                      strokeWidth={1.5}
                    />
                    <h2 className="mt-3 font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-snug">{body}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">{note}</p>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'mt-2 w-full border-b border-rule-strong bg-transparent py-2.5 text-sm outline-none placeholder:text-ink-faint focus:border-pigment-indigo',
          error && 'border-destructive'
        )}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
