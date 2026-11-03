import type { FaqItem } from '@/lib/types';

/*
  The /faq questions only a person can answer. Payment methods, delivery rates and times, and the
  minimum order are NOT here: the page computes them from what checkout uses (storeFaqs in
  lib/catalogue/buying-facts.ts), because the typed-in versions drifted until the page listed
  cards, PayPal, USDT and Litecoin.

  Every answer must be something the shop actually does. The previous set offered a "Mass Stack
  Pro" bundle and loyalty pricing that do not exist, and gave a 14-day returns window against the
  policy's 30. The stacks answer names real listings (Injectables → Blends); if either is
  delisted, change it. Testing is as the owner stated it on 3 November 2026: an independent laboratory
  tests every batch, and the certificate for the batch goes out with every order.
  Run `npm run db:seed` after editing.
*/
export const faqs: FaqItem[] = [
  {
    question: 'How is my order packed and tracked?',
    answer:
      'Every order ships in plain, unmarked packaging, tracked and insured. Orders are processed within 1–2 business days, and the tracking number is emailed to you when your parcel is dispatched.',
  },
  {
    question: 'What if my parcel does not arrive?',
    answer:
      'Write to us with your order number. If your parcel does not arrive, we send it again.',
  },
  {
    question: 'What is your return policy?',
    answer:
      'Unopened items in their original condition can be returned within 30 days of delivery. Email support@mrsanabolics.com with your order number and the reason, and we send you return instructions. Opened or used items cannot be returned. Return postage is yours to pay unless the item was faulty or damaged on our side, and refunds go back to the original payment method within 7–10 business days of the return arriving.',
  },
  {
    question: 'Are your products lab-tested?',
    answer:
      'Yes. Every batch is tested by an independent laboratory before we sell it, and the certificate of analysis for your batch comes with your order. When it arrives, check that the batch number on the certificate matches the one printed on your pack; our guide to reading a certificate of analysis, in the Journal, explains what else to check.',
  },
  {
    question: 'Do you offer discounts?',
    answer:
      'We do not run bulk-buy tiers. Standard delivery is free above a set order value (see the delivery question above), and newsletter subscribers are emailed discount codes from time to time.',
  },
  {
    question: 'Do you sell stacks or bundles?',
    answer:
      'We do not put bundles together ourselves, but some manufacturers make ready-mixed blends of several compounds in one vial, such as Mass-Stack 500 by Ultima Pharma and Mass Stack 500 Mix by Nakon Medical. You will find them in the Shop under Injectables, then Blends.',
  },
  {
    question: 'Do I need an account to order?',
    answer:
      'No. You can check out as a guest. If you open an account later with the same email address, your earlier orders appear in it.',
  },
  {
    question: 'Are these products legal in my country?',
    answer:
      'It depends on where you live, and in many countries buying these products without a prescription, or importing them, is an offence. Check the law where you live before you order: you are responsible for complying with it. Our guide to steroid law in the US, UK, Canada and Australia, in the Journal, sets out what the legislation says. We cannot give legal advice.',
  },
  {
    question: 'How should I store my products?',
    answer:
      'Follow the storage directions on the pack or leaflet, because they differ from product to product. Keep everything in its original packaging, away from heat, direct sunlight and moisture, and out of reach of children.',
  },
  {
    question: 'How can I contact customer support?',
    answer:
      'Our support team works 24 hours a day, 7 days a week, so there is always someone to answer, day or night, weekends included. Use the form on our Contact page, email support@mrsanabolics.com, or message us on Telegram or WhatsApp with the buttons at the bottom of every page.',
  },
];
