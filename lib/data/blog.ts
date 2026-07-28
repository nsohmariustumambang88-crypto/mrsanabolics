import type { BlogPost } from '@/lib/types';

const img = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;

export const blogPosts: BlogPost[] = [
  {
    id: 'b1',
    slug: 'understanding-testosterone-esters',
    title: 'Understanding Testosterone Esters: A Complete Guide',
    excerpt:
      'From enanthate to cypionate to sustanon blends — learn how ester chains affect release rates, half-lives, and protocol design.',
    content:
      'Testosterone esters differ primarily in the length of the attached carboxylic acid chain, which directly determines the compound release rate. Shorter esters like propionate release quickly and require frequent administration, while longer esters like decanoate provide sustained release over a week or more. Blends such as Sustanon combine multiple esters to achieve both rapid onset and extended duration. Understanding these pharmacokinetics is essential for designing effective research protocols.',
    category: 'Education',
    author: 'Dr. Sarah Klein',
    date: '2024-11-15',
    readTime: '8 min',
    image: img(3683099),
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
    author: 'Marcus Donovan',
    date: '2024-10-28',
    readTime: '6 min',
    image: img(3683102),
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
    author: 'Dr. Sarah Klein',
    date: '2024-10-12',
    readTime: '10 min',
    image: img(3683094),
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
    author: 'Priya Sharma',
    date: '2024-09-30',
    readTime: '5 min',
    image: img(3683091),
  },
  {
    id: 'b5',
    slug: 'third-party-testing-matters',
    title: 'Why Third-Party Testing Is Non-Negotiable',
    excerpt:
      'How independent laboratory verification works, what to look for in a certificate of analysis, and why it protects you.',
    content:
      'Third-party testing means a product is analyzed by an independent laboratory with no financial interest in the results. A proper certificate of analysis should include identity (the compound is what it claims), purity (free from contaminants), and potency (concentration matches the label). At MrAnabolics, every batch is tested and COAs are available on request.',
    category: 'Quality',
    author: 'Tom Whitfield',
    date: '2024-09-14',
    readTime: '7 min',
    image: img(3683056),
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
    author: 'Jordan Reyes',
    date: '2024-08-22',
    readTime: '9 min',
    image: img(3683063),
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
