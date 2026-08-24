import type { Product } from '@/lib/types';

const img = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;

const sampleReviews = (seed: number) => [
  {
    id: `r${seed}1`,
    author: 'Marcus D.',
    rating: 5,
    date: '2024-11-12',
    title: 'Exceptional quality',
    body: 'Third order from MrAnabolics and the consistency is unmatched. Packaging was discreet and temperature-controlled.',
  },
  {
    id: `r${seed}2`,
    author: 'Jordan K.',
    rating: 5,
    date: '2024-10-04',
    title: 'Lab results verified',
    body: 'Sent a sample to an independent lab — purity came back at 99.2%. Will absolutely reorder.',
  },
  {
    id: `r${seed}3`,
    author: 'Alex R.',
    rating: 4,
    date: '2024-09-21',
    title: 'Great product, slow shipping',
    body: 'Product quality is top tier but international shipping took 9 days. Worth the wait though.',
  },
];

const baseFaqs = [
  {
    question: 'Are these products third-party tested?',
    answer:
      'Every batch undergoes independent third-party laboratory testing for purity, potency, and contaminants. Certificates of analysis are available upon request with each order.',
  },
  {
    question: 'How is my order packaged?',
    answer:
      'All orders ship in plain, discreet packaging with no external branding. Temperature-sensitive items include insulated packaging and cold packs where required.',
  },
  {
    question: 'What is the shelf life?',
    answer:
      'Unopened products stored correctly (cool, dry, away from direct sunlight) maintain full potency for 24–36 months from the manufacture date printed on each unit.',
  },
  {
    question: 'Do you ship internationally?',
    answer:
      'Yes. We ship to over 40 countries with tracked, insured delivery. Customs documentation is handled discreetly and professionally.',
  },
];

const sharedSpecs = (concentration: string, volume: string) => [
  { label: 'Concentration', value: concentration },
  { label: 'Volume', value: volume },
  { label: 'Active Half-Life', value: '7–10 days' },
  { label: 'Storage', value: 'Room temperature, protect from light' },
  { label: 'Manufacture', value: 'GMP-certified facility' },
  { label: 'Testing', value: 'Third-party verified' },
];

export const products: Product[] = [
  {
    id: 'p1',
    slug: 'testosterone-enanthate-300',
    name: 'Testosterone Enanthate 300',
    brand: 'NovaLabs',
    brandSlug: 'novalabs',
    category: 'Injectables',
    categorySlug: 'injectables',
    price: 89,
    compareAtPrice: 119,
    rating: 4.9,
    reviewCount: 214,
    inStock: true,
    stockCount: 84,
    isBestSeller: true,
    isTrending: true,
    description:
      'Pharmaceutical-grade testosterone enanthate at 300 mg/mL. Smooth release profile ideal for sustained research protocols.',
    longDescription:
      'Testosterone Enanthate 300 is a premium injectable preparation delivering 300 mg of testosterone enanthate per milliliter in a sterile, pyrogen-free carrier oil. Each vial is manufactured under GMP conditions and independently verified for potency and purity. The enanthate ester provides a steady, predictable release over 7–10 days, making it the benchmark compound for sustained androgenic research.',
    specifications: sharedSpecs('300 mg/mL', '10 mL vial'),
    benefits: [
      'Sustained 7–10 day release profile',
      'Highly predictable blood serum levels',
      'Minimal injection frequency',
      'Industry-standard reference compound',
    ],
    directions:
      'For research purposes only. Administer via intramuscular injection. Refer to your protocol for specific dosing. Always use sterile technique and dispose of sharps appropriately.',
    ingredients: [
      'Testosterone enanthate (USP grade)',
      'Grapeseed oil carrier',
      'Benzyl alcohol 2% v/v',
    ],
    shipping:
      'Ships within 24 hours in discreet, insulated packaging. Tracked international delivery available.',
    returns:
      'Unopened, sealed products may be returned within 14 days. See our refund policy for details.',
    images: [img(3683099), img(3683100), img(3683101)],
    faqs: baseFaqs,
    reviews: sampleReviews(1),
  },
  {
    id: 'p2',
    slug: 'trenbolone-acetate-100',
    name: 'Trenbolone Acetate 100',
    brand: 'Titan Research',
    brandSlug: 'titan-research',
    category: 'Injectables',
    categorySlug: 'injectables',
    price: 129,
    rating: 4.8,
    reviewCount: 167,
    inStock: true,
    stockCount: 52,
    isTrending: true,
    description:
      'High-potency trenbolone acetate at 100 mg/mL for advanced research applications.',
    longDescription:
      'Trenbolone Acetate 100 delivers 100 mg of trenbolone acetate per milliliter in a pharmaceutical-grade carrier. Renowned among advanced researchers for its exceptional anabolic-to-androgenic ratio, this compound is manufactured to the highest purity standards and verified by independent laboratory analysis.',
    specifications: sharedSpecs('100 mg/mL', '10 mL vial'),
    benefits: [
      'Exceptional anabolic potency',
      'Rapid clearance for flexible protocols',
      'No estrogenic conversion',
      'Lab-verified purity',
    ],
    directions:
      'For research purposes only. Intramuscular administration. Advanced compound — adhere strictly to protocol dosing.',
    ingredients: [
      'Trenbolone acetate (USP grade)',
      'Grapeseed oil carrier',
      'Benzyl alcohol 2% v/v',
    ],
    shipping:
      'Ships within 24 hours in discreet packaging. Cold-chain options available for sensitive shipments.',
    returns: 'Unopened sealed products returnable within 14 days.',
    images: [img(3683056), img(3683057), img(3735703)],
    faqs: baseFaqs,
    reviews: sampleReviews(2),
  },
  {
    id: 'p3',
    slug: 'anavar-oxandrolone-10',
    name: 'Anavar (Oxandrolone) 10',
    brand: 'ApexGenix',
    brandSlug: 'apexgenix',
    category: 'Orals',
    categorySlug: 'orals',
    price: 79,
    compareAtPrice: 99,
    rating: 4.9,
    reviewCount: 298,
    inStock: true,
    stockCount: 120,
    isBestSeller: true,
    isDeal: true,
    description:
      'Mild yet effective oxandrolone oral capsules at 10 mg per dose. Renowned for clean results.',
    longDescription:
      'Anavar (Oxandrolone) 10 provides 10 mg of ultra-pure oxandrolone per capsule in a pharmaceutical-grade oral formulation. Oxandrolone is widely regarded as one of the most well-tolerated oral compounds, prized for delivering quality results with a favorable side-effect profile. Each batch is third-party tested for content accuracy.',
    specifications: [
      { label: 'Strength', value: '10 mg per capsule' },
      { label: 'Quantity', value: '60 capsules' },
      { label: 'Active Half-Life', value: '9–10 hours' },
      { label: 'Storage', value: 'Room temperature, dry place' },
      { label: 'Manufacture', value: 'GMP-certified facility' },
      { label: 'Testing', value: 'Third-party verified' },
    ],
    benefits: [
      'Well-tolerated oral compound',
      'Clean, quality-focused results',
      'Favorable side-effect profile',
      'Convenient capsule format',
    ],
    directions:
      'For research purposes only. Take orally with food. Refer to your research protocol for specific dosing guidelines.',
    ingredients: [
      'Oxandrolone (USP grade) 10 mg',
      'Microcrystalline cellulose',
      'Magnesium stearate',
    ],
    shipping: 'Ships within 24 hours. Discreet, tamper-evident packaging.',
    returns: 'Unopened sealed products returnable within 14 days.',
    images: [img(3683076), img(3683077), img(3683078)],
    faqs: baseFaqs,
    reviews: sampleReviews(3),
  },
  {
    id: 'p4',
    slug: 'ostarine-mk-2866-25',
    name: 'Ostarine MK-2866 25',
    brand: 'Quantum Labs',
    brandSlug: 'quantum-labs',
    category: 'SARMs',
    categorySlug: 'sarms',
    price: 64,
    rating: 4.7,
    reviewCount: 189,
    inStock: true,
    stockCount: 96,
    isNew: true,
    isTrending: true,
    description:
      'Selective androgen receptor modulator at 25 mg/mL. The most-researched SARM available.',
    longDescription:
      'Ostarine MK-2866 25 is a selective androgen receptor modulator provided at 25 mg per milliliter in a convenient oral suspension. As the most extensively studied SARM, MK-2866 offers tissue-selective activity that has made it a staple in performance research. Independently verified for identity and purity.',
    specifications: [
      { label: 'Concentration', value: '25 mg/mL' },
      { label: 'Volume', value: '30 mL' },
      { label: 'Active Half-Life', value: '24 hours' },
      { label: 'Storage', value: 'Room temperature' },
      { label: 'Manufacture', value: 'GMP-certified facility' },
      { label: 'Testing', value: 'Third-party verified' },
    ],
    benefits: [
      'Tissue-selective activity',
      'Once-daily administration',
      'Most-researched SARM',
      'Oral suspension format',
    ],
    directions:
      'For research purposes only. Administer orally. Shake well before use. Follow your research protocol for dosing.',
    ingredients: [
      'Ostarine (MK-2866) 25 mg/mL',
      'PEG-400 carrier',
      'Glycerin',
      'Natural flavoring',
    ],
    shipping: 'Ships within 24 hours in discreet packaging.',
    returns: 'Unopened sealed products returnable within 14 days.',
    images: [img(3683094), img(3683095), img(3683096)],
    faqs: baseFaqs,
    reviews: sampleReviews(4),
  },
  {
    id: 'p5',
    slug: 'nolvadex-tamoxifen-20',
    name: 'Nolvadex (Tamoxifen) 20',
    brand: 'Pinnacle RX',
    brandSlug: 'pinnacle-rx',
    category: 'PCT',
    categorySlug: 'pct',
    price: 49,
    compareAtPrice: 69,
    rating: 4.8,
    reviewCount: 142,
    inStock: true,
    stockCount: 200,
    isBestSeller: true,
    description:
      'Tamoxifen citrate 20 mg capsules — the gold standard for post-cycle support protocols.',
    longDescription:
      'Nolvadex (Tamoxifen) 20 delivers 20 mg of tamoxifen citrate per capsule in a pharmaceutical-grade formulation. As the most widely recommended post-cycle support compound, tamoxifen helps researchers restore natural hormonal balance following intensive protocols.',
    specifications: [
      { label: 'Strength', value: '20 mg per capsule' },
      { label: 'Quantity', value: '50 capsules' },
      { label: 'Active Half-Life', value: '5–7 days' },
      { label: 'Storage', value: 'Room temperature, dry place' },
      { label: 'Manufacture', value: 'GMP-certified facility' },
      { label: 'Testing', value: 'Third-party verified' },
    ],
    benefits: [
      'Gold-standard PCT compound',
      'Supports hormonal recovery',
      'Well-tolerated oral format',
      'Extensively documented',
    ],
    directions:
      'For research purposes only. Take orally with water. Refer to your post-cycle protocol for dosing.',
    ingredients: [
      'Tamoxifen citrate 20 mg',
      'Microcrystalline cellulose',
      'Croscarmellose sodium',
    ],
    shipping: 'Ships within 24 hours. Discreet packaging.',
    returns: 'Unopened sealed products returnable within 14 days.',
    images: [img(3683102), img(3683103), img(3683104)],
    faqs: baseFaqs,
    reviews: sampleReviews(5),
  },
  {
    id: 'p6',
    slug: 'bpc-157-5mg',
    name: 'BPC-157 5mg',
    brand: 'Helix Bio',
    brandSlug: 'helix-bio',
    category: 'Peptides',
    categorySlug: 'peptides',
    price: 59,
    rating: 4.9,
    reviewCount: 176,
    inStock: true,
    stockCount: 64,
    isNew: true,
    isTrending: true,
    description:
      'Body protection compound 157 — 5 mg lyophilized peptide for recovery research.',
    longDescription:
      'BPC-157 5mg is a synthetic pentadecapeptide provided in lyophilized (freeze-dried) form for maximum stability. BPC-157 has generated significant research interest for its potential role in tissue recovery and repair. Each vial is synthesized to ≥99% purity and reconstitutes cleanly with bacteriostatic water.',
    specifications: [
      { label: 'Purity', value: '≥99% (HPLC verified)' },
      { label: 'Quantity', value: '5 mg per vial' },
      { label: 'Format', value: 'Lyophilized powder' },
      { label: 'Storage', value: 'Refrigerate after reconstitution' },
      { label: 'Manufacture', value: 'GMP-certified facility' },
      { label: 'Testing', value: 'Third-party verified' },
    ],
    benefits: [
      'High-purity synthetic peptide',
      'Stable lyophilized format',
      'Clean reconstitution',
      'Recovery-focused research',
    ],
    directions:
      'For research purposes only. Reconstitute with bacteriostatic water per protocol. Use sterile technique. Refrigerate after reconstitution.',
    ingredients: ['BPC-157 (synthetic) 5 mg', 'Mannitol (lyophilization aid)'],
    shipping:
      'Ships within 24 hours with cold-pack insulation for peptide stability.',
    returns: 'Unopened sealed products returnable within 14 days.',
    images: [img(3683091), img(3683092), img(3683093)],
    faqs: baseFaqs,
    reviews: sampleReviews(6),
  },
  {
    id: 'p7',
    slug: 'clenbuterol-40',
    name: 'Clenbuterol 40',
    brand: 'ApexGenix',
    brandSlug: 'apexgenix',
    category: 'Fat Burners',
    categorySlug: 'fat-burners',
    price: 54,
    compareAtPrice: 74,
    rating: 4.6,
    reviewCount: 121,
    inStock: true,
    stockCount: 88,
    isDeal: true,
    description:
      'Potent thermogenic compound at 40 mcg per tablet for body composition research.',
    longDescription:
      'Clenbuterol 40 provides 40 micrograms of clenbuterol hydrochloride per tablet in a precisely-dosed oral formulation. Widely researched for its thermogenic and lipolytic properties, this compound is a staple in advanced body composition studies.',
    specifications: [
      { label: 'Strength', value: '40 mcg per tablet' },
      { label: 'Quantity', value: '100 tablets' },
      { label: 'Active Half-Life', value: '26–36 hours' },
      { label: 'Storage', value: 'Room temperature, dry place' },
      { label: 'Manufacture', value: 'GMP-certified facility' },
      { label: 'Testing', value: 'Third-party verified' },
    ],
    benefits: [
      'Thermogenic activity',
      'Lipolytic properties',
      'Precise tablet dosing',
      'Convenient oral format',
    ],
    directions:
      'For research purposes only. Take orally. Begin with lowest protocol dose and titrate carefully. Not for continuous use.',
    ingredients: [
      'Clenbuterol hydrochloride 40 mcg',
      'Microcrystalline cellulose',
      'Calcium phosphate',
    ],
    shipping: 'Ships within 24 hours in discreet packaging.',
    returns: 'Unopened sealed products returnable within 14 days.',
    images: [img(3683089), img(3683090), img(3683097)],
    faqs: baseFaqs,
    reviews: sampleReviews(7),
  },
  {
    id: 'p8',
    slug: 'anastrozole-1mg',
    name: 'Anastrozole 1mg',
    brand: 'Pinnacle RX',
    brandSlug: 'pinnacle-rx',
    category: 'Ancillaries',
    categorySlug: 'ancillaries',
    price: 39,
    rating: 4.7,
    reviewCount: 98,
    inStock: true,
    stockCount: 150,
    description:
      'Aromatase inhibitor at 1 mg per tablet for estrogen management in research protocols.',
    longDescription:
      'Anastrozole 1mg delivers 1 mg of anastrozole per tablet in a pharmaceutical-grade formulation. As a potent aromatase inhibitor, it is widely used as an ancillary compound to manage estrogenic activity during intensive research protocols.',
    specifications: [
      { label: 'Strength', value: '1 mg per tablet' },
      { label: 'Quantity', value: '30 tablets' },
      { label: 'Active Half-Life', value: '40–50 hours' },
      { label: 'Storage', value: 'Room temperature, dry place' },
      { label: 'Manufacture', value: 'GMP-certified facility' },
      { label: 'Testing', value: 'Third-party verified' },
    ],
    benefits: [
      'Potent aromatase inhibition',
      'Convenient once-daily dosing',
      'Precise 1 mg tablet format',
      'Ancillary protocol staple',
    ],
    directions:
      'For research purposes only. Take orally. Dose per protocol — anastrozole is potent; titrate carefully.',
    ingredients: [
      'Anastrozole 1 mg',
      'Lactose monohydrate',
      'Magnesium stearate',
    ],
    shipping: 'Ships within 24 hours in discreet packaging.',
    returns: 'Unopened sealed products returnable within 14 days.',
    images: [img(3683098), img(3683055), img(3683059)],
    faqs: baseFaqs,
    reviews: sampleReviews(8),
  },
  {
    id: 'p9',
    slug: 'sustanon-350',
    name: 'Sustanon 350',
    brand: 'Onyx Therapeutics',
    brandSlug: 'onyx-therapeutics',
    category: 'Testosterone',
    categorySlug: 'testosterone',
    price: 109,
    rating: 4.8,
    reviewCount: 134,
    inStock: true,
    stockCount: 40,
    isNew: true,
    description:
      'Four-ester testosterone blend at 350 mg/mL for sustained multi-phase release.',
    longDescription:
      'Sustanon 350 is a precision-blended injectable containing four testosterone esters — testosterone propionate, phenylpropionate, isocaproate, and decanoate — at a total concentration of 350 mg/mL. This multi-ester formulation provides both fast-acting and long-lasting release, creating a sustained androgenic profile.',
    specifications: sharedSpecs('350 mg/mL', '10 mL vial'),
    benefits: [
      'Four-ester sustained release',
      'Fast onset + extended duration',
      'Reduced injection frequency',
      'Premium blend formulation',
    ],
    directions:
      'For research purposes only. Intramuscular administration. Refer to your protocol for specific dosing.',
    ingredients: [
      'Testosterone propionate 42 mg',
      'Testosterone phenylpropionate 84 mg',
      'Testosterone isocaproate 84 mg',
      'Testosterone decanoate 140 mg',
      'Grapeseed oil carrier',
      'Benzyl alcohol 2% v/v',
    ],
    shipping:
      'Ships within 24 hours in discreet, insulated packaging with cold packs.',
    returns: 'Unopened sealed products returnable within 14 days.',
    images: [img(3822906), img(3683061), img(3683062)],
    faqs: baseFaqs,
    reviews: sampleReviews(9),
  },
  {
    id: 'p10',
    slug: 'mass-stack-pro',
    name: 'Mass Stack Pro Bundle',
    brand: 'MrAnabolics',
    brandSlug: 'mranabolics',
    category: 'Bundles',
    categorySlug: 'bundles',
    price: 249,
    compareAtPrice: 329,
    rating: 4.9,
    reviewCount: 87,
    inStock: true,
    stockCount: 25,
    isBestSeller: true,
    isDeal: true,
    isTrending: true,
    description:
      'Curated 3-product mass research stack — injectable, oral, and PCT support included.',
    longDescription:
      'The Mass Stack Pro Bundle is a professionally curated three-product stack designed for advanced mass-accumulation research. Each component is selected to work synergistically: a sustained injectable base, a potent oral compound, and full PCT support. Save 24% versus purchasing each product separately.',
    specifications: [
      { label: 'Contents', value: '3 products + PCT support' },
      { label: 'Savings', value: '24% vs individual purchase' },
      { label: 'Protocol Length', value: '12 weeks' },
      { label: 'Storage', value: 'Mixed — see individual products' },
      { label: 'Manufacture', value: 'GMP-certified facilities' },
      { label: 'Testing', value: 'Third-party verified' },
    ],
    benefits: [
      'Synergistically designed stack',
      '24% savings vs individual',
      'Complete 12-week protocol',
      'Includes full PCT support',
    ],
    directions:
      'For research purposes only. Follow the included protocol guide for each component. PCT begins upon completion of the primary compounds.',
    ingredients: [
      'Testosterone Enanthate 300 (1 vial)',
      'Anavar Oxandrolone 10 (1 bottle)',
      'Nolvadex Tamoxifen 20 (1 bottle)',
      'Protocol guide included',
    ],
    shipping:
      'Ships within 24 hours in a single discreet, insulated package.',
    returns: 'Bundle returnable only if fully sealed and unopened.',
    images: [img(3683063), img(3683064), img(3683065)],
    faqs: baseFaqs,
    reviews: sampleReviews(10),
  },
  {
    id: 'p11',
    slug: 'injectable-supply-kit',
    name: 'Injectable Supply Kit',
    brand: 'MrAnabolics',
    brandSlug: 'mranabolics',
    category: 'Accessories',
    categorySlug: 'accessories',
    price: 29,
    rating: 4.7,
    reviewCount: 64,
    inStock: true,
    stockCount: 300,
    description:
      'Complete sterile administration kit — syringes, needles, alcohol prep pads, and sharps container.',
    longDescription:
      'The Injectable Supply Kit provides everything needed for safe, sterile administration in a single convenient package. Each kit contains individually wrapped sterile syringes, needles in multiple gauges, alcohol prep pads, and a puncture-resistant sharps container for responsible disposal.',
    specifications: [
      { label: 'Syringes', value: '50 × 3 mL luer-lock' },
      { label: 'Needles', value: '25 × 23G, 25 × 25G' },
      { label: 'Prep Pads', value: '100 alcohol swabs' },
      { label: 'Sharps Container', value: '1 × 1 quart' },
      { label: 'Sterility', value: 'Individually sealed, EO sterilized' },
      { label: 'Testing', value: 'ISO 13485 certified' },
    ],
    benefits: [
      'All-in-one sterile kit',
      'Multiple needle gauges included',
      'Puncture-resistant sharps container',
      'Individually sealed components',
    ],
    directions:
      'Single-use only. Always use sterile technique. Dispose of all sharps in the provided container. Never recap used needles.',
    ingredients: [
      '50 × sterile 3 mL syringes',
      '25 × 23G needles',
      '25 × 25G needles',
      '100 × alcohol prep pads',
      '1 × sharps container',
    ],
    shipping: 'Ships within 24 hours.',
    returns: 'Unopened sealed kits returnable within 14 days.',
    images: [img(3683066), img(3683067), img(3683068)],
    faqs: baseFaqs,
    reviews: sampleReviews(11),
  },
  {
    id: 'p12',
    slug: 'rad140-testolone-15',
    name: 'RAD140 Testolone 15',
    brand: 'Quantum Labs',
    brandSlug: 'quantum-labs',
    category: 'SARMs',
    categorySlug: 'sarms',
    price: 74,
    rating: 4.8,
    reviewCount: 156,
    inStock: true,
    stockCount: 72,
    isNew: true,
    description:
      'High-affinity SARM at 15 mg/mL — one of the most potent selective modulators researched.',
    longDescription:
      'RAD140 Testolone 15 provides 15 mg of RAD140 per milliliter in a convenient oral suspension. As one of the most potent selective androgen receptor modulators available for research, RAD140 exhibits high receptor affinity with tissue-selective activity. Independently verified for identity, purity, and concentration.',
    specifications: [
      { label: 'Concentration', value: '15 mg/mL' },
      { label: 'Volume', value: '30 mL' },
      { label: 'Active Half-Life', value: '20–24 hours' },
      { label: 'Storage', value: 'Room temperature' },
      { label: 'Manufacture', value: 'GMP-certified facility' },
      { label: 'Testing', value: 'Third-party verified' },
    ],
    benefits: [
      'High receptor affinity',
      'Tissue-selective activity',
      'Once-daily administration',
      'Potent SARM profile',
    ],
    directions:
      'For research purposes only. Administer orally. Shake well before use. Follow your research protocol for dosing.',
    ingredients: [
      'RAD140 (testolone) 15 mg/mL',
      'PEG-400 carrier',
      'Glycerin',
      'Natural flavoring',
    ],
    shipping: 'Ships within 24 hours in discreet packaging.',
    returns: 'Unopened sealed products returnable within 14 days.',
    images: [img(3683069), img(3683070), img(3683071)],
    faqs: baseFaqs,
    reviews: sampleReviews(12),
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((p) => p.categorySlug === categorySlug);
}

export function getProductsByBrand(brandSlug: string): Product[] {
  return products.filter((p) => p.brandSlug === brandSlug);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  /*
    Closest first, then top up. Several categories hold only one or two products, and
    returning a single related item left the grid with three empty cells. Relatedness degrades
    in a defined order — same category, then same manufacturer, then the rest of the
    catalogue — so the row always fills and the most relevant entries still lead it.
  */
  const seen = new Set([product.id]);
  const out: Product[] = [];

  const take = (candidates: Product[]) => {
    for (const candidate of candidates) {
      if (out.length >= limit) return;
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      out.push(candidate);
    }
  };

  take(products.filter((p) => p.categorySlug === product.categorySlug));
  take(products.filter((p) => p.brandSlug === product.brandSlug));
  take(products);

  return out;
}
