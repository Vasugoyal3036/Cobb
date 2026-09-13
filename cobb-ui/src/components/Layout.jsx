import React, { useState } from 'react';
import SetupWizardModal from './SetupWizardModal';
import {
  LineChart,
  MessageCircle,
  Users,
  AlertCircle,
  MessageSquare,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Package,
  Terminal,
  Play,
  Square,
  Radio,
  Clock,
  Archive,
  Send,
  ChevronDown,
  ChevronUp,
  Layers,
  Tag,
  Calendar,
  BarChart3,
  Search,
  X,
  UserCheck,
  ShoppingBag,
  Sparkles,
  Wand2,
  TrendingDown,
  Activity,
  Megaphone,
  Target,
  Zap,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Star,
  Sun,
  Moon,
  Shirt,
  Scissors,
  Calculator,
  Database,
  FileText,
  Grid,
  DollarSign,
  CheckCircle2,
  Menu,
  Barcode,
  Scan,
  Flame,
  Award,
  Trophy,
  RotateCcw,
  Map,
  Crown,
  ThumbsUp,
  Upload,
  Camera,
  Percent,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
  Wallet,
  AlarmClock,
  Network,
  Music
} from 'lucide-react';

import FloatingCopilot from './FloatingCopilot';

const navigationItems = [
  {
    category: "AI & Intelligence", items: [
      { id: "copilot", label: "Cobb AI Copilot", icon: Sparkles, colorClass: "text-blue-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-blue-500/15 text-blue-400 font-bold border-l-2 border-blue-500" },
    ]
  },
  {
    category: "Overview & P&L", items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "pnl", label: "Store P&L Statement", icon: DollarSign, colorClass: "text-green-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-green-500/15 text-green-400 font-bold border-l-2 border-green-500" },
      { id: "gst", label: "GST & Tax Summary", icon: FileText, colorClass: "text-emerald-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-500" },
      { id: "analytics", label: "Visual Rush Chart", icon: Clock },
      { id: "monthly", label: "Monthly Products", icon: Calendar },
    ]
  },

  {
    category: "Operations", items: [
      { id: "live", label: "Live Checkouts", icon: Receipt },
      { id: "pocket_khata", label: "Pocket Khata (Expenses)", icon: Wallet, colorClass: "text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "hold_desk", label: "Hold & Reserve Desk", icon: AlarmClock, colorClass: "text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "save_the_sale", label: "Save-The-Sale Network", icon: Network, colorClass: "text-emerald-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-500" },
      { id: "lounge_radio", label: "Lounge Radio & PA", icon: Music, colorClass: "text-purple-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-purple-500/15 text-purple-400 font-bold border-l-2 border-purple-500" },
      { id: "returns", label: "Product Exchanges", icon: RotateCcw, colorClass: "text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "topmovers", label: "Top Movers & Size Demand", icon: Flame, colorClass: "text-rose-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-rose-500/15 text-rose-400 font-bold border-l-2 border-rose-500" },
      { id: "sizematrix", label: "Size Matrix Heatmap", icon: Grid, colorClass: "text-blue-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-blue-500/15 text-blue-400 font-bold border-l-2 border-blue-500" },
      { id: "deadstock", label: "Inventory", icon: Package },
      { id: "reorder", label: "Warehouse Reorder", icon: ClipboardList, colorClass: "text-blue-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-blue-500/15 text-blue-400 font-bold border-l-2 border-blue-500" },
      { id: "denomination", label: "Night Closing", icon: Wallet, colorClass: "text-emerald-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-500" },
      { id: "vm_auditor", label: "VM Auditor", icon: Camera, colorClass: "text-purple-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-purple-500/15 text-purple-400 font-bold border-l-2 border-purple-500" },
      { id: "smart_bundles", label: "Smart Bundling", icon: Percent, colorClass: "text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "trend_forecast", label: "Trend Forecaster", icon: LineChart, colorClass: "text-indigo-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-indigo-500/15 text-indigo-400 font-bold border-l-2 border-indigo-500" },
      { id: "competitor_intel", label: "Competitor Intel", icon: Target, colorClass: "text-red-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-red-500/15 text-red-400 font-bold border-l-2 border-red-500" },
    ]
  },
  {
    category: "Marketing & CRM", items: [
      { id: "shelf_talkers", label: "Shelf Talker Studio", icon: Tag, colorClass: "text-purple-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-purple-500/15 text-purple-400 font-bold border-l-2 border-purple-500" },
      { id: "loyalty", label: "Loyalty & Points", icon: Crown, colorClass: "text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "broadcast", label: "Mass Offer Broadcast", icon: Send, colorClass: "text-emerald-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-500" },
      { id: "wardrobe", label: "Wardrobe Profiler", icon: Shirt, colorClass: "text-purple-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-purple-500/15 text-purple-400 font-bold border-l-2 border-purple-500" },
      { id: "retention", label: "Retention Radar", icon: Activity, colorClass: "text-rose-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-rose-500/15 text-rose-400 font-bold border-l-2 border-rose-500" },
      { id: "campaigns", label: "AI Campaigns", icon: Megaphone, colorClass: "text-indigo-400 hover:bg-slate-900 hover:text-indigo-300", activeColorClass: "bg-indigo-500/15 text-indigo-400 font-bold border-l-2 border-indigo-500" },
      { id: "vip", label: "VIP Profiles", icon: Users },
      { id: "dormant", label: "Dormant Clients", icon: AlertCircle },
    ]
  },
  {
    category: "System", items: [
      { id: "automation", label: "Automation Engine", icon: Terminal },
    ]
  }
];

import { useAuth, AVAILABLE_STORES } from '../context/AuthContext';
import {
  Building2,
  Store,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

const Layout = ({
  children,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  handleGlobalSearch,
  setShowReconModal,
  handleGenerateEodReport,
  darkMode,
  setDarkMode,
  isGatewayRunning,
  isListenerRunning,
  userRole: propUserRole,
  API_BASE
}) => {

  const { role: contextRole, switchRole, activeStore, switchStore, user } = useAuth();
  const currentRole = contextRole || propUserRole || 'owner';
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Filter navigation items based on role (RBAC)
  // Store Manager only sees operational counter tools; hides P&L, GST, Automation, Broadcast, Competitor Intel
  const managerAllowedItems = [
    'dashboard',
    'live',
    'pocket_khata',
    'hold_desk',
    'save_the_sale',
    'lounge_radio',
    'shelf_talkers',
    'returns',
    'topmovers',
    'sizematrix',
    'deadstock',
    'reorder',
    'denomination',
    'loyalty',
    'vip',
    'dormant',
    'copilot'
  ];

  
  const filteredNavigation = navigationItems.map(cat => {
    return {
      ...cat,
      items: cat.items.filter(item => {
        if (currentRole === 'owner') return true;
        return managerAllowedItems.includes(item.id);
      })
    };
  }).filter(cat => cat.items.length > 0);

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-950 text-slate-300 flex flex-col shadow-xl z-40 border-r border-slate-800 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <h1 className="text-xl font-bold tracking-wider text-white">COBB ITALY</h1>
            </div>
            <p className="text-slate-500 text-xs font-medium ml-11">Smart Retail ERP</p>
            <div className="mt-2.5 ml-11 flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wide">
                {AVAILABLE_STORES.find(s => s.id === activeStore)?.shortName || 'Pundri'}
              </span>
              <span className={`px-2 py-0.5 text-[9px] font-black rounded-md border uppercase tracking-wide ${
                currentRole === 'owner' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {currentRole === 'owner' ? '👑 Owner' : '👔 Manager'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-4 mt-6 overflow-y-auto custom-scrollbar">
          {filteredNavigation.map((cat, catIdx) => (
            <div key={catIdx} className="space-y-1">
              <p className="px-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">{cat.category}</p>
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                const normalColor = item.colorClass || "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200";
                const activeColor = item.activeColorClass || "bg-blue-600/15 text-blue-400 font-semibold border-l-2 border-blue-500";

                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSearchQuery(''); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer relative group text-xs ${isActive ? activeColor : normalColor}`}
                  >
                    <Icon className={`w-4 h-4 mr-3 transition-colors ${isActive ? "" : "opacity-60 group-hover:opacity-100"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <div className="pb-8"></div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-auto relative min-w-0 pb-20 lg:pb-0 transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>

        {/* Top Navbar */}
        <header className={`backdrop-blur-md px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 border-b sticky top-0 z-30 transition-colors ${darkMode ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-800'}`}>

          {/* MOBILE PHONE HEADER (md:hidden) — Clean single row */}
          <div className="flex md:hidden items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                title="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm">
                  C
                </div>
                <span className="font-extrabold text-xs tracking-wider uppercase">COBB</span>
              </div>
            </div>

            {/* Quick Actions on Mobile Top Bar */}
            <div className="flex items-center gap-1.5">
              {/* Prominent Cobb AI button right in the top bar */}
              <button
                type="button"
                onClick={() => { setActiveTab('copilot'); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-black transition-all shadow-xs cursor-pointer border ${
                  activeTab === 'copilot'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-blue-500/25'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                }`}
                title="Open Cobb AI Assistant"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 animate-pulse" />
                <span>✨ Cobb AI</span>
              </button>

              {/* Compact Store Switcher */}
              <div className={`flex items-center p-1 rounded-xl border shrink-0 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <select
                  value={activeStore}
                  onChange={(e) => switchStore(e.target.value)}
                  className={`bg-transparent text-[10px] font-bold rounded py-0.5 px-0.5 focus:outline-none cursor-pointer ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
                >
                  {AVAILABLE_STORES.map(store => (
                    <option key={store.id} value={store.id} className={darkMode ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}>
                      {store.shortName || store.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dark mode button */}
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className={`p-1.5 rounded-xl border shrink-0 cursor-pointer ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
              </button>
            </div>
          </div>

          {/* DESKTOP HEADER (hidden md:flex) */}
          <div className="hidden md:flex flex-row justify-between items-center gap-4 w-full">
            <div className="flex items-center gap-3 w-full sm:max-w-lg">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search Article / Phone / Name / Amount..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleGlobalSearch}
                  className={`w-full pl-9 pr-28 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner border ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:bg-slate-900' : 'bg-slate-100 border-transparent text-slate-800 focus:bg-white'}`}
                />
                <div className={`absolute right-2 top-1.5 hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg border shadow-xs pointer-events-none ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <Barcode className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Scanner Ready</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              {/* Desktop Prominent AI Copilot Shortcut */}
              <button
                type="button"
                onClick={() => setActiveTab('copilot')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                  activeTab === 'copilot'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
                    : darkMode
                      ? 'bg-blue-950/60 text-blue-300 border-blue-800/60 hover:bg-blue-900/60'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
                title="Open Cobb AI Assistant"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>Cobb AI</span>
              </button>

              {/* Multi-Store Switcher */}
              <div className={`flex items-center gap-1.5 p-1 rounded-xl border shrink-0 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                <Store className="w-3.5 h-3.5 text-blue-500 ml-1.5 shrink-0" />
                <select
                  value={activeStore}
                  onChange={(e) => switchStore(e.target.value)}
                  className={`bg-transparent text-xs font-bold rounded-lg py-0.5 pr-2 focus:outline-none cursor-pointer ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
                  title="Switch Cobb Store Branch"
                >
                  {AVAILABLE_STORES.map(store => (
                    <option key={store.id} value={store.id} className={darkMode ? "bg-slate-900 text-slate-200 py-1" : "bg-white text-slate-800 py-1"}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Role Switcher Pill */}
              <button
                type="button"
                onClick={() => {
                  const nextRole = currentRole === 'owner' ? 'manager' : 'owner';
                  switchRole(nextRole);
                }}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                  currentRole === 'owner'
                    ? darkMode
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : darkMode
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
                title={currentRole === 'owner' ? 'Click to preview Manager View' : 'Click to return to Owner View'}
              >
                {currentRole === 'owner' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>👑 Owner</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                    <span>👔 Manager</span>
                  </>
                )}
              </button>

              {/* EOD Cash Reconciliation Button */}
              <button
                type="button"
                onClick={() => setShowReconModal(true)}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1 shrink-0"
                title="EOD Cash Register Reconciliation"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>EOD Cash</span>
              </button>

              {/* EOD WhatsApp Report Button */}
              <button
                type="button"
                onClick={handleGenerateEodReport}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1 shrink-0"
                title="Generate Daily EOD Report for Owner"
              >
                <Send className="w-3.5 h-3.5" />
                <span>EOD Report</span>
              </button>

              {/* Database & Store Setup Button */}
              <button
                type="button"
                onClick={() => setShowSetupModal(true)}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  darkMode
                    ? 'bg-blue-950/60 text-blue-300 hover:bg-blue-900/60 border-blue-800/60'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                }`}
                title="Configure Database, Presets & Store Profile"
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>POS Setup</span>
              </button>

              {/* Dark Mode Toggle Button */}
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className={`p-1.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center shrink-0 border ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400'
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600'
                }`}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Systems status badge */}
              <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border shadow-sm cursor-help shrink-0 ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`} title="Automation Engine Status">
                <div className="relative flex h-2 w-2">
                  {(isGatewayRunning && isListenerRunning) && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isGatewayRunning && isListenerRunning ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  {isGatewayRunning && isListenerRunning ? 'Active' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className={activeTab === 'copilot' ? 'p-0 sm:p-6 lg:p-8 max-w-7xl mx-auto' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'}>

          {children}
        </div>
      </div>

      {/* Multi-Store & Database Setup Wizard */}
      <SetupWizardModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onConfigSaved={() => {
          setShowSetupModal(false);
          window.location.reload();
        }}
      />

      {/* Global Floating AI Copilot Drawer */}
      <FloatingCopilot
        API_BASE={API_BASE || 'http://localhost:5000'}
        darkMode={darkMode}
        activeTab={activeTab}
        onOpenFullTab={() => setActiveTab('copilot')}
      />

    </>
  );
};

export default Layout;
