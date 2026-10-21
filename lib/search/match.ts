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
  /* Trade names people search by, mapped to what the catalogue calls the product. */
  sustanon: ['susta', 'sustamed', 'sustalad'],
  sustaplex: ['susta', 'sustamed', 'sustalad'],
  testoviron: ['enanthate'],
  enanthate: ['enantat', 'enan'],
  cypionate: ['cyp', 'cypionat'],
};

/*
  Words that say nothing about a product. Somebody typing "Sistaplex like 5 minutes" is looking
  for Sistaplex; requiring "like" and "minutes" to appear in a product name too is why that search
  found nothing.
*/
const STOPWORDS = new Set([
  'a', 'an', 'and', 'any', 'buy', 'can', 'cheap', 'do', 'for', 'get', 'have', 'how', 'i', 'in',
  'is', 'it', 'like', 'me', 'minute', 'minutes', 'much', 'need', 'of', 'online', 'or', 'please',
  'price', 'sale', 'some', 'the', 'tiene', 'to', 'want', 'what', 'where', 'with', 'you',
]);

function words(text: string): string[] {
  return foldText(text).split(/[^a-z0-9]+/).filter(Boolean);
}

/** The words of a query worth matching: stopwords dropped, unless that would leave nothing. */
function queryTerms(query: string): string[] {
  const all = words(query);
  const meaningful = all.filter((w) => !STOPWORDS.has(w));
  return meaningful.length ? meaningful : all;
}

/*
  The alternatives a term stands for. A misspelt trade name still finds its aliases: "sistaplex"
  is one letter from "sustaplex". Only aliases of five letters or more are matched that loosely,
  so "test" never turns into "tren".
*/
function aliasesFor(term: string): string[] {
  const exact = ALIASES[term];
  if (exact) return exact;
  for (const [key, values] of Object.entries(ALIASES)) {
    if (key.length >= 5 && levenshtein(term, key) <= allowedEdits(key, false)) return values;
  }
  return [];
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
  const options = [term, ...aliasesFor(term)];
  return options.some((option) =>
    candidates.some((word) => {
      if (word === option) return true;
      /* A number is a strength: "400" is not "500", and "5" is not every one-letter word. */
      if (/^\d+$/.test(option)) return false;
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
  const terms = queryTerms(query);
  if (terms.length === 0) return false;
  const candidates = fields.flatMap(words);
  return terms.every((term) => termMatches(term, candidates, loose));
}

/*
  The last resort, when no product matches every word even loosely: how many of the query's words
  a product matches. "Tren entha" has no product matching both words but plenty matching "tren";
  "Ultima-Anomass 400 Mix" names two different products at once. `named` counts only words with a
  letter in them, so a strength alone ("400") never qualifies a product.
*/
export function matchCount(
  fields: string[],
  query: string,
  loose = false
): { matched: number; named: number } {
  const terms = queryTerms(query);
  const candidates = fields.flatMap(words);
  let matched = 0;
  let named = 0;
  for (const term of terms) {
    if (!termMatches(term, candidates, loose)) continue;
    matched += 1;
    if (/[a-z]/.test(term)) named += 1;
  }
  return { matched, named };
}
