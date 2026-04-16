import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Zap,
  Shield,
  Star,
} from 'lucide-react';
import { Product } from '../types';

/* ─── Scroll-to-top on mount ─── */
const useScrollTop = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
};

/* ─── Animated number counter ─── */
const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1500;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{count}{suffix}</>;
};

/* ─── FAQ Accordion Item ─── */
const FaqItem = ({
  question,
  answer,
}: {
  question: string;
  answer: string;
  key?: React.Key;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState && window.umami) {
      window.umami.track('faq_expand', { question });
    }
  };

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-zinc-700">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-6 text-left focus:outline-none group"
      >
        <span className="text-white font-semibold text-lg pr-4 group-hover:text-indigo-300 transition-colors">
          {question}
        </span>
        <ChevronDown
          size={20}
          className={`text-zinc-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`}
        />
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="px-6 pb-6 text-zinc-400 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

/* ─── CTA Button ─── */
const CtaButton = ({
  href,
  text,
  size = 'lg',
  productName,
}: {
  href: string;
  text: string;
  size?: 'lg' | 'md';
  productName: string;
}) => {
  const handleCtaClick = () => {
    if (window.umami) {
      window.umami.track('product_cta_click', { product: productName, text, size });
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleCtaClick}
      className={`
        group relative inline-flex items-center gap-3 font-bold rounded-xl
        bg-gradient-to-r from-indigo-600 to-indigo-500
        text-white shadow-lg shadow-indigo-600/25
        hover:shadow-xl hover:shadow-indigo-500/30
        hover:scale-[1.02] active:scale-[0.98]
        transition-all duration-300
        ${size === 'lg' ? 'px-10 py-5 text-lg' : 'px-4 py-2 md:px-8 md:py-4 text-sm md:text-base'}
      `}
    >
      <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span className="relative">{text} →</span>
      <ExternalLink size={size === 'lg' ? 20 : 16} className="relative opacity-60 group-hover:opacity-100 transition-opacity" />
    </a>
  );
};

/* ─── Section Wrapper ─── */
const ProductSection = ({
  id,
  children,
  className = '',
  noPadding = false,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) => (
  <section
    id={id}
    className={`${noPadding ? '' : 'py-20 md:py-28 px-6 md:px-12'} max-w-6xl mx-auto ${className}`}
  >
    {children}
  </section>
);

/* ─── Section Label ─── */
const SectionLabel = ({ text }: { text: string }) => (
  <span className="inline-block text-indigo-500 font-mono text-xs uppercase tracking-[0.2em] mb-4">
    {text}
  </span>
);

/* ─── Autoplay Carousel (for mobile/tablet) ─── */
const AutoplayCarousel = ({ children, interval = 4000 }: { children: React.ReactNode; interval?: number }) => {
  const items = React.Children.toArray(children);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, interval);
    return () => clearInterval(timer);
  }, [items.length, interval]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (items.length <= 1) return;
    if (touchStartX.current - touchEndX.current > 50) {
      // Swipe Left
      setIndex((prev) => (prev + 1) % items.length);
    } else if (touchStartX.current - touchEndX.current < -50) {
      // Swipe Right
      setIndex((prev) => (prev - 1 + items.length) % items.length);
    }
  };

  return (
    <div className="relative overflow-hidden w-full group">
      <div
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((child, i) => (
          <div key={i} className="w-full shrink-0 px-2">
            {child}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-indigo-500' : 'w-2 bg-zinc-800 hover:bg-zinc-700'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   MAIN PRODUCT PAGE COMPONENT
   ═══════════════════════════════════════════════ */

export const ProductPage = ({ product }: { product: Product }) => {
  useScrollTop();
  const navigate = useNavigate();

  const handleBackClick = () => {
    window.umami?.track('product_back_click', { product: product.name });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">

      {/* ─── Sticky Nav Bar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Portfolio
          </button>
          <CtaButton href={product.ctaUrl} text={product.ctaText} size="md" productName={product.name} />
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-600/8 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
              <Sparkles size={14} className="text-indigo-400" />
              <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Digital Product</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
              {product.name}
            </h1>

            <p className="text-xl md:text-2xl text-zinc-400 mb-8 leading-relaxed max-w-xl">
              {product.tagline}
            </p>

            <div className="flex items-baseline gap-4 mb-8">
              <span className="text-zinc-600 line-through text-2xl font-medium">{product.originalPrice}</span>
              <span className="text-5xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                {product.price}
              </span>
              <span className="text-zinc-500 text-sm">· Instant download</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <CtaButton href={product.ctaUrl} text={product.ctaText} size="lg" productName={product.name} />
            </div>

            <p className="text-zinc-600 text-sm flex items-center gap-2">
              <Shield size={14} className="text-zinc-500" />
              {product.compatibility}
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/10 rounded-2xl blur-xl" />
            <div className="relative bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3 shadow-2xl shadow-black/50">
              <img
                src={product.images.cover}
                alt={product.name}
                className="w-full rounded-xl"
              />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2">
              <Zap size={16} />
              <AnimatedNumber value={53} suffix="+" /> Prompts Inside
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF BAR ═══ */}
      <div className="border-y border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-14">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="shrink-0">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/20">
                {product.socialProof.author[0]}
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-lg mb-1">
                Built by <span className="text-indigo-400">{product.socialProof.author}</span>
                <span className="text-zinc-500 font-normal"> · {product.socialProof.title}</span>
              </p>
              <p className="text-zinc-400 italic leading-relaxed max-w-3xl text-base">
                "{product.socialProof.quote}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PROBLEM ═══ */}
      <ProductSection id="problem">
        <SectionLabel text="The Problem" />
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
          {product.problem.headline}
        </h2>
        <p className="text-zinc-400 text-xl mb-10">{product.problem.intro}</p>

        <div className="space-y-4 mb-12">
          {product.problem.painPoints.map((point, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-5 bg-zinc-950/50 border border-zinc-800/50 rounded-xl hover:border-red-900/30 transition-colors group"
            >
              <span className="text-red-500 font-bold text-lg shrink-0 mt-0.5 group-hover:scale-110 transition-transform">✕</span>
              <span className="text-zinc-300 text-base leading-relaxed">{point}</span>
            </div>
          ))}
        </div>

        <div className="p-8 bg-gradient-to-r from-indigo-950/30 to-purple-950/20 border border-indigo-500/10 rounded-2xl">
          <p className="text-zinc-300 text-lg md:text-xl leading-relaxed font-medium">
            {product.problem.closing}
          </p>
        </div>
      </ProductSection>

      {/* ═══ WHAT'S INSIDE ═══ */}
      <section className="py-20 md:py-28 px-6 md:px-12 bg-zinc-950/30 border-y border-zinc-800/30">
        <div className="max-w-6xl mx-auto">
          <SectionLabel text="What's Inside" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Everything you need, in one kit.
          </h2>
          <p className="text-zinc-400 text-lg mb-14 max-w-2xl">
            Organized into one downloadable package — open it, follow the system, start landing interviews.
          </p>

          {/* Grid for desktop */}
          <div className="hidden lg:grid grid-cols-3 gap-6">
            {product.features.map((feature, i) => (
              <div
                key={i}
                className="group p-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:border-indigo-500/30 hover:bg-zinc-900/60 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div className="text-4xl mb-5 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-3 group-hover:text-indigo-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Carousel for mobile/tablet */}
          <div className="lg:hidden">
            <AutoplayCarousel>
              {product.features.map((feature, i) => (
                <div
                  key={i}
                  className="h-full group p-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl"
                >
                  <div className="text-4xl mb-5">
                    {feature.icon}
                  </div>
                  <h3 className="text-white font-bold text-lg mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </AutoplayCarousel>
          </div>
        </div>
      </section>

      {/* ═══ PROMPT PREVIEW ═══ */}
      <ProductSection id="preview">
        <SectionLabel text="See The Quality" />
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Prompt Preview
        </h2>
        <p className="text-zinc-400 text-lg mb-12 max-w-2xl">
          {product.promptPreview.intro}
        </p>

        <div className="relative">
          {/* Glow behind code block */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent rounded-2xl blur-xl" />

          <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-6 py-4 bg-zinc-900/80 border-b border-zinc-800">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-4 text-zinc-600 text-xs font-mono">ai-job-hunter-kit / prompts.md</span>
            </div>

            <pre className="p-6 md:p-8 text-sm md:text-base text-zinc-300 font-mono leading-relaxed overflow-x-auto">
              <code>{product.promptPreview.promptCode}</code>
            </pre>
          </div>
        </div>

        <p className="text-zinc-400 text-lg mt-8 leading-relaxed">
          {product.promptPreview.outro}
        </p>

        <div className="mt-6 inline-flex items-center gap-3 px-6 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
          <Star size={16} className="text-indigo-400" />
          <span className="text-indigo-300 font-semibold text-sm">
            {product.promptPreview.totalCount - 1} more prompts just like this are inside the kit.
          </span>
        </div>
      </ProductSection>

      {/* ═══ WHO IT'S FOR ═══ */}
      <section className="py-20 md:py-28 px-6 md:px-12 bg-zinc-950/30 border-y border-zinc-800/30">
        <div className="max-w-6xl mx-auto">
          <SectionLabel text="Who It's For" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            This kit is for you if you're…
          </h2>
          <p className="text-zinc-400 text-lg mb-14">
            No matter where you are in your career — there's a system inside for you.
          </p>

          {/* Grid for desktop */}
          <div className="hidden lg:grid grid-cols-3 gap-6 mb-10">
            {product.personas.map((persona, i) => (
              <div
                key={i}
                className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:bg-indigo-500/20 transition-colors">
                  <span className="text-indigo-400 font-bold text-sm">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-3 group-hover:text-indigo-300 transition-colors">
                  {persona.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {persona.description}
                </p>
              </div>
            ))}
          </div>

          {/* Carousel for mobile/tablet */}
          <div className="lg:hidden mb-10">
            <AutoplayCarousel>
              {product.personas.map((persona, i) => (
                <div
                  key={i}
                  className="h-full p-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
                    <span className="text-indigo-400 font-bold text-sm">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-3">
                    {persona.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {persona.description}
                  </p>
                </div>
              ))}
            </AutoplayCarousel>
          </div>

          <div className="p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
            <p className="text-zinc-500 text-sm leading-relaxed italic">
              {product.exclusionNote}
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <ProductSection id="faq">
        <SectionLabel text="FAQ" />
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Got questions?
        </h2>
        <p className="text-zinc-400 text-lg mb-12">
          Here are the most common ones — answered.
        </p>

        <div className="space-y-4 max-w-3xl">
          {product.faq.map((item, i) => (
            <FaqItem key={i} question={item.question} answer={item.answer} />
          ))}
        </div>
      </ProductSection>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 md:py-28 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-400/10 blur-2xl rounded-full translate-y-1/2 -translate-x-1/4" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 p-10 md:p-16 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
                  {product.finalCta.headline}
                </h2>
                <p className="text-indigo-100 text-xl mb-8 leading-relaxed">
                  {product.finalCta.subtext}
                </p>

                <div className="flex items-baseline gap-4 mb-8">
                  <span className="text-indigo-200/50 line-through text-xl">{product.originalPrice}</span>
                  <span className="text-4xl font-bold text-white">{product.price}</span>
                  <span className="text-indigo-200 text-sm">· One-time payment · Instant download</span>
                </div>

                <div className="mb-8">
                  <CtaButton href={product.ctaUrl} text={`Get the ${product.name}`} size="lg" productName={product.name} />
                </div>

                <div className="flex flex-wrap gap-4 mb-6">
                  {product.finalCta.perks.map((perk, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-2 text-indigo-200 text-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                      {perk}
                    </span>
                  ))}
                </div>

                <p className="text-indigo-200/60 text-sm italic">
                  {product.finalCta.authorCredit}
                </p>
              </div>

              <div className="relative hidden lg:block">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl blur-lg" />
                <div className="relative bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 shadow-2xl">
                  <img
                    src={product.images.thumbnail}
                    alt={product.name}
                    className="w-full rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-8 px-6 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleBackClick}
            className="text-zinc-500 hover:text-white transition-colors text-sm flex items-center gap-2"
          >
            <ArrowLeft size={14} />
            Back to Portfolio
          </button>
          <span className="text-zinc-700 text-xs font-mono uppercase tracking-widest">
            &copy; {new Date().getFullYear()} CALLMEHALPHA
          </span>
        </div>
      </footer>
    </div>
  );
};

export default ProductPage;
