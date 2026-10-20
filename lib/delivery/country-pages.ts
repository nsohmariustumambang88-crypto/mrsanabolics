import type { ApproxCurrency, CountryCode } from '@/lib/countries';

/*
  The written half of the delivery pages for the United Kingdom, Canada and Australia.

  Everything about delivery itself — which zone, which rates, what they cost, how long they take —
  is read from the database on the page. What is here is the legal summary, and it is taken from
  the journal's law article (content/journal/anabolic-steroids-law-us-uk-canada-australia.md),
  which quotes the legislation and was checked against it in September 2026. Each point cites the
  same primary source the article does. Nothing is added that the article does not say: if the law
  changes, change the article first and this second.

  The three summaries all say the same uncomfortable thing about the thing this page is for, which
  is sending steroids by post into the country, and they say it plainly on purpose.
*/

export type Source = { title: string; publisher: string; url: string };

export type CountryPage = {
  code: Extract<CountryCode, 'GB' | 'CA' | 'AU'>;
  slug: string;
  /** "the United Kingdom": the form used inside a sentence. */
  name: string;
  /** "United Kingdom": the form used in a title or a breadcrumb. */
  shortName: string;
  currency: ApproxCurrency;
  /** One sentence: the position on posted imports, for the description and the top of the page. */
  importLine: string;
  law: { heading: string; points: { text: string; source: number }[] }[];
  sources: Source[];
};

export const LAW_ARTICLE = '/blog/anabolic-steroids-law-us-uk-canada-australia';
export const LAW_CHECKED = 'September 2026';

export const COUNTRY_PAGES: CountryPage[] = [
  {
    code: 'GB',
    slug: 'united-kingdom',
    name: 'the United Kingdom',
    shortName: 'United Kingdom',
    currency: 'GBP',
    importLine:
      'Since 23 April 2012 the UK’s personal-use import exemption covers only steroids you carry in yourself, so a parcel sent to you by post or courier is not covered.',
    law: [
      {
        heading: 'Class C, with a personal-possession exemption',
        points: [
          {
            text: 'Anabolic steroids are Class C drugs under the Misuse of Drugs Act 1971, which names substances such as nandrolone, stanozolol and testosterone and covers compounds structurally derived from them.',
            source: 0,
          },
          {
            text: 'The Misuse of Drugs Regulations 2001 disapply the possession offence for the steroids listed in Part II of Schedule 4, so simple possession for yourself is not an offence in England, Wales and Scotland. Northern Ireland has its own regulations, which the guide does not cover.',
            source: 1,
          },
        ],
      },
      {
        heading: 'Importing: in person only, since 2012',
        points: [
          {
            text: 'Since 23 April 2012 the import exemption has covered only importation “carried out in person for administration to that person”. A steroid sent to you by post, courier or freight is not covered by it, even if it is for your own use.',
            source: 2,
          },
          {
            text: 'Unlawful importation, prosecuted under customs law, carries up to 14 years in prison and a fine of any amount.',
            source: 4,
          },
        ],
      },
      {
        heading: 'Supply',
        points: [
          {
            text: 'The exemption does not extend to supply. For a Class C drug, production, supply and possession with intent to supply each carry up to 14 years, a fine, or both.',
            source: 3,
          },
        ],
      },
    ],
    sources: [
      { title: 'Misuse of Drugs Act 1971, Schedule 2', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/ukpga/1971/38/schedule/2' },
      { title: 'Misuse of Drugs Regulations 2001, regulation 4', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/uksi/2001/3998/regulation/4' },
      {
        title: 'The Misuse of Drugs (Amendment No. 2) (England, Wales and Scotland) Regulations 2012: Explanatory Note',
        publisher: 'legislation.gov.uk',
        url: 'https://www.legislation.gov.uk/uksi/2012/973/note/made',
      },
      { title: 'Misuse of Drugs Act 1971, Schedule 4', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/ukpga/1971/38/schedule/4' },
      { title: 'Customs and Excise Management Act 1979, Schedule 1', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/ukpga/1979/2/schedule/1' },
    ],
  },
  {
    code: 'CA',
    slug: 'canada',
    name: 'Canada',
    shortName: 'Canada',
    currency: 'CAD',
    importLine:
      'Canada prohibits importing anabolic steroids except as authorized under its regulations, even though possessing them is not an offence.',
    law: [
      {
        heading: 'Schedule IV: possession is not an offence, trafficking is',
        points: [
          {
            text: 'Canada lists “Anabolic steroids and their derivatives” in Schedule IV of the Controlled Drugs and Substances Act. The simple-possession offence in section 4(1) applies only to Schedules I to III, so possessing a Schedule IV substance is not an offence under it.',
            source: 0,
          },
          {
            text: 'Trafficking, and possession for the purpose of trafficking, is an offence: up to three years on indictment, or up to one year on summary conviction.',
            source: 0,
          },
        ],
      },
      {
        heading: 'Importing and exporting',
        points: [
          {
            text: 'Importing is prohibited outright: “Except as authorized under the regulations, no person shall import into Canada or export from Canada a substance included in Schedule I, II, III, IV, V or VI.” For Schedule IV the maximum is three years on indictment. Possession being lawful does not make it lawful to bring steroids into the country.',
            source: 0,
          },
        ],
      },
    ],
    sources: [
      {
        title: 'Controlled Drugs and Substances Act (S.C. 1996, c. 19)',
        publisher: 'Justice Laws Website, Government of Canada',
        url: 'https://laws-lois.justice.gc.ca/eng/acts/C-38.8/FullText.html',
      },
    ],
  },
  {
    code: 'AU',
    slug: 'australia',
    name: 'Australia',
    shortName: 'Australia',
    currency: 'AUD',
    importLine:
      'Australia prohibits importing anabolic steroids unless the importer holds written permission to import them.',
    law: [
      {
        heading: 'Prescription-only, and illegal to possess without authority',
        points: [
          {
            text: 'Anabolic and androgenic steroidal agents are Schedule 4 (prescription-only) substances in the national Poisons Standard, and are listed in Appendix D, clause 5, which covers poisons for which possession without authority is illegal.',
            source: 0,
          },
        ],
      },
      {
        heading: 'Importing requires written permission',
        points: [
          {
            text: 'They are listed in Schedule 7A of the Customs (Prohibited Imports) Regulations 1956. Importing them “is prohibited unless … the person importing the substance is the holder of a permission to import the substance granted in writing”.',
            source: 1,
          },
        ],
      },
      {
        heading: 'State and territory law',
        points: [
          {
            text: 'Offences and penalties for possession and supply sit largely in state and territory law, and they differ. Queensland, for example, lists steroids as dangerous drugs in its Drugs Misuse Regulation 1987.',
            source: 2,
          },
        ],
      },
    ],
    sources: [
      {
        title: 'Therapeutic Goods (Poisons Standard—June 2026) Instrument 2026',
        publisher: 'Federal Register of Legislation (Australia)',
        url: 'https://www.legislation.gov.au/F2026L00633/asmade',
      },
      {
        title: 'Customs (Prohibited Imports) Regulations 1956',
        publisher: 'Federal Register of Legislation (Australia)',
        url: 'https://www.legislation.gov.au/F1996B03651/latest/text',
      },
      {
        title: 'Drugs Misuse Regulation 1987',
        publisher: 'Queensland Legislation',
        url: 'https://www.legislation.qld.gov.au/view/pdf/inforce/current/sl-1987-dmr',
      },
    ],
  },
];

export function countryPage(slug: string): CountryPage | null {
  return COUNTRY_PAGES.find((c) => c.slug === slug) ?? null;
}
