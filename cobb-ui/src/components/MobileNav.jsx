import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Search,
  Trophy,
  Menu,
  Zap
} from 'lucide-react';

export default function MobileNav({
  activeTab,
  setActiveTab,
  setShowCommandBar,
  setShowActionCenter,
  setIsMobileMenuOpen,
  darkMode
}) {
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
    <nav
      role="navigation"
      aria-label="Mobile Navigation"
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-[60] border-t backdrop-blur-2xl select-none transition-colors duration-200 ${
        darkMode
          ? 'bg-[#0a0d16]/92 border-white/10 text-slate-400 shadow-[0_-8px_30px_rgba(0,0,0,0.7)]'
          : 'bg-white/92 border-slate-200/90 text-slate-500 shadow-[0_-8px_25px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className="flex items-center justify-around px-3 pt-1.5 pb-safe">
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
                className="relative -mt-6 flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
                title="Universal Search (Ctrl+K)"
              >
                <div className="relative">
                  {/* Ambient Glow Ring */}
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-60 blur-sm group-hover:opacity-100 transition-opacity animate-pulse" />
                  
                  {/* Elevated Button Tile */}
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 border border-white/30 transform active:scale-90 transition-transform duration-150">
                    <Icon className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </div>
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-300 mt-1 tracking-tight">
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
                className={`relative p-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? darkMode
                      ? 'bg-white/10 text-blue-400'
                      : 'bg-blue-50 text-blue-600'
                    : ''
                }`}
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span
                    className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                      darkMode ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' : 'bg-blue-600'
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
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
  );
}
