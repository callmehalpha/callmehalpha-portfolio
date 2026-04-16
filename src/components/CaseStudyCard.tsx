import React, { useState, useEffect, useRef } from 'react';
import { Share2, Check, Copy, Twitter, Linkedin, X, ChevronDown, Cpu, ExternalLink } from 'lucide-react';
import { CaseStudy } from '../types';

interface CaseStudyCardProps {
  study: CaseStudy;
  index: number;
  key?: React.Key;
}

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

export const CaseStudyCard = ({ study, index }: CaseStudyCardProps) => {
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
    
    // Tracking event
    if (window.umami) {
      window.umami.track('copy_casestudy_link', { study_id: study.id });
    }
  };

  const shareText = `Check out this technical case study: ${study.name} by @callmehalpha`;
  const shareUrl = `${window.location.origin}${window.location.pathname}#${study.id}`;

  const toggleExpand = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (newState && window.umami) {
      window.umami.track('expand_casestudy', { study_id: study.id });
    }
  };

  return (
    <div id={study.id} className="snap-start min-w-[85vw] md:min-w-[calc(33.333%-1rem)] group flex flex-col h-full bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 transition-all duration-300 hover:border-zinc-700">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-indigo-500 font-mono text-xs tracking-widest">0{index + 1}</span>
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
                  onClick={() => window.umami?.track('share_casestudy_twitter', { study_id: study.id })}
                  className="flex items-center gap-3 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                >
                  <Twitter size={14} /> Share on X
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => window.umami?.track('share_casestudy_linkedin', { study_id: study.id })}
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
        onClick={toggleExpand}
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
              <div className="mt-6 flex flex-wrap gap-2">
                {study.focus.map(f => (
                  <span key={f} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-indigo-400 text-[10px] rounded-full uppercase tracking-wider font-bold">
                    {f}
                  </span>
                ))}
              </div>
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
                <a 
                  href={study.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => window.umami?.track('view_casestudy_platform', { study_id: study.id })}
                  className="inline-flex items-center gap-2 text-white bg-indigo-600 px-8 py-3 rounded-lg font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                >
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
