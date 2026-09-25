import React from 'react';
import { ShieldCheck, Database, Layers } from 'lucide-react';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 bg-white sticky top-0 z-20">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a 
          href="/" 
          onClick={(e) => { e.preventDefault(); setActiveTab('overview'); }}
          className="text-lg font-semibold tracking-tight text-zinc-950 hover:text-zinc-800 transition-colors"
        >
          QuickServe Admin
        </a>
        <span className="text-xs text-zinc-400 font-mono">v1.0-phase1</span>
      </div>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
        <button
          onClick={() => setActiveTab('overview')}
          className={`hover:text-zinc-950 transition-colors ${activeTab === 'overview' ? 'text-zinc-950 border-b-2 border-zinc-950 pb-0.5' : ''}`}
        >
          Architecture
        </button>
        <button
          onClick={() => setActiveTab('auth')}
          className={`hover:text-zinc-950 transition-colors ${activeTab === 'auth' ? 'text-zinc-950 border-b-2 border-zinc-950 pb-0.5' : ''}`}
        >
          Authentication
        </button>
        <button
          onClick={() => setActiveTab('rls')}
          className={`hover:text-zinc-950 transition-colors ${activeTab === 'rls' ? 'text-zinc-950 border-b-2 border-zinc-950 pb-0.5' : ''}`}
        >
          RLS & Security
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`hover:text-zinc-950 transition-colors ${activeTab === 'database' ? 'text-zinc-950 border-b-2 border-zinc-950 pb-0.5' : ''}`}
        >
          Database Contracts
        </button>
        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`hover:text-zinc-950 transition-colors ${activeTab === 'lifecycle' ? 'text-zinc-950 border-b-2 border-zinc-950 pb-0.5' : ''}`}
        >
          State Machine
        </button>
        <button
          onClick={() => setActiveTab('monorepo')}
          className={`hover:text-zinc-950 transition-colors ${activeTab === 'monorepo' ? 'text-zinc-950 border-b-2 border-zinc-950 pb-0.5' : ''}`}
        >
          Monorepo Tree
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>RLS & RBAC Planned</span>
        </div>
      </div>
    </header>
  );
};
