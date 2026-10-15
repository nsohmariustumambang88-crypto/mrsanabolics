import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import type { FaqItem } from '@/components/shop/collection-sections';
import { getSettingsSafe } from '@/lib/settings';

/*
  The policy text is unchanged; only the frame around it is new. The questions restate what
  the policy already says and nothing more.

  OPEN QUESTION FOR THE OWNER: this page and the return-policy markup on product pages say 30
  days, but each product's own returns line (Product.returns, written by the seed) says 14. Until
  he decides, neither is changed here and the questions do not repeat the period.
*/

export const revalidate = 60;

const PATH = '/legal/returns';
const TITLE = 'Returns and Refund Policy: How to Return an Order';
const DESCRIPTION =
  'How to return an unopened order, which items cannot be returned, who pays return shipping, how refunds are processed and what to do if an item arrives damaged.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: 'website', url: PATH, title: TITLE, description: DESCRIPTION },
};

function returnsFaq(email: string): FaqItem[] {
  return [
    {
      question: 'How do I return an order?',
      answer: `Email ${email} with your order number and the reason for the return. Once the return is approved, we send you return shipping instructions.`,
    },
    {
      question: 'Which items cannot be returned?',
      answer: 'Opened, damaged or used items cannot be returned. Custom, specialty or discontinued items may not be eligible either, so contact us to check a specific product.',
    },
    {
      question: 'Who pays for return shipping?',
      answer: 'The customer pays return shipping, unless the return is due to a defect or damage caused by us.',
    },
    {
      question: 'How long does a refund take?',
      answer: 'Once we receive and inspect your return, the refund is processed within 7-10 business days, to the original payment method.',
    },
    {
      question: 'What if my order arrives damaged?',
      answer: 'Contact us straight away with photos of the damage and the packaging, and we will arrange a replacement or a refund.',
    },
  ];
}

export default async function ReturnsPage() {
  const settings = await getSettingsSafe();
  const email = settings.support_email;

  return (
    <LegalPage
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      heading="Returns & Refund Policy"
      intro="Unopened items in their original condition can be returned. This page explains how to request a return, what cannot be returned, who pays for return shipping and how refunds are made."
      updated="2026-09-29"
      faq={returnsFaq(email)}
    >
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Return Period</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          We accept returns within 30 days of order delivery. Items must be unopened and in original condition. Requests made after 30 days will not be accepted.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Non-Returnable Items</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Opened, damaged or used items cannot be returned. Items damaged during shipping may be returned for inspection and replacement.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">How to Request a Return</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Contact us at {email} with your order number and reason for return. Once approved, we will provide return shipping instructions.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Shipping Costs</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Return shipping is the customer&apos;s responsibility unless the return is due to a defect or damage caused by us.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Refund Processing</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Once we receive and inspect your return, we will process your refund within 7-10 business days. Refunds are issued to the original payment method.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Damaged Items</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          If an item arrives damaged, contact us immediately with photos of the damage and the packaging. We will arrange for replacement or refund.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Exceptions</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Custom, specialty or discontinued items may not be eligible for return. Contact us to verify eligibility for specific products.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Contact</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Questions about returns? Email {email} with your order number.
        </p>
      </section>
    </LegalPage>
  );
}
