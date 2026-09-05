'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CampaignStatus } from '@prisma/client';
import {
  deleteCampaign,
  recordCampaignSent,
  setCampaignStatus,
  updateCampaign,
} from '@/app/admin/campaign-actions';
import { runAction } from '@/components/admin/run-action';
import { WpPostbox } from '@/components/admin/wp-ui';

/*
  Writing a campaign.

  THE ONE THING THIS SCREEN DOES NOT HAVE IS A SEND BUTTON, and that is the design rather than a
  missing feature. This build has no sending infrastructure. A control labelled "Send" would
  either do nothing or mark a row, and in both cases somebody would walk away believing several
  thousand people had just received something. So the strongest control here is "Record as sent",
  which asks who sent it and through what — because that is a statement a person can honestly
  make, and the other one is not.

  Each panel saves on its own and reports its own outcome, like the order and contact screens:
  these edits are independent, and batching them behind one Save means a failure in one silently
  discards the others.

  Forms use onSubmit + new FormData. <form action={clientFn}> is a React 19 feature and on React
  18 it fails silently — the button runs its busy state and nothing is written.
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

export type SegmentOption = {
  key: string;
  label: string;
  description: string;
  count: number;
};

export type ReadinessLine = {
  key: string;
  label: string;
  href?: string;
  hrefLabel?: string;
};

export type CampaignView = {
  id: string;
  name: string;
  subject: string;
  body: string;
  segment: string;
  status: CampaignStatus;
  recipientCount: number;
  sentAt: string | null;
  sentBy: string | null;
  sentVia: string | null;
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  SENT: 'Sent',
  CANCELLED: 'Cancelled',
};

export function CampaignEditor({
  campaign,
  segments,
  problems,
}: {
  campaign: CampaignView;
  segments: SegmentOption[];
  /** Computed on the server against what is SAVED, and re-checked there before READY is granted. */
  problems: ReadinessLine[];
}) {
  const router = useRouter();
  const sent = campaign.status === 'SENT';

  const [name, setName] = React.useState(campaign.name);
  const [subject, setSubject] = React.useState(campaign.subject);
  const [body, setBody] = React.useState(campaign.body);
  const [segment, setSegment] = React.useState(campaign.segment);

  const [savingBusy, setSavingBusy] = React.useState(false);
  const [saveNotice, setSaveNotice] = React.useState<Notice>(null);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [statusNotice, setStatusNotice] = React.useState<Notice>(null);
  const [sentBusy, setSentBusy] = React.useState(false);
  const [sentNotice, setSentNotice] = React.useState<Notice>(null);

  const dirty =
    name !== campaign.name ||
    subject !== campaign.subject ||
    body !== campaign.body ||
    segment !== campaign.segment;

  const chosen = segments.find((s) => s.key === segment) ?? segments[0];

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingBusy(true);
    setSaveNotice(null);

    const result = await runAction(() => updateCampaign(campaign.id, new FormData(event.currentTarget)));
    setSavingBusy(false);

    if (result.ok) {
      setSaveNotice({
        ok: true,
        text:
          campaign.status === 'READY'
            ? 'Saved. Because the wording changed, it went back to Draft — mark it ready again when you are happy.'
            : 'Saved.',
      });
      router.refresh();
    } else {
      setSaveNotice({ ok: false, text: result.error });
    }
  }

  async function moveTo(status: CampaignStatus, done: string) {
    setStatusBusy(true);
    setStatusNotice(null);
    const result = await runAction(() => setCampaignStatus(campaign.id, status));
    setStatusBusy(false);

    if (result.ok) {
      setStatusNotice({ ok: true, text: done });
      router.refresh();
    } else {
      setStatusNotice({ ok: false, text: result.error });
    }
  }

  async function record(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const via = String(form.get('sentVia') ?? '');

    if (!window.confirm(
      `Record “${campaign.name}” as sent via ${via.trim() || 'a platform'}?\n\nThis writes down that YOU sent it, from that platform, to the ${chosen?.count ?? 0} people currently in this audience. It does not send anything. The stamp is written once and cannot be edited afterwards.`
    )) {
      return;
    }

    setSentBusy(true);
    setSentNotice(null);
    const result = await runAction(() => recordCampaignSent(campaign.id, via));
    setSentBusy(false);

    if (result.ok) {
      setSentNotice({ ok: true, text: 'Recorded.' });
      router.refresh();
    } else {
      setSentNotice({ ok: false, text: result.error });
    }
  }

  async function remove() {
    if (
      !window.confirm(
        sent
          ? `Delete “${campaign.name}” permanently?\n\nThis was recorded as sent, so deleting it removes the record of a message that really did reach people.\n\nThis cannot be undone.`
          : `Delete “${campaign.name}” permanently?\n\nThis cannot be undone.`
      )
    ) {
      return;
    }

    setStatusBusy(true);
    const result = await runAction(() => deleteCampaign(campaign.id));
    setStatusBusy(false);

    if (result.ok) {
      /* router.push, not a location change: waiting on a URL here would wait forever. */
      router.push('/admin/campaigns');
      router.refresh();
    } else {
      setStatusNotice({ ok: false, text: result.error });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      {/* ------------------------------------------------------------------ the words */}

      <div className="grid gap-4">
        <div className="wp-notice wp-notice-info">
          <p>
            <strong>This build sends no email.</strong> A campaign is written and its audience
            counted here. When you send it from your mailing platform, come back and record that
            you did — nothing on this screen delivers anything to anybody.
          </p>
        </div>

        <WpPostbox title={sent ? 'What was sent' : 'The message'}>
          <NoticeLine notice={saveNotice} />

          {sent && (
            <p className="wp-muted m-0 mb-3 text-[12px]">
              Locked. This is the record of what went out on {campaign.sentAt?.slice(0, 10)};
              editing it would leave the system claiming something was sent that nobody received.
            </p>
          )}

          <form onSubmit={save}>
            <label className="wp-label" htmlFor="campaign-name">
              Name <span style={{ color: 'var(--wp-error)' }}>*</span>
            </label>
            <input
              id="campaign-name"
              name="name"
              className="wp-input"
              value={name}
              disabled={sent}
              maxLength={200}
              required
              onChange={(e) => setName(e.target.value)}
            />
            <p className="wp-muted mt-1 text-[12px]">
              Internal only. Nobody outside this admin ever sees it.
            </p>

            <label className="wp-label mt-4" htmlFor="campaign-subject">
              Subject line
            </label>
            <input
              id="campaign-subject"
              name="subject"
              className="wp-input"
              value={subject}
              disabled={sent}
              maxLength={300}
              onChange={(e) => setSubject(e.target.value)}
            />
            <p className="wp-muted mt-1 text-[12px]">
              For most recipients this is the entire message. It is required before the campaign
              can be marked ready.
            </p>

            <label className="wp-label mt-4" htmlFor="campaign-segment">
              Audience
            </label>
            <select
              id="campaign-segment"
              name="segment"
              className="wp-select"
              value={segment}
              disabled={sent}
              onChange={(e) => setSegment(e.target.value)}
            >
              {segments.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} — {s.count}
                </option>
              ))}
            </select>
            <p className="wp-muted mt-1 text-[12px]">{chosen?.description}</p>

            <label className="wp-label mt-4" htmlFor="campaign-body">
              Body
            </label>
            <textarea
              id="campaign-body"
              name="body"
              className="wp-textarea"
              rows={14}
              value={body}
              disabled={sent}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="wp-muted mt-1 text-[12px]">
              Plain text. Your mailing platform adds the unsubscribe link and the postal address
              footer — both are legal requirements, and neither is optional.
            </p>

            {!sent && (
              <p className="mt-4">
                <button type="submit" className="wp-button wp-button-primary" disabled={savingBusy}>
                  {savingBusy ? 'Saving…' : 'Save'}
                </button>
                {dirty && (
                  <span className="wp-muted ml-3 text-[12px]">Unsaved changes.</span>
                )}
              </p>
            )}
          </form>
        </WpPostbox>
      </div>

      {/* ------------------------------------------------------------------- sidebar */}

      <div className="grid gap-4">
        <WpPostbox title="Audience">
          <p className="m-0 text-[13px]">
            <strong className="wp-num text-[20px]">
              {sent ? campaign.recipientCount : chosen?.count ?? 0}
            </strong>{' '}
            {sent ? 'recipients at the time' : 'people right now'}
          </p>
          <p className="wp-muted m-0 mt-2 text-[12px]">
            {sent
              ? 'Snapshotted when this was recorded as sent. The list has moved since; how many it reached is a fact about that day.'
              : 'Only addresses with live marketing consent are ever counted. Anyone who has unsubscribed is unreachable from this screen by construction, not by a filter.'}
          </p>
          {!sent && dirty && segment !== campaign.segment && (
            <p className="wp-muted m-0 mt-2 text-[12px]">
              This is the count for the audience you have picked. Save to make it the campaign&rsquo;s.
            </p>
          )}
        </WpPostbox>

        {!sent && (
          <WpPostbox title="Before it can go">
            {problems.length === 0 ? (
              <p className="m-0 text-[13px]" style={{ color: 'var(--wp-success)' }}>
                Nothing is blocking this. It can be marked ready.
              </p>
            ) : (
              <ul className="m-0 list-none p-0 text-[13px]">
                {problems.map((p) => (
                  <li key={p.key} className="mb-2 flex gap-2 last:mb-0">
                    <span aria-hidden style={{ color: 'var(--wp-error)' }}>
                      ✕
                    </span>
                    <span>
                      {p.label}
                      {p.href && (
                        <>
                          {' '}
                          <Link href={p.href}>{p.hrefLabel ?? 'Fix it'}</Link>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="wp-muted m-0 mt-3 text-[12px]">
              Checked against what is saved
              {dirty ? ' — save to re-check' : ''}. The postal address and from address are legal
              requirements for marketing email, not preferences.
            </p>
          </WpPostbox>
        )}

        <WpPostbox title="Status">
          <NoticeLine notice={statusNotice} />

          <p className="m-0 text-[13px]">
            <strong>{STATUS_LABEL[campaign.status]}</strong>
          </p>

          {sent ? (
            <dl className="mt-3 text-[12px]">
              <div className="flex justify-between py-0.5">
                <dt className="wp-muted">Sent</dt>
                <dd className="wp-num">{campaign.sentAt?.slice(0, 10) ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <dt className="wp-muted">Through</dt>
                <dd className="text-right">{campaign.sentVia ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <dt className="wp-muted">Recorded by</dt>
                <dd className="text-right">{campaign.sentBy ?? '—'}</dd>
              </div>
            </dl>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {campaign.status !== 'READY' && campaign.status !== 'CANCELLED' && (
                <button
                  type="button"
                  className="wp-button"
                  disabled={statusBusy || problems.length > 0}
                  onClick={() => moveTo('READY', 'Marked ready.')}
                >
                  Mark ready
                </button>
              )}

              {campaign.status !== 'DRAFT' && (
                <button
                  type="button"
                  className="wp-button"
                  disabled={statusBusy}
                  onClick={() => moveTo('DRAFT', 'Back to draft.')}
                >
                  Back to draft
                </button>
              )}

              {campaign.status !== 'CANCELLED' && (
                <button
                  type="button"
                  className="wp-button"
                  disabled={statusBusy}
                  onClick={() => moveTo('CANCELLED', 'Cancelled.')}
                >
                  Cancel campaign
                </button>
              )}
            </div>
          )}

          <p className="wp-muted m-0 mt-3 text-[12px]">
            “Sent” is not in this list on purpose — it can only be reached by recording who sent
            it and through what.
          </p>
        </WpPostbox>

        {!sent && campaign.status !== 'CANCELLED' && (
          <WpPostbox title="Record as sent">
            <NoticeLine notice={sentNotice} />

            <p className="wp-muted m-0 text-[12px]">
              You sent this yourself, from a real mailing platform. Write down which one, and this
              becomes the record: the date, your address, and how many people were in the audience
              at that moment.
            </p>

            <form onSubmit={record} className="mt-3">
              <label className="wp-label" htmlFor="campaign-sent-via">
                Sent through <span style={{ color: 'var(--wp-error)' }}>*</span>
              </label>
              <input
                id="campaign-sent-via"
                name="sentVia"
                className="wp-input"
                placeholder="Mailchimp"
                maxLength={120}
                required
              />
              <p className="wp-muted mt-1 text-[12px]">
                The platform it actually went through. A record that does not say where it went
                from cannot be checked against anything.
              </p>

              <p className="mt-3 mb-0">
                <button type="submit" className="wp-button" disabled={sentBusy}>
                  {sentBusy ? 'Recording…' : 'Record as sent'}
                </button>
              </p>
            </form>
          </WpPostbox>
        )}

        <WpPostbox title="Delete">
          <p className="wp-muted m-0 text-[12px]">
            {sent
              ? 'This is the record of a message that reached people. Deleting it loses that.'
              : 'Removes the draft entirely.'}
          </p>
          <p className="mt-3 mb-0">
            <button
              type="button"
              className="wp-button wp-button-danger"
              disabled={statusBusy}
              onClick={remove}
            >
              Delete permanently
            </button>
          </p>
        </WpPostbox>
      </div>
    </div>
  );
}
