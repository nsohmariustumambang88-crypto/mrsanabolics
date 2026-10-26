import type { IntlLocale } from '@/lib/i18n/locales';
import type { TRANSLATED_CATEGORIES, TRANSLATED_GROUPS } from '@/lib/i18n/routes';

/*
  The collection copy of lib/catalogue/collection-copy.ts, translated — and the titles and
  descriptions the translated pages put in search results.

  Translated, not rewritten. Each entry says what the English one says: what the substance is,
  the form it comes in, and its regulatory status where the English states it. No dosing, no
  protocols, no claims about effects, and nothing the English does not say. Two sentences
  differ on purpose, both in the direction of saying less: "check our law guide for yours" is
  rendered as "our law guide covers the US, UK, Canada and Australia", because to a reader in
  Madrid "for yours" promises a guide to Spanish law that does not exist.

  Compound names are translated (enantato de testosterona, Testosteron-Enantat), because those
  are the words people search in each language. Brand names (Winstrol, Anavar, Dianabol,
  Turinabol, Sustanon) and product names are not. Prices stay in USD as they are.

  Server pages only; nothing here reaches the browser bundle.
*/

export type TranslatedCategory = (typeof TRANSLATED_CATEGORIES)[number];
export type TranslatedGroup = (typeof TRANSLATED_GROUPS)[number];

export type IntlCategoryCopy = {
  /** Starts a heading: "Esteroides inyectables". */
  heading: string;
  /** Inside a sentence: "esteroides inyectables" (German keeps its capitals). */
  label: string;
  intro: string[];
};

export type IntlGroupCopy = {
  /** The compound's name in this language, as the group is called in running text. */
  name: string;
  /** The name with its route, for titles and the <h1>: "Winstrol (estanozolol) oral". */
  title: string;
  /** What it is: GROUP_COPY, translated. */
  identity: string;
};

export const INTL_CATEGORY: Record<IntlLocale, Record<TranslatedCategory, IntlCategoryCopy>> = {
  es: {
    injectables: {
      heading: 'Esteroides inyectables',
      label: 'esteroides inyectables',
      intro: [
        'Esteroides anabólico-androgénicos para inyección, en viales multidosis y ampollas de un solo uso: testosterona en sus ésteres habituales, nandrolona, trembolona, boldenona, drostanolona, metenolona y mezclas de varios ésteres en un mismo vial.',
        'Los productos se agrupan por compuesto, de modo que la versión de cada fabricante de una misma sustancia aparece junto a las demás, con su concentración y su envase tal como figuran en el producto.',
      ],
    },
    orals: {
      heading: 'Esteroides orales',
      label: 'esteroides orales',
      intro: [
        'Esteroides anabólicos en comprimidos y cápsulas: metandienona (Dianabol), oxandrolona (Anavar), estanozolol (Winstrol), oximetolona (Anadrol), Turinabol, fluoximesterona, acetato de metenolona y metiltestosterona.',
        'Cada compuesto tiene su propia página con la versión de cada fabricante, con la concentración por comprimido y el tamaño del envase.',
      ],
    },
  },
  fr: {
    injectables: {
      heading: 'Stéroïdes injectables',
      label: 'stéroïdes injectables',
      intro: [
        'Stéroïdes anabolisants androgènes injectables, en flacons multidoses et en ampoules à usage unique : testostérone sous ses esters courants, nandrolone, trenbolone, boldénone, drostanolone, méthénolone, et mélanges de plusieurs esters dans un même flacon.',
        'Les produits sont regroupés par composé : la version de chaque fabricant d’une même substance figure côte à côte, avec son dosage et son conditionnement tels qu’imprimés sur le produit.',
      ],
    },
    orals: {
      heading: 'Stéroïdes oraux',
      label: 'stéroïdes oraux',
      intro: [
        'Stéroïdes anabolisants en comprimés et en gélules : méthandiénone (Dianabol), oxandrolone (Anavar), stanozolol (Winstrol), oxymétholone (Anadrol), Turinabol, fluoxymestérone, acétate de méthénolone et méthyltestostérone.',
        'Chaque composé a sa propre page présentant la version de chaque fabricant, avec le dosage par comprimé et la taille de la boîte.',
      ],
    },
  },
  de: {
    injectables: {
      heading: 'Injizierbare Steroide',
      label: 'injizierbare Steroide',
      intro: [
        'Anabol-androgene Steroide zur Injektion, in Mehrdosen-Durchstechflaschen und Einzelampullen: Testosteron in seinen gängigen Estern, Nandrolon, Trenbolon, Boldenon, Drostanolon, Metenolon sowie Mischungen mehrerer Ester in einer Flasche.',
        'Die Angebote sind nach Wirkstoff gruppiert, sodass die Version jedes Herstellers derselben Substanz nebeneinandersteht, mit Stärke und Behältnis, wie sie auf dem Produkt angegeben sind.',
      ],
    },
    orals: {
      heading: 'Orale Steroide',
      label: 'orale Steroide',
      intro: [
        'Anabole Steroide als Tabletten und Kapseln: Metandienon (Dianabol), Oxandrolon (Anavar), Stanozolol (Winstrol), Oxymetholon (Anadrol), Turinabol, Fluoxymesteron, Metenolonacetat und Methyltestosteron.',
        'Jeder Wirkstoff hat eine eigene Seite mit der Version jedes Herstellers, mit der Stärke pro Tablette und der Packungsgröße.',
      ],
    },
  },
  it: {
    injectables: {
      heading: 'Steroidi iniettabili',
      label: 'steroidi iniettabili',
      intro: [
        'Steroidi anabolizzanti androgeni iniettabili, in flaconcini multidose e fiale monouso: testosterone nei suoi esteri più comuni, nandrolone, trenbolone, boldenone, drostanolone, metenolone e miscele di più esteri nello stesso flaconcino.',
        'I prodotti sono raggruppati per composto, così la versione di ogni produttore della stessa sostanza compare accanto alle altre, con il dosaggio e la confezione riportati sul prodotto.',
      ],
    },
    orals: {
      heading: 'Steroidi orali',
      label: 'steroidi orali',
      intro: [
        'Steroidi anabolizzanti in compresse e capsule: metandienone (Dianabol), oxandrolone (Anavar), stanozololo (Winstrol), ossimetolone (Anadrol), Turinabol, fluoximesterone, metenolone acetato e metiltestosterone.',
        'Ogni composto ha una pagina dedicata con la versione di ciascun produttore, con il dosaggio per compressa e la dimensione della confezione.',
      ],
    },
  },
};

export const INTL_GROUP: Record<IntlLocale, Record<TranslatedGroup, IntlGroupCopy>> = {
  es: {
    'injectables/testosterone-enanthate': {
      name: 'Enantato de testosterona',
      title: 'Enantato de testosterona inyectable',
      identity:
        'Testosterona con un éster enantato, suministrada como solución oleosa para inyección. En la mayoría de los países es un medicamento con receta para el hipogonadismo masculino.',
    },
    'injectables/testosterone-cypionate': {
      name: 'Cipionato de testosterona',
      title: 'Cipionato de testosterona inyectable',
      identity:
        'Testosterona con un éster cipionato, suministrada como solución oleosa para inyección. Es la forma de testosterona que más se receta en Estados Unidos.',
    },
    'injectables/testosterone-blends': {
      name: 'Mezclas de testosterona',
      title: 'Mezclas de testosterona inyectables',
      identity:
        'Varios ésteres de testosterona en un mismo vial, al estilo de Sustanon. Cada etiqueta indica los ésteres que contiene y la cantidad de cada uno.',
    },
    'injectables/nandrolone': {
      name: 'Nandrolona',
      title: 'Nandrolona inyectable',
      identity:
        'La nandrolona es un esteroide inyectable que se vende sobre todo como decanoato de nandrolona y fenilpropionato de nandrolona. En Estados Unidos es una sustancia controlada de la Lista III (Schedule III) y en el Reino Unido una droga de Clase C. Las leyes cambian de un país a otro; nuestra guía legal trata Estados Unidos, el Reino Unido, Canadá y Australia. Nuestra guía de certificados explica cómo comprobar un lote.',
    },
    'injectables/trenbolone': {
      name: 'Trembolona',
      title: 'Trembolona inyectable',
      identity:
        'Trembolona en forma de éster acetato, enantato o hexahidrobencilcarbonato. La trembolona se desarrolló para uso veterinario y hoy no está aprobada como medicamento humano.',
    },
    'injectables/winstrol-stanozolol': {
      name: 'Winstrol (estanozolol)',
      title: 'Winstrol (estanozolol) inyectable',
      identity: 'Estanozolol en suspensión inyectable, vendido como Winstrol Depot.',
    },
    'orals/winstrol-stanozolol': {
      name: 'Winstrol (estanozolol)',
      title: 'Winstrol (estanozolol) oral',
      identity:
        'El estanozolol es un esteroide anabólico sintético derivado de la dihidrotestosterona, conocido sobre todo por la marca Winstrol. Esta página recoge los comprimidos orales. En Estados Unidos el estanozolol es una sustancia controlada de la Lista III (Schedule III).',
    },
    'orals/anavar-oxandrolone': {
      name: 'Anavar (oxandrolona)',
      title: 'Anavar (oxandrolona) oral',
      identity: 'Comprimidos de oxandrolona, vendidos como Anavar.',
    },
    'orals/dianabol-methandienone': {
      name: 'Dianabol (metandienona)',
      title: 'Dianabol (metandienona) oral',
      identity: 'Metandienona, también llamada metandrostenolona, en comprimidos vendidos con el nombre Dianabol.',
    },
    'orals/turinabol': {
      name: 'Turinabol',
      title: 'Turinabol oral',
      identity:
        'Turinabol es el nombre comercial de la clorodehidrometiltestosterona, que se vende en comprimidos orales. Como otros esteroides orales, se metaboliza en el hígado. Los esteroides anabólicos están controlados en la mayoría de los países, entre otros como sustancias de la Lista III (Schedule III) en Estados Unidos y como drogas de Clase C en el Reino Unido. Nuestra guía legal trata Estados Unidos, el Reino Unido, Canadá y Australia, y nuestra guía de salud resume lo que se sabe sobre los esteroides orales.',
    },
  },
  fr: {
    'injectables/testosterone-enanthate': {
      name: 'Énanthate de testostérone',
      title: 'Énanthate de testostérone injectable',
      identity:
        'Testostérone liée à un ester énanthate, fournie sous forme de solution huileuse injectable. Dans la plupart des pays, c’est un médicament sur ordonnance indiqué dans l’hypogonadisme masculin.',
    },
    'injectables/testosterone-cypionate': {
      name: 'Cypionate de testostérone',
      title: 'Cypionate de testostérone injectable',
      identity:
        'Testostérone liée à un ester cypionate, fournie sous forme de solution huileuse injectable. C’est la forme de testostérone la plus souvent prescrite aux États-Unis.',
    },
    'injectables/testosterone-blends': {
      name: 'Mélanges de testostérone',
      title: 'Mélanges de testostérone injectables',
      identity:
        'Plusieurs esters de testostérone dans un même flacon, à la manière du Sustanon. Chaque étiquette indique les esters contenus et la quantité de chacun.',
    },
    'injectables/nandrolone': {
      name: 'Nandrolone',
      title: 'Nandrolone injectable',
      identity:
        'La nandrolone est un stéroïde injectable, vendu surtout sous forme de décanoate de nandrolone et de phénylpropionate de nandrolone. Aux États-Unis, c’est une substance contrôlée de l’annexe III (Schedule III) ; au Royaume-Uni, une drogue de classe C. La législation varie d’un pays à l’autre ; notre guide juridique couvre les États-Unis, le Royaume-Uni, le Canada et l’Australie. Notre guide des certificats explique comment vérifier un lot.',
    },
    'injectables/trenbolone': {
      name: 'Trenbolone',
      title: 'Trenbolone injectable',
      identity:
        'Trenbolone sous forme d’ester acétate, énanthate ou hexahydrobenzylcarbonate. La trenbolone a été mise au point pour un usage vétérinaire et n’est pas autorisée aujourd’hui comme médicament à usage humain.',
    },
    'injectables/winstrol-stanozolol': {
      name: 'Winstrol (stanozolol)',
      title: 'Winstrol (stanozolol) injectable',
      identity: 'Stanozolol en suspension injectable, vendu sous le nom de Winstrol Depot.',
    },
    'orals/winstrol-stanozolol': {
      name: 'Winstrol (stanozolol)',
      title: 'Winstrol (stanozolol) oral',
      identity:
        'Le stanozolol est un stéroïde anabolisant de synthèse dérivé de la dihydrotestostérone, surtout connu sous le nom de marque Winstrol. Cette page présente les comprimés oraux. Aux États-Unis, le stanozolol est une substance contrôlée de l’annexe III (Schedule III).',
    },
    'orals/anavar-oxandrolone': {
      name: 'Anavar (oxandrolone)',
      title: 'Anavar (oxandrolone) oral',
      identity: 'Comprimés d’oxandrolone, vendus sous le nom d’Anavar.',
    },
    'orals/dianabol-methandienone': {
      name: 'Dianabol (méthandiénone)',
      title: 'Dianabol (méthandiénone) oral',
      identity: 'Méthandiénone, aussi appelée méthandrosténolone, en comprimés vendus sous le nom de Dianabol.',
    },
    'orals/turinabol': {
      name: 'Turinabol',
      title: 'Turinabol oral',
      identity:
        'Turinabol est le nom de marque de la chlorodéhydrométhyltestostérone, vendue en comprimés oraux. Comme les autres stéroïdes oraux, elle est métabolisée par le foie. Les stéroïdes anabolisants sont contrôlés dans la plupart des pays, notamment comme substances de l’annexe III (Schedule III) aux États-Unis et comme drogues de classe C au Royaume-Uni. Notre guide juridique couvre les États-Unis, le Royaume-Uni, le Canada et l’Australie, et notre guide santé résume ce que l’on sait des stéroïdes oraux.',
    },
  },
  de: {
    'injectables/testosterone-enanthate': {
      name: 'Testosteron-Enantat',
      title: 'Testosteron-Enantat (Injektion)',
      identity:
        'Testosteron mit Enantat-Ester, als ölige Injektionslösung. In den meisten Ländern ist es ein verschreibungspflichtiges Arzneimittel gegen männlichen Hypogonadismus.',
    },
    'injectables/testosterone-cypionate': {
      name: 'Testosteron-Cypionat',
      title: 'Testosteron-Cypionat (Injektion)',
      identity:
        'Testosteron mit Cypionat-Ester, als ölige Injektionslösung. Es ist die in den Vereinigten Staaten am häufigsten verschriebene Form von Testosteron.',
    },
    'injectables/testosterone-blends': {
      name: 'Testosteron-Mischungen',
      title: 'Testosteron-Mischungen (Injektion)',
      identity:
        'Mehrere Testosteron-Ester in einer Durchstechflasche, nach Art von Sustanon. Jedes Etikett nennt die enthaltenen Ester und die Menge jedes einzelnen.',
    },
    'injectables/nandrolone': {
      name: 'Nandrolon',
      title: 'Nandrolon (Injektion)',
      identity:
        'Nandrolon ist ein injizierbares Steroid, das vor allem als Nandrolondecanoat und Nandrolonphenylpropionat verkauft wird. In den Vereinigten Staaten ist es eine kontrollierte Substanz der Schedule III, im Vereinigten Königreich eine Droge der Klasse C. Die Gesetze unterscheiden sich von Land zu Land; unser Rechtsratgeber behandelt die USA, das Vereinigte Königreich, Kanada und Australien. Unser Ratgeber zu Analysezertifikaten erklärt, wie man eine Charge prüft.',
    },
    'injectables/trenbolone': {
      name: 'Trenbolon',
      title: 'Trenbolon (Injektion)',
      identity:
        'Trenbolon als Acetat-, Enantat- oder Hexahydrobenzylcarbonat-Ester. Trenbolon wurde für die Tiermedizin entwickelt und ist heute nicht als Humanarzneimittel zugelassen.',
    },
    'injectables/winstrol-stanozolol': {
      name: 'Winstrol (Stanozolol)',
      title: 'Winstrol (Stanozolol) Injektion',
      identity: 'Stanozolol als injizierbare Suspension, verkauft als Winstrol Depot.',
    },
    'orals/winstrol-stanozolol': {
      name: 'Winstrol (Stanozolol)',
      title: 'Winstrol (Stanozolol) Tabletten',
      identity:
        'Stanozolol ist ein synthetisches anaboles Steroid, das sich vom Dihydrotestosteron ableitet und vor allem unter dem Markennamen Winstrol bekannt ist. Diese Seite listet die Tabletten zum Einnehmen. In den Vereinigten Staaten ist Stanozolol eine kontrollierte Substanz der Schedule III.',
    },
    'orals/anavar-oxandrolone': {
      name: 'Anavar (Oxandrolon)',
      title: 'Anavar (Oxandrolon) Tabletten',
      identity: 'Oxandrolon-Tabletten, verkauft als Anavar.',
    },
    'orals/dianabol-methandienone': {
      name: 'Dianabol (Metandienon)',
      title: 'Dianabol (Metandienon) Tabletten',
      identity: 'Metandienon, auch Methandrostenolon genannt, in Tabletten unter dem Namen Dianabol.',
    },
    'orals/turinabol': {
      name: 'Turinabol',
      title: 'Turinabol Tabletten',
      identity:
        'Turinabol ist der Markenname von Chlordehydromethyltestosteron, das als Tabletten zum Einnehmen verkauft wird. Wie andere orale Steroide wird es über die Leber verstoffwechselt. Anabole Steroide sind in den meisten Ländern kontrolliert, unter anderem als Substanzen der Schedule III in den Vereinigten Staaten und als Drogen der Klasse C im Vereinigten Königreich. Unser Rechtsratgeber behandelt die USA, das Vereinigte Königreich, Kanada und Australien; unser Gesundheitsratgeber fasst zusammen, was über orale Steroide bekannt ist.',
    },
  },
  it: {
    'injectables/testosterone-enanthate': {
      name: 'Testosterone enantato',
      title: 'Testosterone enantato iniettabile',
      identity:
        'Testosterone legato a un estere enantato, fornito come soluzione oleosa iniettabile. Nella maggior parte dei paesi è un medicinale soggetto a prescrizione per l’ipogonadismo maschile.',
    },
    'injectables/testosterone-cypionate': {
      name: 'Testosterone cipionato',
      title: 'Testosterone cipionato iniettabile',
      identity:
        'Testosterone legato a un estere cipionato, fornito come soluzione oleosa iniettabile. È la forma di testosterone più prescritta negli Stati Uniti.',
    },
    'injectables/testosterone-blends': {
      name: 'Miscele di testosterone',
      title: 'Miscele di testosterone iniettabili',
      identity:
        'Diversi esteri di testosterone in un unico flaconcino, sul modello del Sustanon. Ogni etichetta riporta gli esteri contenuti e la quantità di ciascuno.',
    },
    'injectables/nandrolone': {
      name: 'Nandrolone',
      title: 'Nandrolone iniettabile',
      identity:
        'Il nandrolone è uno steroide iniettabile, venduto soprattutto come nandrolone decanoato e nandrolone fenilpropionato. Negli Stati Uniti è una sostanza controllata della Schedule III e nel Regno Unito una droga di Classe C. Le leggi variano da paese a paese; la nostra guida legale tratta Stati Uniti, Regno Unito, Canada e Australia. La nostra guida ai certificati spiega come verificare un lotto.',
    },
    'injectables/trenbolone': {
      name: 'Trenbolone',
      title: 'Trenbolone iniettabile',
      identity:
        'Trenbolone come estere acetato, enantato o esaidrobenzilcarbonato. Il trenbolone è stato sviluppato per uso veterinario e oggi non è approvato come medicinale per uso umano.',
    },
    'injectables/winstrol-stanozolol': {
      name: 'Winstrol (stanozololo)',
      title: 'Winstrol (stanozololo) iniettabile',
      identity: 'Stanozololo in sospensione iniettabile, venduto come Winstrol Depot.',
    },
    'orals/winstrol-stanozolol': {
      name: 'Winstrol (stanozololo)',
      title: 'Winstrol (stanozololo) orale',
      identity:
        'Lo stanozololo è uno steroide anabolizzante sintetico derivato dal diidrotestosterone, noto soprattutto con il marchio Winstrol. Questa pagina elenca le compresse orali. Negli Stati Uniti lo stanozololo è una sostanza controllata della Schedule III.',
    },
    'orals/anavar-oxandrolone': {
      name: 'Anavar (oxandrolone)',
      title: 'Anavar (oxandrolone) orale',
      identity: 'Compresse di oxandrolone, vendute come Anavar.',
    },
    'orals/dianabol-methandienone': {
      name: 'Dianabol (metandienone)',
      title: 'Dianabol (metandienone) orale',
      identity: 'Metandienone, detto anche metandrostenolone, in compresse vendute con il nome Dianabol.',
    },
    'orals/turinabol': {
      name: 'Turinabol',
      title: 'Turinabol orale',
      identity:
        'Turinabol è il nome commerciale del clorodeidrometiltestosterone, venduto in compresse orali. Come gli altri steroidi orali, viene metabolizzato dal fegato. Gli steroidi anabolizzanti sono controllati nella maggior parte dei paesi, tra cui come sostanze della Schedule III negli Stati Uniti e come droghe di Classe C nel Regno Unito. La nostra guida legale tratta Stati Uniti, Regno Unito, Canada e Australia, e la nostra guida sulla salute riassume ciò che si sa sugli steroidi orali.',
    },
  },
};

/**
 * A compound's name as it sits inside a sentence: "enantato de testosterona", but "Winstrol
 * (estanozolol)" and, in German, "Testosteron-Enantat" — brand names and German nouns keep their
 * capitals.
 */
export function runningName(locale: IntlLocale, name: string): string {
  if (locale === 'de' || /^(Winstrol|Anavar|Dianabol|Turinabol)/.test(name)) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** A group's name in a language when it has a translation, else its English name. */
export function intlGroupName(locale: IntlLocale, key: string, fallback: string): string {
  return (INTL_GROUP[locale] as Record<string, IntlGroupCopy>)[key]?.name ?? fallback;
}

/*
  Titles and descriptions for search results. Every figure in them is computed by the page
  (prices, counts, strengths, the delivery price), exactly as the English pages do it.
*/
type Seo = {
  and: string;
  more: (n: number) => string;
  homeTitle: string;
  homeDescription: (makers: number) => string;
  shopTitle: (listings: number, from: string | null) => string;
  shopDescription: (listings: number, makers: number, range: string | null) => string;
  categoryTitle: (heading: string, scope: string, from: string | null) => string;
  categoryScope: (compounds: number, listings: number) => string;
  categoryLead: (heading: string, listings: number, makers: number) => string;
  including: (names: string) => string;
  priced: (range: string) => string;
  groupTitle: (title: string, from: string | null) => string;
  groupLeadOne: (title: string, maker: string) => string;
  groupLead: (title: string, listings: number, makers: number) => string;
  inStrengths: (strengths: string) => string;
  shipping: (country: string, price: string) => string;
};

export const INTL_SEO: Record<IntlLocale, Seo> = {
  es: {
    and: 'y',
    more: (n) => `y ${n} más`,
    homeTitle: 'MrsAnabolics — Esteroides, péptidos y SARMs por compuesto',
    homeDescription: (makers) =>
      `Esteroides inyectables y orales, post-ciclo, péptidos y SARMs de ${makers} fabricantes, agrupados por compuesto para comparar cada versión por concentración y precio.`,
    shopTitle: (n, from) => `Comprar esteroides, péptidos y SARMs: ${n} productos${from ? ` desde ${from}` : ''}`,
    shopDescription: (n, m, range) =>
      `Esteroides inyectables y orales, post-ciclo, péptidos, SARMs y más en venta: ${n} productos de ${m} fabricantes${range ? `, a ${range}` : ''}.`,
    categoryTitle: (h, scope, from) => `${h} en venta: ${scope}${from ? ` desde ${from}` : ''}`,
    categoryScope: (c, l) => (c > 1 ? `${c} compuestos` : `${l} productos`),
    categoryLead: (h, l, m) => `${h} en venta: ${l} productos de ${m} fabricantes`,
    including: (names) => `, entre ellos ${names}`,
    priced: (range) => `, a ${range}`,
    groupTitle: (t, from) => (from ? `${t} en venta: precio desde ${from}` : `${t} en venta`),
    groupLeadOne: (t, maker) => `${t} de ${maker} en venta`,
    groupLead: (t, l, m) => `${t} en venta: ${l} productos de ${m} fabricantes`,
    inStrengths: (s) => `en ${s}`,
    shipping: (c, p) => ` Envío con seguimiento a ${c} desde ${p}.`,
  },
  fr: {
    and: 'et',
    more: (n) => `et ${n} autres`,
    homeTitle: 'MrsAnabolics — Stéroïdes, peptides et SARMs par composé',
    homeDescription: (makers) =>
      `Stéroïdes injectables et oraux, post-cycle, peptides et SARMs de ${makers} fabricants, regroupés par composé pour comparer chaque version par dosage et prix.`,
    shopTitle: (n, from) => `Acheter stéroïdes, peptides et SARMs : ${n} produits${from ? ` dès ${from}` : ''}`,
    shopDescription: (n, m, range) =>
      `Stéroïdes injectables et oraux, post-cycle, peptides, SARMs et plus à vendre : ${n} produits de ${m} fabricants${range ? `, de ${range}` : ''}.`,
    categoryTitle: (h, scope, from) => `${h} à vendre : ${scope}${from ? ` dès ${from}` : ''}`,
    categoryScope: (c, l) => (c > 1 ? `${c} composés` : `${l} produits`),
    categoryLead: (h, l, m) => `${h} à vendre : ${l} produits de ${m} fabricants`,
    including: (names) => `, dont ${names}`,
    priced: (range) => `, de ${range}`,
    groupTitle: (t, from) => (from ? `${t} à vendre : prix dès ${from}` : `${t} à vendre`),
    groupLeadOne: (t, maker) => `${t} de ${maker} à vendre`,
    groupLead: (t, l, m) => `${t} à vendre : ${l} produits de ${m} fabricants`,
    inStrengths: (s) => `en ${s}`,
    shipping: (c, p) => ` Livraison suivie (${c}) dès ${p}.`,
  },
  de: {
    and: 'und',
    more: (n) => `und ${n} weitere`,
    homeTitle: 'MrsAnabolics — Steroide, Peptide und SARMs nach Wirkstoff',
    homeDescription: (makers) =>
      `Injizierbare und orale Steroide, Post-Cycle, Peptide und SARMs von ${makers} Herstellern, nach Wirkstoff gruppiert, um jede Version nach Stärke und Preis zu vergleichen.`,
    shopTitle: (n, from) => `Steroide, Peptide und SARMs kaufen: ${n} Angebote${from ? ` ab ${from}` : ''}`,
    shopDescription: (n, m, range) =>
      `Injizierbare und orale Steroide, Post-Cycle, Peptide, SARMs und mehr: ${n} Angebote von ${m} Herstellern${range ? `, ${range}` : ''}.`,
    categoryTitle: (h, scope, from) => `${h} kaufen: ${scope}${from ? ` ab ${from}` : ''}`,
    categoryScope: (c, l) => (c > 1 ? `${c} Wirkstoffe` : `${l} Angebote`),
    categoryLead: (h, l, m) => `${h} kaufen: ${l} Angebote von ${m} Herstellern`,
    including: (names) => `, darunter ${names}`,
    priced: (range) => `, ${range}`,
    groupTitle: (t, from) => (from ? `${t} kaufen: Preis ab ${from}` : `${t} kaufen`),
    groupLeadOne: (t, maker) => `${t} von ${maker} kaufen`,
    groupLead: (t, l, m) => `${t} kaufen: ${l} Angebote von ${m} Herstellern`,
    inStrengths: (s) => `in ${s}`,
    shipping: (c, p) => ` Versand mit Sendungsverfolgung nach ${c} ab ${p}.`,
  },
  it: {
    and: 'e',
    more: (n) => `e altri ${n}`,
    homeTitle: 'MrsAnabolics — Steroidi, peptidi e SARM per composto',
    homeDescription: (makers) =>
      `Steroidi iniettabili e orali, post-ciclo, peptidi e SARM di ${makers} produttori, raggruppati per composto per confrontare ogni versione per dosaggio e prezzo.`,
    shopTitle: (n, from) => `Acquista steroidi, peptidi e SARM: ${n} prodotti${from ? ` da ${from}` : ''}`,
    shopDescription: (n, m, range) =>
      `Steroidi iniettabili e orali, post-ciclo, peptidi, SARM e altro in vendita: ${n} prodotti di ${m} produttori${range ? `, da ${range}` : ''}.`,
    categoryTitle: (h, scope, from) => `${h} in vendita: ${scope}${from ? ` da ${from}` : ''}`,
    categoryScope: (c, l) => (c > 1 ? `${c} composti` : `${l} prodotti`),
    categoryLead: (h, l, m) => `${h} in vendita: ${l} prodotti di ${m} produttori`,
    including: (names) => `, tra cui ${names}`,
    priced: (range) => `, da ${range}`,
    groupTitle: (t, from) => (from ? `${t} in vendita: prezzo da ${from}` : `${t} in vendita`),
    groupLeadOne: (t, maker) => `${t} di ${maker} in vendita`,
    groupLead: (t, l, m) => `${t} in vendita: ${l} prodotti di ${m} produttori`,
    inStrengths: (s) => `in ${s}`,
    shipping: (c, p) => ` Spedizione tracciata verso ${c} da ${p}.`,
  },
};

/** "A, B y C" in a language. */
export function andListIn(locale: IntlLocale, values: string[]): string {
  if (values.length <= 1) return values.join('');
  return `${values.slice(0, -1).join(', ')} ${INTL_SEO[locale].and} ${values[values.length - 1]}`;
}

/** "A, B y C", or "A, B, C y 9 más" past `max`. */
export function namesIn(locale: IntlLocale, values: string[], max = 8): string {
  const shown = values.slice(0, max);
  const rest = values.length - shown.length;
  if (rest > 0) return `${shown.join(', ')} ${INTL_SEO[locale].more(rest)}`;
  return andListIn(locale, shown);
}
