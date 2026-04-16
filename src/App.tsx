import React, { Suspense, lazy } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ScrollToHash } from './components/ScrollToHash';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import { PRODUCTS } from './data/products';

// Lazy load pages for code splitting
const Portfolio = lazy(() => import('./pages/Portfolio').then(module => ({ default: module.Portfolio })));
const Product = lazy(() => import('./pages/Product'));
const NotFound = lazy(() => import('./pages/NotFound').then(module => ({ default: module.NotFound })));

/**
 * ProductView handles locating the product data by slug 
 * and passing it to the Product page component.
 */
const ProductView = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const product = PRODUCTS.find(p => p.slug === slug);

  if (!product) {
    // Redirect to custom 404 if product not found
    return <NotFound />;
  }

  return <Product product={product} />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AnalyticsTracker />
      <ScrollToHash />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Portfolio />} />
          <Route path="/products/:slug" element={<ProductView />} />
          {/* Catch-all route for 404 handling within the SPA */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
