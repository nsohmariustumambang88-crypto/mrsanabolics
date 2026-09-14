/**
 * "11 September 2026" from a 'YYYY-MM-DD' date.
 *
 * Formatted in UTC on purpose. The dates are calendar days with no time; read in a local zone
 * west of Greenwich they fall back to the previous evening, and the server and the browser would
 * print different days for the same article.
 */
export function journalDate(value: string, month: 'long' | 'short' = 'long'): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month,
    year: 'numeric',
    timeZone: 'UTC',
  });
}
