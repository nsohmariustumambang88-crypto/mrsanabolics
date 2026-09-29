export const metadata = {
  title: 'Returns & Refund Policy | MrAnabolics',
  description: 'Return and refund policy for MrAnabolics',
};

export default function ReturnsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
          Returns & Refund Policy
        </h1>
        <p className="mt-2 text-sm text-ink-soft">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

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
          Contact us at support@mranabolics.com with your order number and reason for return. Once approved, we will provide return shipping instructions.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Shipping Costs</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Return shipping is the customer's responsibility unless the return is due to a defect or damage caused by us.
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
          Questions about returns? Email support@mranabolics.com with your order number.
        </p>
      </section>
    </div>
  );
}
