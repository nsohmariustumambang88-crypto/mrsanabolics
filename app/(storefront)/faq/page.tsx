import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { getFaqs } from '@/lib/db/catalogue';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Questions',
  description:
    'How testing works, how orders ship, what the certificates cover, and what to do when something is wrong.',
  alternates: { canonical: '/faq' },
};

export const revalidate = 3600;

export default async function FaqPage() {
  const faqs = await getFaqs();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${SITE.url}/faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            Questions
          </h1>
          <p className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            How testing works, how orders ship, and what to do when something is wrong. If the
            answer is not here,{' '}
            <Link
              href="/contact"
              className="underline decoration-rule-strong underline-offset-4 transition-colors hover:decoration-pigment-indigo hover:text-pigment-indigo"
            >
              write to us
            </Link>
            .
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10">
          <div className="measure">
            <Accordion type="single" collapsible className="border-t border-rule">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-rule">
                  <AccordionTrigger className="py-5 text-left font-display text-base font-medium tracking-[-0.02em] hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-ink-soft">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </>
  );
}
