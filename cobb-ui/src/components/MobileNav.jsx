import React from 'react';
import { LayoutDashboard, Search, BellRing, Package, Receipt, Sparkles, User } from 'lucide-react';

export default function MobileNav({ activeTab, setActiveTab, setShowCommandBar, setShowActionCenter, darkMode }) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'live', label: 'Bills', icon: Receipt },
    { id: 'search', label: 'Search', icon: Search, isAction: true, onClick: () => setShowCommandBar(true) },
    { id: 'copilot', label: 'AI', icon: Sparkles, highlight: true },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-[60] border-t backdrop-blur-xl ${
      darkMode ? 'bg-[#0f1115]/90 border-white/10 text-slate-400' : 'bg-white/90 border-slate-200 text-slate-500'
    }`}>
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                  darkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[9px] font-semibold">{item.label}</span>
              </button>
            );
          }

          if (item.highlight) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center p-2 -mt-4 transition-all group`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 ${
                  isActive 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400 text-white shadow-purple-500/40' 
                    : darkMode 
                      ? 'bg-purple-900/50 border-purple-800 text-purple-300 shadow-purple-900/30 group-hover:bg-purple-800' 
                      : 'bg-purple-100 border-purple-200 text-purple-700 shadow-purple-200/50 group-hover:bg-purple-200'
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                </div>
                <span className={`text-[9px] font-bold mt-1 ${isActive ? (darkMode ? 'text-purple-400' : 'text-purple-700') : ''}`}>{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                isActive 
                  ? darkMode ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold'
                  : darkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className={`relative ${isActive ? (darkMode ? 'bg-blue-500/20' : 'bg-blue-50') : ''} p-1.5 rounded-lg mb-0.5`}>
                <Icon className="w-5 h-5" />
                {isActive && <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-600'}`} />}
              </div>
              <span className="text-[9px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
