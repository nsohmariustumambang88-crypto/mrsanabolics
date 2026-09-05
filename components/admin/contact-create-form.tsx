'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createContact } from '@/app/admin/crm-actions';
import { cn } from '@/lib/utils';
import { runAction } from '@/components/admin/run-action';

/*
  Adding a contact by hand.

  The notice at the top is not decoration. This is the only screen in the product where a person
  gets a record without having done anything themselves, so it has to say plainly what the record
  does and does not authorise — otherwise "I added them to the CRM" quietly becomes "I added them
  to the mailing list", which is the one mistake this area is built to prevent.

  There is no consent checkbox here, and there should never be one. Consent has to come from the
  person, through a form they filled in themselves; a box an administrator ticks on their behalf
  is evidence of nothing.
*/

export function ContactCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /*
    onSubmit rather than <form action={fn}>. This is React 18: passing a client function to
    action is a React 19 feature, and here it silently does nothing at all — the button appears
    to work and no row is ever written. product-create-form.tsx uses this same shape.
  */
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await runAction(() => createContact(new FormData(event.currentTarget)));
    setBusy(false);

    if (result.ok) {
      /* Straight to the record just created — the next thing anyone does is add context to it. */
      router.push(`/admin/contacts/${result.id}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-[42rem]">
      <div className="wp-notice wp-notice-warning">
        <p>
          <strong>This records a person, not permission to email them.</strong> A contact added
          here has agreed to nothing, so they will show as having no marketing consent and must
          not be included in any send. Consent can only come from them, through a form they
          filled in.
        </p>
      </div>

      {error && (
        <div className="wp-notice wp-notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      <label className="wp-label" htmlFor="email">
        Email address <span style={{ color: 'var(--wp-error)' }}>*</span>
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        className="wp-input"
        placeholder="name@domain.com"
      />
      <p className="wp-muted mt-1 text-[12px]">
        This identifies the contact and cannot be changed afterwards.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="wp-label" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" className="wp-input" placeholder="Alex Rivera" />
        </div>

        <div>
          <label className="wp-label" htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" className="wp-input" placeholder="Optional" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="wp-label" htmlFor="stage">
            Stage
          </label>
          <select id="stage" name="stage" className="wp-select" defaultValue="LEAD">
            <option value="LEAD">Lead</option>
            <option value="ENGAGED">Engaged</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="DORMANT">Dormant</option>
          </select>
        </div>

        <div>
          <label className="wp-label" htmlFor="tags">
            Tags
          </label>
          <input id="tags" name="tags" className="wp-input" placeholder="wholesale, trade show" />
          <p className="wp-muted mt-1 text-[12px]">Comma separated. Lower-cased so they group.</p>
        </div>
      </div>

      <label className="wp-label mt-4" htmlFor="note">
        Why you are adding them
      </label>
      <textarea
        id="note"
        name="note"
        rows={3}
        className="wp-textarea"
        placeholder="Met at the Cologne trade show, asked us to follow up in March."
      />
      <p className="wp-muted mt-1 text-[12px]">
        Goes on their timeline as the first entry. Worth writing: in six months it is the only
        thing that explains why this record exists.
      </p>

      <button
        type="submit"
        className={cn('wp-button wp-button-primary wp-w-auto mt-5')}
        disabled={busy}
      >
        {busy ? 'Adding…' : 'Add contact'}
      </button>
    </form>
  );
}
