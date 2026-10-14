import { foldText } from './fold';

/*
  Common shorthand and trade names, so a term typed one way finds the product or article named
  another way. Each value is a term the catalogue actually uses.
*/
const ALIASES: Record<string, string[]> = {
  gyno: ['gynecomastia'],
  gyne: ['gynecomastia'],
  test: ['testosterone'],
  tren: ['trenbolone'],
  deca: ['nandrolone'],
  npp: ['nandrolone'],
  dbol: ['dianabol', 'methandienone'],
  var: ['anavar', 'oxandrolone'],
  winny: ['winstrol', 'stanozolol'],
  pct: ['post', 'cycle'],
};

function words(text: string): string[] {
  return foldText(text).split(/[^a-z0-9]+/).filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }
  return prev[b.length];
}

/* Short words must match exactly; longer words may be off by a letter or two. */
function allowedEdits(term: string, loose: boolean): number {
  const base = term.length <= 3 ? 0 : term.length <= 6 ? 1 : 2;
  return loose ? base + 1 : base;
}

function termMatches(term: string, candidates: string[], loose: boolean): boolean {
  const options = [term, ...(ALIASES[term] ?? [])];
  return options.some((option) =>
    candidates.some((word) => {
      if (word === option) return true;
      if (option.length >= 3 && word.startsWith(option)) return true;
      return levenshtein(word, option) <= allowedEdits(option, loose);
    })
  );
}

/*
  Every word typed must match something in the fields. Matching is forgiving: prefixes count
  ("stano" finds stanozolol), a letter or two can be wrong ("tenosterone"), and shorthand from
  ALIASES is accepted. `loose` widens the tolerance, and is used only when nothing matched exactly.
*/
export function matchesQuery(fields: string[], query: string, loose = false): boolean {
  const terms = words(query);
  if (terms.length === 0) return false;
  const candidates = fields.flatMap(words);
  return terms.every((term) => termMatches(term, candidates, loose));
}
