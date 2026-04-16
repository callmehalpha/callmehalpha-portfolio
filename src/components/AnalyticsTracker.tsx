import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * AnalyticsTracker handles page view tracking and source attribution
 * via Umami Analytics.
 */
export const AnalyticsTracker = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Determine source from URL params or document referrer
    const source = searchParams.get('source') || 
                   searchParams.get('ref') || 
                   (document.referrer ? new URL(document.referrer).hostname : 'direct');
    
    // Explicitly track the page visit event with source data
    // Assuming Umami is loaded via script tag
    if (window.umami) {
      window.umami.track('launch_page_visit', { source });
    }
  }, [searchParams]);

  return null;
};

// Global type definition for Umami
declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: any) => void;
    };
  }
}
