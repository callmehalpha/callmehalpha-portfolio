
export interface CaseStudy {
  id: string;
  name: string;
  url: string;
  focus: string[];
  context: string;
  role: string;
  architecture: string;
  decisions: string[];
  challenges: string;
  outcome: string;
  lessons: string;
}

export interface BuildLog {
  title: string;
  date: string;
  excerpt: string;
  content: string;
  url: string;
}

export interface Capability {
  title: string;
  description: string;
  items: string[];
}

export interface Philosophy {
  title: string;
  description: string;
}

export interface ProductSocialProof {
  author: string;
  title: string;
  quote: string;
}

export interface ProductProblem {
  headline: string;
  intro: string;
  painPoints: string[];
  closing: string;
}

export interface ProductFeature {
  icon: string;
  title: string;
  description: string;
}

export interface ProductPromptPreview {
  intro: string;
  promptCode: string;
  outro: string;
  totalCount: number;
}

export interface ProductPersona {
  title: string;
  description: string;
}

export interface ProductFaq {
  question: string;
  answer: string;
}

export interface ProductFinalCta {
  headline: string;
  subtext: string;
  perks: string[];
  authorCredit: string;
}

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  price: string;
  originalPrice: string;
  ctaUrl: string;
  ctaText: string;
  compatibility: string;
  socialProof: ProductSocialProof;
  problem: ProductProblem;
  features: ProductFeature[];
  promptPreview: ProductPromptPreview;
  personas: ProductPersona[];
  exclusionNote: string;
  faq: ProductFaq[];
  finalCta: ProductFinalCta;
  images: {
    cover: string;
    thumbnail: string;
  };
}
