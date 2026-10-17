export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: string;
  categorySlug: string;
  /** Second level of the catalogue folder, where the category has one. */
  subcategory?: string;
  subcategoryName?: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockCount: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  isDeal?: boolean;
  description: string;
  longDescription: string;
  specifications: { label: string; value: string }[];
  benefits: string[];
  directions: string;
  ingredients: string[];
  shipping: string;
  returns: string;
  images: string[];
  faqs: { question: string; answer: string }[];
  reviews: {
    id: string;
    author: string;
    rating: number;
    date: string;
    title: string;
    body: string;
  }[];
};

/**
 * What the client-side catalogue carries per product.
 *
 * The storefront layout hands every product to the browser through the catalogue provider, on
 * every page. With 800+ products the full record — long copy, FAQs, reviews, ingredients — is
 * megabytes of RSC payload nobody reads on a listing. This is the projection that cards, search,
 * filters and the cart actually use; the product page reads the full record server-side.
 *
 * A full Product is assignable to this, so server pages can pass either.
 */
export type ProductSummary = Pick<
  Product,
  | 'id'
  | 'slug'
  | 'name'
  | 'brand'
  | 'brandSlug'
  | 'category'
  | 'categorySlug'
  | 'subcategory'
  | 'subcategoryName'
  | 'price'
  | 'compareAtPrice'
  | 'rating'
  | 'reviewCount'
  | 'inStock'
  | 'stockCount'
  | 'isNew'
  | 'isBestSeller'
  | 'isTrending'
  | 'isDeal'
  | 'description'
  | 'images'
> & {
  /** The leading specification only — the card and the plate marking read nothing else. */
  specifications: { label: string; value: string }[];
};

export type Category = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  productCount: number;
};

export type Brand = {
  name: string;
  slug: string;
  description: string;
  productCount: number;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  quote: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  metaTitle: string | null;
  metaDescription: string | null;
  imageAlt: string;
  imageCredit: string | null;
  /** 'YYYY-MM-DD', or null when the article has not been revised since it was published. */
  updated: string | null;
  featured: boolean;
  faqs: { question: string; answer: string }[];
  sources: JournalSource[];
};

/**
 * A post as a card: everything a listing shows, and not the body. Client components get this,
 * because a long article's body in a listing's payload is shipped to every visitor for nothing.
 */
export type JournalCard = Pick<
  BlogPost,
  | 'id'
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'category'
  | 'date'
  | 'updated'
  | 'readTime'
  | 'image'
  | 'imageAlt'
  | 'featured'
> & { sourceCount: number };

/** A reference an article relies on. Cited in the body as [^n], numbered from 1. */
export type JournalSource = {
  title: string;
  publisher?: string;
  year?: string;
  url: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
  brand: string;
};

/**
 * The public face of a discount code an administrator has chosen to advertise.
 *
 * Declared here rather than in lib/discounts so the storefront's client components can take it
 * as a prop without reaching into a `server-only` module. It carries only what a shopper may
 * see: never the usage count, the limit, or anything that says how close a code is to running
 * out — that would be a figure to game.
 */
export type AdvertisedDiscount = {
  code: string;
  /** "10% off", "$15 off", "Free delivery". */
  headline: string;
  /** "on orders over $100", "on Injectables", or empty when the code has no condition. */
  condition: string;
  /** ISO timestamp, or null when the code has no end date. */
  endsAt: string | null;
  /** True when the code is not limited to a category, so "everything" is a true word. */
  sitewide: boolean;
  /** True when the code also comes off shipping, so the popup may say "including shipping". */
  includesShipping: boolean;
};
