import React from 'react';
import { Cpu, Database, ShieldCheck, CreditCard, Layout } from 'lucide-react';
import { Capability } from '../types';

interface CapabilityCardProps {
  capability: Capability;
  key?: React.Key;
}

export const CapabilityCard = ({ capability }: CapabilityCardProps) => {
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
