import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/** Minimal chrome for standalone pages (notes): back link, content column, footer. */
export const PageShell = ({ children, back = { to: '/#build-logs', label: 'Back to portfolio' } }: { children: React.ReactNode; back?: { to: string; label: string } }) => (
  <div className="min-h-screen bg-[#0a0a0a] selection:bg-indigo-500/30 selection:text-indigo-200">
    <header className="max-w-3xl mx-auto px-6 pt-12">
      <Link to={back.to} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
        <ArrowLeft size={14} /> {back.label}
      </Link>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12">{children}</main>
    <footer className="max-w-3xl mx-auto px-6 py-12 border-t border-zinc-900 text-zinc-600 font-mono text-xs uppercase tracking-widest">
      &copy; {new Date().getFullYear()} CALLMEHALPHA
    </footer>
  </div>
);
