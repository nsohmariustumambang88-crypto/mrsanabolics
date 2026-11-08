/*
  The subjects a visitor can pick on the contact form.

  No `server-only` guard, for the same reason lib/marketing/consent.ts has none: the form that
  offers the choice and the route that validates it must work from ONE list. Two copies drift,
  and the drift shows up as a valid submission being rejected for an unknown subject.
*/

export const ENQUIRY_SUBJECTS = [
  'An order I placed',
  'A batch certificate',
  'Shipping or customs',
  'Returns',
  'Something else',
] as const;

export type EnquirySubject = (typeof ENQUIRY_SUBJECTS)[number];

export function isEnquirySubject(value: string): value is EnquirySubject {
  return (ENQUIRY_SUBJECTS as readonly string[]).includes(value);
}

/** Message length floor, shared so the form and the route reject the same thing. */
export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 5000;
export const MAX_NAME_LENGTH = 120;

/*
  The phone number is required, checked by lib/checkout/phone.ts (the checkout's rule). This is
  only the sentence for an empty field, since the checkout's speaks of the courier.
*/
export const ENQUIRY_PHONE_MISSING = 'Enter a phone number so we can reach you about your message.';
