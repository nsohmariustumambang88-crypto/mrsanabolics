export const metadata = {
  title: 'Shipping Policy | MrAnabolics',
  description: 'Shipping information and delivery details for MrAnabolics',
};

export default function ShippingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
          Shipping Policy
        </h1>
        <p className="mt-2 text-sm text-ink-soft">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Shipping Rates</h2>
        <div className="space-y-2 text-sm text-ink-soft">
          <p><strong className="text-ink">United States:</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Standard Tracked: $9.00 (3-6 business days) | Free over $150</li>
            <li>Express Tracked: $24.00 (1-2 business days)</li>
          </ul>
          <p className="mt-3"><strong className="text-ink">Europe:</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Standard Tracked: $14.00 (5-9 business days) | Free over $200</li>
            <li>Express Tracked: $32.00 (2-4 business days)</li>
          </ul>
          <p className="mt-3"><strong className="text-ink">Rest of World:</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>International Tracked: $22.00 (7-16 business days)</li>
          </ul>
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
          For shipping inquiries, contact us at support@mranabolics.com with your order number.
        </p>
      </section>
    </div>
  );
}
