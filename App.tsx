
import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  ArrowRight,
  ChevronRight,
  Database,
  ShieldCheck,
  Cpu,
  CreditCard,
  Layout,
  ExternalLink,
  ChevronDown,
  Terminal,
  BookOpen,
  Mail,
  Linkedin,
  Share2,
  Twitter,
  Copy,
  Check
} from 'lucide-react';
import { CASE_STUDIES, PHILOSOPHIES, CAPABILITIES, BUILD_LOGS } from './constants';
import { CaseStudy, Capability, Philosophy, BuildLog } from './types';

// --- Sub-components ---

const Section = ({ id, title, children, className = "" }: { id: string, title?: string, children?: React.ReactNode, className?: string }) => (
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

const CapabilityCard = ({ capability }: { capability: Capability; key?: React.Key }) => {
  const IconMap: Record<string, any> = {
    "Architecture & Systems Design": Cpu,
    "Backend Engineering": Database,
    "Infrastructure & DevOps": ShieldCheck,
    "Payments & Fintech Systems": CreditCard,
    "Frontend (Supporting, system-driven UI)": Layout
  };
  const Icon = IconMap[capability.title] || Cpu;

  return (
    <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300">
      <div className="w-12 h-12 flex items-center justify-center rounded-md bg-zinc-800 mb-6">
        <Icon size={24} className="text-indigo-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{capability.title}</h3>
      <p className="text-zinc-400 mb-6 text-sm leading-relaxed">{capability.description}</p>
      <div className="flex flex-wrap gap-2">
        {capability.items.map(item => (
          <span key={item} className="px-2 py-1 bg-zinc-800 text-zinc-300 text-[10px] uppercase tracking-wider font-medium rounded">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

const ArchitectureDiagramPlaceholder = ({ title }: { title: string }) => (
  <div className="w-full aspect-video bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
      backgroundImage: 'radial-gradient(circle at 2px 2px, #3f3f46 1px, transparent 0)',
      backgroundSize: '24px 24px'
    }}></div>
    <div className="relative z-10 flex flex-col items-center">
      <div className="w-16 h-16 border-2 border-dashed border-zinc-700 rounded-full flex items-center justify-center mb-4 group-hover:border-indigo-500 transition-colors">
        <Cpu size={32} className="text-zinc-600 group-hover:text-indigo-400 transition-colors" />
      </div>
      <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest">{title} System Diagram</span>
      <span className="text-zinc-700 text-[10px] mt-1 italic">[Schematic Embedding Restricted]</span>
    </div>
  </div>
);

const CaseStudyCard = ({ study }: { study: CaseStudy; key?: React.Key }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setIsShareOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${study.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareText = `Check out this technical case study: ${study.name} by @callmehalpha`;
  const shareUrl = `${window.location.origin}${window.location.pathname}#${study.id}`;

  return (
    <div id={study.id} className="snap-start min-w-[85vw] md:min-w-[calc(33.333%-1rem)] group flex flex-col h-full bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 transition-all duration-300 hover:border-zinc-700">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-indigo-500 font-mono text-xs tracking-widest">0{CASE_STUDIES.indexOf(study) + 1}</span>
            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">{study.name}</h3>
          </div>
          <div className="relative" ref={shareRef}>
            <button
              onClick={() => setIsShareOpen(!isShareOpen)}
              className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="Share System Review"
            >
              <Share2 size={16} />
            </button>
            {isShareOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? "Link Copied" : "Copy Deep Link"}
                </button>
                <div className="h-px bg-zinc-800 my-1"></div>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                >
                  <Twitter size={14} /> Share on X
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                >
                  <Linkedin size={14} /> Share on LinkedIn
                </a>
              </div>
            )}
          </div>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6 line-clamp-4">{study.context}</p>
        <div className="flex flex-wrap gap-2 mb-8">
          {study.focus.slice(0, 2).map(f => (
            <span key={f} className="px-3 py-1 bg-zinc-950 border border-zinc-800 text-zinc-500 text-[10px] rounded-full uppercase tracking-wider">
              {f}
            </span>
          ))}
          {study.focus.length > 2 && <span className="text-zinc-600 text-[10px] self-center">+{study.focus.length - 2}</span>}
        </div>
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-auto flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold transition-colors text-[10px] uppercase tracking-widest group/btn"
      >
        {isExpanded ? "Minimize Review" : "System Breakdown"}
        <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-8 md:p-12 relative">
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <div className="mb-10">
              <span className="text-indigo-500 font-mono text-sm uppercase tracking-widest block mb-2">Technical Case Study</span>
              <h2 className="text-4xl font-bold text-white">{study.name}</h2>
            </div>
            <div className="mb-10">
              <ArchitectureDiagramPlaceholder title={study.name} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h4 className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-4">Role & Responsibility</h4>
                <p className="text-zinc-300 mb-8 text-sm md:text-base leading-relaxed">{study.role}</p>
                <h4 className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-4">Architecture Overview</h4>
                <p className="text-zinc-300 mb-8 text-sm md:text-base leading-relaxed">{study.architecture}</p>
                <h4 className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-4">Core Decisions</h4>
                <ul className="space-y-3">
                  {study.decisions.map((d, i) => (
                    <li key={i} className="flex gap-3 text-zinc-300 text-sm italic">
                      <span className="text-indigo-600 font-mono">•</span> {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-4">Challenges</h4>
                <p className="text-zinc-300 mb-8 text-sm md:text-base leading-relaxed">{study.challenges}</p>
                <h4 className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-4">Lessons</h4>
                <p className="text-zinc-300 mb-10 font-medium border-l-2 border-indigo-900 pl-4 text-sm md:text-base leading-relaxed">{study.lessons}</p>
                <a href={study.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white bg-indigo-600 px-8 py-3 rounded-lg font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20">
                  Platform Access <ExternalLink size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Added key?: React.Key to the props type to avoid "Property 'key' does not exist" error when mapping over BUILD_LOGS
const BuildLogEntry = ({ log }: { log: BuildLog; key?: React.Key }) => (
  <div className="p-8 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 group snap-start min-w-[85vw] md:min-w-[calc(33.333%-1rem)] flex flex-col h-full">
    <div className="flex justify-between items-start mb-4">
      <span className="text-zinc-500 font-mono text-xs">{log.date}</span>
      <BookOpen size={16} className="text-zinc-600 group-hover:text-indigo-400 transition-colors" />
    </div>
    <div className="flex-1">
      <h3 className="text-xl font-bold text-white mb-2">{log.title}</h3>
      <p className="text-zinc-500 text-sm mb-6 leading-relaxed line-clamp-3">{log.excerpt}</p>
      <div className="font-mono text-[10px] text-zinc-500 bg-zinc-900/50 p-4 rounded border border-zinc-800/50 overflow-hidden line-clamp-2">
        {log.content}
      </div>
    </div>
    <button className="mt-8 text-indigo-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-indigo-400 transition-colors">
      Read Full Note <ArrowRight size={14} />
    </button>
  </div>
);

// --- Main App Component ---

export default function App() {
  const [activeNav, setActiveNav] = useState('hero');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'philosophy', 'capabilities', 'case-studies', 'build-logs', 'operating', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveNav(section);
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] selection:bg-indigo-500/30 selection:text-indigo-200">

      {/* Navigation */}
      <nav className="fixed top-4 left-6 right-6 z-50 bg-white/95 backdrop-blur-md border border-zinc-200 shadow-sm rounded-2xl">
        <div className="max-w-7xl mx-auto px-6 h-32 pt-4 pb-2 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 relative">
            <img src="/logo.png" alt="CALLMEHALPHA Logo" className="h-40 w-auto py-2" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[
              { id: 'case-studies', label: 'Case Studies' },
              { id: 'capabilities', label: 'Capabilities' },
              { id: 'build-logs', label: 'Logs' },
              { id: 'contact', label: 'Contact' }
            ].map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`text-xs font-bold uppercase tracking-widest transition-colors ${activeNav === item.id ? 'text-indigo-600' : 'text-zinc-600 hover:text-black'}`}
              >
                {item.label}
              </a>
            ))}
          </div>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-zinc-800 p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            {isMenuOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-zinc-100 bg-white/95 backdrop-blur-md rounded-b-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col p-6 gap-4">
              {[
                { id: 'case-studies', label: 'Case Studies' },
                { id: 'capabilities', label: 'Capabilities' },
                { id: 'build-logs', label: 'Logs' },
                { id: 'contact', label: 'Contact' }
              ].map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-sm font-bold uppercase tracking-widest transition-colors ${activeNav === item.id ? 'text-indigo-600' : 'text-zinc-600 hover:text-black'}`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <Section id="hero" className="min-h-screen flex flex-col justify-center pt-32 pb-16">
        <div className="max-w-3xl">
          <span className="text-indigo-500 font-mono text-sm uppercase tracking-[0.2em] mb-4 block animate-in fade-in slide-in-from-bottom-2 duration-700">Systems & Architecture</span>
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 tracking-tighter leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Callme<span className="text-zinc-600">halpha</span>
          </h1>
          <p className="text-2xl md:text-3xl font-medium text-zinc-400 mb-10 leading-snug animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            Systems-focused Software Engineer & Technical Founder.
          </p>
          <p className="text-zinc-500 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            I design, build, and operate scalable software systems — from multi-tenant platforms to payment infrastructure — with a focus on correctness, ownership, and long-term maintainability.
          </p>
          <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500">
            <a
              href="#case-studies"
              className="bg-white text-black px-8 py-4 rounded font-bold flex items-center gap-2 transition-all duration-300 hover:bg-zinc-100 hover:scale-105 active:scale-[0.98] group"
            >
              View Case Studies <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#contact"
              className="bg-zinc-900 text-white border border-zinc-800 px-8 py-4 rounded font-bold transition-all duration-300 hover:bg-black hover:border-zinc-600 hover:scale-105 active:scale-[0.98]"
            >
              Connect
            </a>
          </div>
        </div>
      </Section>

      {/* Technical Philosophy */}
      <div id="philosophy" className="bg-zinc-950 border-y border-zinc-900 py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-12">
          {PHILOSOPHIES.map((phi, i) => (
            <div key={i} className="group">
              <h4 className="text-white font-bold mb-2 flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                <ChevronRight size={14} className="text-indigo-600" />
                {phi.title}
              </h4>
              <p className="text-zinc-500 text-sm leading-relaxed">{phi.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Capabilities */}
      <Section id="capabilities" title="Core Capabilities">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CAPABILITIES.map((cap, i) => (
            <CapabilityCard key={i} capability={cap} />
          ))}
        </div>
      </Section>

      {/* Case Studies */}
      <Section id="case-studies" title="Technical Case Studies" className="bg-zinc-950/30 overflow-hidden">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 -mx-6 px-6 no-scrollbar">
          {CASE_STUDIES.map((study) => (
            <CaseStudyCard
              key={study.id}
              study={study}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-zinc-600 font-mono text-[10px] uppercase">
          <ArrowRight size={12} /> Scroll to traverse systems
        </div>
      </Section>

      {/* Build Logs */}
      <Section id="build-logs" title="Technical Notes" className="overflow-hidden">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 -mx-6 px-6 no-scrollbar">
          {BUILD_LOGS.map((log, i) => (
            <BuildLogEntry key={i} log={log} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-zinc-600 font-mono text-[10px] uppercase">
          <ArrowRight size={12} /> Scroll for technical deep dives
        </div>
      </Section>

      {/* Operating Style */}
      <Section id="operating" title="Operating Style">
        <div className="max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <ShieldCheck size={20} className="text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Ownership Mindset</h3>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
              I believe in deep ownership of the software I build. This means being responsible for the system's performance, reliability, and security long after the initial code is deployed.
            </p>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Preferring clarity over cleverness, I write code that is readable by others and maintainable over years, not months.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <Cpu size={20} className="text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Calm Execution</h3>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
              Systems engineering involves managing complexity and high-stakes failures. I focus on maintaining a calm, systematic approach to problem-solving, especially under pressure.
            </p>
            <p className="text-zinc-500 text-sm leading-relaxed">
              I prioritize long-term system health over short-term "hacks," ensuring that the technical foundations remain solid as the product evolves.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <Layout size={20} className="text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Pragmatic Tool Selection</h3>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
              Technology choice is an architectural decision with multi-year consequences. I select tools based on operational maturity, community support, and ecosystem stability.
            </p>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Boring technology allows us to focus our limited innovation budget on the unique architectural challenges that differentiate the business.
            </p>
          </div>
        </div>
      </Section>

      {/* Contact */}
      <Section id="contact" className="pb-32">
        <div className="p-12 md:p-20 bg-indigo-600 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 blur-3xl rounded-full opacity-50 -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tighter">Let's build something robust.</h2>
            <p className="text-indigo-100 text-xl mb-12 leading-relaxed">
              Available for senior engineering roles, system design advisory, and technical leadership.
            </p>
            <div className="flex flex-wrap gap-8">
              <a
                href="mailto:hello@callmehalpha.tech"
                className="flex items-center gap-3 text-white font-bold group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:bg-white/5 rounded-xl transition-all p-2 -m-2"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 group-focus-visible:bg-white/30 transition-colors">
                  <Mail size={20} />
                </div>
                Email
              </a>
              <a
                href="https://linkedin.com"
                className="flex items-center gap-3 text-white font-bold group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:bg-white/5 rounded-xl transition-all p-2 -m-2"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 group-focus-visible:bg-white/30 transition-colors">
                  <Linkedin size={20} />
                </div>
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-zinc-600 font-mono text-xs uppercase tracking-widest">
            <span>&copy; 2024 CALLMEHALPHA</span>
            <span className="h-4 w-px bg-zinc-800"></span>
            <span>SYSTEMS BUILDER</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-600 font-mono text-[10px] uppercase">
            <span>v2.4.0-STABLE</span>
            <Terminal size={14} />
          </div>
        </div>
      </footer>
    </div>
  );
}
