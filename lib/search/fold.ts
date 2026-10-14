/* Lower-cases and strips accents, so "Súper" and "super" are the same search. */
export function foldText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
