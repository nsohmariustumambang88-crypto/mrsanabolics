import 'server-only';

import { prisma } from '@/lib/prisma';

/*
  Site settings.

  One row per key in `site_settings`, read through a declared registry rather than by free-form
  string. The registry is the point: a setting that is not declared here cannot be read or
  written, so a typo in a key is a type error rather than a silently empty value that some
  screen then renders as a blank announcement bar.

  Every setting has a default, and the default is what the site uses when nothing is stored. A
  fresh database therefore renders correctly with no settings rows at all — the same rule the
  Cloudinary helpers follow: a missing value costs a refinement, never the page.

  Reads are memoised for a minute, for the same reason the catalogue is: the storefront layout
  needs these on every route and a static build renders hundreds of pages.
*/

export type SettingType = 'text' | 'longtext' | 'boolean' | 'number' | 'email';

export type SettingDef = {
  key: string;
  label: string;
  type: SettingType;
  default: string;
  /** Shown under the field in the admin. Say what it affects and where. */
  help: string;
  group: 'general' | 'commerce' | 'email' | 'privacy';
};

/**
 * Every setting this site has.
 *
 * `postal_address` is not decoration: CAN-SPAM requires a physical postal address in every
 * marketing email, and PECR/GDPR expect an identifiable sender. The email screen refuses to
 * mark a campaign ready without it.
 */
export const SETTINGS: SettingDef[] = [
  {
    key: 'site_title',
    label: 'Site title',
    type: 'text',
    default: 'MrAnabolics',
    help: 'Used in the browser tab, structured data and the email footer.',
    group: 'general',
  },
  {
    key: 'site_tagline',
    label: 'Tagline',
    type: 'text',
    default: 'Every batch, floated and documented.',
    help: 'The short line under the name in the footer.',
    group: 'general',
  },
  {
    key: 'announcement_enabled',
    label: 'Show the announcement bar',
    type: 'boolean',
    default: 'true',
    help: 'The strip above the site header on every storefront page.',
    group: 'general',
  },
  {
    key: 'announcement_text',
    label: 'Announcement text',
    type: 'text',
    /*
      The sentence the site already shipped with, kept verbatim.

      Moving hard-coded copy into a setting must not change what the page says: an unwritten
      setting has to render exactly what was there before, or the extraction is a silent
      content edit that nobody approved. It also has to pair with the link beside it, which
      goes to /faq under the label "How testing works".
    */
    default: 'Certificates of analysis now published with every batch.',
    help: 'Keep it to one short sentence; it sits above the header on small screens too. It is followed by a link to the FAQ.',
    group: 'general',
  },
  {
    key: 'support_email',
    label: 'Support address',
    type: 'email',
    default: 'support@mranabolics.example.com',
    help: 'Shown on the contact page. Enquiries are answered from here by a person.',
    group: 'general',
  },
  {
    key: 'support_phone',
    label: 'Support phone',
    type: 'text',
    default: '',
    help: 'Optional. Left blank, no phone number is shown anywhere.',
    group: 'general',
  },
  {
    key: 'postal_address',
    label: 'Postal address',
    type: 'longtext',
    default: '',
    help: 'Required in the footer of every marketing email by law. A campaign cannot be marked ready without it.',
    group: 'general',
  },

  {
    key: 'currency',
    label: 'Currency',
    type: 'text',
    default: 'USD',
    help: 'Three-letter code. Prices are stored as plain decimals and formatted with this.',
    group: 'commerce',
  },
  {
    key: 'low_stock_threshold',
    label: 'Low stock threshold',
    type: 'number',
    default: '5',
    help: 'At or below this count a product shows "N left" instead of "In stock".',
    group: 'commerce',
  },
  {
    key: 'free_shipping_over',
    label: 'Free delivery over',
    type: 'number',
    default: '0',
    help: 'A headline figure for the storefront only. The real rules live on each delivery rate. Zero hides it.',
    group: 'commerce',
  },
  {
    key: 'hero_promo_code',
    label: 'Promote a discount code',
    type: 'text',
    default: '',
    help: 'Named here, a code appears on the offer card at the top of the home page. It is shown only while it is active, inside its dates and not used up, with any minimum spend or category stated — a code that would be refused at checkout is never advertised. Leave blank to promote deals alone.',
    group: 'commerce',
  },
  {
    key: 'reviews_open',
    label: 'Accept new reviews',
    type: 'boolean',
    default: 'true',
    help: 'Turns the review form on the product page on or off. Submitted reviews always wait for approval.',
    group: 'commerce',
  },

  {
    key: 'email_from_name',
    label: 'From name',
    type: 'text',
    default: 'MrAnabolics',
    help: 'What a recipient sees in their inbox. Nothing is sent by this build.',
    group: 'email',
  },
  {
    key: 'email_from_address',
    label: 'From address',
    type: 'email',
    default: '',
    help: 'Must be on a domain you control and can set SPF, DKIM and DMARC records for.',
    group: 'email',
  },
  {
    key: 'email_reply_to',
    label: 'Reply-to address',
    type: 'email',
    default: '',
    help: 'Where replies land. Blank means replies go to the from address.',
    group: 'email',
  },
  {
    key: 'email_footer',
    label: 'Email footer',
    type: 'longtext',
    default: 'You are receiving this because you subscribed at mranabolics.example.com.',
    help: 'Appears under every campaign, above the postal address and the unsubscribe link.',
    group: 'email',
  },

  {
    key: 'chat_enabled',
    label: 'Show live chat',
    type: 'boolean',
    default: 'true',
    help: 'The chat button on every storefront page. Agent mode answers from the store’s delivery, payment and stock settings; Support mode puts the visitor in the Live Chat inbox.',
    group: 'general',
  },

  {
    key: 'analytics_enabled',
    label: 'Record visits',
    type: 'boolean',
    default: 'true',
    help: 'Turns the visit counter off entirely. No IP address is ever stored; a visitor is a random token in a first-party cookie.',
    group: 'privacy',
  },
  {
    key: 'analytics_retention_days',
    label: 'Keep page views for',
    type: 'number',
    default: '90',
    help: 'Days. Views older than this are deleted by the cleanup action on the Analytics screen.',
    group: 'privacy',
  },
];

const BY_KEY = new Map(SETTINGS.map((s) => [s.key, s]));

export type SettingKey = string;

/** Defaults, as a plain record. */
export function settingDefaults(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of SETTINGS) out[s.key] = s.default;
  return out;
}

const TTL_MS = 60_000;
let cache: { at: number; value: Promise<Record<string, string>> } | null = null;

/** Drop the memo. Call after writing a setting. */
export function invalidateSettings(): void {
  cache = null;
}

async function read(): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany();
  const out = settingDefaults();
  for (const row of rows) {
    /* An undeclared key in the table is ignored rather than surfaced: it is almost certainly a
       leftover from a renamed setting, and rendering it would resurrect dead configuration. */
    if (BY_KEY.has(row.key)) out[row.key] = row.value;
  }
  return out;
}

/** Every setting, defaults filled in. Memoised for a minute; failures are not cached. */
export function getSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const value = read().catch((error) => {
    cache = null;
    throw error;
  });
  cache = { at: Date.now(), value };
  return value;
}

/**
 * Settings, but never throwing.
 *
 * The storefront layout reads these on every route. If Neon is asleep, the right outcome is a
 * site rendered with default copy, not a 500 on the home page — the settings are a refinement,
 * and no page here depends on one being present.
 */
export async function getSettingsSafe(): Promise<Record<string, string>> {
  try {
    return await getSettings();
  } catch {
    return settingDefaults();
  }
}

export async function getSetting(key: SettingKey): Promise<string> {
  const all = await getSettings();
  return all[key] ?? BY_KEY.get(key)?.default ?? '';
}

export function asBoolean(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

export function asNumber(value: string | undefined, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Write settings.
 *
 * Only declared keys are accepted, and each value is coerced to its declared type before it is
 * stored — so a boolean is always "true"/"false" and a number is always a number, whatever the
 * form posted. Callers must have already checked the admin session.
 */
export async function writeSettings(
  values: Record<string, string>,
  updatedBy: string
): Promise<{ written: string[]; rejected: string[] }> {
  const written: string[] = [];
  const rejected: string[] = [];
  const writes: { key: string; value: string }[] = [];

  for (const [key, raw] of Object.entries(values)) {
    const def = BY_KEY.get(key);
    if (!def) {
      rejected.push(key);
      continue;
    }

    let value = String(raw ?? '').trim();
    if (def.type === 'boolean') value = asBoolean(value) ? 'true' : 'false';
    if (def.type === 'number') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        rejected.push(key);
        continue;
      }
      value = String(Math.floor(n));
    }

    writes.push({ key, value });
    written.push(key);
  }

  /* One round trip for the lot. Not an interactive transaction — see CLAUDE.md on PgBouncer. */
  if (writes.length) {
    await prisma.$transaction(
      writes.map((w) =>
        prisma.siteSetting.upsert({
          where: { key: w.key },
          create: { key: w.key, value: w.value, updatedBy },
          update: { value: w.value, updatedBy },
        })
      )
    );
  }

  invalidateSettings();
  return { written, rejected };
}
