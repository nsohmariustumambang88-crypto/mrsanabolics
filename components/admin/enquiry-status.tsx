'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { EnquiryStatus } from '@prisma/client';
import { setEnquiryStatus } from '@/app/admin/crm-actions';
import { runAction } from '@/components/admin/run-action';

/*
  The status control for one enquiry.

  Used on both the enquiry list and the contact screen, so the two cannot offer different sets
  of statuses or write them differently — the commonest way a queue ends up with rows in a state
  only one screen knows how to produce.

  On failure the select snaps back to the value that is actually stored. Leaving it showing the
  attempted status would mean the queue reads as handled when nothing was written.
*/

const STATUSES: { value: EnquiryStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ANSWERED', label: 'Answered' },
  { value: 'CLOSED', label: 'Closed' },
];

export function EnquiryStatusPicker({
  enquiryId,
  status,
}: {
  enquiryId: string;
  status: EnquiryStatus;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(status);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function change(next: EnquiryStatus) {
    const previous = value;
    setValue(next);
    setBusy(true);
    setError(null);
    const result = await runAction(() => setEnquiryStatus(enquiryId, next));
    setBusy(false);

    if (result.ok) {
      router.refresh();
    } else {
      setValue(previous);
      setError(result.error);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <label className="wp-screen-reader-text" htmlFor={`status-${enquiryId}`}>
        Enquiry status
      </label>
      {/*
        wp-w-auto only. wp-input-narrow is sized for a numeric stock field, and on a select it
        clipped the longest option ("Answered") down to its first letter.
      */}
      <select
        id={`status-${enquiryId}`}
        className="wp-select wp-w-auto"
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value as EnquiryStatus)}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-[11px]" style={{ color: 'var(--wp-error)' }} role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
