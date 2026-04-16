import { useEffect } from 'react';
import { SeoData } from '../types';

interface SEOProps {
  data?: SeoData;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export const SEO = ({ 
  data, 
  fallbackTitle = "Callmehalpha | Systems Engineer & Technical Founder",
  fallbackDescription = "Portfolio of Callmehalpha - A systems-focused software engineer and technical founder specializing in scalable infrastructure and distributed systems."
}: SEOProps) => {
  useEffect(() => {
    const title = data?.title || fallbackTitle;
    const description = data?.description || fallbackDescription;
    const image = data?.image || "https://abdulazeez.usaiy.xyz/logo.png";
    const keywords = data?.keywords?.join(', ') || "systems engineer, software engineer, technical founder, portfolio";

    // Update Standard Meta Tags
    document.title = title;
    
    const updateMetaTag = (selectors: string[], content: string) => {
      selectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          element.setAttribute('content', content);
        }
      });
    };

    updateMetaTag(['meta[name="description"]'], description);
    updateMetaTag(['meta[name="title"]'], title);
    updateMetaTag(['meta[name="keywords"]'], keywords);

    // Update Open Graph Tags
    updateMetaTag(['meta[property="og:title"]'], title);
    updateMetaTag(['meta[property="og:description"]'], description);
    updateMetaTag(['meta[property="og:image"]'], image);
    updateMetaTag(['meta[property="og:url"]'], window.location.href);

    // Update Twitter Tags
    updateMetaTag(['meta[name="twitter:title"]', 'meta[property="twitter:title"]'], title);
    updateMetaTag(['meta[name="twitter:description"]', 'meta[property="twitter:description"]'], description);
    updateMetaTag(['meta[name="twitter:image"]', 'meta[property="twitter:image"]'], image);
    updateMetaTag(['meta[name="twitter:url"]', 'meta[property="twitter:url"]'], window.location.href);

  }, [data, fallbackTitle, fallbackDescription]);

  return null; // This component doesn't render anything visually
};
