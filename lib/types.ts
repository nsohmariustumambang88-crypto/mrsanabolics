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
