import 'server-only';

import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import { getSettings, invalidateSettings } from '@/lib/settings';
import { advertisedDiscount } from '@/lib/discounts';
import { jobDef, excludedFromMarketing } from '@/lib/automation/jobs';
import {
  UNSUBSCRIBE_PLACEHOLDER,
  enquiryAlertEmail,
  templateVersion,
  unpaidReminderEmail,
  weeklyReportEmail,
  welcomeEmail2,
  welcomeEmail3,
  withPostalAddress,
} from '@/lib/automation/templates';
import { sendPlain } from '@/lib/automation/sender';
import { basketReminderSubject, renderBasketReminderHTML } from '@/lib/email/basket-reminder';
import { buildWeeklyReport } from '@/lib/automation/jobs/shop-reports';

/*
  A test of a job's template, sent to the `automation_copy_to` address only, never to a customer.
  The subject carries the template version ("[TEST u-1a2b3c4d] …"), which is what switching the
  job on approves. Sample data with real product names and photos, so it looks like the real thing.
  A marketing test shows the postal address, or says in red-letter words that it is missing.
*/

export type TemplateTestResult =
  | { ok: true; to: string; version: string; sent: { subject: string; resendId: string | null }[] }
  | { ok: false; error: string };

export async function sendTemplateTests(jobId: string): Promise<TemplateTestResult> {
  const def = jobDef(jobId);
  if (!def) return { ok: false, error: 'No such job.' };
  invalidateSettings();
  const settings = await getSettings();
  const to = (settings.automation_copy_to ?? '').trim();
  if (!to) return { ok: false, error: 'Set "Copy of the first email of each run, and template tests, to" first.' };

  const version = templateVersion(def.id);
  const postal = (settings.postal_address ?? '').trim();
  const marketing = (html: string) => {
    const linked = html.split(UNSUBSCRIBE_PLACEHOLDER).join(`${SITE.url}/unsubscribe`);
    return withPostalAddress(linked, postal || 'POSTAL ADDRESS NOT SET: required before this email can go to subscribers');
  };

  const sample = await prisma.product.findMany({
    where: { inStock: true, price: { gte: 40, lte: 120 }, NOT: { images: { isEmpty: true } } },
    select: { name: true, slug: true, brand: { select: { name: true } }, images: true, price: true, category: { select: { slug: true } } },
    orderBy: { name: 'asc' },
    take: 40,
  });
  const products = sample.filter((p) => !excludedFromMarketing({ name: p.name, categorySlug: p.category?.slug })).slice(0, 2);

  const emails: { subject: string; html: string }[] = [];
  if (def.id === 'unpaid-orders') {
    const items = products.map((p) => ({ name: p.name, quantity: 1, lineTotal: Number(p.price) }));
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const base = {
      firstName: 'Marius',
      reference: 'MRA-TEST01',
      placedAt: new Date(Date.now() - 26 * 3_600_000),
      items,
      subtotal,
      discountLabel: null,
      discountTotal: 0,
      shipping: 9,
      total: subtotal + 9,
      payUrl: `${SITE.url}/checkout/payment-confirmation?order=MRA-TEST01`,
      cashApp: null,
    };
    emails.push(unpaidReminderEmail({ ...base, step: 1, method: 'crypto' }));
    emails.push(unpaidReminderEmail({ ...base, step: 2, method: 'bank_transfer', payUrl: null }));
  } else if (def.id === 'basket-reminders') {
    const live = await advertisedDiscount('WELCOME15').catch(() => null);
    const offer = Boolean(live && live.headline === '15% off' && !live.condition);
    const lines = products.map((p) => ({
      slug: p.slug,
      name: p.name,
      brand: p.brand?.name ?? '',
      image: p.images[0] ?? '',
      price: Number(p.price),
      quantity: 1,
    }));
    emails.push({
      subject: basketReminderSubject(lines, offer),
      html: marketing(
        renderBasketReminderHTML({ firstName: 'Marius', lines, restoreUrl: `${SITE.url}/basket`, unsubscribeUrl: UNSUBSCRIBE_PLACEHOLDER, offer, reachedCheckout: true })
      ),
    });
  } else if (def.id === 'welcome') {
    const live = await advertisedDiscount('WELCOME15').catch(() => null);
    const two = welcomeEmail2();
    const three = welcomeEmail3(live ? { code: live.code, headline: live.headline, condition: live.condition } : null);
    emails.push({ subject: two.subject, html: marketing(two.html) });
    emails.push({ subject: three.subject, html: marketing(three.html) });
  } else if (def.id === 'weekly-report') {
    emails.push(weeklyReportEmail(await buildWeeklyReport(new Date(), settings)));
  } else if (def.id === 'enquiry-alert') {
    emails.push(
      enquiryAlertEmail({ enquiries: [{ name: 'Sample person', email: 'sample@example.com', subject: 'Sample enquiry', waitedHours: 30, url: `${SITE.url}/admin/enquiries` }] })
    );
  }

  const stamp = Date.now();
  const sent: { subject: string; resendId: string | null }[] = [];
  for (const [i, email] of emails.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 600));
    const subject = `[TEST${version ? ` ${version}` : ''}] ${email.subject}`;
    const outcome = await sendPlain({ key: `test:${def.id}:${i}:${stamp}`, job: def.id, kind: 'TEST', to, subject, html: email.html });
    if (outcome.status !== 'sent') {
      return { ok: false, error: `Test ${i + 1} was not sent: ${'reason' in outcome ? outcome.reason : outcome.status}` };
    }
    sent.push({ subject, resendId: outcome.resendId });
  }
  return { ok: true, to, version, sent };
}
