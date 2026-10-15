import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

/* The policy text is unchanged; only the frame around it, the metadata and the contact address are new. */

const PATH = '/legal/terms';
const TITLE = 'Terms of Service: Using This Website';
const DESCRIPTION =
  'The terms for using the MrAnabolics website: acceptance, use licence, disclaimer, limitations, accuracy of materials, links, changes and governing law.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: 'website', url: PATH, title: TITLE, description: DESCRIPTION },
};

export default function TermsPage() {
  return (
    <LegalPage
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      heading="Terms of Service"
      intro="These terms apply to anyone using this website. They cover the licence to use its materials, the limits of our liability, links to other sites, changes to the terms and the law that governs them."
      updated="2026-09-29"
    >
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">1. Acceptance of Terms</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">2. Use License</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Permission is granted to temporarily download one copy of the materials (information or software) on MrAnabolics for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">3. Disclaimer</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          The materials on MrAnabolics are provided on an &apos;as is&apos; basis. MrAnabolics makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">4. Limitations</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          In no event shall MrAnabolics or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit) arising out of the use or inability to use the materials on MrAnabolics.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">5. Accuracy of Materials</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          The materials appearing on MrAnabolics could include technical, typographical, or photographic errors. MrAnabolics does not warrant that any of the materials on MrAnabolics are accurate, complete, or current.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">6. Links</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          MrAnabolics has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by MrAnabolics of the site. Use of any such linked website is at the user&apos;s own risk.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">7. Modifications</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          MrAnabolics may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">8. Governing Law</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          These terms and conditions are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
        </p>
      </section>
    </LegalPage>
  );
}
