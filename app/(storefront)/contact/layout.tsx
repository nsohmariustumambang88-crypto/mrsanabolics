import type { Metadata } from 'next';

/*
  /contact is a client component (a form), and a 'use client' file cannot export metadata. Without
  this layout the page inherited the home page's title and description, so search engines saw two
  pages claiming to be the same one.
*/
export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Ask MrAnabolics about an order, a product or delivery. Support is staffed 24 hours a day, 7 days a week, and a person replies. Telegram and WhatsApp are also available.',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
