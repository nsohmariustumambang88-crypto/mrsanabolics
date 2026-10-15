export const metadata = {
  title: 'Privacy Policy',
  description:
    'What information MrAnabolics collects, how it is used and protected, how cookies and third-party services are handled, and your rights over your data.',
  alternates: { canonical: '/legal/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-ink-soft">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">1. Information We Collect</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          We collect information you provide directly to us when you create an account, make a purchase, or contact us. This includes your name, email address, shipping address, and payment information.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">2. How We Use Your Information</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          We use the information we collect to process your orders, send you order confirmations and updates, respond to your inquiries, and improve our services.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">3. Data Protection</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">4. Cookies</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          We use cookies to enhance your browsing experience. You can choose to disable cookies through your browser settings, though this may affect website functionality.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">5. Third-Party Services</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          We may share your information with third-party service providers who assist us in operating our website and conducting our business, subject to confidentiality agreements.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">6. Your Rights</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          You have the right to access, correct, or delete your personal information. Contact us at support@mranabolics.com to exercise these rights.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">7. Policy Changes</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          We may update this privacy policy from time to time. Changes will be posted on this page with an updated last-modified date.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">8. Contact Us</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          If you have questions about this privacy policy, please contact us at support@mranabolics.com.
        </p>
      </section>
    </div>
  );
}
