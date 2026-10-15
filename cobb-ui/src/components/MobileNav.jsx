import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Search,
  Trophy,
  Menu,
  Zap,
  Wallet,
  Scissors,
  FileText,
  LineChart,
  Calculator,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

export default function MobileNav({
  activeTab,
  setActiveTab,
  setShowCommandBar,
  setShowActionCenter,
  setIsMobileMenuOpen,
  handleGenerateEodReport,
  setShowReconModal,
  darkMode
}) {
  const [showQuickDock, setShowQuickDock] = useState(true);

  const quickActions = [
    {
      id: 'speed_billing',
      label: 'Speed Bill',
      icon: Zap,
      color: 'emerald',
      onClick: () => setActiveTab('speed_billing')
    },
    {
      id: 'pocket_khata',
      label: 'Pocket Khata',
      icon: Wallet,
      color: 'amber',
      onClick: () => setActiveTab('pocket_khata')
    },
    {
      id: 'alterations',
      label: 'Alterations',
      icon: Scissors,
      color: 'indigo',
      onClick: () => setActiveTab('alterations')
    },
    {
      id: 'eod',
      label: 'EOD Digest',
      icon: FileText,
      color: 'blue',
      onClick: () => {
        if (typeof handleGenerateEodReport === 'function') {
          handleGenerateEodReport();
        } else {
          window.dispatchEvent(new CustomEvent('cobb_open_eod'));
        }
      }
    },
    {
      id: 'breakeven',
      label: 'Breakeven',
      icon: LineChart,
      color: 'yellow',
      onClick: () => {
        if (activeTab !== 'dashboard') {
          setActiveTab('dashboard');
        }
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('cobb_open_breakeven_chart'));
          window.dispatchEvent(new CustomEvent('cobb_focus_breakeven'));
        }, 120);
      }
    },
    {
      id: 'cash_recon',
      label: 'Cash Recon',
      icon: Calculator,
      color: 'teal',
      onClick: () => {
        if (typeof setShowReconModal === 'function') {
          setShowReconModal(true);
        } else {
          window.dispatchEvent(new CustomEvent('cobb_open_recon'));
        }
      }
    }
  ];

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      onClick: () => setActiveTab('dashboard')
    },
    {
      id: 'live',
      label: 'Bills',
      icon: Receipt,
      onClick: () => setActiveTab('live')
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      isAction: true,
      highlight: true,
      onClick: () => setShowCommandBar(true)
    },
    {
      id: 'staff_leaderboard',
      label: 'Floor Race',
      icon: Trophy,
      onClick: () => setActiveTab('staff_leaderboard')
    },
    {
      id: 'menu',
      label: 'More',
      icon: Menu,
      isAction: true,
      onClick: () => {
        if (typeof setIsMobileMenuOpen === 'function') {
          setIsMobileMenuOpen(true);
        }
      }
    }
  ];

  return (
    <div
      role="navigation"
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] select-none pointer-events-none"
    >
      {/* ── Ergonomic Quick Action Capsule Strip ── */}
      <div className="pointer-events-auto px-2.5 pb-1 flex flex-col items-center">
        {/* Compact Toggle Handle */}
        <div className="flex items-center justify-between w-full max-w-md px-1 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className={`text-[9.5px] font-black uppercase tracking-wider ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Quick Shortcuts
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowQuickDock(prev => !prev)}
            className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer ${
              darkMode
                ? 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-400 hover:text-slate-200'
                : 'bg-slate-200/70 hover:bg-slate-300 text-slate-600'
            }`}
            title={showQuickDock ? "Hide Quick Dock" : "Show Quick Dock"}
          >
            <span>{showQuickDock ? 'Hide' : 'Show'}</span>
            {showQuickDock ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
          </button>
        </div>

        {/* Scrollable Action Capsule Bar */}
        {showQuickDock && (
          <div className={`w-full max-w-md py-1.5 px-2 rounded-2xl border backdrop-blur-2xl shadow-xl flex items-center gap-2 overflow-x-auto no-scrollbar transition-all duration-200 ${
            darkMode
              ? 'bg-[#0a0d16]/95 border-white/10 text-white shadow-black/60'
              : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-300/40'
          }`}>
            {quickActions.map(action => {
              const Icon = action.icon;
              const isActive = activeTab === action.id;

              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 shadow-xs ${
                    isActive
                      ? action.color === 'emerald'
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/30'
                        : action.color === 'amber'
                          ? 'bg-amber-600 text-white border-amber-400 shadow-amber-500/30'
                          : action.color === 'indigo'
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/30'
                            : action.color === 'blue'
                              ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/30'
                              : 'bg-teal-600 text-white border-teal-400 shadow-teal-500/30'
                      : darkMode
                        ? 'bg-white/[0.05] hover:bg-white/[0.09] text-slate-200 border-white/[0.08]'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${
                    isActive
                      ? 'text-white'
                      : action.color === 'emerald'
                        ? 'text-emerald-400'
                        : action.color === 'amber'
                          ? 'text-amber-400'
                          : action.color === 'indigo'
                            ? 'text-indigo-400'
                            : action.color === 'blue'
                              ? 'text-blue-400'
                              : 'text-amber-300'
                  }`} />
                  <span className="whitespace-nowrap">{action.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Primary 5-Tab Bottom Dock ── */}
      <nav
        className={`pointer-events-auto border-t backdrop-blur-2xl transition-colors duration-200 ${
          darkMode
            ? 'bg-[#0a0d16]/95 border-white/10 text-slate-400 shadow-[0_-8px_30px_rgba(0,0,0,0.7)]'
            : 'bg-white/95 border-slate-200/90 text-slate-500 shadow-[0_-8px_25px_rgba(0,0,0,0.06)]'
        }`}
      >
        <div className="flex items-center justify-around px-3 pt-1 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            // Raised Center Universal Action Orb (Spotlight Search)
            if (item.highlight) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="relative -mt-5 flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
                  title="Universal Search (Ctrl+K)"
                >
                  <div className="relative">
                    {/* Ambient Glow Ring */}
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-60 blur-sm group-hover:opacity-100 transition-opacity animate-pulse" />
                    
                    {/* Elevated Button Tile */}
                    <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 border border-white/30 transform active:scale-90 transition-transform duration-150">
                      <Icon className="w-5 h-5 text-white drop-shadow" />
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black text-indigo-500 dark:text-indigo-300 mt-0.5 tracking-tight">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`flex-1 py-1 flex flex-col items-center justify-center transition-all cursor-pointer focus:outline-none active:scale-92 ${
                  isActive
                    ? darkMode
                      ? 'text-white font-bold'
                      : 'text-slate-950 font-bold'
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div
                  className={`relative p-1 rounded-xl transition-all duration-200 ${
                    isActive
                      ? darkMode
                        ? 'bg-white/10 text-blue-400'
                        : 'bg-blue-50 text-blue-600'
                      : ''
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {isActive && (
                    <span
                      className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                        darkMode ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' : 'bg-blue-600'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`text-[9.5px] mt-0.5 tracking-tight ${
                    isActive ? 'font-black' : 'font-semibold'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
