/*
  The checkout's country field takes a two-letter code (US, GB, DE), because that is what the
  delivery zones are keyed on. Browser autofill does not always oblige: asked for `country`, some
  browsers fill the name ("United Kingdom") instead of the code. The field used to have
  maxLength=2, which cut that to "UN" and quoted delivery for a country that does not exist.

  So the field accepts either, and a full name becomes its code here. Names come from the
  browser's own Intl.DisplayNames, in English and in the visitor's language, so there is no
  country table to keep up to date. Anything not recognised is left exactly as typed: the
  shopper may still be typing it.
*/

/* Names people commonly type that are not the official English short name. */
const ALIASES: Record<string, string> = {
  USA: 'US',
  AMERICA: 'US',
  'UNITED STATES OF AMERICA': 'US',
  UK: 'GB',
  'GREAT BRITAIN': 'GB',
  BRITAIN: 'GB',
  ENGLAND: 'GB',
  SCOTLAND: 'GB',
  WALES: 'GB',
  'NORTHERN IRELAND': 'GB',
  UAE: 'AE',
  HOLLAND: 'NL',
};

/* Upper case, accents off, punctuation off, single spaces: "Côte d'Ivoire" -> "COTE DIVOIRE". */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

let byName: Map<string, string> | null = null;

function namesToCodes(): Map<string, string> {
  if (byName) return byName;
  const map = new Map<string, string>();
  try {
    const locales = Array.from(
      new Set([typeof navigator !== 'undefined' ? navigator.language : 'en', 'en'])
    );
    const A = 'A'.charCodeAt(0);
    for (const locale of locales) {
      const names = new Intl.DisplayNames([locale], { type: 'region' });
      for (let i = 0; i < 26; i += 1) {
        for (let j = 0; j < 26; j += 1) {
          const code = String.fromCharCode(A + i, A + j);
          let name: string | undefined;
          try {
            name = names.of(code);
          } catch {
            name = undefined;
          }
          /* An unknown code comes back as itself; only real names are kept. */
          if (name && name !== code) {
            const key = fold(name);
            if (key && !map.has(key)) map.set(key, code);
          }
        }
      }
    }
  } catch {
    /* No Intl.DisplayNames in this browser: codes and the aliases above still work. */
  }
  byName = map;
  return map;
}

/** What the field should hold after this keystroke or autofill. */
export function normalizeCountryInput(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= 2) return raw.toUpperCase();

  const folded = fold(trimmed);
  /* "U.S." and the like. */
  if (/^[A-Z]{2}$/.test(folded.replace(/ /g, ''))) return folded.replace(/ /g, '');
  if (ALIASES[folded]) return ALIASES[folded];
  return namesToCodes().get(folded) ?? raw;
}

/** The two-letter code in the field, or '' while it holds something else. */
export function countryCode(value: string): string {
  const trimmed = value.trim();
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : '';
}
