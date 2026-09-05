/*
  The catalogue taxonomy, transcribed from the store's product-image folders.

  The folder tree in `mranabolic files` IS the taxonomy: the top level is the category, the
  second level (where there is one) is the compound group. Nothing here is invented — every
  slug below is a folder that exists, and the display names are the ordinary names for what
  those folders hold. prisma/seed-catalogue.ts reads prisma/image-library.json against this
  file to build categories, subcategories, brands and products.

  Prices are placeholders. The files carry no prices, and a shop without prices cannot be
  browsed, so each group gets a baseline that staff are expected to correct in the admin.
  They are not offers.
*/

export type CategoryDef = {
  slug: string;
  name: string;
  description: string;
  /** lucide icon name, kept for parity with the original Category shape. */
  icon: string;
};

/** In display order. Position in this array is the category's `position`. */
export const CATEGORIES: CategoryDef[] = [
  {
    slug: 'injectables',
    name: 'Injectables',
    description: 'Injectable compounds, grouped by ester and by compound.',
    icon: 'Syringe',
  },
  {
    slug: 'orals',
    name: 'Orals',
    description: 'Oral tablets and capsules, grouped by compound.',
    icon: 'Pill',
  },
  {
    slug: 'peptides',
    name: 'Peptides',
    description: 'Peptides, growth hormone and SARMs.',
    icon: 'Dna',
  },
  {
    slug: 'post-cycle',
    name: 'Post Cycle',
    description: 'Aromatase inhibitors, SERMs and cycle-support compounds.',
    icon: 'ShieldPlus',
  },
  {
    slug: 'fat-burners',
    name: 'Fat Burners',
    description: 'Thermogenic and thyroid compounds.',
    icon: 'Flame',
  },
  {
    slug: 'sexual-health',
    name: 'Sexual Health',
    description: 'PDE5 inhibitors and related tablets.',
    icon: 'HeartPulse',
  },
  {
    slug: 'immune-boosters',
    name: 'Immune Boosters',
    description: 'General health and support medicines.',
    icon: 'ShieldCheck',
  },
  {
    slug: 'skin-health',
    name: 'Skin Health',
    description: 'Isotretinoin and other skin treatments.',
    icon: 'Droplets',
  },
  {
    slug: 'syringes-needles',
    name: 'Syringes & Needles',
    description: 'Bacteriostatic water and administration supplies.',
    icon: 'Beaker',
  },
];

export type SubcategoryDef = {
  name: string;
  /** The active compound, used as the ingredient line. Null where a group is mixed. */
  compound: string | null;
};

/** Keyed `<category>/<subcategory>`, both as folder slugs. */
export const SUBCATEGORIES: Record<string, SubcategoryDef> = {
  'injectables/boldenone': { name: 'Boldenone', compound: 'Boldenone undecylenate' },
  'injectables/cypionate': { name: 'Testosterone Cypionate', compound: 'Testosterone cypionate' },
  'injectables/drostanolone': { name: 'Drostanolone', compound: 'Drostanolone' },
  'injectables/enantat': { name: 'Testosterone Enanthate', compound: 'Testosterone enanthate' },
  'injectables/methenolone': { name: 'Methenolone (Primobolan)', compound: 'Methenolone enanthate' },
  'injectables/nandrolone': { name: 'Nandrolone', compound: 'Nandrolone decanoate' },
  'injectables/propionate': { name: 'Testosterone Propionate', compound: 'Testosterone propionate' },
  'injectables/steroids': { name: 'Blends', compound: null },
  'injectables/testosterone-base': { name: 'Testosterone Base', compound: 'Testosterone (no ester)' },
  'injectables/testosterone': { name: 'Testosterone Blends', compound: 'Testosterone ester blend' },
  'injectables/trenbolone': { name: 'Trenbolone', compound: 'Trenbolone' },
  'injectables/trestolone-acetate': { name: 'Trestolone Acetate (MENT)', compound: 'Trestolone acetate' },
  'injectables/undecanoate': { name: 'Testosterone Undecanoate', compound: 'Testosterone undecanoate' },
  'injectables/winstrol-stanolol': { name: 'Winstrol (Stanozolol)', compound: 'Stanozolol' },

  'orals/anadrol-oxymeth': { name: 'Anadrol (Oxymetholone)', compound: 'Oxymetholone' },
  'orals/anavar-oxandrolone': { name: 'Anavar (Oxandrolone)', compound: 'Oxandrolone' },
  'orals/dianabol-methandienone': { name: 'Dianabol (Methandienone)', compound: 'Methandienone' },
  'orals/halotestin': { name: 'Halotestin (Fluoxymesterone)', compound: 'Fluoxymesterone' },
  'orals/methyl-testosterone': { name: 'Methyltestosterone', compound: 'Methyltestosterone' },
  'orals/primobolan-methenolone': { name: 'Primobolan (Methenolone Acetate)', compound: 'Methenolone acetate' },
  'orals/stanozolol-winstrol': { name: 'Winstrol (Stanozolol)', compound: 'Stanozolol' },
  'orals/turinabol': { name: 'Turinabol', compound: 'Chlorodehydromethyltestosterone' },

  'peptides/human-growth': { name: 'Growth Hormone', compound: 'Somatropin' },
  'peptides/peptides': { name: 'Peptides', compound: null },
  'peptides/sarms': { name: 'SARMs', compound: null },

  'post-cycle/armidex': { name: 'Arimidex (Anastrozole)', compound: 'Anastrozole' },
  'post-cycle/aromasin': { name: 'Aromasin (Exemestane)', compound: 'Exemestane' },
  'post-cycle/caber-dostinex': { name: 'Cabergoline (Dostinex)', compound: 'Cabergoline' },
  'post-cycle/clomid-clomiphene': { name: 'Clomid (Clomiphene)', compound: 'Clomiphene citrate' },
  'post-cycle/finasteride': { name: 'Finasteride & Dutasteride', compound: null },
  'post-cycle/hcg-vitagon': { name: 'HCG', compound: 'Human chorionic gonadotropin' },
  'post-cycle/litrozole': { name: 'Letrozole (Femara)', compound: 'Letrozole' },
  'post-cycle/nolvadex-tamoxifen': { name: 'Nolvadex (Tamoxifen)', compound: 'Tamoxifen citrate' },
  'post-cycle/proviron-mesterolone': { name: 'Proviron (Mesterolone)', compound: 'Mesterolone' },

  'fat-burners/clenbuterol': { name: 'Clenbuterol', compound: 'Clenbuterol hydrochloride' },
  'fat-burners/levotiron': { name: 'Levothyroxine (T4)', compound: 'Levothyroxine sodium' },
  'fat-burners/sibutramine': { name: 'Sibutramine', compound: 'Sibutramine' },
  'fat-burners/tiromel': { name: 'Liothyronine (T3)', compound: 'Liothyronine sodium' },
};

/**
 * Manufacturer names as they appear after the ` - ` in the file names, folded onto one
 * canonical spelling each. The files spell several brands more than one way ("Hilma Biocare",
 * "Hilma Pharma", "Hima Biocare"); a shop with three Hilma entries in the manufacturer filter
 * is a shop that cannot be filtered by manufacturer.
 *
 * Keys are lower-case with spaces removed, so matching is tolerant of case and spacing.
 */
export const BRAND_ALIASES: Record<string, string> = {
  ultimapharma: 'Ultima Pharma',
  deusmedical: 'Deus Medical',
  pharmaqous: 'Pharmaqo US',
  pharmaqo: 'Pharmaqo',
  intexpharma: 'Intex Pharma',
  nakonmedical: 'Nakon Medical',
  nakonmedica: 'Nakon Medical',
  driadamedical: 'Driada Medical',
  driadamedica: 'Driada Medical',
  beligaspharmaceuticals: 'Beligas Pharmaceuticals',
  beligaspharma: 'Beligas Pharmaceuticals',
  xtlabs: 'XT Labs',
  crowxlabs: 'Crowx Labs',
  crowx: 'Crowx Labs',
  testcrow: 'Crowx Labs',
  hilmabiocare: 'Hilma Biocare',
  hilmapharma: 'Hilma Biocare',
  himabiocare: 'Hilma Biocare',
  himapharma: 'Hilma Biocare',
  hutechlabs: 'Hutech Labs',
  britishdragon: 'British Dragon',
  dragonpharma: 'Dragon Pharma',
  bullpharma: 'Bull Pharma',
  kalpapharmaceuticals: 'Kalpa Pharmaceuticals',
  omegalab: 'Omega Lab',
  roidplus: 'Roid Plus',
  gomeisalabs: 'Gomeisa Labs',
  hemipharma: 'Hemi Pharma',
  saxonpharmaceuticals: 'Saxon Pharmaceuticals',
  aslanpharma: 'Aslan Pharma',
  ryzenpharmaceuticals: 'Ryzen Pharmaceuticals',
  ryzenpharma: 'Ryzen Pharmaceuticals',
  pfizer: 'Pfizer',
  deva: 'Deva',
  abdiibrahim: 'Abdi Ibrahim',
  sandoz: 'Sandoz',
  bayer: 'Bayer',
  zentiva: 'Zentiva',
  recordati: 'Recordati',
  cima: 'Cima',
  aksu: 'Aksu',
  aburaihan: 'Aburaihan',
  astrazeneca: 'AstraZeneca',
  kocakfarma: 'Koçak Farma',
  gsk: 'GSK',
  msd: 'MSD',
  organon: 'Organon',
  novartis: 'Novartis',
  drogsan: 'Drogsan',
};

/** For the handful of files whose name carries no manufacturer at all. */
export const UNLISTED_BRAND = 'Unlisted manufacturer';

/**
 * Compounds recognisable from the product name, for categories whose folder has no second
 * level. Ordered: the first pattern to match wins. Anything unmatched falls back to
 * "as labelled", which is the honest answer.
 */
export const COMPOUND_BY_NAME: [RegExp, string][] = [
  [/sildenafil|viag|silda|degra|vigrande/i, 'Sildenafil citrate'],
  [/tadalafil|cialis|cial|afilta|ciamed|ciarow|taldab|taldena|cialyn/i, 'Tadalafil'],
  [/levitra|vardenafil/i, 'Vardenafil'],
  [/dapoxetine/i, 'Dapoxetine'],
  [/accutane|aknetrent|zoretanin|isotretinoin/i, 'Isotretinoin'],
  [/bac(teriostatic)? water|watermed/i, 'Bacteriostatic water (0.9% benzyl alcohol)'],
  [/vitamin e|evigen/i, 'Tocopherol (vitamin E)'],
  [/dodex|b12/i, 'Cyanocobalamin (vitamin B12)'],
  [/pt[ -]?141/i, 'Bremelanotide (PT-141)'],
  [/champix/i, 'Varenicline'],
  [/betnovate/i, 'Betamethasone valerate'],
];

/**
 * What form a product takes, by category and group. This is what a buyer sees in the
 * specification table; it is derived from the folder, so it says what the folder says.
 */
export function formFor(category: string, subcategory: string | null): string {
  if (category === 'injectables') return 'Injectable, vial';
  if (category === 'orals') return 'Oral tablet';
  if (category === 'peptides') {
    if (subcategory === 'sarms') return 'Oral';
    return 'Lyophilised powder, vial';
  }
  if (category === 'post-cycle') {
    return subcategory === 'hcg-vitagon' ? 'Lyophilised powder, vial' : 'Oral tablet';
  }
  if (category === 'fat-burners') return 'Oral tablet';
  if (category === 'sexual-health') return 'Oral tablet';
  if (category === 'skin-health') return 'Oral capsule';
  if (category === 'syringes-needles') return 'Sterile water, vial';
  return 'As labelled';
}

/**
 * The unit a bare number in the product name most plausibly carries, by group. Null where a
 * bare number cannot be trusted to be a strength at all (a mixed folder of general medicines,
 * or supplies), in which case no strength is transcribed.
 */
export function strengthUnitFor(category: string, subcategory: string | null): string | null {
  if (category === 'injectables') return 'mg/mL';
  if (category === 'fat-burners') {
    return subcategory === 'sibutramine' ? 'mg per tablet' : 'mcg per tablet';
  }
  if (category === 'peptides') {
    if (subcategory === 'human-growth') return 'IU';
    if (subcategory === 'sarms') return 'mg per capsule';
    return 'mg per vial';
  }
  if (category === 'post-cycle') {
    return subcategory === 'hcg-vitagon' ? 'IU' : 'mg per tablet';
  }
  if (category === 'orals' || category === 'sexual-health') return 'mg per tablet';
  if (category === 'skin-health') return 'mg per capsule';
  return null;
}

/**
 * Placeholder baseline price in USD, by group. Deliberately coarse. The admin's inline price
 * editor is where real prices go; these exist so the shop has a price slider and a sort order
 * from day one rather than 800 rows at $0.
 */
export function baselinePrice(category: string, subcategory: string | null): number {
  const key = `${category}/${subcategory ?? ''}`;
  const table: Record<string, number> = {
    'injectables/steroids': 70,
    'injectables/testosterone': 65,
    'injectables/trenbolone': 75,
    'injectables/trestolone-acetate': 70,
    'injectables/methenolone': 80,
    'orals/anavar-oxandrolone': 60,
    'orals/primobolan-methenolone': 70,
    'peptides/human-growth': 190,
    'peptides/sarms': 55,
    'peptides/peptides': 45,
    'post-cycle/hcg-vitagon': 60,
  };
  if (table[key]) return table[key];

  const byCategory: Record<string, number> = {
    injectables: 55,
    orals: 45,
    peptides: 45,
    'post-cycle': 35,
    'fat-burners': 35,
    'sexual-health': 25,
    'immune-boosters': 20,
    'skin-health': 30,
    'syringes-needles': 12,
  };
  return byCategory[category] ?? 40;
}
