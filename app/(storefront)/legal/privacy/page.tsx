import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { getSettingsSafe } from '@/lib/settings';

/* The policy text is unchanged; only the frame around it, the metadata and the contact address are new. */

export const revalidate = 3600;

const PATH = '/legal/privacy';
const TITLE = 'Privacy Policy: How We Handle Your Data';
const DESCRIPTION =
  'What information MrsAnabolics collects, how it is used and protected, how cookies and third-party services are handled, and your rights over your data.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: 'website', url: PATH, title: TITLE, description: DESCRIPTION },
};

export default async function PrivacyPage() {
  const email = (await getSettingsSafe()).support_email;

  return (
    <LegalPage
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      heading="Privacy Policy"
      intro="This policy explains what personal information we collect when you shop or get in touch, what we use it for, how it is protected, and how to access, correct or delete it."
      updated="2026-09-29"
    >
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
          You have the right to access, correct, or delete your personal information. Contact us at {email} to exercise these rights.
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
          If you have questions about this privacy policy, please contact us at {email}.
        </p>
      </section>
    </LegalPage>
  );
}
