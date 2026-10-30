import type { JournalSource } from '@/lib/types';

/*
  The journal's written articles: everything about each one except its body, which is Markdown
  at content/journal/<slug>.md. Seed source only — `npm run db:seed-journal` checks and writes
  them. App code reads the database, never this file.

  THE RULES THESE ARTICLES ARE HELD TO are the editorial policy at /about#editorial-policy:

  - Every factual claim is cited as [^n] against the numbered `sources` below, in order. The seed
    refuses an article that cites a source it does not list, or lists one it never cites.
  - Primary sources first: the regulator, the legislation, the standard, the published study.
  - No dosing, no protocols, no advice on what to take or combine.
  - The byline is the organisation. No invented authors, no invented credentials.
  - `date` is when the article was actually published here. It is not backdated to look
    established; `updated` is set only for a real revision.

  Photographs are from Pexels, under the Pexels License (free to use, attribution not
  required). They are credited anyway, because naming the photographer costs nothing.

  Retired addresses, and where they now redirect, are in content/journal/retired.json.
*/

export type JournalArticle = {
  slug: string;
  title: string;
  /** Shown on cards and under the headline; also the fallback meta description. 165 chars max. */
  excerpt: string;
  category: 'Testing' | 'Verification' | 'Law' | 'Health';
  author: string;
  /** 'YYYY-MM-DD' */
  date: string;
  updated?: string;
  image: string;
  imageAlt: string;
  imageCredit?: string;
  /** The <title> in search results when the headline is too long for one. ~60 chars. */
  metaTitle?: string;
  metaDescription?: string;
  featured?: boolean;
  faqs: { question: string; answer: string }[];
  sources: JournalSource[];
};

const BYLINE = 'MrsAnabolics Editorial';
const PUBLISHED = '2026-09-14';

const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;

const credit = (photographer: string) => `Photograph: ${photographer} / Pexels`;

export const articles: JournalArticle[] = [
  {
    slug: 'how-to-read-a-certificate-of-analysis',
    title: 'How to read a certificate of analysis, and how to tell if one is real',
    metaTitle: 'How to Read a Certificate of Analysis (and Spot a Fake)',
    excerpt:
      'A line-by-line guide to certificates of analysis: what each part should say, how to check the lab’s accreditation, and the red flags that mark a fake.',
    metaDescription:
      'What a certificate of analysis should show, how to verify the lab and its ISO 17025 scope, why batch numbers matter, and the red flags of a forged CoA.',
    category: 'Testing',
    author: BYLINE,
    date: PUBLISHED,
    featured: true,
    image: pexels(8533016),
    imageAlt:
      'A laboratory bench with a clipboard of printed notes and diagrams, a glass flask in front and a microscope to one side.',
    imageCredit: credit('Artem Podrez'),
    faqs: [
      {
        question: 'What is a certificate of analysis?',
        answer:
          'A report issued by a laboratory that records the tests performed on a particular sample, the method used for each, the specification each result was judged against, and the results. It describes that sample only.',
      },
      {
        question: 'How can I tell if a certificate of analysis is fake?',
        answer:
          'Find the laboratory independently through its accreditation body’s directory, confirm the test is on its scope of accreditation, check the batch number matches your product, and ask the laboratory directly whether it issued that certificate.',
      },
      {
        question: 'Does ISO/IEC 17025 accreditation cover every test a lab offers?',
        answer:
          'No. Accreditation is granted for a defined scope: a list of specific tests. A laboratory can be accredited for some tests and not others, so check that the test on the certificate appears on the scope.',
      },
      {
        question: 'Does a genuine certificate prove a product is safe?',
        answer:
          'No. It is evidence about what was in one tested sample. It cannot show that your container came from that batch, how it was stored afterwards, or whether the product is legal or safe for you.',
      },
    ],
    sources: [
      { title: 'Frequently asked questions: ISO/IEC 17025 and scope of accreditation', publisher: 'A2LA', url: 'https://a2la.org/faq/' },
      { title: 'ILAC MRA and Signatories', publisher: 'International Laboratory Accreditation Cooperation', url: 'https://ilac.org/ilac-mra-and-signatories/' },
      {
        title: 'ICH Q6A: Specifications, test procedures and acceptance criteria for new drug substances and new drug products (CPMP/ICH/367/96)',
        publisher: 'European Medicines Agency',
        year: '2000',
        url: 'https://www.ema.europa.eu/en/documents/scientific-guideline/ich-q-6-test-procedures-and-acceptance-criteria-new-drug-substances-and-new-drug-products-chemical-substances-step-5_en.pdf',
      },
      {
        title: 'ICH Q2(R2): Validation of analytical procedures',
        publisher: 'International Council for Harmonisation',
        year: '2023',
        url: 'https://database.ich.org/sites/default/files/ICH_Q2%28R2%29_Guideline_2023_1130.pdf',
      },
      { title: 'Common calibration certificate findings (ISO/IEC 17025 clause 7.8.2.1)', publisher: 'A2LA', url: 'https://a2la.org/common-calibration-certificate-findings/' },
      {
        title: 'Fake anabolic androgenic steroids on the black market: a systematic review and meta-analysis on qualitative and quantitative analytical results found within the literature',
        publisher: 'BMC Public Health (Magnolini R et al.)',
        year: '2022',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9288681/',
      },
      { title: 'Find an accredited organisation', publisher: 'United Kingdom Accreditation Service (UKAS)', url: 'https://www.ukas.com/find-an-organisation/' },
      { title: 'Directory of accredited organizations', publisher: 'A2LA', url: 'https://customer.a2la.org/index.cfm?event=directory.index' },
    ],
  },

  {
    slug: 'how-to-spot-counterfeit-steroids',
    title: 'How to spot counterfeit steroids and falsified medicines',
    metaTitle: 'How to Spot Counterfeit Steroids and Fake Medicines',
    excerpt:
      'How common fake and underdosed steroids are, the warning signs regulators publish for sellers and packaging, and why the most dangerous fakes look genuine.',
    metaDescription:
      'Evidence on how many black-market steroids are fake or underdosed, FDA and MHRA warning signs for sellers and packs, and why only lab testing can tell.',
    category: 'Verification',
    author: BYLINE,
    date: PUBLISHED,
    image: pexels(4210607),
    imageAlt:
      'Close-up of overlapping blister packs, with pink scored tablets in silver foil and yellow tablets in orange foil.',
    imageCredit: credit('Karola G'),
    faqs: [
      {
        question: 'How common are counterfeit anabolic steroids?',
        answer:
          'A 2022 meta-analysis of 19 studies and 5,413 samples estimated that 36% were counterfeit and a further 37% were substandard. The authors caution that the studies varied widely, but fewer than half of the products tested matched their labels.',
      },
      {
        question: 'Can you tell a fake steroid by looking at it?',
        answer:
          'Only a careless one. Packaging checks catch crude forgeries, but a vial containing a different substance or no active ingredient can look identical to the real product. Only laboratory testing shows what is inside.',
      },
      {
        question: 'What is the difference between substandard and falsified?',
        answer:
          'In WHO’s terms, a substandard product is an authorised product that fails its quality standards or specifications. A falsified product deliberately misrepresents its identity, composition or source.',
      },
      {
        question: 'What should I do if I think a product is counterfeit?',
        answer:
          'Stop using it, keep the packaging, batch number and proof of purchase, and report it to your national medicines regulator. If you feel unwell, get medical help and take the packaging with you.',
      },
    ],
    sources: [
      { title: 'Definitions of substandard and falsified (SF) medical products', publisher: 'World Health Organization', url: 'https://www.who.int/teams/regulation-prequalification/incidents-and-SF/background/definitions' },
      { title: 'Substandard and falsified medical products (fact sheet)', publisher: 'World Health Organization', year: '2024', url: 'https://www.who.int/news-room/fact-sheets/detail/substandard-and-falsified-medical-products' },
      {
        title: 'Fake anabolic androgenic steroids on the black market: a systematic review and meta-analysis on qualitative and quantitative analytical results found within the literature',
        publisher: 'BMC Public Health (Magnolini R et al.)',
        year: '2022',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9288681/',
      },
      { title: 'BeSafeRx: Considering an online pharmacy?', publisher: 'US Food and Drug Administration', url: 'https://www.fda.gov/drugs/besaferx-your-source-online-pharmacy-information/considering-online-pharmacy' },
      { title: '#FakeMeds: Spot a fake', publisher: 'Medicines and Healthcare products Regulatory Agency', year: '2026', url: 'https://fakemeds.campaign.gov.uk/spot-a-fake/' },
      { title: '#FakeMeds', publisher: 'Medicines and Healthcare products Regulatory Agency', year: '2026', url: 'https://fakemeds.campaign.gov.uk/' },
      {
        title: 'MHRA seizes illegal medicines worth almost £45m in 2025, disrupting major criminal networks',
        publisher: 'GOV.UK',
        year: '2026',
        url: 'https://www.gov.uk/government/news/mhra-seizes-illegal-medicines-worth-almost-45m-in-2025-disrupting-major-criminal-networks',
      },
      {
        title: 'Seven sentenced after MHRA investigation uncovers £1.8m illegal medicines and steroids network',
        publisher: 'GOV.UK',
        year: '2026',
        url: 'https://www.gov.uk/government/news/seven-sentenced-after-mhra-investigation-uncovers-18m-illegal-medicines-and-steroids-network',
      },
      {
        title: 'Global crackdown on illicit pharmaceuticals sees USD 15.5 million in seizures (Operation Pangea XVIII)',
        publisher: 'INTERPOL',
        year: '2026',
        url: 'https://www.interpol.int/en/News-and-Events/News/2026/Global-crackdown-on-illicit-pharmaceuticals-sees-USD-15.5-million-in-seizures',
      },
      { title: 'Falsified medicines', publisher: 'European Commission', url: 'https://health.ec.europa.eu/medicinal-products/falsified-medicines_en' },
    ],
  },

  {
    slug: 'hplc-mass-spectrometry-lab-testing-explained',
    title: 'What lab tests can and cannot prove: HPLC, mass spectrometry and certificates',
    metaTitle: 'HPLC vs Mass Spectrometry: What Lab Tests Can Prove',
    excerpt:
      'Identity, assay and purity are different questions. What HPLC and mass spectrometry each measure, and why “lab tested” can mean almost nothing.',
    metaDescription:
      'A plain-English guide to HPLC and mass spectrometry: what each test proves, why HPLC alone cannot confirm identity, and how to judge a “lab tested” claim.',
    category: 'Testing',
    author: BYLINE,
    date: PUBLISHED,
    image: pexels(10514991),
    imageAlt:
      'A laboratory autosampler, its robotic arm poised over a circular tray of blue-capped sample vials.',
    imageCredit: credit('Yuri Shkoda'),
    faqs: [
      {
        question: 'Can HPLC prove what a substance is?',
        answer:
          'Not on its own. HPLC is strong at measuring how much of a compound is present, but ICH Q6A states that identification by a single chromatographic retention time is not regarded as specific. Pairing chromatography with mass spectrometry is generally acceptable.',
      },
      {
        question: 'What is the difference between HPLC and mass spectrometry?',
        answer:
          'HPLC separates the compounds in a sample and measures each one, which makes it good for quantity and impurities. Mass spectrometry sorts ions by mass-to-charge ratio, producing a reproducible pattern that identifies a compound.',
      },
      {
        question: 'What does “not detected” mean on a lab report?',
        answer:
          'That the substance was not found above that method’s detection limit. It does not mean the substance is absent.',
      },
    ],
    sources: [
      { title: 'Chromatography (StatPearls)', publisher: 'NCBI Bookshelf', year: '2024', url: 'https://www.ncbi.nlm.nih.gov/books/NBK599545/' },
      {
        title: 'High-performance liquid chromatography (Analytical Chemistry 2.1, §12.5)',
        publisher: 'LibreTexts (Harvey D)',
        url: 'https://chem.libretexts.org/Courses/BethuneCookman_University/B-CU:_CH-345_Quantitative_Analysis/Book:_Analytical_Chemistry_2.1_(Harvey)/12:_Chromatographic_and_Electrophoretic_Methods/12.05:_High-Performance_Liquid_Chromatography',
      },
      { title: 'Mass spectrometer (StatPearls)', publisher: 'NCBI Bookshelf', year: '2024', url: 'https://www.ncbi.nlm.nih.gov/books/NBK589702/' },
      {
        title: 'ICH Q6A: Specifications, test procedures and acceptance criteria for new drug substances and new drug products (CPMP/ICH/367/96)',
        publisher: 'European Medicines Agency',
        year: '2000',
        url: 'https://www.ema.europa.eu/en/documents/scientific-guideline/ich-q-6-test-procedures-and-acceptance-criteria-new-drug-substances-and-new-drug-products-chemical-substances-step-5_en.pdf',
      },
      {
        title: 'ICH Q2(R2): Validation of analytical procedures',
        publisher: 'International Council for Harmonisation',
        year: '2023',
        url: 'https://database.ich.org/sites/default/files/ICH_Q2%28R2%29_Guideline_2023_1130.pdf',
      },
      { title: 'Frequently asked questions: ISO/IEC 17025 and scope of accreditation', publisher: 'A2LA', url: 'https://a2la.org/faq/' },
      { title: 'Common calibration certificate findings (ISO/IEC 17025 clause 7.8.2.1)', publisher: 'A2LA', url: 'https://a2la.org/common-calibration-certificate-findings/' },
      {
        title: 'Fake anabolic androgenic steroids on the black market: a systematic review and meta-analysis on qualitative and quantitative analytical results found within the literature',
        publisher: 'BMC Public Health (Magnolini R et al.)',
        year: '2022',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9288681/',
      },
    ],
  },

  {
    slug: 'are-sarms-legal-fda-wada-tga',
    title: 'Are SARMs legal? What the FDA, WADA and Australia’s TGA have actually said',
    metaTitle: 'Are SARMs Legal? FDA, WADA and TGA Positions Explained',
    excerpt:
      'SARMs are sold as supplements and “research chemicals”. What regulators in the US, UK and Australia have said, and what testing found inside them.',
    metaDescription:
      'Are SARMs legal? The FDA’s position, WADA’s ban, Australia’s prescription-only rule, UK trading standards seizures, and a JAMA study of what products contained.',
    category: 'Law',
    author: BYLINE,
    date: PUBLISHED,
    image: pexels(13787566),
    imageAlt: 'Tan capsules spilling from an unlabelled white bottle onto a white surface.',
    imageCredit: credit('Supplements On Demand'),
    faqs: [
      {
        question: 'Are SARMs legal in the United States?',
        answer:
          'The FDA says SARMs cannot be legally marketed in the US as a dietary supplement or a drug. They are not federally scheduled controlled substances: bills to schedule them in 2018 and 2019 were not enacted.',
      },
      {
        question: 'Are SARMs banned in sport?',
        answer:
          'Yes. WADA’s 2026 Prohibited List places SARMs under S1.2, Other Anabolic Agents, prohibited at all times in and out of competition. USADA warns that some supplements contain SARMs that are not on the label.',
      },
      {
        question: 'Are SARMs legal in Australia?',
        answer:
          'SARMs are Schedule 4, prescription-only, substances in Australia, and the TGA has stated that no SARM has been approved for human use.',
      },
      {
        question: 'Do products sold as SARMs contain what the label says?',
        answer:
          'Often not. A 2017 JAMA study of 44 products found only 52% contained SARMs, 39% contained a different unapproved drug, 9% contained no active compound, and only 41% matched the labelled amount.',
      },
    ],
    sources: [
      {
        title: 'FDA warns of use of selective androgen receptor modulators (SARMs) among teens, young adults',
        publisher: 'US Food and Drug Administration',
        year: '2023',
        url: 'https://www.fda.gov/consumers/consumer-updates/fda-warns-use-selective-androgen-receptor-modulators-sarms-among-teens-young-adults',
      },
      {
        title: 'Certain bodybuilding products put consumers at risk for heart attack, stroke, serious liver damage and more',
        publisher: 'US Food and Drug Administration',
        year: '2025',
        url: 'https://www.fda.gov/drugs/fraudulent-products/certain-bodybuilding-products-put-consumers-risk-heart-attack-stroke-serious-liver-damage-and-more',
      },
      {
        title: 'Warning letter: Infantry Labs LLC (535333)',
        publisher: 'US Food and Drug Administration',
        year: '2017',
        url: 'https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/infantry-labs-llc-535333-10232017',
      },
      {
        title: 'Chemical composition and labeling of substances marketed as selective androgen receptor modulators and sold via the Internet',
        publisher: 'JAMA (Van Wagoner RM et al.)',
        year: '2017',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29183075/',
      },
      {
        title: 'International Standard: Prohibited List 2026',
        publisher: 'World Anti-Doping Agency',
        year: '2025',
        url: 'https://www.wada-ama.org/sites/default/files/2025-09/2026list_en_final_clean_september_2025.pdf',
      },
      {
        title: 'Athlete advisory: Growing evidence that ostarine is a risk for athletes',
        publisher: 'US Anti-Doping Agency',
        year: '2026',
        url: 'https://www.usada.org/athlete-advisory/growing-evidence-ostarine-athlete-risk/',
      },
      {
        title: 'Redback SARMs pays fine for advertising prescription-only substances',
        publisher: 'Therapeutic Goods Administration',
        year: '2019',
        url: 'https://www.tga.gov.au/news/media-releases/redback-sarms-pays-fine-advertising-prescription-only-substances',
      },
      {
        title: 'Consumer story: Tim and selective androgen receptor modulators (SARMs)',
        publisher: 'Therapeutic Goods Administration',
        year: '2019',
        url: 'https://www.tga.gov.au/news/blog/consumer-story-tim-and-selective-androgen-receptor-modulators-sarms',
      },
      {
        title: 'Illegal muscle drugs worth half a million pounds seized by trading standards',
        publisher: 'Warwickshire County Council',
        year: '2024',
        url: 'https://www.warwickshire.gov.uk/news/article/5295/illegal-muscle-drugs-worth-half-a-million-pounds-seized-by-trading-standards',
      },
      {
        title: 'Telford & Wrekin Council seizes illegal SARMs sold as fitness supplements',
        publisher: 'Telford & Wrekin Council',
        year: '2025',
        url: 'https://newsroom.telford.gov.uk/news/telford-wrekin-council-seizes-illegal-sarms-sold-as-fitness-supplements',
      },
      { title: 'S.2742: SARMs Control Act of 2018', publisher: 'Congress.gov', year: '2018', url: 'https://www.congress.gov/bill/115th-congress/senate-bill/2742' },
      { title: 'S.2895: SARMs Control Act of 2019', publisher: 'Congress.gov', year: '2019', url: 'https://www.congress.gov/bill/116th-congress/senate-bill/2895/all-info' },
      {
        title: 'Selective androgen receptor modulator use and related adverse events including drug-induced liver injury: analysis of suspected cases',
        publisher: 'European Journal of Clinical Pharmacology (Leciejewska N et al.)',
        year: '2024',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38059982/',
      },
    ],
  },

  {
    slug: 'anabolic-steroids-law-us-uk-canada-australia',
    title: 'Anabolic steroids and the law in the US, UK, Canada and Australia',
    metaTitle: 'Are Steroids Legal? US, UK, Canada and Australia Compared',
    excerpt:
      'Possession, importing and supply of anabolic steroids in four countries, quoted from the legislation, and why legal to own is not the same as legal to post.',
    metaDescription:
      'Are anabolic steroids legal? Possession, import and supply rules in the US, UK, Canada and Australia, with penalties, quoted from the primary legislation.',
    category: 'Law',
    author: BYLINE,
    date: PUBLISHED,
    image: pexels(5668473),
    imageAlt: 'A dark wooden gavel with a brass band resting on its sound block, beside black binders on a desk.',
    imageCredit: credit('Sora Shimazaki'),
    faqs: [
      {
        question: 'Are anabolic steroids legal in the US?',
        answer:
          'They are Schedule III controlled substances. Possession without a valid prescription is a federal offence carrying up to one year and a minimum $1,000 fine for a first offence, and distribution carries up to 10 years.',
      },
      {
        question: 'Is it legal to possess steroids in the UK?',
        answer:
          'Anabolic steroids are Class C, but possessing the steroids listed in Part II of Schedule 4 of the Misuse of Drugs Regulations 2001 is not an offence in England, Wales and Scotland. Supply carries up to 14 years.',
      },
      {
        question: 'Can I have steroids posted to me in the UK?',
        answer:
          'Not under the personal-use exemption. Since April 2012 it covers only importation carried out in person for your own use, so steroids sent by post, courier or freight are not covered.',
      },
      {
        question: 'Are steroids legal in Canada and Australia?',
        answer:
          'In Canada they are Schedule IV: simple possession is not an offence, but trafficking and importing without authorisation are. In Australia they are prescription-only, illegal to possess without authority, and need written permission to import.',
      },
    ],
    sources: [
      { title: '21 U.S.C. 802: Definitions (including notes on the 1990 and 2014 Acts)', publisher: 'US Government Publishing Office', year: '2024', url: 'https://www.govinfo.gov/content/pkg/USCODE-2024-title21/html/USCODE-2024-title21-chap13-subchapI-partA-sec802.htm' },
      { title: 'Anabolic steroids (drug fact sheet)', publisher: 'DEA Diversion Control Division', year: '2025', url: 'https://www.deadiversion.usdoj.gov/drug_chem_info/anabolic.pdf' },
      { title: 'Implementation of the Anabolic Steroid Control Act of 2004 (70 FR 74653)', publisher: 'Federal Register', year: '2005', url: 'https://www.govinfo.gov/content/pkg/FR-2005-12-16/html/05-23907.htm' },
      { title: '21 CFR 1308.13: Schedule III', publisher: 'eCFR', year: '2026', url: 'https://www.ecfr.gov/current/title-21/section-1308.13' },
      { title: '21 U.S.C. 844: Penalty for simple possession', publisher: 'US Government Publishing Office', year: '2024', url: 'https://www.govinfo.gov/content/pkg/USCODE-2024-title21/html/USCODE-2024-title21-chap13-subchapI-partD-sec844.htm' },
      { title: '21 U.S.C. 841: Prohibited acts A', publisher: 'US Government Publishing Office', year: '2024', url: 'https://www.govinfo.gov/content/pkg/USCODE-2024-title21/html/USCODE-2024-title21-chap13-subchapI-partD-sec841.htm' },
      { title: '21 U.S.C. 952: Importation of controlled substances', publisher: 'US Government Publishing Office', year: '2024', url: 'https://www.govinfo.gov/content/pkg/USCODE-2024-title21/html/USCODE-2024-title21-chap13-subchapII-sec952.htm' },
      { title: '21 U.S.C. 829: Prescriptions (Ryan Haight Online Pharmacy Consumer Protection Act)', publisher: 'US Government Publishing Office', year: '2024', url: 'https://www.govinfo.gov/content/pkg/USCODE-2024-title21/html/USCODE-2024-title21-chap13-subchapI-partC-sec829.htm' },
      { title: 'Misuse of Drugs Act 1971, Schedule 2', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/ukpga/1971/38/schedule/2' },
      { title: 'Misuse of Drugs Regulations 2001, regulation 4', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/uksi/2001/3998/regulation/4' },
      { title: 'The Misuse of Drugs (Amendment No. 2) (England, Wales and Scotland) Regulations 2012: Explanatory Note', publisher: 'legislation.gov.uk', year: '2012', url: 'https://www.legislation.gov.uk/uksi/2012/973/note/made' },
      { title: 'Misuse of Drugs Act 1971, Schedule 4', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/ukpga/1971/38/schedule/4' },
      { title: 'Customs and Excise Management Act 1979, Schedule 1', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/ukpga/1979/2/schedule/1' },
      { title: 'Controlled Drugs and Substances Act (S.C. 1996, c. 19)', publisher: 'Justice Laws Website, Government of Canada', year: '2026', url: 'https://laws-lois.justice.gc.ca/eng/acts/C-38.8/FullText.html' },
      { title: 'Therapeutic Goods (Poisons Standard—June 2026) Instrument 2026', publisher: 'Federal Register of Legislation (Australia)', year: '2026', url: 'https://www.legislation.gov.au/F2026L00633/asmade' },
      { title: 'Customs (Prohibited Imports) Regulations 1956', publisher: 'Federal Register of Legislation (Australia)', year: '2026', url: 'https://www.legislation.gov.au/F1996B03651/latest/text' },
      { title: 'Drugs Misuse Regulation 1987', publisher: 'Queensland Legislation', year: '2026', url: 'https://www.legislation.qld.gov.au/view/pdf/inforce/current/sl-1987-dmr' },
    ],
  },

  {
    slug: 'anabolic-steroid-health-risks',
    title: 'The health risks of anabolic steroids: what the evidence says',
    metaTitle: 'Anabolic Steroid Side Effects and Health Risks: The Evidence',
    excerpt:
      'What NIDA, the NHS, the Endocrine Society and the largest studies say about steroid risks to the heart, hormones, fertility and mental health, with sources.',
    metaDescription:
      'Anabolic steroid health risks from NIDA, the NHS and major studies: heart damage, mortality, fertility, dependence and infection, plus where to get help.',
    category: 'Health',
    author: BYLINE,
    date: PUBLISHED,
    image: pexels(28585011),
    imageAlt:
      'Grey ECG lead cables with coloured electrode clips lying across a printed 12-lead electrocardiogram trace.',
    imageCredit: credit('Marta Branco'),
    faqs: [
      {
        question: 'What are the main health risks of anabolic steroids?',
        answer:
          'NIDA lists early heart attacks, strokes, liver tumours, kidney failure and psychiatric problems. The NHS adds high blood pressure, deep vein thrombosis and high cholesterol, and injecting carries risks of HIV and hepatitis.',
      },
      {
        question: 'Do anabolic steroids damage the heart?',
        answer:
          'A 2017 study in Circulation found long-term users had weaker heart pumping function (ejection fraction 52% against 63%) and more coronary plaque than non-users, which the authors associated with long-term use.',
      },
      {
        question: 'Does fertility recover after stopping steroids?',
        answer:
          'Often, but not always. In the HAARLEM study testosterone generally normalised within three months and sperm production took about a year, but at the end of follow-up 11% still had low testosterone and 34% a low sperm count.',
      },
      {
        question: 'Can you become dependent on anabolic steroids?',
        answer:
          'Yes. The Endocrine Society estimates about 30% of users may develop dependence, and NIDA warns that depression during withdrawal is the most dangerous withdrawal symptom.',
      },
    ],
    sources: [
      {
        title: 'Anabolic steroids and other appearance and performance enhancing drugs (APEDs)',
        publisher: 'National Institute on Drug Abuse',
        year: '2024',
        url: 'https://nida.nih.gov/research-topics/anabolic-steroids',
      },
      { title: 'Anabolic steroid misuse', publisher: 'NHS', year: '2026', url: 'https://www.nhs.uk/conditions/anabolic-steroid-misuse/' },
      {
        title: 'Adverse health consequences of performance-enhancing drugs: an Endocrine Society scientific statement',
        publisher: 'Endocrine Reviews (Pope HG Jr et al.)',
        year: '2014',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4026349/',
      },
      {
        title: 'Cardiovascular toxicity of illicit anabolic-androgenic steroid use',
        publisher: 'Circulation (Baggish AL et al.)',
        year: '2017',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28533317/',
      },
      {
        title: 'Health consequences of androgenic anabolic steroid use',
        publisher: 'Journal of Internal Medicine (Horwitz H et al.)',
        year: '2019',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30460728/',
      },
      {
        title: 'Positive and negative side effects of androgen abuse. The HAARLEM study: a one-year prospective cohort study in 100 men',
        publisher: 'Scandinavian Journal of Medicine & Science in Sports (Smit DL et al.)',
        year: '2021',
        url: 'https://pubmed.ncbi.nlm.nih.gov/33038020/',
      },
      {
        title: 'Disruption and recovery of testicular function during and after androgen abuse: the HAARLEM study',
        publisher: 'Human Reproduction (Smit DL et al.)',
        year: '2021',
        url: 'https://pubmed.ncbi.nlm.nih.gov/33550376/',
      },
      {
        title: 'Prevalence of, and risk factors for, HIV, hepatitis B and C infections among men who inject image and performance enhancing drugs: a cross-sectional study',
        publisher: 'BMJ Open (Hope VD et al.)',
        year: '2013',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24030866/',
      },
      {
        title: 'The global epidemiology of anabolic-androgenic steroid use: a meta-analysis and meta-regression analysis',
        publisher: 'Annals of Epidemiology (Sagoe D et al.)',
        year: '2014',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24582699/',
      },
      { title: 'Image and performance enhancing drugs', publisher: 'FRANK', url: 'https://www.talktofrank.com/drug/image-and-performance-enhancing-drug' },
      { title: 'Steroids', publisher: 'Alcohol and Drug Foundation', url: 'https://adf.org.au/drug-facts/steroids/' },
      { title: 'National Helpline', publisher: 'Substance Abuse and Mental Health Services Administration', url: 'https://www.samhsa.gov/find-help/helplines/national-helpline' },
    ],
  },
  {
    slug: 'what-are-anabolic-steroids',
    title: 'What are anabolic steroids, and how do they work?',
    metaTitle: 'What Are Anabolic Steroids and How Do They Work?',
    excerpt:
      'What anabolic steroids are, how they act through the androgen receptor, what they are prescribed for, and how they differ from corticosteroids, with sources.',
    metaDescription:
      'Anabolic steroids explained with sources: what they are, how they work via the androgen receptor, approved medical uses, and how they differ from corticosteroids.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-03',
    updated: '2026-10-30',
    image: pexels(8533016),
    imageAlt:
      'A laboratory bench with a clipboard of printed notes and diagrams, a glass flask in front and a microscope to one side.',
    imageCredit: credit('Artem Podrez'),
    faqs: [
      {
        question: 'What are anabolic steroids?',
        answer:
          'Synthetic substances similar to the male sex hormone testosterone, in NIDA\'s definition. Their full name is anabolic-androgenic steroids: they promote muscle growth (anabolic effects) and male sexual characteristics (androgenic effects).',
      },
      {
        question: 'How do anabolic steroids work?',
        answer:
          'They bind to and activate the androgen receptor. The activated receptor moves into the cell nucleus, attaches to DNA and switches on target genes. How a steroid is metabolised in each tissue helps explain why some act more on muscle than others, though none is purely anabolic.',
      },
      {
        question: 'What are anabolic steroids used for medically?',
        answer:
          'In the US, the DEA lists approved uses including testosterone deficiency, delayed puberty, anaemia, breast cancer and AIDS-related tissue wasting. NIDA notes they are not approved for improving well-being or bone strength.',
      },
      {
        question: 'What is the difference between anabolic steroids and corticosteroids?',
        answer:
          'Corticosteroids are anti-inflammatory medicines used for conditions such as asthma, eczema and rheumatoid arthritis. They work on inflammation and the immune system rather than the androgen receptor, and the NHS says they are not the same as anabolic steroids.',
      },
      {
        question: 'Are anabolic steroids legal?',
        answer:
          'It depends on the country. In the US they are Schedule III controlled substances. In the UK the NHS describes them as class C medicines that pharmacists can issue only on prescription, and supplying them carries up to 14 years in prison.',
      },
    ],
    sources: [
      {
        title: 'Anabolic steroids and other appearance and performance enhancing drugs (APEDs)',
        publisher: 'National Institute on Drug Abuse',
        year: '2024',
        url: 'https://nida.nih.gov/research-topics/anabolic-steroids',
      },
      {
        title: 'Anabolic steroids (drug fact sheet)',
        publisher: 'DEA Diversion Control Division',
        year: '2025',
        url: 'https://www.deadiversion.usdoj.gov/drug_chem_info/anabolic.pdf',
      },
      {
        title: 'Pharmacology of anabolic steroids',
        publisher: 'British Journal of Pharmacology (Kicman AT)',
        year: '2008',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2439524/',
      },
      {
        title: 'Steroids',
        publisher: 'NHS',
        year: '2025',
        url: 'https://www.nhs.uk/medicines/steroids/',
      },
      {
        title: '21 U.S.C. 802: Definitions',
        publisher: 'US Government Publishing Office',
        year: '2024',
        url: 'https://www.govinfo.gov/content/pkg/USCODE-2024-title21/html/USCODE-2024-title21-chap13-subchapI-partA-sec802.htm',
      },
      {
        title: 'Adverse health consequences of performance-enhancing drugs: an Endocrine Society scientific statement',
        publisher: 'Endocrine Reviews (Pope HG Jr et al.)',
        year: '2014',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4026349/',
      },
      {
        title: 'The global epidemiology of anabolic-androgenic steroid use: a meta-analysis and meta-regression analysis',
        publisher: 'Annals of Epidemiology (Sagoe D et al.)',
        year: '2014',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24582699/',
      },
      {
        title: 'The effects of supraphysiologic doses of testosterone on muscle size and strength in normal men',
        publisher: 'New England Journal of Medicine (Bhasin S et al.)',
        year: '1996',
        url: 'https://pubmed.ncbi.nlm.nih.gov/8637535/',
      },
      {
        title: 'Testosterone enanthate injection, USP: prescribing information',
        publisher: 'DailyMed, US National Library of Medicine',
        year: '2026',
        url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e89d6458-428c-4256-97a3-f1fa851293c1',
      },
      {
        title: 'Gemini Laboratories, LLC, et al.; Withdrawal of Approval of One New Drug Application for OXANDRIN (Oxandrolone) Tablets and Four Abbreviated New Drug Applications for Oxandrolone Tablets (88 FR 41970)',
        publisher: 'Federal Register (US Food and Drug Administration)',
        year: '2023',
        url: 'https://www.govinfo.gov/content/pkg/FR-2023-06-28/html/2023-13733.htm',
      },
      {
        title: 'International Standard: Prohibited List 2026',
        publisher: 'World Anti-Doping Agency',
        year: '2025',
        url: 'https://www.wada-ama.org/sites/default/files/2025-09/2026list_en_final_clean_september_2025.pdf',
      },
      {
        title: 'Anabolic steroid misuse',
        publisher: 'NHS',
        year: '2026',
        url: 'https://www.nhs.uk/conditions/anabolic-steroid-misuse/',
      },
    ],
  },
  {
    slug: 'how-to-buy-steroids-online-safely',
    title: 'How to buy steroids online safely, and how to tell which suppliers are legit',
    metaTitle: 'How to Buy Steroids Online Safely (and Spot Legit Sellers)',
    excerpt:
      'The law on buying steroids online, what tests of black-market products have found, and the checks to run on any seller, this shop included, before you pay.',
    metaDescription:
      'Is it legal to buy steroids online? What tests of seized products found, how rogue sellers and payment scams work, and how to check whether a supplier is legit.',
    category: 'Verification',
    author: BYLINE,
    date: '2026-10-03',
    updated: '2026-10-30',
    image: pexels(8533016),
    imageAlt:
      'A laboratory bench with a clipboard of printed notes and diagrams, a glass flask in front and a microscope to one side.',
    imageCredit: credit('Artem Podrez'),
    faqs: [
      {
        question: 'Is it legal to buy steroids online?',
        answer:
          'It depends on where you live, and ordering by post is often treated more strictly than possession. In the US, anabolic steroids are Schedule III and a prescription controlled substance may not be supplied over the internet without a valid prescription. In the UK, the import exemption covers only steroids carried in person for your own use, not a parcel. Canada prohibits importing them unless authorised under the regulations, and Australia requires a written permission to import them.',
      },
      {
        question: 'How can I tell if a steroid supplier is legit?',
        answer:
          'In law, the legitimate supplier is a licensed pharmacy dispensing on a valid prescription, and a shop selling without one is outside that system. Beyond that, check that the business is real and reachable, that it publishes returns and delivery terms, that packs carry batch numbers and any certificate can be verified with the laboratory, and how your payment is protected. None of these checks proves what is inside a product; only a laboratory test can.',
      },
      {
        question: 'Is it safe to pay for steroids with cryptocurrency?',
        answer:
          'The US Federal Trade Commission says cryptocurrency payments do not come with legal protections and typically are not reversible, unlike credit and debit cards. The UK medicines regulator lists accepting payment in cryptocurrency as one of its signs of a dodgy medicines website. Know what recourse you have before you pay any seller this way.',
      },
      {
        question: 'How common are fake steroids bought online?',
        answer:
          'A 2022 meta-analysis of 19 studies covering 5,413 samples found 36% were counterfeit, with contents that did not match the label, and 37% were substandard, with the right substance in the wrong amount. The authors say the figures must be interpreted with caution because the studies varied widely.',
      },
      {
        question: 'Can you tell if steroids are fake by looking at them?',
        answer:
          'Not reliably. The two largest groups of counterfeits in the 2022 meta-analysis contained a different substance or no active ingredient at all, and a container like that can look exactly like the real product. Only a laboratory can tell what is inside.',
      },
    ],
    sources: [
      {
        title: '21 CFR 1308.13: Schedule III',
        publisher: 'eCFR',
        year: '2026',
        url: 'https://www.ecfr.gov/current/title-21/section-1308.13',
      },
      {
        title: '21 U.S.C. 829: Prescriptions (Ryan Haight Online Pharmacy Consumer Protection Act)',
        publisher: 'US Government Publishing Office',
        year: '2024',
        url: 'https://www.govinfo.gov/content/pkg/USCODE-2024-title21/html/USCODE-2024-title21-chap13-subchapI-partC-sec829.htm',
      },
      {
        title: '21 U.S.C. 952: Importation of controlled substances',
        publisher: 'US Government Publishing Office',
        year: '2024',
        url: 'https://www.govinfo.gov/content/pkg/USCODE-2024-title21/html/USCODE-2024-title21-chap13-subchapII-sec952.htm',
      },
      {
        title: 'Misuse of Drugs Regulations 2001, regulation 4',
        publisher: 'legislation.gov.uk',
        url: 'https://www.legislation.gov.uk/uksi/2001/3998/regulation/4',
      },
      {
        title: 'Controlled Drugs and Substances Act (S.C. 1996, c. 19)',
        publisher: 'Justice Laws Website, Government of Canada',
        year: '2026',
        url: 'https://laws-lois.justice.gc.ca/eng/acts/C-38.8/FullText.html',
      },
      {
        title: 'Customs (Prohibited Imports) Regulations 1956 (regulation 5G and Schedule 7A)',
        publisher: 'Federal Register of Legislation (Australia)',
        year: '2026',
        url: 'https://www.legislation.gov.au/F1996B03651/latest/text',
      },
      {
        title: 'Fake anabolic androgenic steroids on the black market: a systematic review and meta-analysis on qualitative and quantitative analytical results found within the literature',
        publisher: 'BMC Public Health (Magnolini R et al.)',
        year: '2022',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9288681/',
      },
      {
        title: 'Global crackdown on illicit pharmaceuticals sees USD 15.5 million in seizures (Operation Pangea XVIII)',
        publisher: 'INTERPOL',
        year: '2026',
        url: 'https://www.interpol.int/en/News-and-Events/News/2026/Global-crackdown-on-illicit-pharmaceuticals-sees-USD-15.5-million-in-seizures',
      },
      {
        title: 'Internet Drug Outlet Identification Program: Progress Report, September 2018',
        publisher: 'National Association of Boards of Pharmacy',
        year: '2018',
        url: 'https://nabp.pharmacy/wp-content/uploads/2018/09/Internet-Drug-Outlet-Report-September-2018.pdf',
      },
      {
        title: 'How to buy medicines safely from an online pharmacy',
        publisher: 'US Food and Drug Administration',
        year: '2025',
        url: 'https://www.fda.gov/consumers/consumer-updates/how-buy-medicines-safely-online-pharmacy',
      },
      {
        title: 'BeSafeRx: Considering an online pharmacy?',
        publisher: 'US Food and Drug Administration',
        url: 'https://www.fda.gov/drugs/besaferx-your-source-online-pharmacy-information/considering-online-pharmacy',
      },
      {
        title: 'What to know about cryptocurrency and scams',
        publisher: 'Federal Trade Commission',
        year: '2022',
        url: 'https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams',
      },
      {
        title: 'How to avoid a scam',
        publisher: 'Federal Trade Commission',
        year: '2023',
        url: 'https://consumer.ftc.gov/articles/how-avoid-scam',
      },
      {
        title: '#FakeMeds: Spot a fake',
        publisher: 'Medicines and Healthcare products Regulatory Agency',
        year: '2026',
        url: 'https://fakemeds.campaign.gov.uk/spot-a-fake/',
      },
      {
        title: 'Falsified medicines',
        publisher: 'European Commission',
        url: 'https://health.ec.europa.eu/medicinal-products/falsified-medicines_en',
      },
      {
        title: 'Online shopping',
        publisher: 'Federal Trade Commission',
        year: '2023',
        url: 'https://consumer.ftc.gov/articles/online-shopping',
      },
    ],
  },
  {
    slug: 'wada-banned-list-explained',
    title: 'The WADA banned list explained: anabolic agents, exemptions and sanctions for 2026 and 2027',
    metaTitle: 'WADA Banned List 2026: Steroids, TUEs and Sanctions',
    excerpt:
      'What WADA\'s 2026 Prohibited List says about anabolic steroids, how it is updated, how medical exemptions work, and the sanctions, including the 2027 changes.',
    metaDescription:
      'WADA\'s banned list explained from the 2026 Prohibited List and the Code: section S1 anabolic agents, TUE criteria, four-year bans, and what changes in 2027.',
    category: 'Law',
    author: BYLINE,
    date: '2026-10-04',
    updated: '2026-10-30',
    image: pexels(8533016),
    imageAlt:
      'A laboratory bench with a clipboard of printed notes and diagrams, a glass flask in front and a microscope to one side.',
    imageCredit: credit('Artem Podrez'),
    faqs: [
      {
        question: 'Are anabolic steroids banned by WADA?',
        answer:
          'Yes. Anabolic agents are section S1 of the Prohibited List, banned at all times, in and out of competition. S1.1 names dozens of steroids and also covers any with a similar chemical structure or biological effect, including their esters.',
      },
      {
        question: 'How long is the ban for a positive steroid test?',
        answer:
          'Under the 2021 World Anti-Doping Code, in force until 31 December 2026, a violation involving a non-specified substance such as an anabolic steroid carries four years, or two if the athlete establishes it was not intentional. The 2027 Code keeps four years as the default and adds a three-year step.',
      },
      {
        question: 'Can an athlete get a TUE for testosterone?',
        answer:
          'An athlete can apply for a Therapeutic Use Exemption for a prohibited substance, and the List notes that some S1 substances are found in medicines for male hypogonadism. A TUE is granted only if four criteria are met, including a diagnosed condition, no reasonable permitted alternative, and no enhancement beyond a return to normal health.',
      },
      {
        question: 'When does the WADA Prohibited List change?',
        answer:
          'WADA must publish it at least once a year, and it publishes by 1 October after its Executive Committee approves it in September. The 2027 List was published on 21 September 2026, takes effect on 1 January 2027, and leaves section S1 unchanged.',
      },
      {
        question: 'What is the Athlete Biological Passport?',
        answer:
          'A WADA programme that monitors selected biological markers over time against each athlete\'s own reference ranges, rather than testing only for a substance. Its steroidal module, launched in 2014, tracks steroid variables to uncover doping with testosterone or related compounds.',
      },
    ],
    sources: [
      {
        title: 'International Standard: Prohibited List 2026',
        publisher: 'World Anti-Doping Agency',
        year: '2025',
        url: 'https://www.wada-ama.org/sites/default/files/2025-09/2026list_en_final_clean_september_2025.pdf',
      },
      {
        title: 'WADA publishes 2027 Prohibited List',
        publisher: 'World Anti-Doping Agency',
        year: '2026',
        url: 'https://www.wada-ama.org/en/news/wada-publishes-2027-prohibited-list',
      },
      {
        title: 'International Standard: Prohibited List 2027',
        publisher: 'World Anti-Doping Agency',
        year: '2026',
        url: 'https://www.wada-ama.org/sites/default/files/2026-09/2027list_en_final_clean_26_august_2026_2.pdf',
      },
      {
        title: 'World Anti-Doping Code 2021',
        publisher: 'World Anti-Doping Agency',
        year: '2021',
        url: 'https://www.wada-ama.org/sites/default/files/resources/files/2021_wada_code.pdf',
      },
      {
        title: 'World Anti-Doping Code 2027 (version 1.0)',
        publisher: 'World Anti-Doping Agency',
        year: '2026',
        url: 'https://www.wada-ama.org/sites/default/files/2026-10/2027_world_anti-doping_code_code_october_final.pdf',
      },
      {
        title: 'International Standard for Therapeutic Use Exemptions (ISTUE) 2023',
        publisher: 'World Anti-Doping Agency',
        year: '2022',
        url: 'https://www.wada-ama.org/sites/default/files/2022-09/international_standard_for_therapeutic_use_exemptions_istue_2023.pdf',
      },
      {
        title: 'International Standard for Therapeutic Use Exemptions (ISTUE) 2027',
        publisher: 'World Anti-Doping Agency',
        year: '2025',
        url: 'https://www.wada-ama.org/sites/default/files/2025-12/2027_international_standard_for_therapeutic_use_exemptions_istue.pdf',
      },
      {
        title: 'Athlete Biological Passport',
        publisher: 'World Anti-Doping Agency',
        year: '2026',
        url: 'https://www.wada-ama.org/en/athlete-biological-passport',
      },
      {
        title: 'Global DRO (Global Drug Reference Online)',
        publisher: 'USADA, UK Anti-Doping, Sport Integrity Canada and Swiss Sport Integrity',
        url: 'https://www.globaldro.com/Home',
      },
    ],
  },
  {
    slug: 'best-underground-labs-vs-pharmaceutical',
    title: 'Underground lab vs pharmaceutical-grade steroids: what lab tests have found',
    metaTitle: 'Underground Lab vs Pharma Grade Steroids: What Tests Found',
    excerpt:
      'What pharmaceutical grade means in law, what an underground lab is, and what lab analyses of black-market steroids found about content, dose and contamination.',
    metaDescription:
      'Underground lab vs pharmaceutical-grade steroids: what GMP licensing means, and what studies of seized products found on dose accuracy, fakes and contamination.',
    category: 'Verification',
    author: BYLINE,
    date: '2026-10-04',
    updated: '2026-10-30',
    image: pexels(8533016),
    imageAlt:
      'A laboratory bench with a clipboard of printed notes and diagrams, a glass flask in front and a microscope to one side.',
    imageCredit: credit('Artem Podrez'),
    faqs: [
      {
        question: 'What is the difference between underground lab and pharmaceutical grade steroids?',
        answer:
          'Pharmaceutical grade means made by a licensed manufacturer under good manufacturing practice: the site is inspected, each batch is tested for identity and strength before release, and sterile products must be made under validated sterilisation processes. An underground lab has no manufacturing licence, no inspection and no regulator checking its batches.',
      },
      {
        question: 'Does a pharma grade label mean a steroid is genuine?',
        answer:
          'No. A label is the easiest part of a product to fake. In a Danish study of 764 police-seized products, most looked professional and met most EU packaging requirements, yet 25 to 34% did not contain the active ingredient they claimed. Check whether the named manufacturer holds a licence on a regulator\'s register, and verify the batch number and any certificate.',
      },
      {
        question: 'How accurate are the doses in underground lab steroids?',
        answer:
          'A 2022 meta-analysis of 19 studies found 37% of samples were substandard, with the right substance in an amount outside the accepted range, and two thirds of those were under strength. A small Australian study found 4 of 21 samples with a clearly defined labelled dose were within 5% of the expected purity. The meta-analysis authors say its figures must be interpreted with caution, and the Australian sample was small.',
      },
      {
        question: 'Can underground lab steroids be contaminated with bacteria?',
        answer:
          'Yes. A 2009 UK study prompted by abscesses needing surgery found skin bacteria in black-market injectables. A 2025 Dutch study found bacteria in 3 of 63 products (5%): 2 of 22 used multidose vials and 1 of 41 unused ones. Its authors say the sample is too small to estimate the true rate.',
      },
      {
        question: 'Are injectable steroids faked more often than tablets?',
        answer:
          'The studies that compared them suggest so. A 2009 UK study found 53% of injectable samples and 21% of tablets were counterfeit, and the 2022 meta-analysis reports counterfeit proportions of 43 to 65% for oil-based solutions against 29 to 37% for tablets in the studies it drew on.',
      },
    ],
    sources: [
      {
        title: '21 CFR 210.1: Status of current good manufacturing practice regulations',
        publisher: 'eCFR',
        year: '2026',
        url: 'https://www.ecfr.gov/current/title-21/section-210.1',
      },
      {
        title: '21 CFR Part 211: Current good manufacturing practice for finished pharmaceuticals (§211.113 and §211.165)',
        publisher: 'eCFR',
        year: '2026',
        url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-211',
      },
      {
        title: 'Facts about the current good manufacturing practice (CGMP)',
        publisher: 'US Food and Drug Administration',
        year: '2025',
        url: 'https://www.fda.gov/drugs/pharmaceutical-quality-resources/facts-about-current-good-manufacturing-practice-cgmp',
      },
      {
        title: 'EudraLex Volume 4: Good manufacturing practice (GMP) guidelines',
        publisher: 'European Commission',
        url: 'https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en',
      },
      {
        title: 'Apply for manufacturer or wholesaler of medicines licences',
        publisher: 'Medicines and Healthcare products Regulatory Agency (GOV.UK)',
        year: '2025',
        url: 'https://www.gov.uk/guidance/apply-for-manufacturer-or-wholesaler-of-medicines-licences',
      },
      {
        title: 'Fake anabolic androgenic steroids on the black market: a systematic review and meta-analysis on qualitative and quantitative analytical results found within the literature',
        publisher: 'BMC Public Health (Magnolini R et al.)',
        year: '2022',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9288681/',
      },
      {
        title: 'Substandard and falsified medical products (fact sheet)',
        publisher: 'World Health Organization',
        year: '2024',
        url: 'https://www.who.int/news-room/fact-sheets/detail/substandard-and-falsified-medical-products',
      },
      {
        title: 'Do you get what you see? The illicit doping market in Denmark: an analysis of performance and image enhancing drugs seized by the police over a 1-year period',
        publisher: 'Drug Testing and Analysis (Heinsvig PJ et al.)',
        year: '2023',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36932906/',
      },
      {
        title: 'Lead astray? The hidden contaminants in Australian anabolic-androgenic steroid market and their potential health impact',
        publisher: 'Drug and Alcohol Review (Craven A et al.)',
        year: '2025',
        url: 'https://pubmed.ncbi.nlm.nih.gov/40898878/',
      },
      {
        title: 'Counterfeiting in performance- and image-enhancing drugs',
        publisher: 'Drug Testing and Analysis (Graham MR et al.)',
        year: '2009',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20355187/',
      },
      {
        title: 'Microbiological contamination in androgens from the black market',
        publisher: 'Harm Reduction Journal (Verdegaal TJ et al.)',
        year: '2025',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12797776/',
      },
      {
        title: 'Falsified medicines',
        publisher: 'European Commission',
        url: 'https://health.ec.europa.eu/medicinal-products/falsified-medicines_en',
      },
    ],
  },
  {
    slug: 'post-cycle-therapy-complete-guide',
    title: 'Post-cycle therapy (PCT): what the research says about recovery after steroids',
    metaTitle: 'Post-Cycle Therapy (PCT): What Research Says on Recovery',
    excerpt:
      'What PCT is, how steroids shut down natural testosterone, what studies found about recovery, and what clomiphene, tamoxifen and hCG are licensed for.',
    metaDescription:
      'Post-cycle therapy explained with sources: how steroids suppress LH, FSH and testosterone, how recovery went in studies, and whether PCT medicines help.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-05',
    updated: '2026-10-30',
    image: pexels(8533016),
    imageAlt:
      'A laboratory bench with a clipboard of printed notes and diagrams, a glass flask in front and a microscope to one side.',
    imageCredit: credit('Artem Podrez'),
    faqs: [
      {
        question: 'What is post-cycle therapy (PCT)?',
        answer:
          'A term from steroid-using communities, not a medical treatment, for medicines taken after a course of steroids to try to restart natural testosterone production. A 2020 review in Endocrine Connections calls it an unproven strategy.',
      },
      {
        question: 'Do you need PCT after a steroid cycle?',
        answer:
          'No study has shown that it helps. The Endocrine Society knew of no systematic treatment studies, and in the HAARLEM study, where 80 of 100 men used PCT, it was not associated with testosterone or sperm recovery. A doctor can test hormone levels and treat a diagnosed problem.',
      },
      {
        question: 'How long does it take to recover after steroids?',
        answer:
          'It varies, and not everyone recovers fully. In the HAARLEM study testosterone recovered sooner than sperm production, and at the end of follow-up 11% of men still had low testosterone and 34% a low sperm count. Another study found low testosterone in 27.2% of former users long after they stopped.',
      },
      {
        question: 'What are Clomid and Nolvadex used for?',
        answer:
          'Clomiphene (Clomid) is licensed for ovulatory dysfunction in women who want to become pregnant, and its label says there are no adequate or well-controlled studies showing it works for male infertility. Tamoxifen (Nolvadex) is licensed for breast cancer. Both are prescription medicines, and neither is licensed for recovery after steroid use.',
      },
      {
        question: 'What is hCG used for?',
        answer:
          'hCG acts almost identically to the pituitary hormone LH. It is licensed for undescended testes in boys, selected cases of hypogonadism caused by a pituitary deficiency in men, and inducing ovulation. A 2020 review warns that it may delay recovery of the body\'s own LH and FSH production.',
      },
    ],
    sources: [
      {
        title: 'Anabolic androgenic steroid abuse in young males',
        publisher: 'Endocrine Connections (de Ronde W, Smit DL)',
        year: '2020',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7219134/',
      },
      {
        title: 'Adverse health consequences of performance-enhancing drugs: an Endocrine Society scientific statement',
        publisher: 'Endocrine Reviews (Pope HG Jr et al.)',
        year: '2014',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4026349/',
      },
      {
        title: 'Diagnosis and management of anabolic androgenic steroid use',
        publisher: 'Journal of Clinical Endocrinology & Metabolism (Anawalt BD)',
        year: '2019',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6517163/',
      },
      {
        title: 'Disruption and recovery of testicular function during and after androgen abuse: the HAARLEM study',
        publisher: 'Human Reproduction (Smit DL et al.)',
        year: '2021',
        url: 'https://academic.oup.com/humrep/article/36/4/880/6128773',
      },
      {
        title: 'Rate and extent of recovery from reproductive and cardiac dysfunction due to androgen abuse in men',
        publisher: 'Journal of Clinical Endocrinology & Metabolism (Shankara-Narayana N et al.)',
        year: '2020',
        url: 'https://pubmed.ncbi.nlm.nih.gov/32030409/',
      },
      {
        title: 'Former abusers of anabolic androgenic steroids exhibit decreased testosterone levels and hypogonadal symptoms years after cessation: a case-control study',
        publisher: 'PLoS One (Rasmussen JJ et al.)',
        year: '2016',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4988681/',
      },
      {
        title: 'Prolonged hypogonadism in males following withdrawal from anabolic-androgenic steroids: an under-recognized problem',
        publisher: 'Addiction (Kanayama G et al.)',
        year: '2015',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25598171/',
      },
      {
        title: 'Anabolic steroid-induced hypogonadism: diagnosis and treatment',
        publisher: 'Fertility and Sterility (Rahnema CD et al.)',
        year: '2014',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24636400/',
      },
      {
        title: 'CLOMID (clomiphene citrate) tablets: prescribing information',
        publisher: 'DailyMed, US National Library of Medicine',
        year: '2023',
        url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=2ca373c1-4dba-4126-8616-5c533d606fe5',
      },
      {
        title: 'Tamoxifen citrate tablets: prescribing information',
        publisher: 'DailyMed, US National Library of Medicine',
        year: '2021',
        url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7ee3d3d2-85d1-4018-8e70-5ed8a64ae1f0',
      },
      {
        title: 'Chorionic gonadotropin for injection: prescribing information',
        publisher: 'DailyMed, US National Library of Medicine',
        year: '2025',
        url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f93b2baa-03ac-4650-b35a-20b818d712d6',
      },
      {
        title: 'ARIMIDEX (anastrozole) tablets: prescribing information',
        publisher: 'DailyMed, US National Library of Medicine',
        year: '2025',
        url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=acbfaaa9-503c-4691-9828-76a7146ed6de',
      },
      {
        title: 'Anabolic steroid misuse',
        publisher: 'NHS',
        year: '2026',
        url: 'https://www.nhs.uk/conditions/anabolic-steroid-misuse/',
      },
      {
        title: 'Image and performance enhancing drugs',
        publisher: 'FRANK',
        url: 'https://www.talktofrank.com/drug/image-and-performance-enhancing-drug',
      },
      {
        title: 'National Helpline',
        publisher: 'Substance Abuse and Mental Health Services Administration',
        url: 'https://www.samhsa.gov/find-help/helplines/national-helpline',
      },
    ],
  },

  {
    slug: 'testosterone-enanthate-for-sale-buying-guide',
    title: 'Testosterone enanthate for sale: how to compare brands, strengths and prices',
    metaTitle: 'Testosterone Enanthate for Sale: Brands, Strengths, Prices',
    excerpt:
      'Every testosterone enanthate listing we stock, compared by brand, strength, pack and price per 100 mg, plus what to check on a label before you buy.',
    metaDescription:
      'Compare 24 testosterone enanthate listings by brand, strength and price per 100 mg, what to check on a label, and the law in the US, UK, Canada, Australia.',
    category: 'Verification',
    author: BYLINE,
    date: '2026-10-20',
    image: pexels(9259963),
    imageAlt:
      'A row of clear glass vials with silver crimp caps standing in the round tray of a laboratory sample changer.',
    imageCredit: credit('Jess Loiterton'),
    faqs: [
      {
        question: 'How much does testosterone enanthate cost?',
        answer:
          'Across the 24 listings compared in this guide, a pack costs $55.00 to $75.00 (prices on 19 October 2026). Packs differ in strength and fill, so compare price per 100 mg: from about $1.38 to $2.80 where the label shows both.',
      },
      {
        question: 'What strengths does testosterone enanthate come in?',
        answer:
          'The listings we stock are labelled at 250, 300 or 400 mg per mL. The licensed US generic is labelled at 200 mg per mL in sesame oil.',
      },
      {
        question: 'Is it legal to buy testosterone enanthate online?',
        answer:
          'It depends on where you live. In the US it is Schedule III and cannot be delivered over the internet without a valid prescription. In the UK the import exemption covers only importation in person. Canada prohibits import unless authorised, and Australia requires written permission to import.',
      },
      {
        question: 'Do you publish certificates of analysis?',
        answer:
          'No. If a seller offers one, check the laboratory through its accreditation body, confirm the test is on its accredited scope, and check the batch number matches your pack.',
      },
      {
        question: 'What does shipping cost?',
        answer:
          'US standard tracked shipping is $9.00, free from $150.00 of goods, and express is $24.00. Europe standard is $14.00, free from $200.00, and express is $32.00. Everywhere else is $22.00. The minimum order is $100.00, including shipping and after any discount.',
      },
    ],
    sources: [
      {
        title: 'Testosterone enanthate injection, solution (Hikma Pharmaceuticals USA Inc.), prescribing information',
        publisher: 'DailyMed, US National Library of Medicine',
        year: '2026',
        url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e89d6458-428c-4256-97a3-f1fa851293c1',
      },
      { title: 'Testosterone enanthate (CID 9416)', publisher: 'PubChem, US National Library of Medicine', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/9416' },
      {
        title: 'Fake anabolic androgenic steroids on the black market: a systematic review and meta-analysis on qualitative and quantitative analytical results found within the literature',
        publisher: 'BMC Public Health (Magnolini R et al.)',
        year: '2022',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9288681/',
      },
      { title: '21 CFR 1308.13: Schedule III', publisher: 'eCFR', year: '2026', url: 'https://www.ecfr.gov/current/title-21/section-1308.13' },
      {
        title: '21 U.S.C. 844: Penalty for simple possession',
        publisher: 'US Government Publishing Office',
        year: '2024',
        url: 'https://www.govinfo.gov/content/pkg/USCODE-2024-title21/html/USCODE-2024-title21-chap13-subchapI-partD-sec844.htm',
      },
      {
        title: '21 U.S.C. 829: Prescriptions (Ryan Haight Online Pharmacy Consumer Protection Act)',
        publisher: 'US Government Publishing Office',
        year: '2024',
        url: 'https://www.govinfo.gov/content/pkg/USCODE-2024-title21/html/USCODE-2024-title21-chap13-subchapI-partC-sec829.htm',
      },
      {
        title: '21 U.S.C. 952: Importation of controlled substances',
        publisher: 'US Government Publishing Office',
        year: '2024',
        url: 'https://www.govinfo.gov/content/pkg/USCODE-2024-title21/html/USCODE-2024-title21-chap13-subchapII-sec952.htm',
      },
      { title: 'Misuse of Drugs Act 1971, Schedule 2', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/ukpga/1971/38/schedule/2' },
      { title: 'Misuse of Drugs Regulations 2001, regulation 4', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/uksi/2001/3998/regulation/4' },
      {
        title: 'The Misuse of Drugs (Amendment No. 2) (England, Wales and Scotland) Regulations 2012: Explanatory Note',
        publisher: 'legislation.gov.uk',
        year: '2012',
        url: 'https://www.legislation.gov.uk/uksi/2012/973/note/made',
      },
      {
        title: 'Controlled Drugs and Substances Act (S.C. 1996, c. 19)',
        publisher: 'Justice Laws Website, Government of Canada',
        year: '2026',
        url: 'https://laws-lois.justice.gc.ca/eng/acts/C-38.8/FullText.html',
      },
      {
        title: 'Therapeutic Goods (Poisons Standard—June 2026) Instrument 2026',
        publisher: 'Federal Register of Legislation (Australia)',
        year: '2026',
        url: 'https://www.legislation.gov.au/F2026L00633/asmade',
      },
      {
        title: 'Customs (Prohibited Imports) Regulations 1956',
        publisher: 'Federal Register of Legislation (Australia)',
        year: '2026',
        url: 'https://www.legislation.gov.au/F1996B03651/latest/text',
      },
    ],
  },
];
