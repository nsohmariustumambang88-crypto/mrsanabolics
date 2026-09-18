/*
  Written copy for the collection pages (/shop/<category> and /shop/<category>/<group>).

  Everything else on those pages — how many listings, which manufacturers, which strengths, the
  price range, the comparison table, the questions — is computed from the catalogue, so it stays
  true as stock changes. This file holds only what cannot be computed: what each compound IS.

  The rules the journal's editorial policy sets apply here too, and they are why the entries are
  short: what the substance is, the form it comes in, and its regulatory status where that is a
  plain fact. No dosing, no protocols, no claims about effects. A shop page is the last place a
  reader should find either.

  Keys are the URL segments from lib/catalogue/paths.ts. A group with no entry still gets a page;
  it just opens on the computed facts instead of a description.
*/

export type ArticleSlug =
  | 'how-to-read-a-certificate-of-analysis'
  | 'how-to-spot-counterfeit-steroids'
  | 'hplc-mass-spectrometry-lab-testing-explained'
  | 'are-sarms-legal-fda-wada-tga'
  | 'anabolic-steroids-law-us-uk-canada-australia'
  | 'anabolic-steroid-health-risks';

export type CategoryCopy = {
  /** The heading and the start of the <title>: the phrase a person would search. */
  heading: string;
  /** One or two paragraphs. Plain text. */
  intro: string[];
  /** Journal articles that bear on everything in the category, most relevant first. */
  articles: ArticleSlug[];
  /** Prescription-only in the US, UK, Canada and Australia — adds that question to the FAQ. */
  prescription?: boolean;
};

export const CATEGORY_COPY: Record<string, CategoryCopy> = {
  injectables: {
    heading: 'Injectable steroids',
    intro: [
      'Anabolic–androgenic steroids for injection, in multi-dose vials and single-use ampoules: testosterone in its common esters, nandrolone, trenbolone, boldenone, drostanolone, methenolone, and blends of several esters in one vial.',
      'Listings are grouped by compound, so every manufacturer’s version of the same substance sits side by side with its strength and container as printed on the product.',
    ],
    articles: ['how-to-spot-counterfeit-steroids', 'how-to-read-a-certificate-of-analysis', 'anabolic-steroids-law-us-uk-canada-australia', 'anabolic-steroid-health-risks'],
    prescription: true,
  },
  orals: {
    heading: 'Oral steroids',
    intro: [
      'Anabolic steroids in tablet and capsule form: methandienone (Dianabol), oxandrolone (Anavar), stanozolol (Winstrol), oxymetholone (Anadrol), Turinabol, fluoxymesterone, methenolone acetate and methyltestosterone.',
      'Each compound has its own page listing every manufacturer’s version, with the strength per tablet and the pack size.',
    ],
    articles: ['how-to-spot-counterfeit-steroids', 'anabolic-steroid-health-risks', 'anabolic-steroids-law-us-uk-canada-australia', 'how-to-read-a-certificate-of-analysis'],
    prescription: true,
  },
  'post-cycle': {
    heading: 'Post-cycle and estrogen control',
    intro: [
      'Aromatase inhibitors (anastrozole, letrozole, exemestane), selective estrogen receptor modulators (clomiphene, tamoxifen), mesterolone, cabergoline, hCG, and 5-alpha-reductase inhibitors.',
      'All of them are prescription medicines. They are listed by active ingredient, so different manufacturers’ versions of the same drug can be compared directly.',
    ],
    articles: ['how-to-spot-counterfeit-steroids', 'how-to-read-a-certificate-of-analysis', 'anabolic-steroids-law-us-uk-canada-australia'],
    prescription: true,
  },
  peptides: {
    heading: 'Peptides, SARMs and growth hormone',
    intro: [
      'Research peptides, selective androgen receptor modulators (SARMs) and somatropin, the recombinant form of human growth hormone.',
      'No SARM is an approved medicine in any country, and most research peptides are not either. Our guide to the legal status of SARMs sets out where each regulator stands.',
    ],
    articles: ['are-sarms-legal-fda-wada-tga', 'hplc-mass-spectrometry-lab-testing-explained', 'how-to-read-a-certificate-of-analysis'],
  },
  'fat-burners': {
    heading: 'Fat burners',
    intro: [
      'Clenbuterol, the thyroid hormones liothyronine (T3) and levothyroxine (T4), and sibutramine, grouped by compound.',
    ],
    articles: ['how-to-spot-counterfeit-steroids', 'how-to-read-a-certificate-of-analysis'],
  },
  'sexual-health': {
    heading: 'Sexual health',
    intro: ['Sexual health medicines from the manufacturers in this catalogue, with each product’s strength and pack as printed on it.'],
    articles: ['how-to-spot-counterfeit-steroids', 'how-to-read-a-certificate-of-analysis'],
  },
  'skin-health': {
    heading: 'Skin health',
    intro: ['Skin health products from the manufacturers in this catalogue.'],
    articles: ['how-to-read-a-certificate-of-analysis'],
  },
  'immune-boosters': {
    heading: 'Immune support',
    intro: ['Immune support products from the manufacturers in this catalogue.'],
    articles: ['how-to-read-a-certificate-of-analysis'],
  },
  'syringes-needles': {
    heading: 'Syringes and needles',
    intro: ['Sterile, single-use syringes and needles.'],
    articles: [],
  },
};

/** What each compound is. Keyed `<category>/<group segment>`. */
export const GROUP_COPY: Record<string, string> = {
  'injectables/blends':
    'Pre-mixed injectables that combine two or more compounds or esters in one vial. Each label lists its components and the amount of each.',
  'injectables/testosterone-enanthate':
    'Testosterone with an enanthate ester attached, supplied as an oil-based solution for injection. It is a prescription medicine for male hypogonadism in most countries.',
  'injectables/testosterone-propionate':
    'Testosterone with the shorter propionate ester, supplied as an oil-based solution for injection.',
  'injectables/testosterone-cypionate':
    'Testosterone with a cypionate ester, supplied as an oil-based solution for injection. It is the form of testosterone most often prescribed in the United States.',
  'injectables/nandrolone':
    'Nandrolone (19-nortestosterone) for injection, mainly as nandrolone decanoate and nandrolone phenylpropionate.',
  'injectables/drostanolone':
    'Drostanolone, known as Masteron, supplied as the propionate or enanthate ester for injection.',
  'injectables/methenolone-primobolan':
    'Methenolone enanthate, sold as Primobolan Depot, for injection.',
  'injectables/testosterone-blends':
    'Several testosterone esters in one vial, in the style of Sustanon. Each label lists the esters it contains and the amount of each.',
  'injectables/boldenone':
    'Boldenone undecylenate, known as Equipoise, a steroid originally developed as a veterinary medicine.',
  'injectables/trenbolone':
    'Trenbolone as the acetate, enanthate or hexahydrobenzylcarbonate ester. Trenbolone was developed for veterinary use and is not approved as a human medicine today.',
  'injectables/winstrol-stanozolol':
    'Stanozolol as an injectable suspension, sold as Winstrol Depot.',
  'injectables/trestolone-acetate-ment':
    'Trestolone acetate, also called MENT, a synthetic androgen studied as a male contraceptive and never approved as a medicine.',
  'injectables/testosterone-undecanoate':
    'Testosterone undecanoate for injection, the long-acting ester used in medicines such as Nebido.',
  'injectables/testosterone-base':
    'Testosterone with no ester attached, supplied as a water-based suspension.',

  'orals/winstrol-stanozolol': 'Stanozolol tablets, sold as Winstrol.',
  'orals/dianabol-methandienone': 'Methandienone, also called methandrostenolone, in tablets sold under the Dianabol name.',
  'orals/anavar-oxandrolone': 'Oxandrolone tablets, sold as Anavar.',
  'orals/anadrol-oxymetholone': 'Oxymetholone tablets, sold as Anadrol.',
  'orals/turinabol': 'Chlorodehydromethyltestosterone tablets, sold as Oral Turinabol.',
  'orals/halotestin-fluoxymesterone': 'Fluoxymesterone tablets, sold as Halotestin.',
  'orals/primobolan-methenolone-acetate': 'Methenolone acetate tablets, the oral form of Primobolan.',
  'orals/methyltestosterone': 'Methyltestosterone in tablets and capsules.',

  'post-cycle/arimidex-anastrozole': 'Anastrozole, sold as Arimidex, an aromatase inhibitor prescribed for breast cancer.',
  'post-cycle/proviron-mesterolone': 'Mesterolone, sold as Proviron, an oral androgen.',
  'post-cycle/clomid-clomiphene': 'Clomiphene citrate, sold as Clomid, a selective estrogen receptor modulator prescribed to induce ovulation.',
  'post-cycle/nolvadex-tamoxifen': 'Tamoxifen, sold as Nolvadex, a selective estrogen receptor modulator prescribed for breast cancer.',
  'post-cycle/aromasin-exemestane': 'Exemestane, sold as Aromasin, a steroidal aromatase inhibitor prescribed for breast cancer.',
  'post-cycle/letrozole-femara': 'Letrozole, sold as Femara, an aromatase inhibitor prescribed for breast cancer.',
  'post-cycle/cabergoline-dostinex': 'Cabergoline, sold as Dostinex, a dopamine agonist prescribed for raised prolactin.',
  'post-cycle/hcg': 'Human chorionic gonadotropin (hCG), a hormone medicine supplied as a powder to be made up for injection.',
  'post-cycle/finasteride-and-dutasteride': 'Finasteride and dutasteride, 5-alpha-reductase inhibitors prescribed for hair loss and an enlarged prostate.',

  'peptides/peptides': 'Research peptides such as BPC-157, TB-500 and growth-hormone secretagogues. Most are not approved medicines anywhere.',
  'peptides/sarms': 'Selective androgen receptor modulators such as ostarine, ligandrol and RAD-140. No SARM is an approved medicine in any country.',
  'peptides/growth-hormone': 'Somatropin, the recombinant form of human growth hormone: a prescription medicine supplied as a powder or in pens for injection.',

  'fat-burners/clenbuterol': 'Clenbuterol hydrochloride, a beta-2 agonist that is not approved for human use in the United States.',
  'fat-burners/liothyronine-t3': 'Liothyronine (T3), a thyroid hormone prescribed for an underactive thyroid.',
  'fat-burners/levothyroxine-t4': 'Levothyroxine (T4), a thyroid hormone prescribed for an underactive thyroid.',
  'fat-burners/sibutramine': 'Sibutramine, a weight-loss drug withdrawn from the US and EU markets in 2010.',
};
