import type { BlogPost } from '@/lib/types';

/*
  The journal's ORIGINAL posts. RETIRED: kept as a record, published nowhere, seeded by nothing.

  Their bodies are kept here verbatim, which is the standing rule for this content. What changed
  is that they are no longer on the site. The journal's editorial policy (/about#editorial-policy)
  rules out dosing, protocols and advice on what to combine, and two of these were exactly that:
  a PCT "protocol" with a duration, and a guide to designing a stack. The rest were five
  unsourced sentences each, and thin health content costs a whole site standing with search
  engines, not just the page itself.

  Each address now permanently redirects to the article that replaced it. The list, with the
  reason for each, is content/journal/retired.json, and the journal seed deletes the rows. The
  sixth original, `third-party-testing-matters`, claimed every batch is tested and was already
  removed from this file; it is retired the same way.

  The bylines here were corrected earlier from invented people (one a "Dr." with invented
  credentials) to the organisation. That correction stands.

  Written articles live in lib/data/journal.ts and content/journal/.
*/

const img = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;

/** The fields the rewrite added, at their "nothing recorded" values. */
const legacy = (): Pick<
  BlogPost,
  'metaTitle' | 'metaDescription' | 'imageCredit' | 'updated' | 'featured' | 'faqs' | 'sources'
> => ({
  metaTitle: null,
  metaDescription: null,
  imageCredit: null,
  updated: null,
  featured: false,
  faqs: [],
  sources: [],
});

export const retiredPosts: BlogPost[] = [
  {
    id: 'b1',
    slug: 'understanding-testosterone-esters',
    title: 'Understanding Testosterone Esters: A Complete Guide',
    excerpt:
      'From enanthate to cypionate to sustanon blends — learn how ester chains affect release rates, half-lives, and protocol design.',
    content:
      'Testosterone esters differ primarily in the length of the attached carboxylic acid chain, which directly determines the compound release rate. Shorter esters like propionate release quickly and require frequent administration, while longer esters like decanoate provide sustained release over a week or more. Blends such as Sustanon combine multiple esters to achieve both rapid onset and extended duration. Understanding these pharmacokinetics is essential for designing effective research protocols.',
    category: 'Education',
    author: 'MrAnabolics Editorial',
    date: '2024-11-15',
    readTime: '8 min',
    image: img(3683099),
    imageAlt: 'Laboratory glassware on a bench',
    ...legacy(),
  },
  {
    id: 'b2',
    slug: 'pct-protocols-explained',
    title: 'PCT Protocols Explained: Restoring Natural Balance',
    excerpt:
      'Why post-cycle support matters, the compounds most researchers use, and how to structure an evidence-based recovery protocol.',
    content:
      'Post-cycle support is a critical phase in any intensive research protocol. The goal is to restore natural hormonal production that may be suppressed during compound use. Tamoxifen and clomiphene are the most widely studied SERMs for this purpose, typically administered for 4–6 weeks. The timing of PCT initiation depends on the half-life of the primary compounds used.',
    category: 'Protocols',
    author: 'MrAnabolics Editorial',
    date: '2024-10-28',
    readTime: '6 min',
    image: img(3683102),
    imageAlt: 'Tablets and capsules arranged on a pale surface',
    ...legacy(),
  },
  {
    id: 'b3',
    slug: 'sarms-vs-steroids-research',
    title: 'SARMs vs Traditional Compounds: What the Research Shows',
    excerpt:
      'A balanced look at the differences in tissue selectivity, side-effect profiles, and research applications between SARMs and classical androgens.',
    content:
      'Selective androgen receptor modulators were developed to provide tissue-selective activity, theoretically reducing androgenic side effects in non-target tissues. While research is ongoing, early data suggests SARMs like Ostarine and RAD140 do exhibit meaningful tissue selectivity. However, potency per milligram is generally lower than classical compounds. The choice depends heavily on research goals.',
    category: 'Research',
    author: 'MrAnabolics Editorial',
    date: '2024-10-12',
    readTime: '10 min',
    image: img(3683094),
    imageAlt: 'Capsules on a laboratory bench',
    ...legacy(),
  },
  {
    id: 'b4',
    slug: 'peptide-storage-best-practices',
    title: 'Peptide Storage: Best Practices for Maximum Stability',
    excerpt:
      'Lyophilized vs reconstituted, refrigeration rules, and how to avoid the most common peptide handling mistakes.',
    content:
      'Proper peptide storage preserves potency and prevents degradation. Lyophilized peptides are stable at room temperature for short periods but should be refrigerated for long-term storage. Once reconstituted with bacteriostatic water, peptides must be refrigerated (2–8°C) and used within the protocol window. Avoid repeated freeze-thaw cycles and protect from light.',
    category: 'Education',
    author: 'MrAnabolics Editorial',
    date: '2024-09-30',
    readTime: '5 min',
    image: img(3683091),
    imageAlt: 'Small sealed vials in a storage tray',
    ...legacy(),
  },
  {
    id: 'b6',
    slug: 'designing-your-first-stack',
    title: 'Designing Your First Research Stack',
    excerpt:
      'A beginner-friendly framework for combining compounds synergistically, with emphasis on safety, support, and documentation.',
    content:
      'A well-designed stack combines compounds that complement rather than redundantly overlap. Beginners should start with a single primary compound, add an ancillary for support, and always include a PCT plan. The Mass Stack Pro bundle is an example of a professionally designed starter stack. Document everything — dose, timing, response.',
    category: 'Protocols',
    author: 'MrAnabolics Editorial',
    date: '2024-08-22',
    readTime: '9 min',
    image: img(3683063),
    imageAlt: 'Notebook and pen beside laboratory equipment',
    ...legacy(),
  },
];
