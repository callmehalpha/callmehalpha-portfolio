import React from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import { BuildLog } from '../types';

interface BuildLogEntryProps {
  log: BuildLog;
  key?: React.Key;
}

export const BuildLogEntry = ({ log }: BuildLogEntryProps) => (
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
    <a 
      href={log.url} 
      onClick={() => window.umami?.track('view_build_log', { log_title: log.title })}
      className="mt-8 text-indigo-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-indigo-400 transition-colors"
    >
      Read Full Note <ArrowRight size={14} />
    </a>
  </div>
);
