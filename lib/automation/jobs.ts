/*
  The automated jobs, declared once.

  ONE daily timer (the owner's decision, 27 November 2026, inside his rule that only payments and
  the visit count call the server on their own): a single Vercel cron, DAILY_CRON in vercel.json,
  calls DAILY_PATH, which runs the jobs in DAILY_ORDER one after another inside one function's
  time. Hobby fires it anywhere inside the scheduled hour. Every job is also a row on
  /admin/automation with its own Run now button. A plain module: the admin page, the daily route,
  the runner and the tests read the same list.

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
  /**
   * Whether the daily timer runs it: every day, on Saturdays only, or never (Run now only).
   * Optional jobs (`timerOnlyIfOn`) are not even started by the timer while switched off.
   */
  timer: 'daily' | 'saturdays' | 'no';
  timerOnlyIfOn: boolean;
  /** When it runs, in words for the owner (Lagos time first: that is where he is). */
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
};

/** The one daily timer: 14:00–15:00 UTC, which is 15:00–16:00 in Lagos (WAT, no daylight saving). */
export const DAILY_CRON = '0 14 * * *';
export const DAILY_PATH = '/api/cron/daily';
const DAILY_WHEN = 'With the daily timer, between 15:00 and 16:00 Lagos time (14:00–15:00 UTC)';

export const JOBS: JobDef[] = [
  {
    id: 'unpaid-orders',
    label: 'Unpaid order reminders',
    does: 'Reminds a customer whose storefront order is still unpaid: once about a day after the order, once about three days after. An order that never had the first reminder gets the first one, never "the last reminder". Never after payment, a cancellation, a Cash App screenshot or an expired crypto payment, and never for orders over 7 days old.',
    timer: 'daily',
    timerOnlyIfOn: false,
    when: `${DAILY_WHEN}, first of the day's jobs`,
    audience: 'customers',
    marketing: false,
    needsApproval: true,
    enabledKey: 'auto_unpaid_enabled',
    approvedKey: 'auto_unpaid_approved',
  },
  {
    id: 'basket-reminders',
    label: 'Basket reminders',
    does: 'Emails a subscriber who reached the checkout and left without ordering, a day later: their products and a Restore my basket button. Once per basket, at most weekly per person, never after an order. Baskets are saved only when a shopper opens the checkout.',
    timer: 'daily',
    timerOnlyIfOn: false,
    when: `${DAILY_WHEN}, after the unpaid order reminders`,
    audience: 'subscribers',
    marketing: true,
    needsApproval: true,
    /* The setting the first version of this job used; kept so its history carries on. */
    enabledKey: 'basket_reminders_enabled',
    approvedKey: 'auto_basket_approved',
  },
  {
    id: 'welcome',
    label: 'Welcome emails 2 and 3',
    does: 'Sends a new subscriber the second welcome email 3 days after they sign up and the third after 7 days. Anyone more than 7 days overdue is skipped.',
    timer: 'no',
    timerOnlyIfOn: true,
    when: 'Not on the daily timer: only when you press Run now',
    audience: 'subscribers',
    marketing: true,
    needsApproval: true,
    enabledKey: 'auto_welcome_enabled',
    approvedKey: 'auto_welcome_approved',
  },
  {
    id: 'enquiry-alert',
    label: 'Waiting enquiries alert',
    does: 'Emails support@ a list of contact-form enquiries that have waited more than 24 hours for an answer. Nothing is sent when none are waiting.',
    timer: 'daily',
    timerOnlyIfOn: true,
    when: `${DAILY_WHEN}, only while switched on`,
    audience: 'shop',
    marketing: false,
    needsApproval: false,
    enabledKey: 'auto_enquiry_alert_enabled',
    approvedKey: 'auto_enquiry_alert_approved',
  },
  {
    id: 'weekly-report',
    label: 'Weekly report',
    does: 'Every Saturday: new customers and subscribers, paid and unpaid orders, what Friday 5% gave away, enquiries, failed searches, every automated email by type, and every job that failed or did not run.',
    timer: 'saturdays',
    timerOnlyIfOn: true,
    when: 'With the daily timer on Saturdays only (15:00–16:00 Lagos time), only while switched on',
    audience: 'shop',
    marketing: false,
    needsApproval: false,
    enabledKey: 'auto_weekly_report_enabled',
    approvedKey: 'auto_weekly_report_approved',
  },
];

/** The order the daily timer runs them in: the customer's own order first. */
export const DAILY_ORDER: JobId[] = ['unpaid-orders', 'basket-reminders', 'enquiry-alert', 'weekly-report'];

/** Saturday in New York, the day the weekly report goes. */
export function isSaturdayInNewYork(at: Date): boolean {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/New_York' }).format(at) === 'Sat';
}

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
  the product name AND its compound group (Product.subcategoryName): a brand name alone can hide
  the medicine, as "Aromalyn 25" (group "Aromasin (Exemestane)") and "Cytobull 50" (group
  "Liothyronine (T3)") did until 27 November 2026. Callers must pass the group.
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

export function excludedFromMarketing(product: { name: string; categorySlug?: string | null; group?: string | null }): boolean {
  if (product.categorySlug && EXCLUDED_CATEGORY_SLUGS.includes(product.categorySlug)) return true;
  return EXCLUDED_NAMES.some((re) => re.test(product.name) || (product.group ? re.test(product.group) : false));
}

/*
  A run left RUNNING by a process that died (killed, cut off at the time limit, lost its
  connection). No run can last this long: a function stops at 60 seconds. lib/automation/run.ts
  closes such runs as FAILED with DID_NOT_FINISH; the screen and the weekly report use
  isStaleRun so one that has not been closed yet never reads as running or as having run.
*/
export const STALE_AFTER_MS = 15 * 60_000;
export const DID_NOT_FINISH =
  'Did not finish: the process stopped before the run was recorded (killed, cut off at the time limit, or lost its connection).';

export function isStaleRun(run: { status: string; startedAt: Date }, now = new Date()): boolean {
  return run.status === 'RUNNING' && now.getTime() - run.startedAt.getTime() > STALE_AFTER_MS;
}

/** "c***@gmail.com": enough for the owner to recognise, not enough to copy around. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 1)}***@${domain}`;
}
