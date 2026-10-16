import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import type { FaqItem } from '@/components/shop/collection-sections';
import { formatEstimate, listDeliveryZones, type DeliveryZoneRecord } from '@/lib/delivery';
import { formatPrice } from '@/lib/format';
import { getSettingsSafe } from '@/lib/settings';

/*
  The rates on this page are read from the delivery zones (Admin → Delivery), the same rows the
  checkout quotes from, so the page and the till cannot disagree. They used to be typed in here.
*/

export const revalidate = 3600;

const PATH = '/legal/shipping';
const TITLE = 'Shipping Policy: Tracked Delivery Rates and Times';
const DESCRIPTION =
  'Tracked shipping rates and delivery times for the United States, Europe and the rest of the world, plus order processing, tracking and undeliverable parcels.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: 'website', url: PATH, title: TITLE, description: DESCRIPTION },
};

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

function where(zone: DeliveryZoneRecord): string {
  if (zone.countries.length === 0) return 'Every country not listed above';
  if (zone.countries.length === 1) return '';
  return zone.countries.map((c) => countryNames.of(c) ?? c).join(', ');
}

function rateLine(rate: DeliveryZoneRecord['rates'][number]): string {
  const estimate = formatEstimate(rate);
  return [
    `${rate.name}: ${formatPrice(rate.price)}`,
    estimate ? `(${estimate.charAt(0).toLowerCase()}${estimate.slice(1)})` : '',
    rate.freeOverSubtotal !== null ? `· free on orders of ${formatPrice(rate.freeOverSubtotal)} or more` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

async function activeZones(): Promise<DeliveryZoneRecord[] | null> {
  try {
    const zones = await listDeliveryZones();
    /* Named zones first, the catch-all last, as they are matched. */
    return zones
      .filter((z) => z.active)
      .map((z) => ({ ...z, rates: z.rates.filter((r) => r.active) }))
      .filter((z) => z.rates.length > 0)
      .sort((a, b) => Number(a.countries.length === 0) - Number(b.countries.length === 0) || a.position - b.position);
  } catch {
    return null;
  }
}

function shippingFaq(zones: DeliveryZoneRecord[]): FaqItem[] {
  const items: FaqItem[] = [];
  const us = zones.find((z) => z.countries.includes('US'));
  if (us) {
    items.push({
      question: 'How much does shipping to the United States cost?',
      answer: `${us.rates.map(rateLine).join('. ')}.`,
    });
  }
  items.push({
    question: 'How long does delivery take?',
    answer: `${zones
      .map((z) => `${z.name}: ${z.rates.map((r) => `${r.name.toLowerCase()} ${formatEstimate(r).toLowerCase() || 'no estimate set'}`).join(', ')}`)
      .join('. ')}. Orders are processed within 1-2 business days before they ship, and delivery times are estimates, not guarantees.`,
  });
  const free = zones.flatMap((z) =>
    z.rates.filter((r) => r.freeOverSubtotal !== null).map((r) => `${r.name.toLowerCase()} to ${z.name} is free on orders of ${formatPrice(r.freeOverSubtotal as number)} or more`)
  );
  items.push({
    question: 'Is shipping free?',
    answer: free.length > 0 ? `Yes, above a minimum: ${free.join('; ')}.` : 'No. Every order pays the rate for its delivery option.',
  });
  items.push({
    question: 'Will I get a tracking number?',
    answer: 'Yes. All orders ship with tracking, and the tracking number is emailed to you once your order ships.',
  });
  return items;
}

export default async function ShippingPage() {
  const [zones, settings] = await Promise.all([activeZones(), getSettingsSafe()]);
  const email = settings.support_email;

  return (
    <LegalPage
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      heading="Shipping Policy"
      intro="Every order ships tracked. Below are the delivery options and rates for each region, how quickly orders are sent, and what happens if a parcel cannot be delivered."
      updated="2026-09-29"
      faq={zones ? shippingFaq(zones) : []}
    >
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Shipping Rates</h2>
        <div className="space-y-2 text-sm text-ink-soft">
          {zones && zones.length > 0 ? (
            zones.map((zone, i) => (
              <div key={zone.id} className={i > 0 ? 'mt-3' : undefined}>
                <p>
                  <strong className="text-ink">{zone.name}:</strong>
                  {where(zone) && <span className="block text-xs text-ink-faint">{where(zone)}</span>}
                </p>
                <ul className="ml-4 mt-1 list-disc space-y-1">
                  {zone.rates.map((rate) => (
                    <li key={rate.id}>{rateLine(rate)}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p>The delivery options and rates for your country are shown at checkout once you enter your address.</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Order Processing</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Orders are processed within 1-2 business days. You will receive a tracking number via email once your order ships.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Delivery Times</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Delivery times are estimates and are not guaranteed. Actual delivery may take longer due to customs, weather, or carrier delays. We recommend allowing an extra 2-3 business days beyond the estimate.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Tracking</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          All orders ship with tracking. You can track your package using the tracking number provided in your shipping confirmation email.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Undeliverable Packages</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          If a package is returned to us as undeliverable, we will attempt to contact you. If we cannot deliver the package after 30 days, it will be destroyed and no refund will be issued.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Contact Us</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          For shipping inquiries, contact us at {email} with your order number.
        </p>
      </section>
    </LegalPage>
  );
}
