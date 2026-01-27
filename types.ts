
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
