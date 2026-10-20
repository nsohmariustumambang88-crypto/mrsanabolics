import { formatPrice } from '@/lib/format';
import type { CategoryCollection, GroupCollection, StrengthPrice } from '@/lib/db/collections';
import type { FaqItem } from '@/components/shop/collection-sections';
import type { IntlLocale } from '@/lib/i18n/locales';
import { namesIn } from '@/lib/i18n/collections';
import { rateLine, type RateWords } from '@/lib/i18n/delivery-text';

/*
  The questions on the translated collection pages, answered from the collection itself — the
  same questions lib/catalogue/collection-faq.ts asks in English, translated.

  Only the steroid categories (injectables, orals) have translated pages, so only the steroid
  answers are here: the counterfeit guide for "is it genuine", and each country's control status
  for "is it legal", in the words of the law article. The English articles they link to are
  marked as English.

  One difference from the English page: the delivery question asks about the country the
  language is spoken in (Spain on /es) instead of the USA, and its answer is read from that
  country's zone — the same rates the checkout would quote.
*/

const COUNTERFEIT = '/blog/how-to-spot-counterfeit-steroids';
const LAW = '/blog/anabolic-steroids-law-us-uk-canada-australia';

export type IntlDelivery = { country: string; rates: RateWords[] } | null;

/*
  French, Italian and German questions lead with the compound — "Énanthate de testostérone :
  quel est le prix ?" — because their articles and cases change with the noun (de l’, del, bei
  den …en), and a question built around a name it cannot decline reads as broken. Spanish takes
  the name inside the sentence, as its searches do ("precio de enantato de testosterona").
*/
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Strings = {
  listing: (n: number) => string;
  priceQ: (label: string) => string;
  priceSame: (one: boolean, price: string, inStock: number, listings: number) => string;
  priceRange: (from: string, to: string, perStrength: string, inStock: number, listings: number) => string;
  perStrength: (rows: string) => string;
  strengthRow: (strength: string, range: string, listings: number) => string;
  rangeTo: (from: string, to: string) => string;
  whereQ: (title: string) => string;
  whereA: (inStock: number, listings: number) => string;
  shipQ: (label: string, country: string) => string;
  shipA: (country: string, options: string) => string;
  or: string;
  altQ: (label: string) => string;
  altA: (title: string, listings: number, altTitle: string, altListings: number) => string;
  altLink: (altTitle: string) => string;
  makersQ: (label: string) => string;
  makersOne: (name: string) => string;
  makersMany: (n: number, names: string) => string;
  strengthsQ: (label: string) => string;
  strengthsA: (names: string) => string;
  genuineQ: (label: string) => string;
  genuineA: string;
  genuineLink: string;
  legalQ: (label: string) => string;
  legalA: string;
  legalLink: string;
  rangeQ: (label: string) => string;
  rangeA: (listings: number, compounds: number, names: string) => string;
  categoryMakersQ: (label: string) => string;
  categoryMakersA: (n: number, names: string) => string;
  categoryPricesQ: (label: string) => string;
  categoryPricesA: (from: string, to: string, examples: string) => string;
  example: (name: string, price: string) => string;
};

const STRINGS: Record<IntlLocale, Strings> = {
  es: {
    listing: (n) => (n === 1 ? 'producto' : 'productos'),
    priceQ: (l) => `¿Cuál es el precio de ${l}?`,
    priceSame: (one, p, s, n) => `${one ? 'Su precio es' : 'Todos los productos cuestan'} ${p}. ${s} de ${n} en stock.`,
    priceRange: (from, to, per, s, n) =>
      `Los precios van de ${from} a ${to}, según el fabricante, la concentración y el envase.${per} ${s} de ${n} productos están en stock.`,
    perStrength: (rows) => ` Por concentración: ${rows}.`,
    strengthRow: (st, r, n) => `${st}: ${r} (${n} ${n === 1 ? 'producto' : 'productos'})`,
    rangeTo: (a, b) => `${a} a ${b}`,
    whereQ: (t) => `¿Dónde comprar ${t}?`,
    whereA: (s, n) =>
      `Todos los productos de esta página se pueden pedir aquí: abra el producto, añádalo a la cesta y finalice la compra. ${s} de ${n} ${n === 1 ? 'producto está' : 'productos están'} en stock. El proceso de pago está en inglés y se cobra en dólares estadounidenses. Si tiene alguna pregunta antes de pedir, escríbanos por Telegram o WhatsApp con los botones de la parte inferior de la página.`,
    shipQ: (l, c) => `¿Envían ${l} a ${c}?`,
    shipA: (c, o) => `Sí. Los pedidos a ${c} se envían por ${o}.`,
    or: 'o',
    altQ: (l) => `¿${l} se vende en comprimidos o inyectable?`,
    altA: (t, n, a, m) => `Esta página recoge ${t}: ${n} ${n === 1 ? 'producto' : 'productos'}. ${a} aparece por separado, con ${m} ${m === 1 ? 'producto' : 'productos'}.`,
    altLink: (a) => `Ver ${a}.`,
    makersQ: (l) => `¿Qué fabricantes producen ${l}?`,
    makersOne: (n) => `Aquí figura un solo fabricante: ${n}.`,
    makersMany: (n, names) => `Aquí figuran ${n} fabricantes: ${names}.`,
    strengthsQ: (l) => `¿En qué concentraciones está disponible ${l}?`,
    strengthsA: (names) =>
      `Los productos vienen en ${names}. Cada página de producto muestra la concentración y el envase exactamente como figuran en la etiqueta.`,
    genuineQ: (l) => `¿Cómo puedo comprobar que un producto de ${l} es auténtico?`,
    genuineA:
      'Compare el número de lote del envase con el certificado del fabricante, use el código o la web de verificación del propio fabricante cuando la ofrezca y compare el envase con la fotografía del producto.',
    genuineLink: 'Nuestra guía para detectar esteroides falsificados (en inglés) repasa cada comprobación.',
    legalQ: (l) => `¿Cuál es la situación legal de ${l}?`,
    legalA:
      'Los esteroides anabólicos están controlados en Estados Unidos (Lista III), el Reino Unido (Clase C), Canadá (Lista IV) y Australia (solo con receta; poseerlos sin autorización es un delito). Las normas sobre posesión, suministro e importación varían de un país a otro.',
    legalLink: 'Nuestra guía sobre la legislación de esteroides (en inglés) cita la ley de cada país.',
    rangeQ: (l) => `¿Qué incluye la gama de ${l}?`,
    rangeA: (n, c, names) =>
      `${n} productos en ${c} compuestos: ${names}. Cada compuesto tiene su propia página, que compara la versión de cada fabricante.`,
    categoryMakersQ: (l) => `¿Qué fabricantes figuran en ${l}?`,
    categoryMakersA: (n, names) => `${n} fabricantes: ${names}.`,
    categoryPricesQ: (l) => `¿Cuáles son los precios de los ${l}?`,
    categoryPricesA: (a, b, ex) =>
      `Los precios van de ${a} a ${b}, según el compuesto, el fabricante, la concentración y el envase.${ex ? ` Por ejemplo: ${ex}. Cada página de compuesto desglosa sus precios por concentración.` : ''}`,
    example: (n, p) => `${n} desde ${p}`,
  },
  fr: {
    listing: (n) => (n === 1 ? 'produit' : 'produits'),
    priceQ: (l) => `${cap(l)} : quel est le prix ?`,
    priceSame: (one, p, s, n) => `${one ? 'Son prix est de' : 'Tous les produits coûtent'} ${p}. ${s} sur ${n} en stock.`,
    priceRange: (from, to, per, s, n) =>
      `Les prix vont de ${from} à ${to}, selon le fabricant, le dosage et le conditionnement.${per} ${s} produits sur ${n} sont en stock.`,
    perStrength: (rows) => ` Par dosage : ${rows}.`,
    strengthRow: (st, r, n) => `${st} : ${r} (${n} ${n === 1 ? 'produit' : 'produits'})`,
    rangeTo: (a, b) => `${a} à ${b}`,
    whereQ: (t) => `Où acheter ${t} ?`,
    whereA: (s, n) =>
      `Chaque produit de cette page peut être commandé ici : ouvrez le produit, ajoutez-le au panier et passez commande. ${s} ${n === 1 ? 'produit' : 'produits'} sur ${n} ${s === 1 ? 'est' : 'sont'} en stock. Le paiement se fait en anglais et est débité en dollars américains. Pour toute question avant de commander, écrivez-nous sur Telegram ou WhatsApp avec les boutons en bas de la page.`,
    shipQ: (l, c) => `${cap(l)} : livrez-vous en ${c} ?`,
    shipA: (c, o) => `Oui. Les commandes vers la ${c} partent en ${o}.`,
    or: 'ou',
    altQ: (l) => `${cap(l)} : en comprimés ou en injectable ?`,
    altA: (t, n, a, m) => `Cette page présente ${t} : ${n} ${n === 1 ? 'produit' : 'produits'}. ${a} est présenté séparément, avec ${m} ${m === 1 ? 'produit' : 'produits'}.`,
    altLink: (a) => `Voir ${a}.`,
    makersQ: (l) => `${cap(l)} : quels fabricants ?`,
    makersOne: (n) => `Un seul fabricant figure ici : ${n}.`,
    makersMany: (n, names) => `${n} fabricants figurent ici : ${names}.`,
    strengthsQ: (l) => `${cap(l)} : quels dosages sont proposés ?`,
    strengthsA: (names) =>
      `Les produits existent en ${names}. Chaque page produit indique le dosage et le conditionnement exactement tels qu’imprimés sur l’étiquette.`,
    genuineQ: (l) => `${cap(l)} : comment vérifier qu’un produit est authentique ?`,
    genuineA:
      'Comparez le numéro de lot de la boîte avec le certificat du fabricant, utilisez le code ou le site de vérification du fabricant lorsqu’il en propose un, et comparez l’emballage avec la photographie du produit.',
    genuineLink: 'Notre guide pour repérer les stéroïdes contrefaits (en anglais) détaille chaque vérification.',
    legalQ: (l) => `${cap(l)} : quelle est la situation juridique ?`,
    legalA:
      'Les stéroïdes anabolisants sont contrôlés aux États-Unis (annexe III), au Royaume-Uni (classe C), au Canada (annexe IV) et en Australie (sur ordonnance uniquement ; les détenir sans autorisation est une infraction). Les règles sur la détention, la fourniture et l’importation varient d’un pays à l’autre.',
    legalLink: 'Notre guide sur la législation des stéroïdes (en anglais) cite la loi de chaque pays.',
    rangeQ: (l) => `${cap(l)} : que comprend la gamme ?`,
    rangeA: (n, c, names) =>
      `${n} produits répartis en ${c} composés : ${names}. Chaque composé a sa propre page, qui compare la version de chaque fabricant.`,
    categoryMakersQ: (l) => `${cap(l)} : quels fabricants figurent ici ?`,
    categoryMakersA: (n, names) => `${n} fabricants : ${names}.`,
    categoryPricesQ: (l) => `${cap(l)} : quels sont les prix ?`,
    categoryPricesA: (a, b, ex) =>
      `Les prix vont de ${a} à ${b}, selon le composé, le fabricant, le dosage et le conditionnement.${ex ? ` Par exemple : ${ex}. Chaque page de composé détaille ses prix par dosage.` : ''}`,
    example: (n, p) => `${n} dès ${p}`,
  },
  de: {
    listing: (n) => (n === 1 ? 'Angebot' : 'Angebote'),
    priceQ: (l) => `Was kostet ${l}?`,
    priceSame: (one, p, s, n) => `${one ? 'Der Preis beträgt' : 'Jedes Angebot kostet'} ${p}. ${s} von ${n} auf Lager.`,
    priceRange: (from, to, per, s, n) =>
      `Die Preise reichen von ${from} bis ${to}, je nach Hersteller, Stärke und Packung.${per} ${s} von ${n} Angeboten sind auf Lager.`,
    perStrength: (rows) => ` Nach Stärke: ${rows}.`,
    strengthRow: (st, r, n) => `${st}: ${r} (${n} ${n === 1 ? 'Angebot' : 'Angebote'})`,
    rangeTo: (a, b) => `${a} bis ${b}`,
    whereQ: (t) => `Wo kann man ${t} kaufen?`,
    whereA: (s, n) =>
      `Jedes Angebot auf dieser Seite kann hier bestellt werden: Produkt öffnen, in den Warenkorb legen und zur Kasse gehen. ${s} von ${n} ${n === 1 ? 'Angebot ist' : 'Angeboten sind'} auf Lager. Die Kasse ist auf Englisch, bezahlt wird in US-Dollar. Wenn Sie vor der Bestellung eine Frage haben, schreiben Sie uns über Telegram oder WhatsApp mit den Schaltflächen unten auf der Seite.`,
    shipQ: (l, c) => `Versenden Sie ${l} nach ${c}?`,
    shipA: (c, o) => `Ja. Bestellungen nach ${c} gehen per ${o}.`,
    or: 'oder',
    altQ: (l) => `Gibt es ${l} als Tabletten oder als Injektion?`,
    altA: (t, n, a, m) => `Diese Seite listet ${t}: ${n} ${n === 1 ? 'Angebot' : 'Angebote'}. ${a} steht auf einer eigenen Seite, mit ${m} ${m === 1 ? 'Angebot' : 'Angeboten'}.`,
    altLink: (a) => `Zu ${a}.`,
    makersQ: (l) => `Welche Hersteller stellen ${l} her?`,
    makersOne: (n) => `Hier ist ein Hersteller gelistet: ${n}.`,
    makersMany: (n, names) => `Hier sind ${n} Hersteller gelistet: ${names}.`,
    strengthsQ: (l) => `In welchen Stärken gibt es ${l}?`,
    strengthsA: (names) =>
      `Die Angebote gibt es in ${names}. Jede Produktseite zeigt Stärke und Behältnis genau so, wie sie auf dem Etikett stehen.`,
    genuineQ: (l) => `${cap(l)}: Wie prüfe ich, ob ein Produkt echt ist?`,
    genuineA:
      'Gleichen Sie die Chargennummer auf der Packung mit dem Zertifikat des Herstellers ab, nutzen Sie den Prüfcode oder die Prüfseite des Herstellers, wo es eine gibt, und vergleichen Sie die Verpackung mit dem Foto im Angebot.',
    genuineLink: 'Unser Ratgeber zum Erkennen gefälschter Steroide (auf Englisch) geht jede Prüfung durch.',
    legalQ: (l) => `${cap(l)}: Wie ist die Rechtslage?`,
    legalA:
      'Anabole Steroide sind in den Vereinigten Staaten (Schedule III), im Vereinigten Königreich (Klasse C), in Kanada (Schedule IV) und in Australien (verschreibungspflichtig; Besitz ohne Erlaubnis ist strafbar) kontrolliert. Die Regeln zu Besitz, Abgabe und Einfuhr unterscheiden sich von Land zu Land.',
    legalLink: 'Unser Ratgeber zum Steroidrecht (auf Englisch) zitiert die Gesetze der einzelnen Länder.',
    rangeQ: (l) => `${cap(l)}: Was umfasst das Sortiment?`,
    rangeA: (n, c, names) =>
      `${n} Angebote in ${c} Wirkstoffen: ${names}. Jeder Wirkstoff hat eine eigene Seite, die die Version jedes Herstellers vergleicht.`,
    categoryMakersQ: (l) => `${cap(l)}: Welche Hersteller sind gelistet?`,
    categoryMakersA: (n, names) => `${n} Hersteller: ${names}.`,
    categoryPricesQ: (l) => `Was kosten ${l}?`,
    categoryPricesA: (a, b, ex) =>
      `Die Preise reichen von ${a} bis ${b}, je nach Wirkstoff, Hersteller, Stärke und Packung.${ex ? ` Zum Beispiel: ${ex}. Jede Wirkstoffseite schlüsselt ihre Preise nach Stärke auf.` : ''}`,
    example: (n, p) => `${n} ab ${p}`,
  },
  it: {
    listing: (n) => (n === 1 ? 'prodotto' : 'prodotti'),
    priceQ: (l) => `${cap(l)}: qual è il prezzo?`,
    priceSame: (one, p, s, n) => `${one ? 'Il prezzo è' : 'Ogni prodotto costa'} ${p}. ${s} su ${n} disponibili.`,
    priceRange: (from, to, per, s, n) =>
      `I prezzi vanno da ${from} a ${to}, a seconda del produttore, del dosaggio e della confezione.${per} ${s} prodotti su ${n} sono disponibili.`,
    perStrength: (rows) => ` Per dosaggio: ${rows}.`,
    strengthRow: (st, r, n) => `${st}: ${r} (${n} ${n === 1 ? 'prodotto' : 'prodotti'})`,
    rangeTo: (a, b) => `${a} a ${b}`,
    whereQ: (t) => `Dove acquistare ${t}?`,
    whereA: (s, n) =>
      `Ogni prodotto di questa pagina si può ordinare qui: apra il prodotto, lo aggiunga al carrello e completi l’acquisto. ${s} ${n === 1 ? 'prodotto' : 'prodotti'} su ${n} ${s === 1 ? 'è disponibile' : 'sono disponibili'}. La cassa è in inglese e il pagamento è addebitato in dollari statunitensi. Se ha domande prima di ordinare, ci scriva su Telegram o WhatsApp con i pulsanti in fondo alla pagina.`,
    shipQ: (l, c) => `${cap(l)}: spedite in ${c}?`,
    shipA: (c, o) => `Sì. Gli ordini verso l’${c} partono con ${o}.`,
    or: 'o',
    altQ: (l) => `${cap(l)}: in compresse o iniettabile?`,
    altA: (t, n, a, m) => `Questa pagina elenca ${t}: ${n} ${n === 1 ? 'prodotto' : 'prodotti'}. ${a} è elencato a parte, con ${m} ${m === 1 ? 'prodotto' : 'prodotti'}.`,
    altLink: (a) => `Vedi ${a}.`,
    makersQ: (l) => `${cap(l)}: quali produttori?`,
    makersOne: (n) => `Qui figura un solo produttore: ${n}.`,
    makersMany: (n, names) => `Qui figurano ${n} produttori: ${names}.`,
    strengthsQ: (l) => `${cap(l)}: in quali dosaggi è disponibile?`,
    strengthsA: (names) =>
      `I prodotti sono disponibili in ${names}. Ogni pagina prodotto mostra dosaggio e confezione esattamente come riportati in etichetta.`,
    genuineQ: (l) => `${cap(l)}: come verificare che un prodotto sia autentico?`,
    genuineA:
      'Confronti il numero di lotto sulla confezione con il certificato del produttore, usi il codice o il sito di verifica del produttore quando lo offre e confronti la confezione con la fotografia del prodotto.',
    genuineLink: 'La nostra guida per riconoscere gli steroidi contraffatti (in inglese) spiega ogni controllo.',
    legalQ: (l) => `${cap(l)}: qual è la situazione legale?`,
    legalA:
      'Gli steroidi anabolizzanti sono controllati negli Stati Uniti (Schedule III), nel Regno Unito (Classe C), in Canada (Schedule IV) e in Australia (solo con prescrizione; detenerli senza autorizzazione è reato). Le regole su detenzione, fornitura e importazione variano da paese a paese.',
    legalLink: 'La nostra guida sulla legge sugli steroidi (in inglese) cita la normativa di ogni paese.',
    rangeQ: (l) => `${cap(l)}: cosa comprende la gamma?`,
    rangeA: (n, c, names) =>
      `${n} prodotti in ${c} composti: ${names}. Ogni composto ha una pagina dedicata che confronta la versione di ogni produttore.`,
    categoryMakersQ: (l) => `${cap(l)}: quali produttori figurano?`,
    categoryMakersA: (n, names) => `${n} produttori: ${names}.`,
    categoryPricesQ: (l) => `${cap(l)}: quali sono i prezzi?`,
    categoryPricesA: (a, b, ex) =>
      `I prezzi vanno da ${a} a ${b}, a seconda del composto, del produttore, del dosaggio e della confezione.${ex ? ` Per esempio: ${ex}. Ogni pagina di composto dettaglia i prezzi per dosaggio.` : ''}`,
    example: (n, p) => `${n} da ${p}`,
  },
};

function range(s: Strings, from: number, to: number): string {
  return from === to ? formatPrice(from) : s.rangeTo(formatPrice(from), formatPrice(to));
}

function shipItem(locale: IntlLocale, s: Strings, label: string, delivery: IntlDelivery): FaqItem | null {
  if (!delivery || delivery.rates.length === 0) return null;
  const parts = delivery.rates.map((r) => {
    const line = rateLine(locale, r);
    const [name, details] = line.split(': ');
    /* German nouns keep their capitals; the others read the rate name as running text. */
    return `${locale === 'de' ? name : name.toLowerCase()} (${details})`;
  });
  const options = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} ${s.or} ${parts[parts.length - 1]}`;
  return { question: s.shipQ(label, delivery.country), answer: s.shipA(delivery.country, options) };
}

function genuine(s: Strings, label: string): FaqItem {
  return { question: s.genuineQ(label), answer: s.genuineA, link: { href: COUNTERFEIT, label: s.genuineLink } };
}

function legal(s: Strings, label: string): FaqItem {
  return { question: s.legalQ(label), answer: s.legalA, link: { href: LAW, label: s.legalLink } };
}

export type IntlGroupFaqContext = {
  /** The compound with its route, in this language. */
  title: string;
  /** The compound's name, in this language. */
  label: string;
  byStrength: StrengthPrice[];
  alternate?: { title: string; path: string; listings: number } | null;
  delivery: IntlDelivery;
};

export function intlGroupFaq(locale: IntlLocale, group: GroupCollection, ctx: IntlGroupFaqContext): FaqItem[] {
  const s = STRINGS[locale];
  const f = group.facts;
  const label = ctx.label;
  const items: FaqItem[] = [];

  if (f.priceFrom !== null && f.priceTo !== null) {
    const common = [...ctx.byStrength].sort((a, b) => b.listings - a.listings).slice(0, 3);
    const per =
      ctx.byStrength.length > 1
        ? s.perStrength(common.map((r) => s.strengthRow(r.strength, range(s, r.priceFrom, r.priceTo), r.listings)).join('; '))
        : '';
    items.push({
      question: s.priceQ(label),
      answer:
        f.priceFrom === f.priceTo
          ? s.priceSame(f.listings === 1, formatPrice(f.priceFrom), f.inStock, f.listings)
          : s.priceRange(formatPrice(f.priceFrom), formatPrice(f.priceTo), per, f.inStock, f.listings),
    });
  }

  items.push({ question: s.whereQ(ctx.title), answer: s.whereA(f.inStock, f.listings) });
  const ship = shipItem(locale, s, label, ctx.delivery);
  if (ship) items.push(ship);

  if (ctx.alternate) {
    items.push({
      question: s.altQ(label),
      answer: s.altA(ctx.title, f.listings, ctx.alternate.title, ctx.alternate.listings),
      link: { href: ctx.alternate.path, label: s.altLink(ctx.alternate.title) },
    });
  }

  items.push({
    question: s.makersQ(label),
    answer:
      f.manufacturers.length === 1
        ? s.makersOne(f.manufacturers[0].name)
        : s.makersMany(f.manufacturers.length, namesIn(locale, f.manufacturers.map((m) => m.name))),
  });
  if (f.strengths.length > 0) {
    items.push({ question: s.strengthsQ(label), answer: s.strengthsA(namesIn(locale, f.strengths)) });
  }
  items.push(genuine(s, label));
  items.push(legal(s, label));
  return items;
}

export function intlCategoryFaq(
  locale: IntlLocale,
  category: CategoryCollection,
  words: { label: string; groupName: (key: string, fallback: string) => string },
  delivery: IntlDelivery
): FaqItem[] {
  const s = STRINGS[locale];
  const f = category.facts;
  const nameOf = (g: GroupCollection) => words.groupName(`${category.slug}/${g.slug}`, g.name);

  const items: FaqItem[] = [
    {
      question: s.rangeQ(words.label),
      answer: s.rangeA(f.listings, category.groups.length, namesIn(locale, category.groups.map(nameOf))),
    },
  ];
  if (f.priceFrom !== null && f.priceTo !== null) {
    /* What the largest compounds start at, each computed from its own listings. */
    const examples = category.groups
      .filter((g) => g.facts.priceFrom !== null)
      .slice(0, 4)
      .map((g) => s.example(nameOf(g), formatPrice(g.facts.priceFrom as number)))
      .join('; ');
    items.push({
      question: s.categoryPricesQ(words.label),
      answer: s.categoryPricesA(formatPrice(f.priceFrom), formatPrice(f.priceTo), examples),
    });
  }
  items.push({
    question: s.categoryMakersQ(words.label),
    answer: s.categoryMakersA(f.manufacturers.length, namesIn(locale, f.manufacturers.map((m) => m.name), 12)),
  });
  items.push({ question: s.whereQ(words.label), answer: s.whereA(f.inStock, f.listings) });
  const ship = shipItem(locale, s, words.label, delivery);
  if (ship) items.push(ship);
  items.push(genuine(s, words.label));
  items.push(legal(s, words.label));
  return items;
}
