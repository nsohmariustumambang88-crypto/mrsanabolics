/*
  The phone number rule, read by the checkout form, the contact form, and the server behind each.

  A plain module, not server-only, for the same reason as lib/orders/minimum.ts: the browser
  checks it so the shopper hears about a typo before Continue, and the server checks it again
  because a request can come from anywhere, not just the form.

  Deliberately loose about layout and strict about content. People write numbers every way there
  is ("+44 20 7946 0958", "(914) 313-7729"), and the carrier only needs the digits to be real, so
  spaces, brackets and dashes are kept as typed. What is refused is anything that is not a phone
  number: letters, a "+" anywhere but the front, fewer than 7 digits or more than 15 (the ITU
  E.164 ceiling for a full international number).
*/

export const PHONE_PLACEHOLDER = '+1 555 123 4567';

const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;
/* Room for 15 digits and generous punctuation; anything longer is not a phone number. */
const PHONE_MAX_LENGTH = 32;

export type PhoneCheck = { ok: true; phone: string } | { ok: false; error: string };

/* `missing` is the sentence for an empty field, because why the number is needed depends on the form. */
export function checkPhone(
  raw: unknown,
  missing = 'Enter a phone number so the courier can reach you about the delivery.'
): PhoneCheck {
  const phone = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';

  if (!phone) {
    return { ok: false, error: missing };
  }
  if (phone.length > PHONE_MAX_LENGTH || !/^\+?[0-9 ()-]+$/.test(phone)) {
    return {
      ok: false,
      error: `Use digits, spaces and + ( ) - only, for example ${PHONE_PLACEHOLDER}.`,
    };
  }

  const digits = phone.replace(/\D/g, '').length;
  if (digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS) {
    return {
      ok: false,
      error: `Enter a phone number of ${PHONE_MIN_DIGITS} to ${PHONE_MAX_DIGITS} digits, with the country code, for example ${PHONE_PLACEHOLDER}.`,
    };
  }

  return { ok: true, phone };
}
