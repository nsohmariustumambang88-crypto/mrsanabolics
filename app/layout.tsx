import './globals.css';
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { StoreProvider } from '@/components/providers/store-provider';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { SearchDialog } from '@/components/search/search-dialog';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mranabolics.example.com'),
  title: {
    default: 'MrAnabolics — Premium Performance Supplements',
    template: '%s | MrAnabolics',
  },
  description:
    'Shop premium, lab-tested performance supplements at MrAnabolics. Injectable compounds, oral capsules, SARMs, PCT, peptides, and more — shipped securely worldwide.',
  keywords: [
    'performance supplements',
    'injectables',
    'SARMs',
    'PCT',
    'peptides',
    'fat burners',
    'MrAnabolics',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mranabolics.example.com',
    siteName: 'MrAnabolics',
    title: 'MrAnabolics — Premium Performance Supplements',
    description:
      'Shop premium, lab-tested performance supplements. Shipped securely worldwide.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MrAnabolics — Premium Performance Supplements',
    description:
      'Shop premium, lab-tested performance supplements. Shipped securely worldwide.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${poppins.variable} font-sans`}
        suppressHydrationWarning
      >
        <StoreProvider>
          <div className="relative min-h-screen">
            <AnnouncementBar />
            <SiteHeader />
            <main className="min-h-[60vh]">{children}</main>
            <SiteFooter />
            <CartDrawer />
            <SearchDialog />
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
