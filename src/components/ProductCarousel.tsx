import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

interface ProductCarouselProps {
  children: React.ReactNode[];
}

export const ProductCarousel = ({ children }: ProductCarouselProps) => {
  const [index, setIndex] = useState(0);
  const total = children.length;
  const showArrows = total > 1;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToIndex = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= total) return;
    
    // Tracking scroll interaction
    if (window.umami) {
      const direction = newIndex > index ? 'next' : 'prev';
      window.umami.track('carousel_scroll', { direction, index: newIndex });
    }
    
    setIndex(newIndex);
  };

  const cardsPerPage = isMobile ? 1 : 3;

  return (
    <div className="relative group">
      <div className="overflow-hidden px-4 -mx-4">
        <div 
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ transform: `translateX(-${index * (100 / cardsPerPage)}%)` }}
        >
          {children.map((child, i) => (
            <div 
              key={i} 
              className={`shrink-0 px-4 ${isMobile ? 'w-full' : 'w-1/3'}`}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {showArrows && (
        <>
          <button
            onClick={() => scrollToIndex(index - 1)}
            disabled={index === 0}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-2xl transition-all ${index === 0 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <ArrowRight size={20} className="rotate-180" strokeWidth={3} />
          </button>
          <button
            onClick={() => scrollToIndex(index + 1)}
            disabled={index >= total - cardsPerPage}
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-2xl transition-all ${index >= total - cardsPerPage ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <ArrowRight size={20} strokeWidth={3} />
          </button>
        </>
      )}
      
      {showArrows && (
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: Math.ceil(total / cardsPerPage) }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                scrollToIndex(i);
                window.umami?.track('carousel_indicator_click', { index: i });
              }}
              className={`h-1 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-indigo-500' : 'w-2 bg-zinc-800'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
