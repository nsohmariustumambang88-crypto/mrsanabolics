import 'server-only';
import { formatPrice } from '@/lib/format';

/*
  Notes the shop has written for individual products, shown on the product page as "From the
  shop" and used as the Product JSON-LD description.

  Why they exist: most of a product page is the same template text on all ~790 products, so
  search engines treat the pages as near-duplicates. A note says what is particular to ONE
  listing, in words written for it.

  Every fact in a note comes from one of three places, and nowhere else:

  - the pack in the product's photograph (read on 10 November 2026, see NOTES_CHECKED);
  - the catalogue: manufacturer, group, the strength as listed;
  - arithmetic on those two.

  Where the photograph could not be read, the note says so rather than guess. The journal's
  editorial policy applies: no dosing, schedules, effects, benefits, or claims about purity or
  quality, and nothing presented as coming from a customer.

  Prices are NOT written into the prose, because the admin can change them. A note uses tokens
  that are filled in at render time from the live price:

    {price}  the listed price, "$75.00"
    {perMg}  price ÷ packMg — set packMg only when the label in the photograph shows both the
             strength (per mL or per tablet) and the size of the pack
    {perIu}  price ÷ packIu (growth hormone)
    {link}   the note's guide link, rendered as a real <a>

  A note that uses a token whose figure is missing is not shown at all (and logs an error), so a
  mistake here costs the note, never a wrong number on the page.

  Keyed by product slug. A product without a note renders exactly as before.
*/

/** The date the packs in the photographs were read for these notes. */
export const NOTES_CHECKED = '2026-11-10';

type NoteLink = { href: string; text: string };

type ProductNoteSource = {
  /** Total milligrams in one pack, from the label in the photograph. */
  packMg?: number;
  /** Total international units in one pack (growth hormone). */
  packIu?: number;
  /** Plain-text paragraphs, with the tokens described above. */
  paragraphs: string[];
  link: NoteLink;
};

const GUIDE = {
  testE: '/blog/testosterone-enanthate-for-sale-buying-guide',
  nandrolone: '/blog/nandrolone-decanoate-deca-npp-guide',
  trenbolone: '/blog/trenbolone-acetate-enanthate-parabolan-guide',
  hgh: '/blog/hgh-kits-vials-pens-iu-explained',
  counterfeit: '/blog/how-to-spot-counterfeit-steroids',
  certificate: '/blog/how-to-read-a-certificate-of-analysis',
} as const;

const PRODUCT_NOTES: Record<string, ProductNoteSource> = {
  'deustropin-4-12-deus-medical': {
    packMg: 40,
    packIu: 120,
    paragraphs: [
      'Deustropin 4/12 is somatropin from Deus Medical, and the carton in our photograph spells out the arithmetic: ten vials of 4 mg (12 IU) each, “10 vials 40mg (120IU)” in the box. The vials hold freeze-dried powder, and each label reads “Recombinant Human Growth Hormone [rDNA origin]”, “For laboratory research” and “Keep refrigerated”.',
      'At {price} for the box, that is {perIu} per IU, or {perMg} per milligram, worked out from the label’s own totals.',
      'When it arrives, read the batch number and expiry date on the carton, then on each of the ten vials: they should match. Our {link} explains how IU and milligrams convert, and how kits, vials and pens differ.',
    ],
    link: { href: GUIDE.hgh, text: 'guide to growth hormone kits, vials and pens' },
  },

  'superbull-500-bull-pharma': {
    paragraphs: [
      'Superbull is Bull Pharma’s testosterone blend, which we list at {price} under Testosterone Blends, at 500 mg/mL. Our photograph is of a real box rather than a studio render: the front reads “Superbull 500mg” and “Cont. Net. 10 ml.”, with the vial visible through a window. What it does not show is the list of esters, and the vial’s strength line is cut off after “500 mg”, so we have not worked out a price per milligram from it.',
      'For a blend, that list is the first thing to look for on arrival. The label should name each testosterone ester and its amount, and the amounts should add up to the total. Then check that the batch number and expiry date on the box match the vial. {link} covers the other warning signs on a pack.',
    ],
    link: { href: GUIDE.counterfeit, text: 'Our guide to spotting counterfeits' },
  },

  'testo-cypionate-1250-roid-plus': {
    paragraphs: [
      'We list Testo Cypionate 1250 from Roid Plus at {price}, filed under Testosterone Cypionate with a strength of 1250 mg/mL. We have to be plain about the photograph: it is a general Roid Plus product shot, and the print on the vials and cartons is too small to read. It shows blue cartons that each hold five vials in a moulded tray, with blue flip-off caps, and nothing more we can confirm.',
      'No other cypionate listing in our catalogue goes above 500 mg/mL, so treat the 1250 figure as unconfirmed until we have checked it against a pack. When yours arrives, each vial should carry its own label naming testosterone cypionate and its strength, with a batch number and expiry date that match the carton. Our {link} shows how that batch number ties a vial to its test results.',
    ],
    link: { href: GUIDE.certificate, text: 'guide to reading a certificate of analysis' },
  },

  'mtren-5-ultima-pharma': {
    packMg: 50,
    paragraphs: [
      'Ultima-MTREN sits on our Trenbolone page, but its label names a different compound: “Metribolone/Methyltrienolone 5mg” per millilitre, in a 10 ml vial of sterile oily solution for intramuscular injection. The vial’s panel reads “Each ml contains: Metribolone/Methyltrienolone USP 5mg”, in an oil base it does not name. We file it with the trenbolone listings because of its name, not its contents.',
      'That is 50 mg in the vial, so at {price} it works out to {perMg} per milligram, computed from the label.',
      'Check that the batch number and expiry date on the carton match the vial. Our {link} sets out how metribolone differs from the trenbolone esters, and why it is listed separately there.',
    ],
    link: { href: GUIDE.trenbolone, text: 'trenbolone guide' },
  },

  'testo-e-250-mg-aburaihan': {
    packMg: 2500,
    paragraphs: [
      'Aburaihan’s Testosterone Enanthate 250 comes as a box of ten glass ampoules rather than a vial. The carton reads “Each ampoule (1ml) contains: Testosterone Enanthate 250 mg” and “Only for deep intramuscular injection”, and the photograph shows the ten ampoules in a white plastic tray.',
      'Ten ampoules at 250 mg is 2,500 mg in the box. At {price}, that comes to {perMg} per milligram, calculated from the label.',
      'Ampoules are printed one by one, so check each of them: the batch number and expiry date on every ampoule should match those on the carton. Our {link} compares every enanthate listing we stock, by strength, pack and price.',
    ],
    link: { href: GUIDE.testE, text: 'testosterone enanthate buying guide' },
  },

  'genotropin-36-i-u-pfizer': {
    packMg: 12,
    packIu: 36,
    paragraphs: [
      'The pack in our photograph is Pfizer’s Genotropin GoQuick: “Genotropin 12 mg, powder and solvent for solution for injection”, somatropin, one pre-filled 1 ml pen to a carton, “Packed by Pfizer Manufacturing Belgium NV, Puurs, Belgium”. The photograph shows two cartons side by side; the 36 IU in our listing is the same 12 mg expressed in international units.',
      'At {price}, the 12 mg pen works out to {perMg} per milligram, or {perIu} per IU, computed from the label and the listing.',
      'Check that the batch number and expiry date on the carton match those on the pen. Our {link} converts IU to milligrams and explains how pens, cartridges and vials differ.',
    ],
    link: { href: GUIDE.hgh, text: 'growth hormone guide' },
  },

  'aromalyn-25-driada-medical': {
    paragraphs: [
      'Aromalyn is exemestane from Driada Medical, sold here at {price} and filed under Aromasin (Exemestane). The carton in our photograph is mostly illustration: two classical warriors in grey wash above the words “Driada Medical”, “Aromalyn” and “Exemestane”, with a few loose white tablets beside it.',
      'The face we can see gives neither the strength nor the number of tablets. The 25 mg per tablet in our listing is therefore ours, not the photograph’s, and we have left the price per milligram out.',
      'Both details should be printed on the pack you receive, with a batch number and expiry date on the carton that are repeated on the blister or container inside. If any of them is missing, our {link} explains why that matters.',
    ],
    link: { href: GUIDE.counterfeit, text: 'guide to spotting counterfeits' },
  },

  'andropen-450-british-dragon': {
    paragraphs: [
      'Andropen 450 is a British Dragon injectable, listed at {price} under Blends with a strength of 450 mg/mL. The photograph shows two red-and-silver vials labelled “Andropen 450” and “10 ML – VIAL”, with a QR code and the line “Store at 20°C – 25°C (68°F – 77°F). Protect from sunlight. Keep away from children.”',
      'What it does not show is what the 450 is made of. No ester names or amounts are visible, and the label we can see gives no per-millilitre figure, so we have not computed a price per milligram.',
      'That is the first thing to read when the vial arrives: a blend’s label should name each ester and its amount per millilitre. Check also that the batch number and expiry date on the vial match the box. Our {link} lists the other warning signs on a pack.',
    ],
    link: { href: GUIDE.counterfeit, text: 'counterfeit guide' },
  },

  'testosterone-enanthate-250-mg-gomeisa-labs': {
    packMg: 2500,
    paragraphs: [
      'The box in our photograph is branded Testoviron: “Testosterone Enanthate, 250mg/ml, 10 Ampoules of 1 ml”, produced by Gomeisa Labs, under a red top printed with maple leaves and with a QR code on the side. We list it as Testosterone Enanthate 250 mg at {price}; it comes as ten ampoules rather than a vial.',
      'Ten 1 ml ampoules at 250 mg/ml hold 2,500 mg between them, which puts the price at {perMg} per milligram, worked out from the label.',
      'With ampoules, the thing to check is that every one carries the same batch number and expiry date as the carton. Our {link} has a table of every enanthate listing we stock, with the pack each label shows.',
    ],
    link: { href: GUIDE.testE, text: 'testosterone enanthate guide' },
  },

  'anavar-10-beligas-pharmaceuticals': {
    packMg: 1000,
    paragraphs: [
      'Our Anavar 10 from Beligas Pharmaceuticals is the pack printed “Anavar-Lite Extra”: oxandrolone tablets USP, “Oxandrolone 10mg/tab.”, in two blister strips of 50, 100 tablets in all. The carton carries a QR code and the Beligas cross. The brand’s 50 mg Pro-Anavar uses the same carton design, so read the strength rather than going by the look of the box.',
      '100 tablets of 10 mg is 1,000 mg of oxandrolone, so at {price} the label works out to {perMg} per milligram.',
      'Each of the two strips should be printed with the same batch number and expiry date as the carton. Our {link} explains how to match that batch number to the certificate that goes with it.',
    ],
    link: { href: GUIDE.certificate, text: 'certificate of analysis guide' },
  },

  'testosterone-trenbolone-lon-300-beligas-pharmaceuticals': {
    packMg: 3000,
    paragraphs: [
      'Beligas prints this one as “Testosterone Trenbolone Long 300”: one 10 mL vial, 300 mg/mL in all. The carton breaks that down as “Testosterone Enanthate 200mg/ml, Trenbolone Enanthate 100mg/ml, USP injection”, for intramuscular use only. It names Beligas Pharmaceuticals, a division of Frontière Médicale, “Formulated in Belgium” and “Manufactured in India”.',
      'That is 3,000 mg in the vial, so at {price} the cost is {perMg} per milligram, computed from the label.',
      'Because it is a blend, check that your vial’s label names both esters with those amounts, and that its batch number and expiry date match the carton. Our {link} explains how trenbolone enanthate differs from the other trenbolone esters.',
    ],
    link: { href: GUIDE.trenbolone, text: 'trenbolone guide' },
  },

  'test-tren-400-beligas-pharmaceuticals': {
    packMg: 4000,
    paragraphs: [
      'As the name on the pack says, “Test Tren Bold Blend 400” holds three esters, not two: testosterone enanthate 150 mg/mL, boldenone undecylenate 150 mg/mL and trenbolone enanthate 100 mg/mL, 400 mg/mL in all. It is one 10 mL vial from Beligas Pharmaceuticals, priced at {price}.',
      'At 4,000 mg per vial, that is {perMg} per milligram on the label’s figures.',
      'The boldenone matters when you compare this with two-ester blends, so check that your vial and carton both list all three esters with those amounts. The batch number and expiry date should match between the two as well. Our {link} covers the trenbolone esters.',
    ],
    link: { href: GUIDE.trenbolone, text: 'trenbolone guide' },
  },

  'testomed-100-deus-medical': {
    packMg: 1000,
    paragraphs: [
      'Testomed 100 is testosterone with no ester, which Deus Medical labels “Testosterone Base 100 mg/ml”. The carton reads “10 Ampoules / x 1 mL, Sterile Solution, For I.M. injection only”, so the pack is ten ampoules rather than a vial. In the photograph the ampoule carries its own print: the product name, a batch number and a manufacturing date.',
      'Ten 1 mL ampoules at 100 mg/ml make 1,000 mg, or {perMg} per milligram at {price}, from the label’s figures.',
      'That print on each ampoule is what to check: its batch number should match the carton’s, and both should show an expiry date. Our {link} explains how a batch number ties a pack to its test results.',
    ],
    link: { href: GUIDE.certificate, text: 'certificate of analysis guide' },
  },

  'anomass-400-mix-nakon-medical': {
    paragraphs: [
      'Nakon Medical’s Anomass, sold as “400 Mix”, is one 10ml vial of sterile oily solution for intramuscular injection. The vial names three esters: “Testosterone Enanthate 150mg, Boldenone Undecylenate 150mg, Trenbolone Enanthate 100mg”. Those add up to the 400 on the carton, but the part of the label in our photograph does not say whether the amounts are per millilitre, so we have not worked out a price per milligram. It is {price} here, filed under Blends.',
      'On the pack you receive, look for the per-millilitre wording, all three ester names with their amounts, and a batch number and expiry date that match between carton and vial. Our {link} explains how to check which ester, or which mix of esters, a label names.',
    ],
    link: { href: GUIDE.trenbolone, text: 'trenbolone guide' },
  },

  'equipoise-200-mg-gomeisa-labs': {
    packMg: 2000,
    paragraphs: [
      'Gomeisa Labs prints this boldenone as “Equipoise, Boldenone Undecylenate, 200mg/ml, 10 Ampoules of 1 ml”, in the same red-topped carton as its Testoviron: ten ampoules rather than a vial, at 200 mg in each millilitre.',
      'That is 2,000 mg of boldenone undecylenate across the box, which puts the price, {price}, at {perMg} per milligram, worked out from the label.',
      'With ampoules, every one should repeat the batch number and expiry date printed on the carton, and an ampoule without them is worth asking us about. Our {link} explains how to read the test certificate for a batch, and what it can and cannot tell you.',
    ],
    link: { href: GUIDE.certificate, text: 'certificate of analysis guide' },
  },

  'anomass-400-ultima-pharma': {
    packMg: 4000,
    paragraphs: [
      'Ultima-Anomass 400 Mix is a 10 ml vial of sterile oily solution, and its label spells out the contents in full: “Each ml contains: Testosterone Enanthate USP 150mg, Boldenone Undecylenate USP 150mg, Trenbolone Enanthate USP 100mg, Oil Base q.s.” The carton repeats the three strengths per ml.',
      'That is 400 mg/ml and 4,000 mg in the vial, so at {price} it costs {perMg} per milligram, computed from the label.',
      'Check that the carton and vial agree on all three esters and their amounts, and on the batch number and expiry date. Nakon Medical sells a blend under the same name with the same three amounts, so the manufacturer’s name is worth confirming too. Our {link} explains trenbolone enanthate and the other esters.',
    ],
    link: { href: GUIDE.trenbolone, text: 'trenbolone guide' },
  },

  'mass-stack-500-ultima-pharma': {
    packMg: 5000,
    paragraphs: [
      'Mass-Stack 500 is printed “Ultima-Mass/Stack 500 Mix” and combines two compounds in one 10 ml vial: “Testosterone Enanthate USP 300mg” and “Deca Durabolin (Nandrolone) USP 200mg” in each ml, in an oil base. The label uses the trade name Deca Durabolin and does not spell out the nandrolone ester, so that is one detail to look for on your pack.',
      '500 mg/ml across 10 ml is 5,000 mg. At {price}, the label works out to {perMg} per milligram.',
      'Check that the carton and vial give the same two strengths and the same batch number and expiry date. Our {link} explains nandrolone decanoate, how it differs from NPP, and how to compare listings.',
    ],
    link: { href: GUIDE.nandrolone, text: 'nandrolone guide' },
  },

  'primo-100-ultima-pharma': {
    packMg: 1000,
    paragraphs: [
      'Ultima-Primo 100 is methenolone enanthate, 100 mg per ml in a 10 ml vial of sterile oily solution for intramuscular injection. The vial’s panel reads “Each ml contains: Methenolone Enanthate USP 100mg, Oil Base q.s.”, which matches our listing.',
      'At {price}, the 1,000 mg in the vial costs {perMg} per milligram, worked out from the label.',
      'Our catalogue also lists methenolone acetate, so check that the label on your vial names the enanthate ester, and that its batch number and expiry date match the carton. Our {link} goes through the other details worth checking on a pack.',
    ],
    link: { href: GUIDE.counterfeit, text: 'guide to spotting counterfeits' },
  },

  'peg-mgf-deus-medical': {
    packMg: 2,
    paragraphs: [
      'PEG MGF from Deus Medical is a single vial of freeze-dried powder. The carton spells it out: “Pegylated Mechano Growth Factor”, “Content: 1 vial of Sterile Lyophilized Powder”, 2 mg per vial. It is marked “For laboratory research only”, and its storage panel reads “Keep refrigerated (2°–8°C). Do not freeze. Protect from light.”',
      'One 2 mg vial at {price} is {perMg} per milligram, computed from the label.',
      'The carton’s warning says “Do not use after the exp date”, so an expiry date should be printed on it; check that it and the batch number match the vial. Our {link} explains what a test certificate for a batch should state.',
    ],
    link: { href: GUIDE.certificate, text: 'certificate of analysis guide' },
  },

  'adex-1-nakon-medical': {
    packMg: 50,
    paragraphs: [
      'Adex 1 is Nakon Medical’s anastrozole: “Anastrozole 1mg” on the front of the carton and “2 x 25 Tablets, For oral use only” on the side, so 50 tablets in two blister strips. The strips in our photograph are printed with the Nakon Medical name across the foil.',
      '50 tablets at 1 mg is 50 mg of anastrozole. At {price}, that is {perMg} per milligram, calculated from the label.',
      'Check that each strip carries the same batch number and expiry date as the carton, and that the count is two full strips of 25. Our {link} goes through the other warning signs on a pack, and what to do if you find one.',
    ],
    link: { href: GUIDE.counterfeit, text: 'counterfeit guide' },
  },

  'razor-200-xt-labs': {
    packMg: 2000,
    paragraphs: [
      'XT Labs’ Razor is a three-ester blend at 200 mg/mL in one 10 mL vial. The carton’s side panel lists the contents: testosterone propionate 100 mg/mL, drostanolone propionate 50 mg/mL and trenbolone acetate 50 mg/mL. The vial names the same three, and the panel has printed fields for the batch number and expiry date.',
      '2,000 mg in the vial at {price} comes to {perMg} per milligram, from the label’s figures.',
      'Check that the three amounts on your carton and vial agree, and that the batch and expiry fields are filled in and match. Our {link} explains how trenbolone acetate differs from trenbolone enanthate.',
    ],
    link: { href: GUIDE.trenbolone, text: 'trenbolone guide' },
  },

  'nolvadex-10-ryzen-pharmaceuticals': {
    packMg: 500,
    paragraphs: [
      'Ryzen Pharmaceuticals’ Nolva 10 is tamoxifen citrate. The carton reads “Nolva 10”, “Nolvadex 10mg”, “For oral application only” and “2 x 25 tablets”, so the box holds 50 tablets of 10 mg.',
      'That is 500 mg of tamoxifen citrate, which at {price} works out to {perMg} per milligram, computed from the label.',
      'Our photograph shows the carton only. When yours arrives, check that each of the two strips inside is printed with the same batch number and expiry date as the box, and that the strips are sealed. Our {link} explains what a certificate of analysis should list for a batch like this, and how to confirm one with the laboratory.',
    ],
    link: { href: GUIDE.certificate, text: 'certificate guide' },
  },

  'oxyplex-50-xt-labs': {
    packMg: 3750,
    paragraphs: [
      'XT Labs prints the name as Oxiplex (our listing spells it OxyPLex): oxymetholone, 50 mg per tablet, “Content: 75 Tablets”, for oral use only. It comes in a black screw-top tub inside a white carton, and the tub’s own label repeats the strength.',
      '75 tablets of 50 mg is 3,750 mg, so at {price} the cost is {perMg} per milligram on the label’s figures.',
      'With a tub rather than blister strips, the batch number and expiry date should appear on both the tub and the carton; check that they match, and that the tub was sealed when it reached you. Our {link} lists the other things to look at on arrival.',
    ],
    link: { href: GUIDE.counterfeit, text: 'counterfeit guide' },
  },

  'mtren-5-nakon-medical': {
    paragraphs: [
      'Nakon Medical’s MTREN is labelled “Metribolone/Methyltrienolone 5mg”, in a 10ml vial of sterile oily solution for intramuscular injection; the carton repeats “5” and “10ml” and says it holds one vial. We file it on the Trenbolone page because of its name, but the pack names metribolone, a different steroid.',
      'The front label does not say whether the 5 mg is per millilitre, so we have not computed a price per milligram. It is {price}.',
      'Check that your vial states the strength per millilitre and carries a batch number and expiry date matching the carton. Our {link} describes metribolone separately from the trenbolone esters and lists both MTren listings apart from the rest.',
    ],
    link: { href: GUIDE.trenbolone, text: 'trenbolone guide' },
  },

  'te-300-intex-pharma': {
    packMg: 3000,
    paragraphs: [
      'Intex Pharma’s TE-300 is testosterone enanthate at 300 mg/ml in a 10 ml vial. The name on the front is printed in a holographic finish, and the carton’s side panel repeats “300mg Testosterone Enanthate” per ml “in oil solution”. The rest of that panel’s small print is not legible in our photograph.',
      'At {price}, the 3,000 mg in the vial works out to {perMg} per milligram, computed from the label.',
      'Check that the batch number and expiry date on the carton match the vial, and that the oil named on your pack is stated in full. Our {link} compares every enanthate listing we stock, and explains why the price per milligram is the fairer comparison.',
    ],
    link: { href: GUIDE.testE, text: 'testosterone enanthate guide' },
  },

  'enantat-250-dragon-pharma': {
    packMg: 2500,
    paragraphs: [
      'Dragon Pharma’s Enantat 250 is a 10 ml vial of testosterone enanthate at 250 mg/ml. Everything is on the vial itself: the strength and volume, “For intramuscular use only”, storage at 20–25 °C (68–77 °F), protected from light, and printed LOT and EXP fields.',
      '2,500 mg per vial at {price} works out to {perMg} per milligram, calculated from the label.',
      'Those LOT and EXP fields are what to check. Both should be printed rather than blank, and they should match any outer packaging that comes with the vial. Our {link} explains what to read on an enanthate label, and why a printed strength is a claim rather than a measurement.',
    ],
    link: { href: GUIDE.testE, text: 'testosterone enanthate guide' },
  },

  'anavar-10mg-gomeisa-labs': {
    packMg: 500,
    paragraphs: [
      'Gomeisa Labs’ Anavar is oxandrolone, 10mg per tablet, 50 tablets to the carton, which reads “Produced by Gomeisa Labs / Montreal – Canada” and carries a QR code on top. The tablets in our photograph are red and round, in a clear blister.',
      '50 tablets of 10 mg make 500 mg, so the price of {price} is {perMg} per milligram, from the label’s figures.',
      'Check the batch number and expiry date on the carton against the back of each blister strip, and count the tablets: there should be 50. Our {link} covers the warning signs to look for on a pack, and what to do if you find one.',
    ],
    link: { href: GUIDE.counterfeit, text: 'guide to spotting counterfeits' },
  },

  'cut-mix-150-ultima-pharma': {
    packMg: 1500,
    paragraphs: [
      'Ultima-Cut Mix 150 puts three compounds in one 10 ml vial: “Testosterone Propionate USP 50mg, Trenbolone Acetate USP 50mg, Drostanolone Propionate USP 50mg” in each ml, in an oil base, 150 mg/ml in total. The carton repeats the three amounts per ml.',
      'That is 1,500 mg in the vial; at {price} it comes to {perMg} per milligram, calculated from the label.',
      'Since three compounds share the vial, read the label for all three names and amounts and check that they agree with the carton, along with the batch number and expiry date. Our {link} sets out the trenbolone esters and how to check which one, or which mix, a label names.',
    ],
    link: { href: GUIDE.trenbolone, text: 'trenbolone guide' },
  },

  'hexyl-450-kalpa-pharmaceuticals': {
    packMg: 4500,
    paragraphs: [
      'Kalpa Pharmaceuticals labels Hexyl 450 simply “Testosterone Mix, 450 mg/ml, 10 ml”, for intramuscular use only, with a QR code on the vial. The vial in our photograph does not say which testosterone esters make up the 450 mg, and our listing does not either.',
      'At {price}, 4,500 mg in the vial is {perMg} per milligram, computed from the label.',
      'A blend should name each ester and its amount, so look for that on the pack you receive, along with a batch number and expiry date that match the carton. If the ester list is absent, ask us. Our {link} explains why an incomplete label is worth questioning.',
    ],
    link: { href: GUIDE.counterfeit, text: 'counterfeit guide' },
  },

  'anadrol-50-pharmaqo': {
    packMg: 3000,
    paragraphs: [
      'Pharmaqo’s Anadrol 50 comes in a foil pouch, not a carton: “Anadrol 50 (Oxymetholone), 50MG X 60 TABLETS”, with “Keep out of reach of children”, “Store below 30°”, “Protect from light” and “Do not refrigerate”, and a QR code marked “Scan me”.',
      'Sixty 50 mg tablets is 3,000 mg; at {price} that is {perMg} per milligram, worked out from the label.',
      'The face of the pouch in our photograph shows no batch number or expiry date, so look for them on the back of yours and on any strip inside. If they are missing, tell us. The brand’s Anavar 50 comes in a near-identical green pouch, so read the compound name too. Our {link} lists other signs to look at.',
    ],
    link: { href: GUIDE.counterfeit, text: 'counterfeit guide' },
  },

  'winstrol-10-pharmaqo-us': {
    packMg: 1000,
    paragraphs: [
      'Our Winstrol 10, listed under the maker name Pharmaqo US, is shown in a pouch printed “Pharmaqo” and “Winstrol (Stanozolol), 10MG X 100 TABLETS”; nothing on the face of the pouch says “US”. It carries the same lines as the brand’s other pouches: keep out of reach of children, store below 30°, protect from light, do not refrigerate.',
      '100 tablets of 10 mg is 1,000 mg of stanozolol, or {perMg} per milligram at {price}, from the label’s figures.',
      'Look on the back of the pouch for the batch number and expiry date, then match the batch number to the certificate for that batch. Our {link} explains how, and what a certificate can and cannot prove.',
    ],
    link: { href: GUIDE.certificate, text: 'certificate of analysis guide' },
  },

  'cypionat-250-hutech-labs': {
    paragraphs: [
      'Hutech Labs labels this testosterone cypionate “Test C 25…” on a black-and-yellow vial. The strength runs off the edge of our photograph, which is why we have not computed a price per milligram. The parts we can read say “Testosterone Cy…”, “10ML Sterile Multiple…”, “For Intramuscular Use”, a storage range starting at 5°C, and “Keep out of reach”.',
      'Our listing calls it Cypionat 250, at 250 mg/mL, for {price}.',
      'When it arrives, turn the vial and read the full strength line, which should say 250 mg per mL to match the listing. Look for the batch number and expiry date as well. Our {link} explains how those numbers connect a vial to its test certificate.',
    ],
    link: { href: GUIDE.certificate, text: 'certificate of analysis guide' },
  },

  'turanaxyl-10-kalpa-pharmaceuticals': {
    packMg: 1000,
    paragraphs: [
      'Turanaxyl is Kalpa Pharmaceuticals’ 4-chlorodehydromethyltestosterone, filed on our Turinabol page. It comes in a foil pouch that reads “10 mg/tab”, “100 tabs” and “Manufactured under license by Kalpa Pharmaceuticals”, with “Protect from light, keep away from children” along the foot.',
      '100 tablets at 10 mg is 1,000 mg; at {price} the label’s figures give {perMg} per milligram.',
      'The front of the pouch shows a QR code but no batch number or expiry date, so check the back and any strips inside for both. Our {link} lists the other warning signs to look for on a pack.',
    ],
    link: { href: GUIDE.counterfeit, text: 'counterfeit guide' },
  },

  'primobull-100-bull-pharma': {
    paragraphs: [
      'Primobull is Bull Pharma’s methenolone, photographed in its box: “Primobull 100mg” and “Cont. Net. 10 ml.”, with the vial showing through a window. Our listing gives methenolone enanthate at 100 mg/mL, for {price}.',
      'The photograph does not name the ester, and the strength line on the vial is partly hidden, so it cannot tell us whether the 100 mg is per millilitre. We have left the price per milligram out for that reason.',
      'When the box arrives, read the vial for the compound and ester, the strength per millilitre, and a batch number and expiry date that match the box. Our catalogue also lists methenolone acetate, so the ester matters. Our {link} covers the other checks.',
    ],
    link: { href: GUIDE.counterfeit, text: 'guide to spotting counterfeits' },
  },

  'propionat-100-dragon-pharma': {
    paragraphs: [
      'Propionat 100 from Dragon Pharma is testosterone propionate in a 10 ml vial, with the same label layout as the brand’s Enantat 250: “For intramuscular use only”, storage at 20–25 °C (68–77 °F), protect from light, keep away from children, and printed LOT and EXP fields.',
      'The strength figure is turned away from the camera in our photograph, so the 100 mg/mL comes from our listing and we have not computed a price per milligram. It is {price}.',
      'Check that your vial’s label gives 100 mg per ml, and that the LOT and EXP fields are filled in. Our {link} explains how the lot number links a vial to its test certificate.',
    ],
    link: { href: GUIDE.certificate, text: 'certificate of analysis guide' },
  },

  'genotropin-16-i-u-pfizer': {
    packMg: 5.3,
    packIu: 16,
    paragraphs: [
      'This is the smaller Genotropin GoQuick pen from Pfizer: “Genotropin 5.3mg, powder and solvent for solution for injection”, somatropin, one pre-filled 1 ml pen to a carton, packed by Pfizer Manufacturing Belgium NV in Puurs. The 16 IU in our listing is the same 5.3 mg expressed in international units.',
      'At {price}, 5.3 mg works out to {perMg} per milligram, or {perIu} per IU, computed from the label and the listing.',
      'Check that the batch number and expiry date on the carton match the pen. Our {link} explains IU, milligrams and the pen format, and why a printed strength is a claim rather than a measurement.',
    ],
    link: { href: GUIDE.hgh, text: 'growth hormone guide' },
  },

  'deca-300-hemi-pharma': {
    paragraphs: [
      'Hemi Pharma’s Deca 300 is labelled “Nandrolone Decanoate 300mg” and “For intramuscular use only”, with the maker’s name printed on the green flip-off cap and its seal as well as on the label.',
      'In our photograph the fill volume is partly hidden under overlapping print, and the strength line does not say per millilitre, so we have not worked out a price per milligram. Our listing gives 300 mg/mL, at {price}.',
      'On arrival, check that the cap seal is unbroken, that the label states both the strength per millilitre and the volume, and that a batch number and expiry date are printed. Our {link} explains nandrolone decanoate, how it differs from NPP, and what the licensed product contains.',
    ],
    link: { href: GUIDE.nandrolone, text: 'nandrolone guide' },
  },

  'deca-500-ultima-pharma': {
    packMg: 5000,
    paragraphs: [
      'Ultima-Deca 500 is nandrolone decanoate at 500 mg per ml, in a 10 ml vial of sterile oily solution for intramuscular injection. The vial’s panel reads “Each ml contains: Nandrolone Decanoate USP 500mg, Oil Base q.s.”, and the carton repeats the strength.',
      '5,000 mg in the vial at {price} is {perMg} per milligram, computed from the label.',
      'Several of our nandrolone listings are 250 or 300 mg/ml, so read the figure on your vial: it should say 500 mg/ml. Check too that the batch number and expiry date match between carton and vial. Our {link} compares every nandrolone listing we stock.',
    ],
    link: { href: GUIDE.nandrolone, text: 'nandrolone guide' },
  },

  'test-e-300-beligas-pharmaceuticals': {
    packMg: 3000,
    paragraphs: [
      'Beligas sells this testosterone enanthate as “Etho Testosterone”: “testosterone enanthate injection, USP, 300 mg/mL”, one 10 mL vial, for intramuscular use only. We list it as Test E 300 at {price}. The carton names Beligas Pharmaceuticals, a division of Frontière Médicale, “Formulated in Belgium” and “Manufactured in India”, and has a QR code on the side.',
      'That is 3,000 mg per vial, so the label works out to {perMg} per milligram.',
      'Check that the vial and the carton show the same batch number and expiry date. Our {link} lists every enanthate listing we stock side by side, with the pack each label shows.',
    ],
    link: { href: GUIDE.testE, text: 'testosterone enanthate guide' },
  },

  'testo-enanthate-1250-roid-plus': {
    paragraphs: [
      'Testo Enanthate 1250 is listed under Roid Plus at {price}, with a strength of 1250 mg/mL. Its photograph is the same general Roid Plus shot as our cypionate listing: blue cartons each holding five vials in a tray, blue caps, and print too small to read. We cannot confirm the ester, the strength or the fill from it, so there is no price per milligram here.',
      'No other enanthate listing in our catalogue goes above 500 mg/mL, so treat 1250 as unconfirmed until we have checked a pack. On yours, each vial should name testosterone enanthate and its strength, with a batch number and expiry date matching the carton. Our {link} covers what an enanthate label should state.',
    ],
    link: { href: GUIDE.testE, text: 'testosterone enanthate guide' },
  },

  'testoplex-e-300-xt-labs': {
    packMg: 3000,
    paragraphs: [
      'XT Labs’ Testoplex-E is testosterone enanthate, 300 mg per mL, in one 10 mL vial. The carton prints the strength as “300mg | mL”, and its side panel gives the content, the maker and a warning block, with Batch and Exp. Date fields at the foot. The vial repeats “300mg” and “10mL”.',
      'At {price}, the 3,000 mg in the vial works out to {perMg} per milligram, computed from the label.',
      'Those Batch and Exp. Date fields should be filled in and should match what is printed on the vial. Our {link} compares every enanthate listing we stock and explains why a single compound, strength and fill on the label is what to look for.',
    ],
    link: { href: GUIDE.testE, text: 'testosterone enanthate guide' },
  },

  'testoxyl-e-250-kalpa-pharmaceuticals': {
    packMg: 2500,
    paragraphs: [
      'The name on this Kalpa Pharmaceuticals vial is “Testoxyl Enanthate 250”: testosterone enanthate, 250 mg/ml, 10 ml, for intramuscular use only, with a QR code and storage at 20–25 °C (68–77 °F). Our listing calls it Testoxyl E 250.',
      'The vial holds 2,500 mg, which at {price} works out to {perMg} per milligram on the label’s figures.',
      'Kalpa’s Hexyl 450 vial wears the same teal label design, so read the name and strength rather than going by colour. Then check that the batch number and expiry date on the vial match the carton. Our {link} sets the enanthate listings side by side.',
    ],
    link: { href: GUIDE.testE, text: 'testosterone enanthate guide' },
  },

  'ena-test-250-omega-lab': {
    packMg: 2500,
    paragraphs: [
      'Omega Lab’s Enatest is testosterone enanthate, 250 mg/ml, in a 10ml vial. The vial is brown glass with a red flip-off cap, and both the vial and the purple carton carry the strength. The carton’s side panel restates the contents and has a printed batch number field beneath them, beside a QR code.',
      'At {price}, 2,500 mg works out to {perMg} per milligram, calculated from the label.',
      'Read the batch number on the side of the carton and check it against the vial; the expiry date should be printed on both. Our {link} explains what to compare between enanthate packs, and how our listings line up.',
    ],
    link: { href: GUIDE.testE, text: 'testosterone enanthate guide' },
  },

  'anavar-10-saxon-pharmaceuticals': {
    paragraphs: [
      'Saxon Pharmaceuticals’ Anavar is “oxandrolone tablets USP 10mg”, marked “Active Formula” and “For Oral use only”, with white tablets in a foil blister beside the carton.',
      'The face of the carton in our photograph does not give the number of tablets, and only part of the blister is visible, so we have not worked out a price per milligram. It is {price}, filed under Anavar (Oxandrolone).',
      'Count the tablets when the pack arrives, and check that the blister and carton show the same batch number and expiry date. Our {link} explains how a batch number connects a pack to its certificate, and how to confirm a certificate with the laboratory.',
    ],
    link: { href: GUIDE.certificate, text: 'certificate of analysis guide' },
  },

  'anavar-50-beligas-pharmaceuticals': {
    packMg: 5000,
    paragraphs: [
      'Our Anavar 50 from Beligas is the pack printed “Pro-Anavar Extra”: oxandrolone tablets USP, “Oxandrolone 50mg/tab.”, two strips of 50, 100 tablets in all. It uses the same carton design as the brand’s 10 mg Anavar-Lite, so the strength printed under the name is the detail to read.',
      '100 tablets at 50 mg is 5,000 mg; at {price} that comes to {perMg} per milligram, from the label.',
      'Check that both blister strips repeat the carton’s batch number and expiry date, and that the strength on the strips matches the 50 mg on the box. Our {link} covers the other warning signs on a pack.',
    ],
    link: { href: GUIDE.counterfeit, text: 'counterfeit guide' },
  },

  'anavar-50-dragon-pharma': {
    packMg: 5000,
    paragraphs: [
      'Dragon Pharma’s Anavar 50 comes in a white foil pouch: “Anavar 50, Oxandrolone, 50 mg/tab, 100 Tabs”, for oral use only, with storage at 20–25 °C (68–77 °F), protected from sunlight. Printed LOT and EXP fields sit on the front of the pouch, where they are easy to find.',
      '100 tablets at 50 mg is 5,000 mg of oxandrolone. At {price}, that is {perMg} per milligram, computed from the label.',
      'Check that both fields are filled in on your pouch, and that it was sealed when it reached you. Our {link} covers the other signs to look for, and what to do if something does not add up.',
    ],
    link: { href: GUIDE.counterfeit, text: 'guide to spotting counterfeits' },
  },

  'anavar-50-pharmaqo': {
    packMg: 3000,
    paragraphs: [
      'Pharmaqo’s Anavar 50 is a green foil pouch printed “Anavar 50 (Oxandrolone), 50MG X 60 TABLETS”, with “Store below 30°”, “Protect from light” and “Do not refrigerate”, and a QR code marked “Scan me”.',
      'Sixty tablets of 50 mg is 3,000 mg, so at {price} the label works out to {perMg} per milligram.',
      'The same brand’s Anadrol 50 comes in an almost identical pouch, so read the compound name rather than going by colour. The front of the pouch shows no batch number or expiry date; look for both on the back of yours. Our {link} explains how to match a batch number to its test certificate.',
    ],
    link: { href: GUIDE.certificate, text: 'certificate of analysis guide' },
  },

  'oxanabol-10-british-dragon': {
    packMg: 1000,
    paragraphs: [
      'British Dragon’s Oxanabol is oxandrolone in a red foil pouch printed “10 mg / tab”, “100 tabs” and “Oxanabol Tablets”, with storage at 20–25 °C (68–77 °F), protect from sunlight, keep away from children and for oral use only, and a QR code at the foot.',
      '100 tablets of 10 mg is 1,000 mg. At {price}, that is {perMg} per milligram, calculated from the label.',
      'Our photograph shows only the front of the pouch. The batch number and expiry date should be on the back or on the strips inside, and should match each other. Our {link} lists the other things to check on a pack.',
    ],
    link: { href: GUIDE.counterfeit, text: 'counterfeit guide' },
  },

  'oxarow-50-crowx-labs': {
    packMg: 2500,
    paragraphs: [
      'Crowx Labs packs Oxarow in a white screw-top bottle: “Oxarow 50mg / 50 tabs” on the front, and on the side “Oxandrolone, each tablets contains 50 mg, for oral use only”. The side label also has a holographic scratch panel marked “Scrape query”.',
      '50 tablets at 50 mg is 2,500 mg; at {price} that is {perMg} per milligram, worked out from the label.',
      'Check the bottle for a batch number and expiry date, and that the seal under the cap is intact when it reaches you. Our {link} explains the warning signs on a pack, and why looking at the pack is not enough on its own.',
    ],
    link: { href: GUIDE.counterfeit, text: 'guide to spotting counterfeits' },
  },

  'boldebull-200-bull-pharma': {
    paragraphs: [
      'Boldebull is Bull Pharma’s boldenone, photographed in its box: “Boldebull 200mg” and “Cont. Net. 10 ml.”, with the vial showing through a window. The vial’s strength line is cut off after “200 mg / 1”, and neither box nor vial names the ester in the photograph.',
      'Our listing gives boldenone undecylenate at 200 mg/mL, for {price}. Because the photograph cannot confirm the per-millilitre figure, we have not computed a price per milligram.',
      'When it arrives, read the full strength line and the ester name on the vial, and check that its batch number and expiry date match the box. Our {link} covers what else to look at on a pack.',
    ],
    link: { href: GUIDE.counterfeit, text: 'counterfeit guide' },
  },
};

/** A run of note text, or a link inside it. */
export type NoteSegment = string | { href: string; text: string };

export type RenderedNote = {
  /** Paragraphs, each a list of text runs and links. */
  paragraphs: NoteSegment[][];
  /** The whole note as one plain string, for the Product JSON-LD description. */
  text: string;
  /** ISO date the pack in the photograph was read. */
  checked: string;
};

const MONEY_TOKENS = /\{(price|perMg|perIu)\}/g;

/** "$0.015" or "$0.07" below ten cents, "$1.67" above; "about" when the shown figure is rounded. */
function perUnit(price: number, quantity: number): string {
  const value = price / quantity;
  const digits = value >= 0.1 ? 2 : 3;
  const shown = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(value);
  return Math.abs(Number(value.toFixed(digits)) - value) < 1e-9 ? shown : `about ${shown}`;
}

/**
 * The note for a product, with the live price filled in, or null when it has none.
 * Returns null too (and logs) when the note uses a figure it does not supply.
 */
export function productNote(slug: string, price: number): RenderedNote | null {
  const note = PRODUCT_NOTES[slug];
  if (!note) return null;

  const values: Record<string, string | null> = {
    price: formatPrice(price),
    perMg: note.packMg ? perUnit(price, note.packMg) : null,
    perIu: note.packIu ? perUnit(price, note.packIu) : null,
  };

  const missing = note.paragraphs
    .flatMap((p) => Array.from(p.matchAll(MONEY_TOKENS), (m) => m[1]))
    .filter((token) => !values[token]);
  if (missing.length > 0 || !Number.isFinite(price) || price <= 0) {
    console.error(`product note for ${slug} not shown: missing ${missing.join(', ') || 'price'}`);
    return null;
  }

  const fill = (text: string) => text.replace(MONEY_TOKENS, (_, token: string) => values[token] ?? '');
  const paragraphs = note.paragraphs.map((p) =>
    p
      .split('{link}')
      .flatMap<NoteSegment>((part, i) => (i === 0 ? [fill(part)] : [{ ...note.link }, fill(part)]))
      .filter((segment) => segment !== '')
  );
  const text = paragraphs
    .map((p) => p.map((segment) => (typeof segment === 'string' ? segment : segment.text)).join(''))
    .join(' ');

  return { paragraphs, text, checked: NOTES_CHECKED };
}

/** Every slug that has a note. For checks and scripts; the page asks productNote(). */
export const NOTED_SLUGS = Object.keys(PRODUCT_NOTES);
