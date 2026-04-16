import React from 'react';
import { Terminal } from 'lucide-react';

export const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 font-mono">
      <div className="relative">
        <div className="w-16 h-16 border-2 border-zinc-800 rounded-full animate-pulse flex items-center justify-center">
          <Terminal size={24} className="text-indigo-500 animate-pulse" />
        </div>
        <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
      </div>
      <div className="mt-8 flex flex-col items-center gap-2">
        <span className="text-zinc-500 text-xs uppercase tracking-widest animate-pulse">Initializing Systems...</span>
        <div className="h-1 w-32 bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 animate-[loading_1.5s_ease-in-out_infinite]"></div>
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 50%; transform: translateX(50%); }
          100% { width: 0%; transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
