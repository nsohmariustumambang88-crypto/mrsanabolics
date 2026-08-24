'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import type { ActionResult } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

/*
  One editor for the small records — categories, manufacturers, journal posts.

  Each row collapses to a summary and opens to a form. That keeps a long list scannable while
  still allowing an edit without a page change, and it avoids three near-identical page
  components drifting apart.

  <details>/<summary> rather than a state toggle: it is open/close behaviour the browser
  already implements, keyboard-operable and announced correctly, with no JavaScript needed to
  reveal the form.
*/

export type EditorField = {
  name: string;
  label: string;
  value: string;
  type?: 'text' | 'number' | 'textarea';
  rows?: number;
  required?: boolean;
  hint?: string;
};

export function InlineEditor({
  title,
  subtitle,
  meta,
  fields,
  action,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  fields: EditorField[];
  action: (form: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<ActionResult | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setState(null);

    const result = await action(new FormData(event.currentTarget));

    setState(result);
    setBusy(false);
    if (result.ok) router.refresh();
  }

  return (
    <details className="group border-b border-[#dcdcde]">
      <summary className="flex cursor-pointer list-none items-baseline gap-4 py-4 transition-colors hover:bg-[#f6f7f7]">
        <ChevronDown
          className="mt-1 h-4 w-4 shrink-0 wp-muted transition-transform group-open:rotate-180"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">
            {title}
          </span>
          {subtitle && (
            <span className="mt-1 block truncate text-sm wp-muted">{subtitle}</span>
          )}
        </span>
        {meta && (
          <span className="shrink-0 text-[11px] uppercase wp-muted wp-num">
            {meta}
          </span>
        )}
      </summary>

      <form onSubmit={onSubmit} className="space-y-5 pb-8 pl-8 pr-2">
        {fields.map((field) => (
          <div key={field.name}>
            <label htmlFor={`${title}-${field.name}`} className="wp-label">
              {field.label}
              {field.required && <span className="ml-1 text-[#d63638]">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                id={`${title}-${field.name}`}
                name={field.name}
                rows={field.rows ?? 4}
                defaultValue={field.value}
                required={field.required}
                className="wp-textarea mt-1"
              />
            ) : (
              <input
                id={`${title}-${field.name}`}
                name={field.name}
                type={field.type ?? 'text'}
                defaultValue={field.value}
                required={field.required}
                className="wp-input mt-1"
              />
            )}

            {field.hint && <p className="wp-help">{field.hint}</p>}
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="wp-button wp-button-primary"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
            {busy ? 'Saving…' : 'Save'}
          </button>

          {state?.ok && (
            <p className={cn('flex items-center gap-2 text-sm text-[#00a32a]')}>
              <Check className="h-4 w-4" strokeWidth={2} />
              Saved.
            </p>
          )}

          {state && !state.ok && (
            <p role="alert" className="flex items-center gap-2 text-sm text-[#d63638]">
              <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
              {state.error}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}
