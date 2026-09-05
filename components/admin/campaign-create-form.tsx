'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createCampaign } from '@/app/admin/campaign-actions';
import { runAction } from '@/components/admin/run-action';
import type { SegmentOption } from '@/components/admin/campaign-editor';

/*
  Starting a campaign.

  It always starts as a draft, and this form has no status control at all: readiness is checked
  against what is stored, and at this point nothing is. The audience count updates as the
  audience is chosen — the numbers come from the server with the page, so choosing is instant
  and no request is made per keystroke.

  onSubmit + new FormData, not <form action={fn}> — React 18, where that fails silently.
*/

export function CampaignCreateForm({ segments }: { segments: SegmentOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [segment, setSegment] = React.useState(segments[0]?.key ?? 'subscribed');

  const chosen = segments.find((s) => s.key === segment) ?? segments[0];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await runAction(() => createCampaign(new FormData(event.currentTarget)));
    setBusy(false);

    if (result.ok) {
      router.push(`/admin/campaigns/${result.id}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-[46rem]">
      <div className="wp-notice wp-notice-info">
        <p>
          <strong>This build sends no email.</strong> You are writing a message and counting who
          it would go to. Sending happens in your own mailing platform; afterwards you come back
          and record that you sent it.
        </p>
      </div>

      {error && (
        <div className="wp-notice wp-notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      <label className="wp-label" htmlFor="new-campaign-name">
        Name <span style={{ color: 'var(--wp-error)' }}>*</span>
      </label>
      <input
        id="new-campaign-name"
        name="name"
        className="wp-input"
        maxLength={200}
        required
        placeholder="October restock"
      />
      <p className="wp-muted mt-1 text-[12px]">
        Internal only — how you will find this again in the list.
      </p>

      <label className="wp-label mt-4" htmlFor="new-campaign-subject">
        Subject line
      </label>
      <input
        id="new-campaign-subject"
        name="subject"
        className="wp-input"
        maxLength={300}
      />
      <p className="wp-muted mt-1 text-[12px]">
        Can be left for later; it is required before the campaign can be marked ready.
      </p>

      <label className="wp-label mt-4" htmlFor="new-campaign-segment">
        Audience
      </label>
      <select
        id="new-campaign-segment"
        name="segment"
        className="wp-select"
        value={segment}
        onChange={(e) => setSegment(e.target.value)}
      >
        {segments.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label} — {s.count}
          </option>
        ))}
      </select>
      <p className="wp-muted mt-1 text-[12px]">
        {chosen?.description} <strong className="wp-num">{chosen?.count ?? 0}</strong> people
        right now. Only addresses with live marketing consent are ever included.
      </p>

      <label className="wp-label mt-4" htmlFor="new-campaign-body">
        Body
      </label>
      <textarea id="new-campaign-body" name="body" className="wp-textarea" rows={12} />
      <p className="wp-muted mt-1 text-[12px]">
        Plain text. The unsubscribe link and the postal address footer are added by your mailing
        platform, and both are required by law.
      </p>

      <p className="mt-4">
        <button type="submit" className="wp-button wp-button-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create draft'}
        </button>
      </p>
    </form>
  );
}
