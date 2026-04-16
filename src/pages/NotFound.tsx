import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFound = () => {
  const navigate = useNavigate();

  const handleReturn = () => {
    window.umami?.track('not_found_return_click');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 text-center font-mono">
      <div className="mb-8">
        <h1 className="text-8xl font-bold text-indigo-600 mb-4 tracking-tighter animate-pulse">404</h1>
        <div className="h-1 w-24 bg-zinc-800 mx-auto"></div>
      </div>
      <h2 className="text-3xl font-bold text-white mb-4 uppercase tracking-widest">System Path Not Found</h2>
      <p className="text-zinc-500 max-w-md mb-12 leading-relaxed text-sm">
        The requested architectural endpoint does not exist or has been decommissioned. 
        Access logs have been updated.
      </p>
      <button
        onClick={handleReturn}
        className="bg-white text-black px-10 py-4 rounded font-bold transition-all duration-300 hover:bg-zinc-100 hover:scale-105 active:scale-[0.98] uppercase tracking-widest border border-transparent"
      >
        Return to Neutral Zone
      </button>
    </div>
  );
};
