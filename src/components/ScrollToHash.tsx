import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToHash handles automatic scrolling to element IDs when
 * a hash is present in the URL, or scrolling to top on route change.
 */
export const ScrollToHash = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (hash) {
      // Small timeout to allow the browser to render the lazy components
      const timer = setTimeout(() => {
        const element = document.getElementById(hash.slice(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash, pathname]);

  return null;
};
