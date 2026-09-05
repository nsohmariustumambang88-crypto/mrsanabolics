import nextPkg from 'next/package.json';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { CLOUD_NAME, cloudinaryEnabled } from '@/lib/cloudinary';
import { SETTINGS, getSettings, type SettingDef } from '@/lib/settings';
import { WpPageHeader, WpPostbox, WpStaticNotice } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { SettingsForm, type SettingsGroup } from '@/components/admin/settings-form';

/*
  Settings.

  Every field on this screen is declared in lib/settings.ts and nowhere else. The page reads the
  registry, groups it, and hands it to the form — so a setting added there appears here with the
  right control and the right help text, and a setting removed there stops being editable
  without anyone remembering to come back to this file.

  The System box below is read-only on purpose and, more importantly, PRINTS NO SECRET. It shows
  the database HOST — never the connection string, which carries the password — and for the
  credentials it shows only whether they are set. "Set / not set" answers the question anyone
  actually opens this box to ask ("is upload configured?") without putting a working credential
  on a screen that gets screenshotted into a support thread.
*/

export const dynamic = 'force-dynamic';

const GROUPS: { key: SettingDef['group']; title: string; description: string }[] = [
  {
    key: 'general',
    title: 'General',
    description:
      'Identity and contact details. These appear in the browser tab, the footer, structured data and the contact page.',
  },
  {
    key: 'commerce',
    title: 'Commerce',
    description:
      'How the catalogue presents price and stock. None of these takes money — this build has no payment rail.',
  },
  {
    key: 'email',
    title: 'Email',
    description:
      'The sender identity a campaign would use. Nothing is dispatched by this build; the Email screen shows what would still be required before anything could be.',
  },
  {
    key: 'privacy',
    title: 'Privacy',
    description:
      'What is recorded about a visit, and for how long. No IP address is ever stored — a visitor is a random token in a first-party cookie.',
  },
];

/** The database host, or null. Never the URL: it carries the password. */
function databaseHost(): string | null {
  try {
    return new URL(process.env.DATABASE_URL ?? '').host || null;
  } catch {
    return null;
  }
}

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [values, products, contacts, orders] = await Promise.all([
    getSettings(),
    prisma.product.count(),
    prisma.contact.count(),
    prisma.order.count(),
  ]);

  const groups: SettingsGroup[] = GROUPS.map((g) => ({
    title: g.title,
    description: g.description,
    fields: SETTINGS.filter((s) => s.group === g.key),
  })).filter((g) => g.fields.length > 0);

  const host = databaseHost();
  const uploadsConfigured =
    cloudinaryEnabled &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET);

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Where these apply.</strong> Settings are read by the storefront layout on
              every route, so a change shows on the next page load. Every setting has a built-in
              default; clearing a field falls back to it rather than leaving a blank.
            </p>
            <p>
              <strong>Postal address</strong> is not optional decoration. A marketing email
              without a physical address in its footer breaks CAN-SPAM, and the Email screen
              refuses to call a send ready without one.
            </p>
            <p className="mb-0">
              <strong>The System box shows no credential.</strong> It reports the database host
              and whether keys are set — never a connection string or a secret.
            </p>
          </div>
        }
      />

      <WpPageHeader
        title="Settings"
        subtitle="Site identity, commerce presentation, sender details and privacy. Saved to the database, not to a file."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <SettingsForm groups={groups} values={values} />
        </div>

        <div className="space-y-5">
          <WpPostbox title="System">
            <dl className="m-0 text-[13px]">
              <SystemRow label="Next.js" value={nextPkg.version} />
              <SystemRow label="Node" value={process.version.replace(/^v/, '')} />
              <SystemRow label="Environment" value={process.env.NODE_ENV ?? 'unknown'} />
              <SystemRow
                label="Database host"
                value={host ?? 'not readable'}
                muted={!host}
              />
              <SystemRow
                label="Cloudinary cloud"
                value={cloudinaryEnabled ? CLOUD_NAME : 'not configured'}
                muted={!cloudinaryEnabled}
              />
              <SystemRow
                label="Image uploads"
                value={uploadsConfigured ? 'configured' : 'not configured'}
                muted={!uploadsConfigured}
              />
              <SystemRow
                label="Upload route token"
                value={process.env.ADMIN_UPLOAD_TOKEN ? 'set' : 'not set — route fails closed'}
                muted={!process.env.ADMIN_UPLOAD_TOKEN}
              />
              <SystemRow
                label="Subscriber IP salt"
                value={process.env.SUBSCRIBER_IP_SALT ? 'set' : 'not set — hash omitted'}
                muted={!process.env.SUBSCRIBER_IP_SALT}
              />

              <div className="my-3 border-t border-[#f0f0f1]" />

              <SystemRow label="Products" value={String(products)} />
              <SystemRow label="Contacts" value={String(contacts)} />
              <SystemRow label="Orders" value={String(orders)} />
            </dl>

            <p className="wp-muted mb-0 mt-3 text-[12px]">
              Read-only, and deliberately partial: no connection string, API secret or session
              key is shown here or anywhere in the admin. Whether a credential is set is useful;
              its value never is.
            </p>
          </WpPostbox>

          {!uploadsConfigured && (
            <WpStaticNotice tone="warning">
              Image uploads are not configured, so attaching a picture to a product will fail.
              Set <code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>{' '}
              and <code>CLOUDINARY_API_SECRET</code> in the environment.
            </WpStaticNotice>
          )}
        </div>
      </div>
    </>
  );
}

function SystemRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className="wp-muted shrink-0">{label}</dt>
      <dd
        className="wp-num m-0 truncate text-right text-[12px]"
        style={muted ? { color: 'var(--wp-text-muted)' } : undefined}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
