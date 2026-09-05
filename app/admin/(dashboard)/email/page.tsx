import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { SITE } from '@/lib/site';
import { SETTINGS, getSettings } from '@/lib/settings';
import { looksLikeEmail } from '@/lib/marketing/consent';
import { WpPageHeader, WpPostbox, WpStaticNotice } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { SettingsForm, type SettingsGroup } from '@/components/admin/settings-form';

/*
  Email.

  NOTHING IS SENT BY THIS BUILD. There is no provider, no API key and no queue; a reply to an
  enquiry comes from a person, in a mail client. This screen exists so that the sender identity
  is recorded in one place and — more usefully — so that the two things the law requires of a
  marketing email are visible as met or missing before anyone wires a provider up.

  Those two are not conventions:

  - A WORKING UNSUBSCRIBE LINK, built from that subscriber's own random token. Not from their
    address: a token derived from the email would let anyone unsubscribe anyone, and a link that
    only says "reply to opt out" is not an opt-out mechanism.
  - A PHYSICAL POSTAL ADDRESS in the footer. CAN-SPAM requires it outright; PECR and GDPR expect
    an identifiable sender.

  The footer preview at the bottom renders exactly what would go out, so a missing address is
  visibly missing rather than quietly absent from a settings field nobody scrolled to.
*/

export const dynamic = 'force-dynamic';

export default async function AdminEmailPage() {
  await requireAdmin();

  const [values, subscribed] = await Promise.all([
    getSettings(),
    prisma.subscriber.count({ where: { status: 'SUBSCRIBED' } }),
  ]);

  const fromName = values.email_from_name?.trim() ?? '';
  const fromAddress = values.email_from_address?.trim() ?? '';
  const replyTo = values.email_reply_to?.trim() ?? '';
  const footer = values.email_footer?.trim() ?? '';
  const postal = values.postal_address?.trim() ?? '';

  const groups: SettingsGroup[] = [
    {
      title: 'Sender',
      description:
        'Who a campaign would come from. Stored only — this build dispatches nothing, so none of these has ever been used to send anything.',
      fields: SETTINGS.filter((s) => s.group === 'email'),
    },
    {
      title: 'Postal address',
      description:
        'Required in the footer of every marketing email. It is the same setting as on the Settings screen; editing it here changes it everywhere.',
      fields: SETTINGS.filter((s) => s.key === 'postal_address'),
    },
  ];

  const checks = [
    {
      met: postal.length > 0,
      label: 'A physical postal address in the footer',
      metText: 'Stored, and rendered in the preview below.',
      missingText:
        'Missing. CAN-SPAM requires a real postal address in every marketing email; without one a campaign cannot lawfully go out.',
    },
    {
      met: true,
      label: 'A working unsubscribe link, from the subscriber’s own token',
      metText: `Built in. Every subscriber row carries its own random token and ${SITE.url}/unsubscribe accepts nothing else — so a link cannot be guessed from an address, and one person cannot unsubscribe another.`,
      missingText: '',
    },
    {
      met: fromAddress.length > 0 && looksLikeEmail(fromAddress),
      label: 'A from address on a domain you control',
      metText: `Set to ${fromAddress}. It still needs SPF, DKIM and DMARC records on that domain before a mailbox provider will trust it.`,
      missingText:
        'Missing. Sending from a domain you cannot publish SPF, DKIM and DMARC records for gets the mail filtered, and takes the domain’s reputation with it.',
    },
    {
      met: fromName.length > 0,
      label: 'A from name a recipient will recognise',
      metText: `Recipients would see “${fromName}”.`,
      missingText: 'Missing. An unnamed sender reads as spam before the subject line is read.',
    },
    {
      met: footer.length > 0,
      label: 'Footer text saying why they are receiving it',
      metText: 'Stored, and rendered in the preview below.',
      missingText:
        'Missing. A recipient who cannot tell why they were mailed reports it rather than unsubscribing.',
    },
    {
      met: false,
      label: 'A sending provider',
      metText: '',
      missingText:
        'Not connected, and not connectable from this screen. There is no provider, no API key and no queue in this build.',
    },
  ];

  const blocking = checks.filter((c) => !c.met).length;

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>This screen sends nothing.</strong> It records the sender identity a
              campaign would use, and checks the two things the law requires before one could go
              out at all.
            </p>
            <p>
              <strong>Answering an enquiry</strong> is not affected by any of this. Enquiries are
              stored and shown in the queue; a reply comes from a person, in their own mail
              client.
            </p>
            <p className="mb-0">
              <strong>Consent lives on the Subscribers screen,</strong> not here. A contact record
              is never permission to email somebody — only a subscriber row is.
            </p>
          </div>
        }
      />

      <WpPageHeader
        title="Email"
        subtitle={`${subscribed} subscribed address${subscribed === 1 ? '' : 'es'} would be in scope for a campaign. None has ever been mailed by this build.`}
      />

      {/* (a) status */}
      <WpStaticNotice tone="warning">
        <strong>No sending provider is connected. This build dispatches no email at all</strong>{' '}
        — not campaigns, not order confirmations, not enquiry acknowledgements. A reply to an
        enquiry comes from a person, in a mail client. Nothing on this screen changes that; it
        records what a sender <em>would</em> be, and what would still be required first.
      </WpStaticNotice>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* (b) sender settings */}
        <div className="space-y-5">
          <SettingsForm groups={groups} values={values} submitLabel="Save sender details" />

          {/* (c) footer preview */}
          <WpPostbox title="Footer preview">
            <p className="wp-muted mt-0 text-[13px]">
              Exactly what would sit at the foot of a campaign, from the values stored above. If
              the postal address is missing it is missing here too — which is the point of
              showing it.
            </p>

            <div className="mt-3 border border-[#c3c4c7] bg-white p-4">
              <p className="m-0 text-[12px] text-[#646970]">
                From: {fromName || <em>no from name set</em>}{' '}
                &lt;{fromAddress || 'no-from-address-set'}&gt;
                {replyTo && <> &middot; Reply-to: {replyTo}</>}
              </p>

              <hr className="my-3 border-0 border-t border-[#dcdcde]" />

              <p className="m-0 text-[13px] leading-relaxed">
                {footer || (
                  <em className="text-[#646970]">No footer text set.</em>
                )}
              </p>

              <p className="mt-2 mb-0 text-[13px] leading-relaxed">
                {postal ? (
                  <span className="whitespace-pre-line">{postal}</span>
                ) : (
                  <span
                    className="inline-block border border-dashed px-2 py-1 text-[12px]"
                    style={{ borderColor: 'var(--wp-error)', color: 'var(--wp-error)' }}
                  >
                    No postal address — required by law in every marketing email
                  </span>
                )}
              </p>

              <p className="mt-3 mb-0 text-[12px] text-[#646970]">
                <span className="underline">Unsubscribe</span> —{' '}
                <span className="wp-num">
                  {SITE.url}/unsubscribe?token=&lt;this subscriber&rsquo;s token&gt;
                </span>
              </p>
            </div>

            <p className="wp-muted mb-0 mt-3 text-[12px]">
              The token in that link is the subscriber&rsquo;s own random value, never derived
              from their address. The page confirms on GET and acts on POST, because mail
              scanners prefetch links and a GET that unsubscribed would fire on its own.
            </p>
          </WpPostbox>
        </div>

        {/* (b) the checklist */}
        <div className="space-y-5">
          <WpPostbox title="Required before any send">
            <p className="wp-muted mt-0 text-[13px]">
              {blocking === 0
                ? 'Everything below is in place.'
                : `${blocking} of these ${blocking === 1 ? 'is' : 'are'} not in place.`}
            </p>

            <ul className="m-0 list-none space-y-3 p-0">
              {checks.map((check) => (
                <li key={check.label} className="text-[13px]">
                  <span className="flex items-baseline gap-2">
                    <span
                      aria-hidden
                      className="wp-num shrink-0"
                      style={{ color: check.met ? 'var(--wp-success)' : 'var(--wp-error)' }}
                    >
                      {check.met ? '✓' : '✕'}
                    </span>
                    <strong>{check.label}</strong>
                  </span>
                  <span className="wp-screen-reader-text">
                    {check.met ? 'Met.' : 'Not met.'}
                  </span>
                  <span className="wp-muted mt-0.5 block pl-5 text-[12px]">
                    {check.met ? check.metText : check.missingText}
                  </span>
                </li>
              ))}
            </ul>
          </WpPostbox>

          <WpPostbox title="Who could be mailed" action={{ href: '/admin/subscribers', label: 'Subscribers' }}>
            <p className="mt-0 text-[13px]">
              <span className="wp-num">{subscribed}</span> subscribed address
              {subscribed === 1 ? '' : 'es'}, each with the sentence they agreed to and where they
              agreed to it recorded against them.
            </p>
            <p className="mb-0 text-[13px]">
              Contacts are <em>not</em> a mailing list. A person who wrote to support has consented
              to nothing, and only a subscriber row grants permission to send.{' '}
              <Link href="/admin/contacts">Contacts</Link> shows consent per person, derived from
              that row rather than copied onto it.
            </p>
          </WpPostbox>
        </div>
      </div>
    </>
  );
}
