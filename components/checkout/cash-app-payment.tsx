'use client';

import * as React from 'react';
import { Check, Copy, ImageUp, Info } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  MAX_PROOFS_PER_ORDER,
  PROOF_MAX_BYTES,
  PROOF_TYPES,
} from '@/lib/checkout/payment-proof-rules';

/*
  Paying a Cash App order: the $Cashtag to send to, the exact amount, the order number for the
  note, and the box for the screenshot of the payment.

  Shown on the "Order placed" screen right after checkout, and on the payment page the "Order
  Received" email links to, so somebody who pays later can still send the screenshot. Without a
  token (a link from somewhere else) it shows how to pay but not the upload box.

  The screenshot is the customer's evidence, not a payment: the copy says the order is confirmed
  once the shop has checked it, never that it is paid.
*/

export function CashAppPayment({
  reference,
  token,
  total,
  tag,
  name,
  initialCount = 0,
}: {
  reference: string;
  /** The upload token for this order; null hides the upload box. */
  token: string | null;
  total: number;
  tag: string;
  name: string | null;
  /** Screenshots already received for this order. */
  initialCount?: number;
}) {
  return (
    <div className="space-y-6 text-left">
      <div className="border border-rule bg-paper-sunk p-5">
        <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
          Send exactly
        </p>
        <p className="mt-1 font-display text-3xl font-semibold tabular">{formatPrice(total)}</p>

        <p className="mt-5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
          To our Cash App
        </p>
        <CashtagRow tag={tag} />
        {name && (
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            The account shows as <strong className="font-medium text-ink">{name}</strong> in Cash App.
          </p>
        )}

        <p className="mt-5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
          In the &ldquo;For&rdquo; note, write
        </p>
        <p className="mt-1 font-mono text-lg font-semibold text-ink">{reference}</p>
      </div>

      <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
        <li>Copy the $Cashtag and send exactly {formatPrice(total)} in Cash App.</li>
        <li>Write your order number, {reference}, in the &ldquo;For&rdquo; note.</li>
        <li>Upload a screenshot of the completed payment below.</li>
      </ol>

      {token ? (
        <ProofUpload reference={reference} token={token} initialCount={initialCount} />
      ) : (
        <p className="flex items-start gap-2.5 border border-rule p-3 text-xs leading-relaxed text-ink-soft">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pigment-indigo" strokeWidth={1.75} />
          <span>
            To send us the screenshot, open the link in your order email, or reply to that email
            with the screenshot attached.
          </span>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ the tag */

export function CashtagRow({ tag }: { tag: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tag);
    } catch {
      /* Older browsers and some in-app browsers have no clipboard API. */
      const field = document.createElement('textarea');
      field.value = tag;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-3">
      <span className="font-mono text-2xl font-semibold text-ink">{tag}</span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-full border border-rule-strong bg-card px-3.5 py-1.5 text-xs font-medium transition-colors hover:border-pigment-indigo hover:text-pigment-indigo"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-pigment-verdigris" strokeWidth={2} />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `${tag} copied` : ''}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- the upload */

/*
  Shrinks a picture the server would refuse (too big for a Vercel request, or a type it does not
  take) to a JPEG of at most 2000px. A screenshot of a payment stays perfectly readable at that.
*/
async function prepare(file: File): Promise<File> {
  const accepted = PROOF_TYPES.includes(file.type) && !/heic|heif/.test(file.type);
  if (accepted && file.size <= PROOF_MAX_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    if (blob && blob.size <= PROOF_MAX_BYTES) {
      return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'screenshot'}.jpg`, {
        type: 'image/jpeg',
      });
    }
  } catch {
    /* A format this browser cannot draw: send it as it is if the server takes it. */
  }

  if (PROOF_TYPES.includes(file.type) && file.size <= PROOF_MAX_BYTES) return file;
  throw new Error('That picture could not be used. Take a screenshot of the payment and upload that.');
}

function ProofUpload({
  reference,
  token,
  initialCount,
}: {
  reference: string;
  token: string;
  initialCount: number;
}) {
  const inputId = React.useId();
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [count, setCount] = React.useState(initialCount);
  const [justSent, setJustSent] = React.useState(false);

  /* The preview is an object URL; release it when it is replaced or the box goes away. */
  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setJustSent(false);
    setFile(event.target.files?.[0] ?? null);
  };

  const send = async () => {
    if (!file) {
      setError('Choose a screenshot of your payment first.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const ready = await prepare(file);
      const body = new FormData();
      body.set('token', token);
      body.set('file', ready);
      const response = await fetch(`/api/orders/${encodeURIComponent(reference)}/payment-proof`, {
        method: 'POST',
        body,
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; count?: number; error?: string }
        | null;
      if (!response.ok || !data?.ok) {
        setError(data?.error ?? 'The screenshot did not send. Try again in a moment.');
        return;
      }
      setCount(data.count ?? count + 1);
      setFile(null);
      setJustSent(true);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : 'The screenshot did not send. Check your connection and try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const full = count >= MAX_PROOFS_PER_ORDER;

  return (
    <div className="border border-rule p-5">
      <h2 className="font-display text-lg font-semibold tracking-[-0.025em]">
        Upload your payment screenshot
      </h2>

      {count > 0 && (
        <p
          role="status"
          className="mt-3 flex items-start gap-2.5 border border-pigment-verdigris bg-paper-sunk p-3 text-sm leading-relaxed text-ink"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-pigment-verdigris" strokeWidth={2} />
          <span>
            {justSent ? 'Screenshot received.' : `We have ${count === 1 ? 'your screenshot' : `${count} screenshots`}.`}{' '}
            We&rsquo;ll check the payment in our Cash App and email you as soon as your order is
            confirmed.
          </span>
        </p>
      )}

      {!full && (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {count > 0
              ? 'Sent the wrong picture? You can send another.'
              : 'Once you have paid, take a screenshot of the completed payment in Cash App and send it here.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label
              htmlFor={inputId}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium transition-colors hover:border-pigment-indigo hover:text-pigment-indigo"
            >
              <ImageUp className="h-4 w-4" strokeWidth={1.75} />
              {file ? 'Choose a different picture' : 'Choose screenshot'}
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              onChange={choose}
              className="sr-only"
            />
            {file && (
              <button
                type="button"
                onClick={send}
                disabled={sending}
                className="rounded-full bg-pigment-indigo px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send screenshot'}
              </button>
            )}
          </div>

          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a remote image
            <img
              src={preview}
              alt="The screenshot you chose"
              className={cn('mt-4 max-h-72 w-auto border border-rule', sending && 'opacity-60')}
            />
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
