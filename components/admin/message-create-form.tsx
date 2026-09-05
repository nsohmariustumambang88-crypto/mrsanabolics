'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { recordMessage } from '@/app/admin/message-actions';
import { runAction } from '@/components/admin/run-action';

/*
  Writing down a message that was already sent.

  This is a LOG ENTRY, not a composer. The person has already replied from their own mail client
  or put the phone down; the button says "Record message" and it writes a row. Nothing here
  reaches anybody, which is exactly why the copy says so before the first field rather than in
  small print underneath.

  Choosing the contact: a filter box narrows a real <select> rather than a combobox built out of
  a datalist. A datalist gives back whatever the person typed, which then has to be matched to a
  contact by string — and the failure mode of that is filing correspondence against the wrong
  person, silently. The select posts an id.

  The contact list is handed down from the server. There is deliberately no "add a new contact"
  affordance here: if they are not in the CRM yet, they get added on the Contacts screen, which
  is the one place that states plainly that adding somebody records no consent.
*/

export type MessageContactOption = {
  id: string;
  name: string | null;
  email: string;
};

const CHANNELS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'OTHER', label: 'Other' },
] as const;

/** `datetime-local` wants local wall-clock time, which toISOString does not give. */
function localNow(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function MessageCreateForm({ contacts }: { contacts: MessageContactOption[] }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);

  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [query, setQuery] = React.useState('');
  const [contactId, setContactId] = React.useState('');
  const [sentAt, setSentAt] = React.useState(localNow);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.email.toLowerCase().includes(q) || (c.name ?? '').toLowerCase().includes(q)
    );
  }, [contacts, query]);

  /*
    Never leave a chosen contact selected once the filter has hidden them. The select would show
    the first visible option while still posting the hidden id — the same class of bug as a list
    table keeping a selection across a filter change, and here it files a message against the
    wrong person.
  */
  React.useEffect(() => {
    if (contactId && !matches.some((c) => c.id === contactId)) setContactId('');
  }, [matches, contactId]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);

    const result = await runAction(() => recordMessage(new FormData(event.currentTarget)));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: 'Recorded. It is on the contact’s timeline too.' });
      formRef.current?.reset();
      setQuery('');
      setContactId('');
      setSentAt(localNow());
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  if (contacts.length === 0) {
    return (
      <div className="wp-notice wp-notice-warning">
        <p>
          <strong>There are no contacts yet.</strong> A message has to be recorded against
          somebody — add a contact first, then come back.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="max-w-[42rem]">
      {notice && (
        <div
          className={`wp-notice ${notice.ok ? 'wp-notice-success' : 'wp-notice-error'}`}
          role={notice.ok ? 'status' : 'alert'}
        >
          <p>{notice.text}</p>
        </div>
      )}

      <p className="wp-muted m-0 text-[12px]">
        <strong>Nothing is sent from here.</strong> Reply from your own mail client, or ring them,
        and then write down what you said so the next person to open that contact can read it.
      </p>

      <label className="wp-label mt-3" htmlFor="message-contact-search">
        Contact <span style={{ color: 'var(--wp-error)' }}>*</span>
      </label>
      <input
        id="message-contact-search"
        type="search"
        className="wp-input wp-input-search"
        placeholder="Search by address or name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <label className="wp-screen-reader-text" htmlFor="message-contact">
        Choose the contact
      </label>
      <select
        id="message-contact"
        name="contactId"
        className="wp-select mt-2"
        value={contactId}
        required
        onChange={(e) => setContactId(e.target.value)}
      >
        <option value="" disabled>
          {matches.length === 0 ? 'No contact matches that' : 'Choose a contact…'}
        </option>
        {matches.slice(0, 200).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name ? `${c.name} — ${c.email}` : c.email}
          </option>
        ))}
      </select>
      <p className="wp-muted mt-1 text-[12px]">
        {matches.length} of {contacts.length} shown
        {matches.length > 200 && ' (first 200 listed — narrow the search)'}.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="wp-label" htmlFor="message-channel">
            Channel
          </label>
          <select id="message-channel" name="channel" className="wp-select" defaultValue="EMAIL">
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="wp-label" htmlFor="message-sent-at">
            When it was sent
          </label>
          <input
            id="message-sent-at"
            name="sentAt"
            type="datetime-local"
            className="wp-input"
            value={sentAt}
            onChange={(e) => setSentAt(e.target.value)}
          />
          <p className="wp-muted mt-1 text-[12px]">
            Defaults to now. It cannot be in the future — a message dated forward has not been
            sent.
          </p>
        </div>
      </div>

      <label className="wp-label mt-4" htmlFor="message-subject">
        Subject
      </label>
      <input
        id="message-subject"
        name="subject"
        className="wp-input"
        maxLength={300}
        placeholder="Re: your enquiry about Test E 300"
      />
      <p className="wp-muted mt-1 text-[12px]">
        Optional, but it is what the timeline entry quotes — leave it blank for a phone call with
        no obvious title.
      </p>

      <label className="wp-label mt-4" htmlFor="message-body">
        What was said <span style={{ color: 'var(--wp-error)' }}>*</span>
      </label>
      <textarea
        id="message-body"
        name="body"
        className="wp-textarea"
        rows={8}
        required
        maxLength={20000}
      />
      <p className="wp-muted mt-1 text-[12px]">
        Paste the reply, or summarise the call. This is internal and is never shown to the
        contact.
      </p>

      <p className="mt-4">
        <button type="submit" className="wp-button wp-button-primary" disabled={busy}>
          {busy ? 'Recording…' : 'Record message'}
        </button>
      </p>
    </form>
  );
}
