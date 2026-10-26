import './globals.css';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { Archivo, Familjen_Grotesk, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { HtmlRoot } from '@/components/i18n/html-root';
import { SITE } from '@/lib/site';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

const familjen = Familjen_Grotesk({
  subsets: ['latin'],
  variable: '--font-familjen',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    'performance supplements',
    'injectables',
    'SARMs',
    'PCT',
    'peptides',
    'fat burners',
    'third-party tested',
    SITE.name,
  ],
  authors: [{ name: SITE.name }],
  /*
    No canonical here. A canonical in the root layout is inherited by every page that does not
    set its own, and '/' told search engines that /contact and the legal pages were copies of the
    home page. Each indexable page declares its own address instead.
  */
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  formatDetection: { telephone: false, address: false },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2ece0' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1016' },
  ],
  colorScheme: 'light dark',
};

const directionContract = `
  IMPECCABLE DIRECTION CONTRACT — seed 39094e04 · form: Floated Pigment (ebru)

  THESIS: A compound is a substance suspended at a concentration; ebru is the craft of
  exactly that. The catalog is floated, combed, and lifted. Refuses both arrangements this
  category ships: the near-black page with one acid-green accent, and the soft DTC wellness grid.

  OWN-WORLD: One historical pigment set — indigo, madder, saffron, verdigris, lamp black — on
  two substrates. Light is the lifted sheet (handmade paper, fibrous, daylight). Dark is the
  bath (thickened water before the lift). Hairline plate rules, tabular assay numerals,
  concentric drop mark. No glass, no gradient text, no glow.

  STORY: A skeptical buyer sees suspension made visible, reads the assay for themselves, and
  lifts one sheet out of the bath.

  FIRST VIEWPORT: Live marbling bath holds the right half full-bleed and is combable by
  pointer; the wordmark, one claim, and the primary action sit left on paper, divided by a
  hairline plate rule. No hero image, no stat row.

  FORM: Floated Pigment — chosen by the user from the demoted row over the assigned roll
  (candidate 4, The Meet). Ebru supplies palette, material, topology, state, and motion.

  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review,
  the verdict, DESIGN.md, and every shipping raster carrying its provenance.
`;

/*
  Revalidate rather than freeze.

  The catalogue is read from the database at build time and regenerated at most once an hour, so
  an edit reaches the site without a redeploy while pages still serve as static HTML. Admin edits
  refresh their own pages immediately through revalidatePath.
  For per-request freshness instead, swap this for `export const dynamic = 'force-dynamic'`.
*/
export const revalidate = 3600;

/*
  The document shell, and nothing else.

  Storefront chrome and the catalogue live in app/(storefront)/layout.tsx; the admin has its
  own shell. Keeping this layer free of data fetching is what lets /admin/login render when
  the database is unreachable — which is exactly when someone needs to sign in and fix it.

  What stays here is genuinely global: the fonts, the theme, the direction contract, the
  duotone presses referenced by .duotone, and the site-level structured data.
*/

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* <html lang> follows the page's language (/es → es); see components/i18n/html-root.tsx. */
    <HtmlRoot className={`${archivo.variable} ${familjen.variable} ${jetbrains.variable}`}>
      <body className="font-sans" suppressHydrationWarning>
        <div dangerouslySetInnerHTML={{ __html: `<!--${directionContract}-->` }} />

        {/*
          Duotone presses. Editorial photography is printed in the house inks — indigo in the
          shadows, paper in the highlights — the way a two-colour press maps a halftone.
          Defined once here; .duotone in globals.css references them.
        */}
        <svg
          aria-hidden="true"
          focusable="false"
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        >
          <filter id="ebru-duotone" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0.2126 0.7152 0.0722 0 0
                      0.2126 0.7152 0.0722 0 0
                      0.2126 0.7152 0.0722 0 0
                      0 0 0 1 0"
            />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.10 0.98" />
              <feFuncG type="table" tableValues="0.21 0.97" />
              <feFuncB type="table" tableValues="0.38 0.94" />
            </feComponentTransfer>
          </filter>

          <filter id="ebru-duotone-dark" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0.2126 0.7152 0.0722 0 0
                      0.2126 0.7152 0.0722 0 0
                      0.2126 0.7152 0.0722 0 0
                      0 0 0 1 0"
            />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.04 0.72" />
              <feFuncG type="table" tableValues="0.09 0.75" />
              <feFuncB type="table" tableValues="0.17 0.80" />
            </feComponentTransfer>
          </filter>
        </svg>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                '@id': `${SITE.url}/#organization`,
                name: SITE.name,
                /*
                  The names people type for this shop. Deliberately NOT "MrAnabolics": that is a
                  separate business (mranabolics.com), and Google already sends that search there.
                */
                alternateName: ['Mrs Anabolics', 'mrsanabolics.com'],
                url: SITE.url,
                logo: `${SITE.url}/apple-icon.png`,
                description: SITE.description,
                slogan: SITE.slogan,
                email: 'support@mrsanabolics.com',
                sameAs: ['https://t.me/mrsanabolics'],
                contactPoint: {
                  '@type': 'ContactPoint',
                  contactType: 'customer support',
                  email: 'support@mrsanabolics.com',
                  url: `${SITE.url}/contact`,
                  hoursAvailable: {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                    opens: '00:00',
                    closes: '23:59',
                  },
                },
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                '@id': `${SITE.url}/#website`,
                url: SITE.url,
                name: SITE.name,
                description: SITE.description,
                publisher: { '@id': `${SITE.url}/#organization` },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${SITE.url}/shop?q={search_term_string}`,
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
            ]),
          }}
        />

        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </HtmlRoot>
  );
}
