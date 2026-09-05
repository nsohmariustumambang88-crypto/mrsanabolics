'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { ContactStage } from '@prisma/client';
import {
  addContactNote,
  deleteContact,
  setContactStage,
  setContactTags,
  updateContactDetails,
} from '@/app/admin/crm-actions';
import { runAction } from '@/components/admin/run-action';

/*
  The writable half of a contact screen.

  Each control saves on its own and reports its own outcome, rather than one page-wide Save.
  These edits are independent — a stage change and a note have nothing to do with each other —
  and batching them means a failure in one silently discards the others.

  Every handler calls router.refresh() on success, because the timeline is rendered on the
  server: without it the activity these actions just recorded would not appear until reload,
  and the screen would look like the write had not happened.
*/

type Notice = { ok: boolean; text: string } | null;

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div
      className={`wp-notice ${notice.ok ? 'wp-notice-success' : 'wp-notice-error'}`}
      role={notice.ok ? 'status' : 'alert'}
    >
      <p>{notice.text}</p>
    </div>
  );
}

const STAGES: { value: ContactStage; label: string }[] = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'ENGAGED', label: 'Engaged' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'DORMANT', label: 'Dormant' },
];

export function StagePicker({ contactId, stage }: { contactId: string; stage: ContactStage }) {
  const router = useRouter();
  const [value, setValue] = React.useState(stage);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice>(null);

  async function change(next: ContactStage) {
    const previous = value;
    setValue(next);
    setBusy(true);
    const result = await runAction(() => setContactStage(contactId, next));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: 'Stage saved.' });
      router.refresh();
    } else {
      /* Put the control back where it was: showing a stage that did not save is a lie. */
      setValue(previous);
      setNotice({ ok: false, text: result.error });
    }
  }

  return (
    <div>
      <NoticeLine notice={notice} />
      <label className="wp-label" htmlFor="contact-stage">
        Stage
      </label>
      <select
        id="contact-stage"
        className="wp-select"
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value as ContactStage)}
      >
        {STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <p className="wp-muted mt-1.5 text-[12px]">
        Your assessment of the relationship. It grants no permission to email anyone.
      </p>
    </div>
  );
}

export function TagEditor({ contactId, tags }: { contactId: string; tags: string[] }) {
  const router = useRouter();
  const [current, setCurrent] = React.useState(tags);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice>(null);

  async function commit(next: string[]) {
    const previous = current;
    setCurrent(next);
    setBusy(true);
    const result = await runAction(() => setContactTags(contactId, next));
    setBusy(false);

    if (result.ok) {
      router.refresh();
    } else {
      setCurrent(previous);
      setNotice({ ok: false, text: result.error });
    }
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const tag = draft.trim().toLowerCase();
    if (!tag) return;
    setDraft('');
    if (current.includes(tag)) return;
    commit([...current, tag].sort());
  }

  return (
    <div>
      <NoticeLine notice={notice} />
      <span className="wp-label">Tags</span>

      {current.length > 0 && (
        <ul className="mb-2 flex list-none flex-wrap gap-1.5 p-0">
          {current.map((tag) => (
            <li
              key={tag}
              className="flex items-center gap-1.5 border border-[#c3c4c7] bg-[#f6f7f7] px-2 py-0.5 text-[12px]"
            >
              {tag}
              <button
                type="button"
                disabled={busy}
                onClick={() => commit(current.filter((t) => t !== tag))}
                aria-label={`Remove tag ${tag}`}
                className="cursor-pointer border-0 bg-transparent p-0 text-[14px] leading-none"
                style={{ color: 'var(--wp-text-muted)' }}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex items-center gap-2">
        <label className="wp-screen-reader-text" htmlFor="tag-input">
          Add a tag
        </label>
        <input
          id="tag-input"
          className="wp-input"
          value={draft}
          disabled={busy}
          placeholder="e.g. wholesale"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="wp-button wp-w-auto" disabled={busy || !draft.trim()}>
          Add
        </button>
      </form>
    </div>
  );
}

export function DetailsForm({
  contactId,
  name,
  phone,
}: {
  contactId: string;
  name: string | null;
  phone: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice>(null);

  /* onSubmit, not <form action={fn}> — see contact-create-form.tsx. React 18 ignores the latter. */
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const result = await runAction(() => updateContactDetails(contactId, new FormData(event.currentTarget)));
    setBusy(false);
    setNotice(result.ok ? { ok: true, text: 'Details saved.' } : { ok: false, text: result.error });
    if (result.ok) router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <NoticeLine notice={notice} />

      <label className="wp-label" htmlFor="contact-name">
        Name
      </label>
      <input
        id="contact-name"
        name="name"
        className="wp-input"
        defaultValue={name ?? ''}
        placeholder="Not given"
      />

      <label className="wp-label mt-3" htmlFor="contact-phone">
        Phone
      </label>
      <input
        id="contact-phone"
        name="phone"
        className="wp-input"
        defaultValue={phone ?? ''}
        placeholder="Not given"
      />

      <button type="submit" className="wp-button wp-button-primary wp-w-auto mt-3" disabled={busy}>
        {busy ? 'Saving…' : 'Save details'}
      </button>
    </form>
  );
}

export function NoteForm({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [body, setBody] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await runAction(() => addContactNote(contactId, body));
    setBusy(false);

    if (result.ok) {
      setBody('');
      setNotice({ ok: true, text: 'Note added.' });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  return (
    <form onSubmit={submit}>
      <NoticeLine notice={notice} />
      <label className="wp-screen-reader-text" htmlFor="note-body">
        Note
      </label>
      <textarea
        id="note-body"
        className="wp-textarea"
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What happened, what was agreed, what to do next."
      />
      <button
        type="submit"
        className="wp-button wp-button-primary wp-w-auto mt-2"
        disabled={busy || !body.trim()}
      >
        {busy ? 'Adding…' : 'Add note'}
      </button>
      <p className="wp-muted mt-1.5 text-[12px]">Internal. The contact never sees this.</p>
    </form>
  );
}

/*
  Deleting the person whose screen you are on.

  Placed last, in its own box, and it names them in the confirmation. What goes with them is
  spelled out rather than summarised as "this cannot be undone", because the consequence people
  do not expect is the one worth stating: their messages and history go, and if they still had
  marketing consent it is ended rather than left attached to a record that no longer exists.

  The consent row itself survives as suppression evidence. Deleting that would quietly make an
  opt-out reversible.
*/
export function DeleteContact({
  contactId,
  label,
  subscribed,
}: {
  contactId: string;
  label: string;
  subscribed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function remove() {
    const warning = [
      `Delete ${label} permanently?`,
      'Their enquiries, notes and activity go too.',
      subscribed
        ? 'They still have marketing consent — it will be withdrawn, and the consent record is kept as evidence of the opt-out.'
        : null,
      'This cannot be undone.',
    ]
      .filter(Boolean)
      .join('\n\n');

    if (!window.confirm(warning)) return;

    setBusy(true);
    setError(null);
    const result = await runAction(() => deleteContact(contactId));

    if (result.ok) {
      /* The record is gone, so there is nothing to come back to. */
      router.push('/admin/contacts');
      router.refresh();
      return;
    }

    setBusy(false);
    setError(result.error);
  }

  return (
    <div>
      {error && (
        <div className="wp-notice wp-notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      <button
        type="button"
        className="wp-button wp-button-danger wp-w-auto"
        onClick={remove}
        disabled={busy}
      >
        {busy ? 'Deleting…' : 'Delete contact'}
      </button>

      <p className="wp-muted mt-2 text-[12px]">
        {subscribed
          ? 'They will be unsubscribed as part of this. The consent record stays, so they cannot be re-added without asking again.'
          : 'Their messages, notes and history go with them. Any consent record stays as evidence.'}
      </p>
    </div>
  );
}
