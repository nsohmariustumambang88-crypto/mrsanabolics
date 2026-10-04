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

const BYLINE = 'MrAnabolics Editorial';
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
    title: 'What Are Anabolic Steroids? Complete Explanation',
    metaTitle: 'What Are Anabolic Steroids? Definition & How They Work',
    excerpt: 'Synthetic compounds that mimic testosterone and promote muscle growth. What they are, types, legal status, and realistic effects.',
    metaDescription: 'Complete guide to anabolic steroids: what they are, types, how they work, legal status, and realistic effects on muscle growth and performance.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-03',
    image: pexels(8533016),
    imageAlt: 'Laboratory equipment with chemical compounds and molecular diagrams.',
    imageCredit: credit('Science Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'how-do-steroids-work',
    title: 'How Do Steroids Work? The Mechanism Behind Muscle Growth',
    metaTitle: 'How Do Steroids Work? Mechanism of Muscle Growth',
    excerpt: 'Understanding how anabolic steroids work requires knowing how your body naturally builds muscle and how steroids amplify protein synthesis and recovery.',
    metaDescription: 'How steroids work: androgen receptors, protein synthesis amplification, recovery enhancement, and the biological mechanisms behind muscle growth.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-03',
    image: pexels(8533016),
    imageAlt: 'Muscle tissue under microscope with cellular diagrams.',
    imageCredit: credit('Medical Illustration'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'how-to-buy-steroids-online-safely',
    title: 'How to Buy Steroids Online Safely: Essential Guide for Buyers',
    metaTitle: 'How to Buy Steroids Online Safely: Verification Guide',
    excerpt: 'Buying steroids online involves real risks. This guide covers how to verify suppliers, authenticate products, avoid counterfeits, and protect yourself.',
    metaDescription: 'Safe steroid buying guide: verify suppliers, check product authenticity, spot counterfeits, understand legal status, and avoid scams when buying online.',
    category: 'Verification',
    author: BYLINE,
    date: '2026-10-03',
    image: pexels(8533016),
    imageAlt: 'Secure online transaction and verification process.',
    imageCredit: credit('Security Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'best-steroids-for-beginners',
    title: 'Best Steroids for Beginners: A Complete Guide',
    metaTitle: 'Best Steroids for Beginners: Safe First Cycle Guide',
    excerpt: 'Testosterone enanthate 300-500mg/week is the safest first steroid. Anavar and Nandrolone are good alternatives. Avoid Trenbolone, Anadrol.',
    metaDescription: 'Beginner steroid guide: best compounds for first cycle, recommended dosages, expected results, PCT protocol, and what steroids to avoid as a beginner.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Beginner athlete starting steroid training cycle.',
    imageCredit: credit('Training Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'best-steroids-for-muscle-gain',
    title: 'Best Steroids for Muscle Gain: Maximum Hypertrophy',
    metaTitle: 'Best Steroids for Muscle Growth: Ranked by Results',
    excerpt: 'Nandrolone and Testosterone are the best for pure muscle gain. Trenbolone builds muscle fastest but carries severe sides. Expected 15-35 lbs per cycle.',
    metaDescription: 'Best muscle-building steroids ranked: Nandrolone, Testosterone, Trenbolone, Boldenone, Dianabol. Stacks, dosages, and realistic 12-week muscle gain expectations.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Bodybuilder with significant muscle gain and definition.',
    imageCredit: credit('Muscle Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'best-steroids-for-fat-loss',
    title: 'Best Steroids for Fat Loss and Cutting: Lean Muscle Guide',
    metaTitle: 'Best Cutting Steroids: Lose Fat While Preserving Muscle',
    excerpt: 'Trenbolone is the gold standard for cutting. Masteron creates hard definition. Anavar is safest. Expect 15-30 lbs fat loss with 5-10 lbs muscle preservation.',
    metaDescription: 'Best cutting steroids: Trenbolone, Masteron, Anavar, Winstrol. How they preserve muscle during calorie deficit. 8-12 week cutting cycle guide and expected results.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Lean athlete with visible muscle definition and low body fat.',
    imageCredit: credit('Cutting Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'best-steroids-for-strength',
    title: 'Best Steroids for Strength: Maximum Power Output',
    metaTitle: 'Best Strength Steroids: Powerlifting & Strongman Guide',
    excerpt: 'Trenbolone and Anadrol deliver fastest strength gains. Testosterone is most sustainable. Halotestin peaks strength but harsh sides. Expect +50-100 lbs major lifts.',
    metaDescription: 'Best strength-building steroids: Trenbolone, Anadrol, Testosterone, Dianabol, Halotestin. Strength stacks, dosages, training for maximum power output.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Powerlifter lifting maximum weight with perfect form.',
    imageCredit: credit('Strength Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'best-steroids-for-endurance',
    title: 'Best Steroids for Endurance: Athletic Performance',
    metaTitle: 'Best Endurance Steroids: VO2 Max & Aerobic Capacity',
    excerpt: 'Boldenone increases red blood cells and oxygen capacity. Testosterone is versatile. Expect 8-15% improvement in VO2 max and aerobic performance.',
    metaDescription: 'Best endurance steroids: Boldenone, Testosterone, Nandrolone, Trenbolone. How they increase red blood cells, oxygen delivery, and aerobic capacity for athletes.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Distance runner with improved aerobic capacity and endurance.',
    imageCredit: credit('Endurance Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'best-place-to-buy-testosterone',
    title: 'Best Place to Buy Testosterone: Where to Source Safely',
    metaTitle: 'How to Buy Testosterone: Pharmaceutical vs UGL Sources',
    excerpt: 'Pharmaceutical (prescription) safest. Reputable UGL with CoA cheaper. Verify supplier, get bloodwork at week 4, verify CoA independently.',
    metaDescription: 'Buy testosterone safely: pharmaceutical TRT prescription vs underground labs. How to verify authenticity, avoid counterfeits, source responsibly.',
    category: 'Verification',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Pharmacy counter showing testosterone prescription bottles.',
    imageCredit: credit('Pharmacy Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'steroid-suppliers-which-are-legit',
    title: 'Steroid Suppliers: Which Are Legit? Identification Guide',
    metaTitle: 'How to Identify Legitimate Steroid Suppliers (Not Scams)',
    excerpt: 'Check business registration (5+ years), verify CoA independently, read recent reviews, compare pricing. Use 10-point checklist before ordering.',
    metaDescription: 'How to identify legit steroid suppliers: red flags (new domains, no CoA), green flags (business registration, verified reviews), 10-point verification checklist.',
    category: 'Verification',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Legitimate business storefront with professional branding.',
    imageCredit: credit('Business Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'steroid-prices-comparison-2026',
    title: 'Steroid Prices Comparison 2026: Cost vs Value Analysis',
    metaTitle: 'Steroid Pricing Guide 2026: Pharmaceutical vs UGL Costs',
    excerpt: 'Pharmaceutical testosterone: $150-300/month. UGL testosterone: $50-100/month. Budget $500-1200/cycle for monitoring. Avoid prices 50%+ below market.',
    metaDescription: '2026 steroid pricing: pharmaceutical vs underground lab costs per compound. Full cycle cost breakdown, hidden costs, and cost-benefit analysis.',
    category: 'Verification',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Cost comparison chart showing pharmaceutical and UGL pricing.',
    imageCredit: credit('Finance Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'steroid-laws-by-country-2026',
    title: 'Steroid Laws by Country 2026: Complete Legal Status',
    metaTitle: 'Anabolic Steroid Laws by Country: Penalties & Legal Status',
    excerpt: 'USA: Felony (up to 1 year). UK: 14 years. Canada: 2 years. Australia: 5 years. Only legal with prescription for TRT (hypogonadism treatment).',
    metaDescription: 'Steroid laws by country 2026: USA, UK, Canada, Australia, EU, Mexico. Possession penalties, trafficking charges, legal access through TRT prescription.',
    category: 'Law',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'International legal document showing steroid legislation.',
    imageCredit: credit('Legal Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'wada-banned-list-explained',
    title: 'WADA Banned List Explained: What\'s Illegal in Sports',
    metaTitle: 'WADA Prohibited Substances 2026: Banned Steroids & Testing',
    excerpt: 'All anabolic steroids prohibited in competition and out-of-competition. Positive test = 4-year ban first offense. Only legal with Therapeutic Use Exemption.',
    metaDescription: 'WADA banned list 2026: all anabolic steroids prohibited. Testing methods, detection windows, failed test consequences, TUE exemption process.',
    category: 'Law',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'WADA anti-doping testing laboratory with equipment.',
    imageCredit: credit('Lab Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'how-to-test-steroids-authenticity',
    title: 'How to Test Steroids for Authenticity: Verification Methods',
    metaTitle: 'Steroid Testing Guide: Lab Tests & Authenticity Verification',
    excerpt: 'Lab testing (Jano): €100-200, most accurate. Bloodwork: $100-200 (proves real at week 4). Visual inspection: free, basic. Combine multiple methods.',
    metaDescription: 'How to test steroids for authenticity: lab testing (Jano, SIMEC), bloodwork verification, visual inspection, chemistry tests, CoA verification.',
    category: 'Verification',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Laboratory technician testing steroid sample for authenticity.',
    imageCredit: credit('Lab Testing Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'oral-vs-injectable-steroids',
    title: 'Oral vs Injectable Steroids: Complete Comparison',
    metaTitle: 'Oral Steroids vs Injectables: Pros, Cons, and Best Use',
    excerpt: 'Oral: fast acting, liver toxic, daily dosing. Injectable: safe, stable, fewer injections. Best cycle combines both (oral kickstart + injectable base).',
    metaDescription: 'Oral vs injectable steroids comparison: advantages/disadvantages, liver toxicity, cost, injection frequency, ideal cycles combining both types.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Steroid tablets and injectable vials side by side.',
    imageCredit: credit('Pharma Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'steroid-side-effects-complete-guide',
    title: 'Steroid Side Effects: Complete Medical Guide',
    metaTitle: 'Anabolic Steroid Side Effects: Reversible & Permanent',
    excerpt: 'Acne, water retention, mood changes are reversible. Cardiovascular, hair loss, liver toxicity are partially reversible. Manage with AI, PCT, bloodwork.',
    metaDescription: 'Complete steroid side effects guide: reversible (acne, mood), partially reversible (cardiovascular, hair loss), management strategies, severity by compound.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Medical blood test showing cholesterol and liver values.',
    imageCredit: credit('Medical Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'best-underground-labs-vs-pharmaceutical',
    title: 'Underground Labs vs Pharmaceutical: Quality Comparison',
    metaTitle: 'UGL vs Pharmaceutical Steroids: Which Is Better?',
    excerpt: 'Pharmaceutical: 100% quality guaranteed, $150-300/month. UGL: 50% reliable, $50-150/month. Top UGL with verified CoA nearly matches pharma quality.',
    metaDescription: 'Underground labs vs pharmaceutical steroids: quality comparison, cost analysis, counterfeit risk, how to reduce UGL risk through verification.',
    category: 'Verification',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Pharmaceutical manufacturing facility with quality control.',
    imageCredit: credit('Manufacturing Photo'),
    faqs: [],
    sources: [],
  },
  {
    slug: 'steroid-cycle-guide-beginners',
    title: 'Complete Steroid Cycle Guide for Beginners: 12-Week Blueprint',
    metaTitle: 'First Steroid Cycle Guide: Step-by-Step 12-Week Protocol',
    excerpt: 'Test 400mg/week for 12 weeks. Baseline bloodwork, hard training, high protein. PCT weeks 13-17. Expected: 15-25 lbs muscle, +30-50 lbs strength.',
    metaDescription: 'Complete beginner steroid cycle guide: 12-week testosterone protocol, bloodwork schedule, training, nutrition, PCT, side effects, expected results.',
    category: 'Health',
    author: BYLINE,
    date: '2026-10-04',
    image: pexels(8533016),
    imageAlt: 'Beginner athlete in gym following structured training plan.',
    imageCredit: credit('Training Guide Photo'),
    faqs: [],
    sources: [],
  },
];
