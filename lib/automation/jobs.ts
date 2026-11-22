/*
  The automated jobs, declared once.

  Each job is a daily Vercel cron (vercel.json; the Hobby plan allows one run a day per job, at
  some minute inside the scheduled hour) and a row on /admin/automation. A plain module: the
  admin page, the cron routes, the runner and the tests read the same list.

  Every switch defaults OFF. A customer-facing job also needs the owner's approval of its
  template (the owner's rule, 20 November 2026): he is sent a test, and switching the job on
  records the template version he saw. If the template changes later, the job stops sending until
  he approves the new version.
*/

export type JobId = 'unpaid-orders' | 'basket-reminders' | 'welcome' | 'enquiry-alert' | 'weekly-report';

export type JobDef = {
  id: JobId;
  label: string;
  /** One sentence for the owner. */
  does: string;
  /** When Vercel runs it (UTC cron), and the same in words. */
  cron: string;
  when: string;
  /** Who receives it. */
  audience: 'customers' | 'subscribers' | 'shop';
  /** Marketing: needs consent at send time, an unsubscribe link and the postal address. */
  marketing: boolean;
  /** Customers or subscribers receive it, so the owner approves the template first. */
  needsApproval: boolean;
  /** The setting that switches it on. */
  enabledKey: string;
  /** The setting that records the template version the owner approved. */
  approvedKey: string;
  /** The cron route. */
  path: string;
};

export const JOBS: JobDef[] = [
  {
    id: 'unpaid-orders',
    label: 'Unpaid order reminders',
    does: 'Reminds a customer whose storefront order is still unpaid: once about a day after the order, once about three days after. Never after payment, a cancellation, a Cash App screenshot or an expired crypto payment, and never for orders over 7 days old.',
    cron: '0 14 * * *',
    when: 'Every day between 14:00 and 15:00 UTC (9–10 am New York)',
    audience: 'customers',
    marketing: false,
    needsApproval: true,
    enabledKey: 'auto_unpaid_enabled',
    approvedKey: 'auto_unpaid_approved',
    path: '/api/cron/unpaid-orders',
  },
  {
    id: 'basket-reminders',
    label: 'Basket reminders',
    does: 'Emails a subscriber who left products in their basket for a day: their products and a Restore my basket button. Once per basket, at most weekly per person, never after an order.',
    cron: '0 15 * * *',
    when: 'Every day between 15:00 and 16:00 UTC (10–11 am New York)',
    audience: 'subscribers',
    marketing: true,
    needsApproval: true,
    /* The setting the first version of this job used; kept so its history carries on. */
    enabledKey: 'basket_reminders_enabled',
    approvedKey: 'auto_basket_approved',
    path: '/api/cron/basket-reminders',
  },
  {
    id: 'welcome',
    label: 'Welcome emails 2 and 3',
    does: 'Sends a new subscriber the second welcome email 3 days after they sign up and the third after 7 days. Anyone more than 7 days overdue is skipped.',
    cron: '0 16 * * *',
    when: 'Every day between 16:00 and 17:00 UTC (11 am–noon New York)',
    audience: 'subscribers',
    marketing: true,
    needsApproval: true,
    enabledKey: 'auto_welcome_enabled',
    approvedKey: 'auto_welcome_approved',
    path: '/api/cron/welcome',
  },
  {
    id: 'enquiry-alert',
    label: 'Waiting enquiries alert',
    does: 'Emails support@ a list of contact-form enquiries that have waited more than 24 hours for an answer. Nothing is sent when none are waiting.',
    cron: '0 13 * * *',
    when: 'Every day between 13:00 and 14:00 UTC (8–9 am New York)',
    audience: 'shop',
    marketing: false,
    needsApproval: false,
    enabledKey: 'auto_enquiry_alert_enabled',
    approvedKey: 'auto_enquiry_alert_approved',
    path: '/api/cron/enquiry-alert',
  },
  {
    id: 'weekly-report',
    label: 'Weekly report',
    does: 'Every Saturday morning: new customers and subscribers, paid and unpaid orders, what Friday 5% gave away, enquiries, failed searches, every automated email by type, and every job that failed or did not run.',
    cron: '0 13 * * 6',
    when: 'Saturdays between 13:00 and 14:00 UTC (8–9 am New York)',
    audience: 'shop',
    marketing: false,
    needsApproval: false,
    enabledKey: 'auto_weekly_report_enabled',
    approvedKey: 'auto_weekly_report_approved',
    path: '/api/cron/weekly-report',
  },
];

/**
 * Settings that only the Automation screen's own buttons may write: the master pause, each job's
 * switch, and each approved template version. The generic settings form refuses them, so a job
 * cannot be switched on without its template being approved in the same step.
 */
export const SCREEN_ONLY_SETTING_KEYS: ReadonlySet<string> = new Set([
  'automation_paused',
  ...JOBS.flatMap((j) => [j.enabledKey, j.approvedKey]),
]);

export function jobDef(id: string): JobDef | null {
  return JOBS.find((j) => j.id === id) ?? null;
}

/** The New York calendar date of an instant, as YYYY-MM-DD: a job's period. */
export function periodOf(at: Date): string {
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)) {
    p[part.type] = part.value;
  }
  return `${p.year}-${p.month}-${p.day}`;
}

/*
  Never in a marketing email (the owner's decision, 20 November 2026): prescription-only
  medicines he does not want promoted by email, and the whole sexual-health category. Matched on
  the product name and its active ingredient, so a listing named either way is caught.
*/
const EXCLUDED_NAMES = [
  /cialis/i,
  /tadalafil/i,
  /levitra/i,
  /vardenafil/i,
  /\bactos\b/i,
  /pioglitazone/i,
  /\bT-?3\b/,
  /liothyronine/i,
  /cytomel/i,
  /aromasin/i,
  /exemestane/i,
];
export const EXCLUDED_CATEGORY_SLUGS = ['sexual-health'];

export function excludedFromMarketing(product: { name: string; categorySlug?: string | null }): boolean {
  if (product.categorySlug && EXCLUDED_CATEGORY_SLUGS.includes(product.categorySlug)) return true;
  return EXCLUDED_NAMES.some((re) => re.test(product.name));
}

/** "c***@gmail.com": enough for the owner to recognise, not enough to copy around. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 1)}***@${domain}`;
}
