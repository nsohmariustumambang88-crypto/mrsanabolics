/*
  Interface strings, in English. This file is the shape every translation follows, and its values
  are the storefront's existing wording, character for character: the English pages render from
  it, so changing a string here changes the live English site.

  Plain module, no imports: client components (header, cards, cart) and server pages share it.
  Collection copy — what each compound is — is not here; it lives in lib/i18n/collections.ts,
  which only server pages import.
*/

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** A category's name as a heading and as words inside a sentence. */
export type CategoryWords = { heading: string; label: string };

export const en = {
  nav: {
    shop: 'Shop',
    categories: 'Categories',
    brands: 'Brands',
    journal: 'Journal',
    about: 'About',
    contact: 'Contact',
    faq: 'FAQ',
    account: 'Account',
    menu: 'Menu',
    openMenu: 'Open menu',
    substrate: 'Substrate',
    country: 'Country',
    search: 'Search the catalogue',
    home: 'MrAnabolics — home',
    wishlist: (n: number) => `Wishlist, ${n} items`,
    cart: (n: number) => `Cart, ${n} items`,
  },

  country: {
    trigger: (name: string) => `Country: ${name}. Change country and currency`,
    heading: 'Shipping to',
    names: {
      US: 'United States',
      GB: 'United Kingdom',
      CA: 'Canada',
      AU: 'Australia',
      ES: 'Spain',
      FR: 'France',
      DE: 'Germany',
      IT: 'Italy',
      OTHER: 'Other country',
    },
    deliveryFor: (name: string) => `Delivery to ${name}`,
    allDelivery: 'Delivery by country',
    charged: 'Checkout is charged in US dollars.',
  },

  currency: {
    approx: 'approx.',
    note: (code: string, date: string) =>
      `Prices are in US dollars. ${code} amounts are approximate, at the European Central Bank reference rate of ${date}; checkout is charged in USD.`,
  },

  delivery: {
    to: (country: string) => `Delivery to ${country}`,
    freeOver: (amount: string) => `free on orders of ${amount} or more`,
    none: (country: string) => `No delivery option is set up for ${country} yet.`,
    nextDay: 'Next working day',
    days: (n: number) => `${n} working days`,
    range: (a: number, b: number) => `${a}–${b} working days`,
    /** Rate names as staff typed them, translated where the name is a known one. */
    rateNames: {} as Record<string, string>,
    otherCountries: 'other countries',
  },

  footer: {
    tagline:
      'Injectable and oral steroids, post-cycle, peptides and SARMs, grouped by compound so every manufacturer’s version can be compared by strength, form and price before you decide.',
    shop: 'Shop',
    read: 'Read',
    account: 'Account',
    delivery: 'Delivery',
    allCompounds: 'All compounds',
    categories: 'Categories',
    brands: 'Brands',
    weeklyDeals: 'Weekly deals',
    journal: 'Journal',
    questions: 'Questions',
    about: 'About',
    contact: 'Contact',
    yourAccount: 'Your account',
    orders: 'Orders',
    wishlist: 'Wishlist',
    signIn: 'Sign in',
    allCountries: 'All countries',
    newBatches: 'New batches',
    newsletterBody: 'One note when a batch is released, with its certificate attached. Nothing else.',
    added: 'Added. Watch for the next release note.',
    emailLabel: 'Email address',
    subscribe: 'Subscribe',
    invalidEmail: 'That address is missing an @ or a domain.',
    manufacturers: 'Manufacturers',
    terms: 'Terms',
    privacy: 'Privacy',
    shipping: 'Shipping',
    returns: 'Returns',
  },

  card: {
    addToCart: 'Add to cart',
    inCart: 'In the cart',
    unavailable: 'Unavailable',
    inStock: 'In stock',
    outOfStock: 'Out of bath',
    left: (n: number) => `${n} left`,
    addAria: (name: string) => `Add ${name} to cart`,
    save: (name: string) => `Save ${name}`,
    unsave: (name: string) => `Remove ${name} from wishlist`,
  },

  cart: {
    title: 'Your cart',
    items: (n: number): string => (n === 1 ? 'item' : 'items'),
    emptyTitle: 'Your cart is empty',
    emptyBody: 'Compounds you add will collect here, with the specification attached to each one.',
    browse: 'Browse the catalogue',
    /** Text before and after the amount still needed for free delivery. */
    moreForFree: ['', ' more for free tracked shipping'] as [string, string],
    freeApplied: 'Free tracked shipping applied',
    progress: 'Progress toward free shipping',
    deliveryFrom: (country: string, price: string) => `Delivery to ${country} from ${price}, chosen at checkout.`,
    subtotal: 'Subtotal',
    shippingNote: 'Shipping and duties calculated at checkout.',
    checkout: 'Checkout',
    keepBrowsing: 'Keep browsing',
    decrease: (name: string) => `Decrease quantity of ${name}`,
    increase: (name: string) => `Increase quantity of ${name}`,
    remove: (name: string) => `Remove ${name} from cart`,
  },

  section: {
    viewAll: 'View all',
  },

  collection: {
    home: 'Home',
    shop: 'Shop',
    forSale: (heading: string) => `${heading} for sale`,
    compounds: (n: number) => `${n} compounds`,
    listings: (n: number) => plural(n, 'listing', 'listings'),
    manufacturers: (n: number) => plural(n, 'manufacturer', 'manufacturers'),
    inStock: (n: number) => `${n} in stock`,
    from: 'from',
    th: {
      product: 'Product',
      manufacturer: 'Manufacturer',
      strength: 'Strength',
      form: 'Form',
      price: 'Price',
      availability: 'Availability',
      listings: 'Listings',
    },
    inStockWord: 'In stock',
    outOfStockWord: 'Out of stock',
    /* `heading` starts a sentence ("Injectable steroids"); `label` sits inside one ("injectable steroids"). */
    browseByCompound: (c: CategoryWords) => `Browse ${c.label} by compound`,
    browseByCompoundBody: 'Each compound has its own page comparing every manufacturer’s version by strength, form and price.',
    featured: (c: CategoryWords) => `Featured ${c.label}`,
    every: (c: CategoryWords) => `Every ${c.label} listing`,
    manufacturersTitle: 'Manufacturers',
    manufacturersBody: (n: number) => `${n} manufacturers, with the number of their listings in this category.`,
    questions: 'Questions',
    beforeYouBuy: 'Before you buy',
    guidesInEnglish: '',
    priceByStrength: (name: string) => `${name} price by strength`,
    priceByStrengthBody: 'The lowest and highest listed price for each strength, across every listing on this page.',
    otherFormAsk: 'Looking for the other form?',
    otherFormHas: (n: number) => `has ${plural(n, 'listing', 'listings')}.`,
    allListings: (name: string) => `All ${name} listings`,
    compare: (name: string) => `Compare ${name} side by side`,
    compareBody: 'Strength and form are as printed on each product. In-stock listings come first.',
    whoMakes: (name: string) => `Who makes ${name}`,
    whoMakesBody: 'Each manufacturer’s page lists everything else it makes in this catalogue.',
    questionsAbout: (name: string) => `Questions about ${name}`,
    other: (c: CategoryWords) => `Other ${c.label}`,
    oneListing: (maker: string, range: string | null) => `One listing, from ${maker}${range ? `, priced at ${range}` : ''}.`,
    allListingsIntro: (n: number, name: string, makers: number, range: string | null, inStock: number) =>
      `All ${n} listings filed under ${name} come from ${makers} manufacturers${range ? ` and are priced ${range.replace(' – ', ' to ')}` : ''}. ${inStock} are in stock. Compare them by strength, form and price below.`,
    strengthCaption: (title: string) => `${title}: listings and price range for each strength`,
    compareCaption: (name: string) => `${name}: every listing with its manufacturer, strength, form, price and availability`,
    inEnglish: 'EN',
    inEnglishTitle: 'This page is in English',
  },

  shop: {
    heading: 'Shop all products',
    count: (products: number, categories: number) => `${products} products across ${categories} categories.`,
    directory: 'Browse by category and compound',
    directoryBody: 'Every compound has its own page comparing each manufacturer’s version by strength, form and price.',
    sorts: {
      featured: 'Featured',
      'price-asc': 'Price, low to high',
      'price-desc': 'Price, high to low',
      rating: 'Best rated',
      newest: 'Newest',
    },
    filters: {
      'best-sellers': 'Best sellers',
      new: 'New arrivals',
      trending: 'Trending',
      deals: 'On offer',
    } as Record<string, string>,
    catalogue: 'The catalogue',
    category: 'Category',
    everything: 'Everything',
    manufacturer: 'Manufacturer',
    collections: 'Collections',
    upTo: (price: string) => `Up to ${price}`,
    loadingCatalogue: 'Loading the catalogue…',
    products: (n: number) => plural(n, 'product', 'products'),
    matchFilters: ' match these filters.',
    eachListing: ' Each listing carries its manufacturer, strength and pack as printed on the product.',
    searchPlaceholder: 'Search compounds, brands, categories',
    filtersButton: 'Filters',
    sort: 'Sort',
    under: (price: string) => `Under ${price}`,
    clearAll: 'Clear all',
    loading: 'Loading…',
    errorTitle: 'The catalogue did not answer',
    errorBody: 'Something went wrong fetching these products. Try again in a moment.',
    emptyTitle: 'Nothing matches those filters',
    emptyBody:
      'Try a broader price range, or clear a filter. Every compound in the catalogue is listed under exactly one category.',
    clearAllFilters: 'Clear all filters',
    showMore: 'Show more',
    shown: (visible: number, total: number) => `${visible} of ${total} shown`,
    removeFilter: (label: string) => `Remove ${label} filter`,
  },

  home: {
    heroLines: ['Steroids, peptides', 'and SARMs,'] as string[],
    heroAccent: 'compared by compound.',
    heroBody: (makers: number) =>
      `Injectable and oral steroids, post-cycle, peptides and SARMs from ${makers} manufacturers. Every compound has its own page comparing each maker’s version by strength, form and price.`,
    heroCta: 'Browse the catalogue',
    doors: {
      'by-compound': {
        title: 'By compound',
        body: 'You know the molecule and the ester. Go straight to the specification, the concentration, and the certificate.',
        action: 'Open the index',
      },
      'by-goal': {
        title: 'By goal',
        body: 'You know what you are training toward. Start from the outcome and read down to what supports it.',
        action: 'Browse by outcome',
      },
    } as Record<string, { title: string; body: string; action: string }>,
    jumpTo: 'Or jump to',
    jumpLinks: { new: 'New arrivals', trending: 'Trending', deals: 'On offer' },
    bestSellers: 'Best sellers',
    bestSellersBody: 'The compounds that move fastest, with the specification and batch record attached to each one.',
    categoriesTitle: 'Browse by category',
    categoriesBody: 'Each category is broken down by compound, so every manufacturer’s version can be compared on one page.',
    categoriesLink: 'Open the index',
    checksTitle: 'Four checks before you buy',
    checksBody:
      'What is worth checking before any order, here or anywhere else. Our guide to reading a certificate of analysis goes through each one.',
    checks: [
      {
        title: 'Check the maker',
        body: 'Every listing names its manufacturer, and each manufacturer has a page listing everything it makes here.',
        record: 'Manufacturer named',
      },
      {
        title: 'Ask for the certificate',
        body: 'Ask for the certificate of analysis for the exact batch, and check that the laboratory that issued it is accredited for that test.',
        record: 'Certificate for the batch',
      },
      {
        title: 'Match the batch',
        body: 'The batch number on the certificate should match the one printed on the pack in your hand. If it does not, the certificate describes a different product.',
        record: 'Batch numbers match',
      },
      {
        title: 'Compare the versions',
        body: 'Every compound has a page comparing each manufacturer’s version side by side, by strength, form and price.',
        record: 'Compared by compound',
      },
    ],
    brandsTitle: 'Who makes it',
    brandsBody: 'The manufacturers in this catalogue. Each one’s page lists everything it makes here.',
    brandsLink: 'All manufacturers',
    brandItems: (n: number) => `${n} items`,
    brandsMore: (n: number) => [`${n} more ${n === 1 ? 'manufacturer' : 'manufacturers'}`, ' in the index.'] as [string, string],
    journalTitle: 'The journal',
    journalBody:
      'How to check a certificate, spot a fake, and read the law and the health evidence — every claim linked to its source.',
    journalLink: 'Read everything',
    updated: 'Updated ',
    readTime: (t: string) => `${t} read`,
    sources: (n: number) => `${n} sources`,
    deliveryTitle: (country: string) => `Delivery to ${country}`,
    deliveryLink: 'Delivery by country',
  },

  /** Category names and short descriptions by slug. Empty in English: the database's own wording is used. */
  categories: {} as Record<string, { name: string; description: string }>,
};

export type Dictionary = typeof en;
