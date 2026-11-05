import React, { useState } from 'react';
import {
  Zap,
  AlarmClock,
  RotateCcw,
  Scissors,
  Banknote,
  Tag,
  ShieldAlert,
  Package,
  ClipboardList,
  Wallet,
  Users,
  Crown,
  Receipt,
  DollarSign,
  Trophy,
  Calculator,
  Sun,
  Moon,
  Palette,
  LayoutGrid,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  Home
} from 'lucide-react';

export const WORKSPACES = [
  {
    id: 'summary',
    label: 'Summary',
    icon: Home,
    defaultTab: 'dashboard'
  },
  {
    id: 'billing',
    label: 'Billing & Counter',
    icon: Zap,
    defaultTab: 'speed_billing',
    tools: [
      { id: 'speed_billing', label: 'Speed POS', subLabel: 'F1', icon: Zap },
      { id: 'hold_desk', label: 'Hold Bills', icon: AlarmClock },
      { id: 'returns', label: 'Exchanges', icon: RotateCcw },
      { id: 'alterations', label: 'Alterations', icon: Scissors },
      { id: 'denomination', label: 'Cash Drawer', icon: Banknote }
    ]
  },
  {
    id: 'stock',
    label: 'Stock & Tags',
    icon: Tag,
    defaultTab: 'pending_tags',
    tools: [
      { id: 'pending_tags', label: 'B1G2 Tags', icon: Tag },
      { id: 'defect_bin', label: 'Damaged Bin', icon: ShieldAlert, targetTab: 'pending_tags', subDesk: 'damages' },
      { id: 'inventory', label: 'Stock Lookup', icon: Package },
      { id: 'reorder', label: 'Reorders', icon: ClipboardList }
    ]
  },
  {
    id: 'customers',
    label: 'Customers & Khata',
    icon: Users,
    defaultTab: 'pocket_khata',
    tools: [
      { id: 'pocket_khata', label: 'Customer Udhar', icon: Wallet },
      { id: 'customerinsights', label: 'Customer Directory', icon: Users },
      { id: 'loyalty', label: 'Loyalty & VIP', icon: Crown }
    ]
  },
  {
    id: 'reports',
    label: 'Store Reports',
    icon: DollarSign,
    defaultTab: 'live',
    tools: [
      { id: 'live', label: "Today's Bills", icon: Receipt },
      { id: 'pnl', label: 'Monthly P&L', icon: DollarSign },
      { id: 'staff_leaderboard', label: 'Staff Incentives', icon: Trophy },
      { id: 'day_close', label: 'Day Close (EOD)', icon: Calculator, isAction: true }
    ]
  }
];

export function getWorkspaceForTab(tabId, subDesk = null) {
  if (['dashboard', 'summary'].includes(tabId)) return 'summary';
  if (['speed_billing', 'hold_desk', 'returns', 'exchanges', 'alterations', 'denomination'].includes(tabId)) return 'billing';
  if (['pending_tags', 'deadstock', 'inventory', 'reorder', 'transit', 'ibt', 'defect_bin'].includes(tabId)) return 'stock';
  if (['pocket_khata', 'customerinsights', 'vip', 'dormant', 'loyalty', 'ratings', 'broadcast'].includes(tabId)) return 'customers';
  if (['live', 'livebills', 'pnl', 'gst', 'analytics', 'monthly', 'staff_leaderboard', 'automation', 'automationengine', 'day_close'].includes(tabId)) return 'reports';
  return 'summary';
}

export default function WorkspaceHeader({
  activeTab,
  onSelectTab,
  darkMode,
  setDarkMode,
  dashTheme,
  setDashTheme,
  simplifiedMode,
  setSimplifiedMode,
  onDayClose,
  activeStoreName = 'Goyal - House Of Fashion',
  currentRole = 'owner',
  onSwitchSubDesk
}) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const activeWorkspaceId = getWorkspaceForTab(activeTab);
  const currentWorkspace = WORKSPACES.find(w => w.id === activeWorkspaceId) || WORKSPACES[0];

  const handleWorkspaceClick = (ws) => {
    if (ws.id === 'summary') {
      onSelectTab('dashboard');
    } else {
      onSelectTab(ws.defaultTab);
    }
  };

  const handleToolClick = (tool) => {
    if (tool.isAction && tool.id === 'day_close') {
      if (typeof onDayClose === 'function') onDayClose();
      return;
    }
    if (tool.targetTab) {
      if (tool.subDesk && typeof onSwitchSubDesk === 'function') {
        onSwitchSubDesk(tool.subDesk);
      }
      onSelectTab(tool.targetTab);
    } else {
      onSelectTab(tool.id);
    }
  };

  const THEME_OPTIONS = [
    { key: 'modern', label: 'Modern Retail', icon: '⚡', desc: 'Crisp & Fast' },
    { key: 'paper', label: 'Paper / Linen', icon: '📜', desc: 'Warm Ivory' },
    { key: 'contrast', label: 'High Contrast', icon: '🔳', desc: 'Sharp B&W' }
  ];

  return (
    <header className={`sticky top-0 z-30 transition-all border-b backdrop-blur-xl ${
      darkMode
        ? 'bg-[#0d111a]/95 border-white/[0.08] text-white shadow-md'
        : 'bg-white/95 border-slate-200 text-slate-900 shadow-xs'
    }`}>
      {/* Top Workspace Navigation Row */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        {/* Left: Workspaces Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {WORKSPACES.map((ws) => {
            const Icon = ws.icon;
            const isActive = activeWorkspaceId === ws.id;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => handleWorkspaceClick(ws)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer select-none active:scale-95 whitespace-nowrap ${
                  isActive
                    ? (darkMode
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                        : 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-700')
                    : (darkMode
                        ? 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-transparent'
                        : 'bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200 border border-slate-200/60')
                }`}
                title={ws.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : (darkMode ? 'text-blue-400' : 'text-blue-600')}`} />
                <span>{ws.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Theme Selector, Mode Toggle, Dark Mode */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowThemeMenu(p => !p)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                darkMode
                  ? 'bg-white/[0.05] border-white/10 text-slate-200 hover:bg-white/10'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Switch Visual Theme"
            >
              <Palette className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline capitalize">{dashTheme || 'modern'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showThemeMenu && (
              <div className={`absolute right-0 mt-1.5 w-48 rounded-2xl p-1.5 shadow-2xl border z-50 animate-in fade-in zoom-in-95 ${
                darkMode ? 'bg-[#121622] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Readability Mode
                </div>
                {THEME_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (typeof setDashTheme === 'function') setDashTheme(opt.key);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      dashTheme === opt.key
                        ? (darkMode ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200')
                        : (darkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-700')
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </div>
                    <span className="text-[10px] opacity-60 font-normal">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Classic / Simplified Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              if (typeof setSimplifiedMode === 'function') {
                setSimplifiedMode(prev => !prev);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer active:scale-95 border ${
              simplifiedMode
                ? (darkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
                : (darkMode ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800')
            }`}
            title="Toggle between Simplified Workspace View and Classic 25-Tab Sidebar"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{simplifiedMode ? 'Simplified' : 'Classic'}</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
              darkMode ? 'bg-white/[0.05] border-white/10 text-amber-400 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Toggle Dark / Light Mode"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Sub-Tools Pill Bar (Rendered for Workspaces with Sub-Tools) */}
      {currentWorkspace?.tools && currentWorkspace.tools.length > 0 && (
        <div className={`px-4 py-2 border-t flex items-center gap-2 overflow-x-auto no-scrollbar ${
          darkMode ? 'bg-black/20 border-white/[0.04]' : 'bg-slate-50/70 border-slate-100'
        }`}>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
            {currentWorkspace.label}:
          </span>
          {currentWorkspace.tools.map((tool) => {
            const Icon = tool.icon;
            const isToolActive = activeTab === (tool.targetTab || tool.id);
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolClick(tool)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95 whitespace-nowrap border ${
                  isToolActive
                    ? (darkMode
                        ? 'bg-white/15 text-white border-white/25 shadow-sm'
                        : 'bg-white text-slate-900 border-slate-300 shadow-xs')
                    : (darkMode
                        ? 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                        : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/50')
                }`}
                title={tool.label}
              >
                <Icon className={`w-3.5 h-3.5 ${isToolActive ? (darkMode ? 'text-amber-400' : 'text-blue-600') : 'text-slate-400'}`} />
                <span>{tool.label}</span>
                {tool.subLabel && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-mono font-black bg-blue-500/20 text-blue-400 border border-blue-400/30">
                    {tool.subLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
