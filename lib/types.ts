export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: string;
  categorySlug: string;
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
