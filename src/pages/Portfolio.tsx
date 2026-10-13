import React, { useState, useEffect } from 'react';
import { 
  Menu, X, ArrowRight, ChevronRight, Terminal, 
  Mail, Linkedin, ShieldCheck, Cpu, Layout, Twitter, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CASE_STUDIES } from '../data/constants';
import { Section } from '../components/Section';
import { CapabilityCard } from '../components/CapabilityCard';
import { CaseStudyCard } from '../components/CaseStudyCard';
import { BuildLogEntry } from '../components/BuildLogEntry';
import { OssProjectCard } from '../components/OssProjectCard';
import { ExperienceTimeline } from '../components/ExperienceTimeline';
import { SEO } from '../components/SEO';
import { api } from '../lib/api';
import { FALLBACK_NOTES, FALLBACK_PROFILE } from '../lib/content';
import { useContent } from '../lib/useContent';
import type { CaseStudy } from '../types';
import type { OssProject, ResumeDownload } from '../types/content';

const NO_OSS: OssProject[] = [];
const NO_RESUME: ResumeDownload[] = [];

export const Portfolio = () => {
  const [activeNav, setActiveNav] = useState('hero');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { data: profile } = useContent((signal) => api.profile(signal), FALLBACK_PROFILE);
  const { data: caseStudies } = useContent<CaseStudy[]>((signal) => api.caseStudies(signal), CASE_STUDIES);
  const { data: notes } = useContent((signal) => api.notes({ pageSize: 6 }, signal).then((r) => r.items), FALLBACK_NOTES);
  const { data: ossProjects } = useContent((signal) => api.oss(signal), NO_OSS);
  const { data: resumes } = useContent((signal) => api.resumes(signal), NO_RESUME);
  // Only offered once an approved resume exists.
  const resume = resumes.find((r) => r.variant === 'default');
  const hasExperience = profile.work.length > 0;
  const github = profile.basics.profiles.find((p) => p.network === 'GitHub');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'philosophy', 'capabilities', 'case-studies', 'experience', 'build-logs', 'open-source', 'operating', 'contact'];
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

  const navItems = [
    { id: 'case-studies', label: 'Case Studies' },
    ...(hasExperience ? [{ id: 'experience', label: 'Experience' }] : []),
    { id: 'capabilities', label: 'Capabilities' },
    { id: 'build-logs', label: 'Notes' },
    { id: 'open-source', label: 'Open Source' },
    { id: 'contact', label: 'Contact' },
  ];

  const trackCta = (name: string, location: string) => {
    window.umami?.track('cta_click', { name, location });
  };

  const trackSocial = (platform: string) => {
    window.umami?.track('social_click', { platform });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] selection:bg-indigo-500/30 selection:text-indigo-200">
      <SEO />
      {/* Navigation */}
      <nav className="fixed top-4 left-6 right-6 z-50 bg-white/95 backdrop-blur-md border border-zinc-200 shadow-sm rounded-2xl">
        <div className="max-w-7xl mx-auto px-6 h-32 pt-4 pb-2 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 relative">
            <img src="/logo.png" alt="CALLMEHALPHA Logo" className="h-40 w-auto py-2" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            {navItems.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => trackCta(`nav_${item.id}`, 'header')}
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
              {navItems.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => {
                    setIsMenuOpen(false);
                    trackCta(`nav_mobile_${item.id}`, 'header_mobile');
                  }}
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
          <span className="text-indigo-500 font-mono text-sm uppercase tracking-[0.2em] mb-4 block animate-in fade-in slide-in-from-bottom-2 duration-700">{profile.positioning.headline}</span>
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 tracking-tighter leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Callme<span className="text-zinc-600">halpha</span>
          </h1>
          <p className="text-2xl md:text-3xl font-medium text-zinc-400 mb-10 leading-snug animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            {profile.positioning.tagline}
          </p>
          <p className="text-zinc-500 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            {profile.positioning.intro}
          </p>
          {profile.heroStats.length > 0 && (
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-3xl mb-12" aria-label="Highlights">
              {profile.heroStats.map((stat) => (
                <div key={stat.label} className="border-l-2 border-indigo-600 pl-4 flex flex-col-reverse">
                  <dt className="text-zinc-500 text-xs leading-snug">{stat.label}</dt>
                  <dd className="text-white text-3xl font-bold tracking-tight">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500">
            <a
              href="#case-studies"
              onClick={() => trackCta('view_case_studies', 'hero')}
              className="bg-white text-black px-8 py-4 rounded font-bold flex items-center gap-2 transition-all duration-300 hover:bg-zinc-100 hover:scale-105 active:scale-[0.98] group"
            >
              View Case Studies <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#contact"
              onClick={() => trackCta('connect', 'hero')}
              className="bg-zinc-900 text-white border border-zinc-800 px-8 py-4 rounded font-bold transition-all duration-300 hover:bg-black hover:border-zinc-600 hover:scale-105 active:scale-[0.98]"
            >
              Connect
            </a>
            {resume && (
              <a
                href={resume.url}
                download
                onClick={() => window.umami?.track('resume_download', { location: 'hero' })}
                className="text-zinc-300 border border-zinc-800 px-8 py-4 rounded font-bold flex items-center gap-2 transition-all duration-300 hover:text-white hover:border-zinc-600 hover:scale-105 active:scale-[0.98]"
              >
                <Download size={18} /> Download Resume
              </a>
            )}
          </div>
        </div>
      </Section>

      {/* Technical Philosophy */}
      <div id="philosophy" className="bg-zinc-950 border-y border-zinc-900 py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-12">
          {profile.philosophies.map((phi, i) => (
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
          {profile.capabilities.map((cap, i) => (
            <CapabilityCard key={i} capability={cap} />
          ))}
        </div>
      </Section>

      {/* Case Studies */}
      <Section id="case-studies" title="Technical Case Studies" className="bg-zinc-950/30 overflow-hidden">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 -mx-6 px-6 no-scrollbar">
          {caseStudies.map((study, i) => (
            <CaseStudyCard
              key={study.id}
              study={study}
              index={i}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-zinc-600 font-mono text-[10px] uppercase">
          <ArrowRight size={12} /> Scroll to traverse systems
        </div>
      </Section>

      {/* Experience */}
      {hasExperience && (
        <Section id="experience" title="Experience">
          <ExperienceTimeline work={profile.work} caseStudyIds={caseStudies.map((c) => c.id)} />
        </Section>
      )}

      {/* Technical Notes */}
      <Section id="build-logs" title="Technical Notes" className="overflow-hidden">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 -mx-6 px-6 no-scrollbar">
          {notes.map((note) => (
            <BuildLogEntry key={note.slug} note={note} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 text-zinc-600 font-mono text-[10px] uppercase">
          <span className="flex items-center gap-2"><ArrowRight size={12} /> Scroll for technical deep dives</span>
          <Link to="/notes" className="text-indigo-500 font-bold tracking-widest hover:text-indigo-400">All notes →</Link>
        </div>
      </Section>

      {/* Open Source */}
      <Section id="open-source" title="Open Source Projects">
        <p className="text-zinc-400 text-lg mb-12 max-w-2xl -mt-6">
          Open-source projects I build and contribute to.
        </p>
        {ossProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ossProjects.map((project) => (
              <OssProjectCard key={project.slug} project={project} />
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            The first projects are on their way.{' '}
            {github && (
              <a href={github.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
                Follow along on GitHub
              </a>
            )}
          </p>
        )}
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
                href="mailto:i.am.abdulazeez.yisau@gmail.com"
                onClick={() => trackSocial('email')}
                className="flex items-center gap-3 text-white font-bold group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:bg-white/5 rounded-xl transition-all p-2 -m-2"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 group-focus-visible:bg-white/30 transition-colors">
                  <Mail size={20} />
                </div>
                Email
              </a>
              <a
                href="https://www.linkedin.com/in/abdulazeez-yisau-tech-ceo/"
                onClick={() => trackSocial('linkedin')}
                target="_blank"
                className="flex items-center gap-3 text-white font-bold group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:bg-white/5 rounded-xl transition-all p-2 -m-2"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 group-focus-visible:bg-white/30 transition-colors">
                  <Linkedin size={20} />
                </div>
                LinkedIn
              </a>
              {resume && (
                <a
                  href={resume.url}
                  download
                  onClick={() => window.umami?.track('resume_download', { location: 'contact' })}
                  className="flex items-center gap-3 text-white font-bold group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:bg-white/5 rounded-xl transition-all p-2 -m-2"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 group-focus-visible:bg-white/30 transition-colors">
                    <Download size={20} />
                  </div>
                  Resume
                </a>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-zinc-600 font-mono text-xs uppercase tracking-widest">
            <span>&copy; {new Date().getFullYear()} CALLMEHALPHA</span>
            <span className="h-4 w-px bg-zinc-800"></span>
            <span>STACKSMITH</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-600 font-mono text-[10px] uppercase">
            <span>v2.4.0-STABLE</span>
            <Terminal size={14} />
          </div>
        </div>
      </footer>
    </div>
  );
};
