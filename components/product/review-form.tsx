'use client';

import * as React from 'react';
import { Check, Info, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
  Write a review, from a product page.

  This is the storefront, so it is ebru — paper, rules and pigment — not the wp-admin sheet the
  moderation queue runs on. The two systems define overlapping tokens with incompatible values;
  nothing from app/admin/wp-admin.css belongs in here.

  The one thing this form must not do is imply the review is live. Everything submitted is
  PENDING until a person reads it (lib/reviews/index.ts), so the success state says exactly that
  rather than "thanks for your review!" over a page that does not show it — which reads as a
  form that lost the message, and brings people back to submit it twice.

  The address is optional and labelled as optional, because it is not needed to publish anything
  and asking for it as though it were is how a form quietly becomes a list-building exercise.
  Nothing here creates a subscriber; /api/review cannot reach the subscriber table.

  No motion, per the build's direction: hover responds in colour only.
*/

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

type Errors = Partial<Record<'rating' | 'author' | 'email' | 'title' | 'review', string>>;

export function ReviewForm({
  productId,
  productName,
}: {
  productId: string;
  productName?: string;
}) {
  const [rating, setRating] = React.useState(0);
  const [values, setValues] = React.useState({
    author: '',
    email: '',
    title: '',
    review: '',
  });
  const [errors, setErrors] = React.useState<Errors>({});
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  /* Honeypot: hidden from people, filled by bots. Never read by a human. */
  const [company, setCompany] = React.useState('');

  const set =
    (key: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const next: Errors = {};
    if (rating < 1) next.rating = 'Pick a rating between one and five stars.';
    if (!values.author.trim()) next.author = 'Give a name to publish this under.';
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      next.email = 'That address is missing an @ or a domain.';
    if (!values.title.trim()) next.title = 'A short headline helps other people scan.';
    if (values.review.trim().length < 20)
      next.review = 'A little more detail makes this useful to somebody else.';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSending(true);
    setFailure(null);

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          author: values.author,
          email: values.email,
          title: values.title,
          review: values.review,
          company,
        }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        /* Keep everything they typed. Clearing a review because the network blinked is the
           worst thing this form could do. */
        setFailure(data?.error ?? 'That did not send. Try again in a moment.');
        return;
      }

      setSent(true);
    } catch {
      setFailure('That did not send — check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="border border-rule bg-paper-sunk p-8 text-center">
        <Check className="mx-auto h-7 w-7 text-pigment-verdigris" strokeWidth={2} />
        <h3 className="mt-5 font-display text-xl font-semibold tracking-[-0.025em]">
          Review received
        </h3>
        <p className="measure-tight mx-auto mt-2 text-sm leading-relaxed text-ink-soft">
          It is not on the page yet. Every review is read by a person before it is published, so
          it will appear here once somebody has been through it. You have not been added to any
          mailing list.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="border border-rule bg-card p-6 sm:p-8">
      <h3 className="font-display text-xl font-semibold tracking-[-0.025em]">
        Write a review{productName ? <span className="sr-only"> of {productName}</span> : null}
      </h3>

      <p className="mt-5 flex gap-2.5 border border-rule bg-paper-sunk p-3.5 text-xs leading-relaxed text-ink-soft">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pigment-saffron" strokeWidth={1.75} />
        <span>
          Reviews are read by a person before they appear, so yours will not show up
          immediately. Your name and what you write are published; your email address is not.
        </span>
      </p>

      <div className="mt-8 space-y-6">
        {/* ------------------------------------------------------------- rating */}
        <fieldset>
          <legend className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
            Rating
          </legend>

          <div className="mt-3 flex items-center gap-3">
            {/*
              Radios rather than buttons: a rating is one choice out of five, and a radio group
              is what a screen reader and a keyboard already know how to work.
            */}
            <div
              className="flex items-center gap-1"
              role="radiogroup"
              aria-label="Rating out of five"
              aria-invalid={errors.rating ? true : undefined}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <label
                  key={value}
                  className="cursor-pointer p-0.5"
                  title={`${value} — ${RATING_WORDS[value]}`}
                >
                  <input
                    type="radio"
                    name="rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                    className="sr-only"
                  />
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      value <= rating
                        ? 'fill-pigment-saffron text-pigment-saffron'
                        : 'fill-transparent text-ink-faint'
                    )}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span className="sr-only">
                    {value} {value === 1 ? 'star' : 'stars'} — {RATING_WORDS[value]}
                  </span>
                </label>
              ))}
            </div>

            <span className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
              {rating > 0 ? RATING_WORDS[rating] : 'Not rated'}
            </span>
          </div>

          {errors.rating && (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {errors.rating}
            </p>
          )}
        </fieldset>

        {/* -------------------------------------------------------------- person */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            id="review-author"
            label="Name to publish"
            value={values.author}
            onChange={set('author')}
            error={errors.author}
            placeholder="Alex R."
          />
          <Field
            id="review-email"
            label="Email (optional, never published)"
            type="email"
            value={values.email}
            onChange={set('email')}
            error={errors.email}
            placeholder="you@domain.com"
          />
        </div>

        {/* --------------------------------------------------------------- copy */}
        <Field
          id="review-title"
          label="Headline"
          value={values.title}
          onChange={set('title')}
          error={errors.title}
          placeholder="Arrived cold, sealed, labelled"
        />

        <div>
          <label htmlFor="review-body" className="block text-sm font-medium">
            Your review
          </label>
          <textarea
            id="review-body"
            rows={6}
            value={values.review}
            onChange={set('review')}
            placeholder="What you ordered, how it arrived, and what you would tell somebody considering it."
            aria-invalid={errors.review ? true : undefined}
            aria-describedby={errors.review ? 'review-body-error' : undefined}
            className={cn(
              'mt-2 w-full resize-y border border-rule-strong bg-transparent p-3 text-sm outline-none placeholder:text-ink-faint focus:border-pigment-indigo',
              errors.review && 'border-destructive'
            )}
          />
          {errors.review && (
            <p id="review-body-error" className="mt-2 text-xs text-destructive">
              {errors.review}
            </p>
          )}
        </div>

        {/* Off-screen rather than display:none — some bots skip hidden inputs. */}
        <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
          <label htmlFor="review-company">Company</label>
          <input
            id="review-company"
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
          {sending ? 'Sending…' : 'Submit review'}
        </button>
      </div>
    </form>
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
