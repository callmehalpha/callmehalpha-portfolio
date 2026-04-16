import React from 'react';

interface SectionProps {
  id: string;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Section = ({ id, title, children, className = "" }: SectionProps) => (
  <section id={id} className={`py-24 px-6 md:px-12 max-w-7xl mx-auto scroll-mt-20 ${className}`}>
    {title && (
      <div className="mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">{title}</h2>
        <div className="h-1 w-12 bg-indigo-600"></div>
      </div>
    )}
    {children}
  </section>
);
