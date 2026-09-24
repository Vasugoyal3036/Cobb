import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SetupWizardModal from './SetupWizardModal';
import SystemHealthModal from './SystemHealthModal';
import PwaInstallBanner from './PwaInstallBanner';
import {
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
  MoreHorizontal,
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
  Percent,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
  Wallet,
  AlarmClock,
  Network,
  Truck
} from 'lucide-react';
import { THEMES } from './DashboardBackground';

const navigationItems = [
  {
    category: "AI & Intelligence", items: [
      { id: "copilot", label: "✨ Cobb AI Copilot", icon: Sparkles, colorClass: "text-purple-600 dark:text-purple-400 hover:bg-purple-950/40 hover:text-white font-semibold", activeColorClass: "bg-gradient-to-r from-purple-600/30 via-indigo-600/20 to-transparent text-purple-700 dark:text-purple-200 font-bold border-l-3 border-purple-500 shadow-md shadow-purple-500/20" },
    ]
  },
  {
    category: "Overview & P&L", items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "multistore", label: "Multi-Store Matrix", icon: Network, colorClass: "text-blue-600 dark:text-blue-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border-l-2 border-blue-500" },
      { id: "pnl", label: "Sales & P&L Statement", icon: DollarSign, colorClass: "text-green-600 dark:text-green-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-green-500/15 text-green-600 dark:text-green-400 font-bold border-l-2 border-green-500" },
      { id: "gst", label: "GST & Tax Summary", icon: FileText, colorClass: "text-emerald-600 dark:text-emerald-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border-l-2 border-emerald-500" },
      { id: "analytics", label: "Visual Rush Chart", icon: Clock },
      { id: "monthly", label: "Monthly Products", icon: Calendar },
    ]
  },

  {
    category: "Operations", items: [
      { id: "live", label: "Transactions & Bills", icon: Receipt, colorClass: "text-blue-600 dark:text-blue-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border-l-2 border-blue-500" },
      { id: "pocket_khata", label: "Pocket Khata (Expenses)", icon: Wallet, colorClass: "text-amber-600 dark:text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "hold_desk", label: "Hold & Reserve Desk", icon: AlarmClock, colorClass: "text-amber-600 dark:text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "save_the_sale", label: "Save-The-Sale Network", icon: Network, colorClass: "text-emerald-600 dark:text-emerald-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border-l-2 border-emerald-500" },
      { id: "returns", label: "Product Exchanges", icon: RotateCcw, colorClass: "text-amber-600 dark:text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "alterations", label: "Alteration Desk", icon: Scissors, colorClass: "text-indigo-600 dark:text-indigo-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border-l-2 border-indigo-500" },
      { id: "topmovers", label: "Top Movers & Size Demand", icon: Flame, colorClass: "text-rose-600 dark:text-rose-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border-l-2 border-rose-500" },
      { id: "sizematrix", label: "Size Matrix Heatmap", icon: Grid, colorClass: "text-blue-600 dark:text-blue-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border-l-2 border-blue-500" },
      { id: "transit", label: "Goods In Transit", icon: Truck, colorClass: "text-orange-600 dark:text-orange-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border-l-2 border-orange-500" },
      { id: "deadstock", label: "Inventory", icon: Package },
      { id: "reorder", label: "Warehouse Reorder", icon: ClipboardList, colorClass: "text-blue-600 dark:text-blue-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border-l-2 border-blue-500" },
      { id: "smart_bundles", label: "Smart Bundling", icon: Percent, colorClass: "text-amber-600 dark:text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "competitor_intel", label: "Competitor Intel", icon: Target, colorClass: "text-red-600 dark:text-red-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-red-500/15 text-red-600 dark:text-red-400 font-bold border-l-2 border-red-500" },
    ]
  },
  {
    category: "Marketing & CRM", items: [
      { id: "loyalty", label: "Loyalty & Points", icon: Crown, colorClass: "text-amber-600 dark:text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "broadcast", label: "Mass Offer Broadcast", icon: Send, colorClass: "text-emerald-600 dark:text-emerald-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border-l-2 border-emerald-500" },
      { id: "wardrobe", label: "Wardrobe Profiler", icon: Shirt, colorClass: "text-purple-600 dark:text-purple-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold border-l-2 border-purple-500" },
      { id: "retention", label: "Retention Radar", icon: Activity, colorClass: "text-rose-600 dark:text-rose-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border-l-2 border-rose-500" },
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
  dashTheme,
  setDashTheme,
  isGatewayRunning,
  isListenerRunning,
  userRole: propUserRole,
  API_BASE
}) => {

  const { role: contextRole, switchRole, activeStore, switchStore, user } = useAuth();
  const currentRole = contextRole || propUserRole || 'owner';
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [healthStatus, setHealthStatus] = useState({ overall: 'healthy', inboundAlertsCount: 0 });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/system/health`);
        setHealthStatus(res.data || { overall: 'healthy' });
      } catch (e) {
        setHealthStatus({ overall: 'attention_required', inboundAlertsCount: 0 });
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  // Filter navigation items based on role (RBAC)
  // Store Manager only sees operational counter tools; hides P&L, GST, Automation, Broadcast, Competitor Intel
  const managerAllowedItems = [
    'dashboard',
    'live',
    'pocket_khata',
    'hold_desk',
    'save_the_sale',
    'returns',
    'topmovers',
    'sizematrix',
    'deadstock',
    'reorder',
    'loyalty',
    'vip',
    'dormant',
    'copilot',
    'multistore',
    'transit'
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

      {/* Sidebar Navigation - Glassmorphism Floating Theme */}
      <div className={`fixed lg:static inset-y-0 left-0 w-64 lg:m-4 lg:h-[calc(100vh-32px)] lg:rounded-[2rem] flex flex-col z-40 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${darkMode ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]' : 'bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}>
        <div className={`p-6 flex justify-between items-center`}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${darkMode ? 'bg-black border-white/20' : 'bg-white border-slate-200 shadow-sm'}`}>
                <span className={`font-black text-xs tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>X</span>
              </div>
              <h1 className={`text-xl font-black tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>COBB</h1>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className={`lg:hidden p-1 rounded-full ${darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-4 mt-6 overflow-y-auto custom-scrollbar">
          {filteredNavigation.map((cat, catIdx) => (
            <div key={catIdx} className="space-y-1">
              <p className={`px-4 text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{cat.category}</p>
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                const baseColorText = item.colorClass ? item.colorClass.split(' ')[0] : (darkMode ? 'text-blue-400' : 'text-blue-600');
                const baseColorBg = baseColorText.replace('text-', 'bg-').replace('-400', '-500/15').replace('-600', '-500/15').replace('-500', '-500/15');

                const normalColor = darkMode
                  ? "text-slate-400 hover:bg-white/[0.08] hover:text-white rounded-full font-medium"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 rounded-full font-medium";

                const activeColor = darkMode
                  ? `${baseColorBg} ${baseColorText} font-bold rounded-full shadow-[inset_0_0_12px_rgba(255,255,255,0.05)] border border-white/[0.05]`
                  : `${baseColorBg.replace('/15', '/10')} ${baseColorText.replace('-400', '-700')} font-bold rounded-full border border-black/5 shadow-sm`;

                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSearchQuery(''); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center px-4 py-2.5 transition-all duration-200 cursor-pointer relative group text-[13px] ${isActive ? activeColor : normalColor}`}
                  >
                    <Icon className={`w-[18px] h-[18px] mr-4 transition-colors shrink-0 ${isActive ? "" : `opacity-70 group-hover:opacity-100 ${baseColorText}`}`} />
                    <span className="truncate tracking-wide">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <div className="pb-4"></div>
        </nav>

        {/* Bottom Post Button, Theme Picker & Profile (X Style) */}
        <div className="mt-auto p-4 space-y-3">
          <button className={`w-full py-3.5 rounded-full font-black text-sm tracking-wide shadow-lg transition-transform hover:scale-[1.02] active:scale-95 ${darkMode ? 'bg-white text-black shadow-white/10' : 'bg-[#0f1419] text-white shadow-black/10'}`}>
            Post Update
          </button>

          {/* Theme Picker */}
          {darkMode && (
            <div className="relative">
              <button
                onClick={() => setShowThemePicker(p => !p)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${showThemePicker ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'}`}
              >
                <span className="text-base">🎨</span>
                <span>Dashboard Theme</span>
                <span className="ml-auto text-[10px] opacity-60">({THEMES.find(t => t.key === dashTheme)?.label || 'Custom'})</span>
              </button>

              {showThemePicker && (
                <div className={`absolute bottom-10 left-0 right-0 rounded-2xl p-3 z-50 border shadow-2xl space-y-1.5 ${
                  darkMode ? 'bg-[#111318] border-white/10 shadow-black/60' : 'bg-white border-slate-200'
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">Choose Theme</p>
                  {THEMES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => { setDashTheme(t.key); setShowThemePicker(false); }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                        dashTheme === t.key
                          ? 'bg-white/10 text-white ring-1 ring-white/20'
                          : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full shrink-0 border border-white/10"
                        style={{ background: `linear-gradient(135deg, ${t.color}, ${t.accent})` }}
                      />
                      {t.label}
                      {dashTheme === t.key && <span className="ml-auto text-[10px] text-white/50">✓ Active</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className={`flex items-center gap-3 p-2.5 rounded-full cursor-pointer transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-200/50'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${darkMode ? 'bg-gradient-to-tr from-slate-800 to-slate-700 border-white/20' : 'bg-gradient-to-tr from-slate-200 to-slate-300 border-slate-300'}`}>
               <span className={`text-xs font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                 {currentRole === 'owner' ? 'OW' : 'MG'}
               </span>
            </div>
            <div className="flex-1 min-w-0">
               <p className={`text-sm font-bold truncate leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                 {currentRole === 'owner' ? 'Store Owner' : 'Store Manager'}
               </p>
               <p className={`text-xs truncate ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                 @cobb_{AVAILABLE_STORES.find(s => s.id === activeStore)?.shortName?.toLowerCase() || 'pundri'}
               </p>
            </div>
            <MoreHorizontal className={`w-5 h-5 shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-auto relative min-w-0 pb-20 lg:pb-0 transition-colors duration-200 lg:my-4 lg:mr-4 lg:rounded-[2rem] border ${darkMode ? 'bg-[#0f1115] border-white/[0.05] shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200/50 shadow-sm'}`}>

        {/* Top Navbar */}
        <header className={`backdrop-blur-md px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 border-b sticky top-0 z-30 transition-colors lg:rounded-t-[2rem] ${darkMode ? 'bg-[#0f1115]/80 border-[#1c2436] text-white' : 'bg-white/80 border-slate-200 text-slate-800'}`}>

          {/* MOBILE / PHONE HEADER (lg:hidden) — Split into two distinct pieces */}
          <div className="flex lg:hidden flex-col gap-2 w-full">
            {/* Piece 1: Brand & Management Controls */}
            <div className={`flex items-center justify-between gap-2 w-full pb-2 border-b ${darkMode ? 'border-[#1c2436]' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${darkMode ? 'bg-[#0e1320] border-[#1c2436] text-white hover:bg-[#141a2c]' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                  title="Toggle menu"
                >
                  {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-sm">
                    ORS
                  </div>
                  <span className="font-extrabold text-xs tracking-wider uppercase">ORS</span>
                </div>
              </div>

              {/* Top Controls: Store Switcher, Role, Dark Mode */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Store Switcher */}
                <div className={`flex items-center p-1 rounded-xl border shrink-0 ${darkMode ? 'bg-[#0e1320] border-[#1c2436]' : 'bg-slate-100 border-slate-200'}`}>
                  <select
                    value={activeStore}
                    onChange={(e) => switchStore(e.target.value)}
                    className={`bg-transparent text-[11px] font-bold rounded py-0.5 px-0.5 focus:outline-none cursor-pointer ${darkMode ? 'text-white' : 'text-slate-800'}`}
                  >
                    {AVAILABLE_STORES.map(store => (
                      <option key={store.id} value={store.id} className={darkMode ? "bg-[#0b0e17] text-white" : "bg-white text-slate-800"}>
                        {store.shortName || store.name.split(' ')[0]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Role Pill */}
                <button
                  type="button"
                  onClick={() => {
                    const nextRole = currentRole === 'owner' ? 'manager' : 'owner';
                    switchRole(nextRole);
                  }}
                  className={`px-2 py-1 rounded-xl font-bold text-[10px] transition-all shadow-xs flex items-center gap-1 cursor-pointer border shrink-0 ${
                    currentRole === 'owner'
                      ? darkMode
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                      : darkMode
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                  title={currentRole === 'owner' ? 'Owner Mode (tap to switch)' : 'Manager Mode (tap to switch)'}
                >
                  {currentRole === 'owner' ? '👑 Owner' : '👔 Mgr'}
                </button>

                {/* Dark mode button */}
                <button
                  type="button"
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-1.5 rounded-xl border shrink-0 cursor-pointer ${
                    darkMode ? 'bg-[#0e1320] border-[#1c2436] text-amber-400 hover:bg-[#141a2c]' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                  title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
                </button>

                {/* System Health Watchdog Button */}
                <button
                  type="button"
                  onClick={() => setShowHealthModal(true)}
                  className={`p-1.5 rounded-xl border shrink-0 cursor-pointer flex items-center justify-center relative ${
                    darkMode ? 'bg-[#0e1320] border-[#1c2436]' : 'bg-slate-100 border-slate-200'
                  }`}
                  title="System Watchdog & Health Telemetry"
                >
                  <div className="relative flex h-2 w-2">
                    {healthStatus.overall === 'healthy' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      healthStatus.overall === 'healthy' ? 'bg-emerald-500' : healthStatus.overall === 'needs_qr_scan' ? 'bg-amber-500' : 'bg-rose-500'
                    }`}></span>
                  </div>
                  {healthStatus.inboundAlertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Piece 2: Search Bar & Quick Tools */}
            <div className="flex items-center gap-2 w-full pt-0.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Article / Phone / Bill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleGlobalSearch}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all border ${
                    darkMode
                      ? 'bg-[#0b0e17] border-[#1c2436] text-white placeholder-slate-400'
                      : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Quick Mobile Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('copilot')}
                  className={`px-2 py-1.5 rounded-xl font-bold text-[10px] transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0 ${
                    activeTab === 'copilot'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  }`}
                  title="Open Cobb AI Copilot"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Copilot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowReconModal(true)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                  title="EOD Cash Register Reconciliation"
                >
                  <Calculator className="w-3 h-3" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateEodReport}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[10px] transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                  title="Generate Daily EOD Report"
                >
                  <Send className="w-3 h-3" />
                  <span>EOD</span>
                </button>
              </div>
            </div>
          </div>

          {/* DESKTOP HEADER (hidden lg:flex) */}
          <div className="hidden lg:flex flex-row justify-between items-center gap-4 w-full">
            <div className="flex items-center gap-3 w-full sm:max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Command Search: Article / Phone / Bill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleGlobalSearch}
                  className={`w-full pl-9 pr-24 py-2 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all border ${darkMode ? 'bg-[#0b0f19] border-[#1e2638] text-white placeholder-slate-400' : 'bg-slate-100 border-slate-200 text-slate-800'}`}
                />
                <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border pointer-events-none ${darkMode ? 'bg-blue-950/40 border-blue-800/50 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                    <Barcode className="w-3 h-3" />
                    <span className="text-[9.5px] font-mono font-bold uppercase">POS</span>
                  </div>
                  <kbd className={`px-1.5 py-0.5 text-[9.5px] font-mono font-semibold rounded border pointer-events-none ${darkMode ? 'bg-[#151b2a] border-[#252f44] text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-600'}`}>
                    ⌘K
                  </kbd>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 shrink-0">

              {/* Multi-Store Switcher */}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border shrink-0 ${darkMode ? 'bg-[#0b0f19] border-[#1e2638]' : 'bg-slate-100 border-slate-200'}`}>
                <Store className="w-3.5 h-3.5 text-blue-400 ml-0.5 shrink-0" />
                <select
                  value={activeStore}
                  onChange={(e) => switchStore(e.target.value)}
                  className={`bg-transparent text-xs font-bold rounded-lg py-0.5 pr-1 focus:outline-none cursor-pointer ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
                  title="Switch Cobb Store Branch"
                >
                  {AVAILABLE_STORES.map(store => (
                    <option key={store.id} value={store.id} className={darkMode ? "bg-[#0b0f19] text-white py-1" : "bg-white text-slate-800 py-1"}>
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
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : darkMode
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
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
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                title="EOD Cash Register Reconciliation"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>EOD Cash</span>
              </button>

              {/* EOD WhatsApp Report Button */}
              <button
                type="button"
                onClick={handleGenerateEodReport}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                title="Generate Daily EOD Report for Owner"
              >
                <Send className="w-3.5 h-3.5" />
                <span>EOD Report</span>
              </button>

              {/* Cobb AI Copilot Direct Workspace Button */}
              <button
                type="button"
                onClick={() => setActiveTab('copilot')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  activeTab === 'copilot'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-md shadow-purple-500/30 ring-1 ring-purple-400'
                    : darkMode
                      ? 'bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border-purple-800/60'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                }`}
                title="Open Cobb AI Copilot Workspace (or press Ctrl+K)"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>Cobb AI Copilot</span>
              </button>

              {/* Database & Store Setup Button */}
              <button
                type="button"
                onClick={() => setShowSetupModal(true)}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  darkMode
                    ? 'bg-[#0b0f19] text-blue-400 hover:bg-[#121828] hover:text-white border-[#1e2638]'
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
                className={`p-1.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0 border ${
                  darkMode
                    ? 'bg-[#0b0f19] hover:bg-[#121828] border-[#1e2638] text-amber-400'
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600'
                }`}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Interactive Systems status badge */}
              <button
                type="button"
                onClick={() => setShowHealthModal(true)}
                className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border shadow-xs cursor-pointer shrink-0 transition-all ${
                  darkMode
                    ? 'bg-[#0b0f19] hover:bg-[#141b2b] border-[#1e2638] text-white'
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
                }`}
                title="System Health, Watchdog & Disaster Backups (Click to open)"
              >
                <div className="relative flex h-2 w-2">
                  {healthStatus.overall === 'healthy' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    healthStatus.overall === 'healthy' ? 'bg-emerald-500' : healthStatus.overall === 'needs_qr_scan' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}></span>
                </div>
                <span className={`text-[10.5px] font-bold uppercase tracking-wider ${
                  healthStatus.overall === 'healthy' ? 'text-emerald-400' : healthStatus.overall === 'needs_qr_scan' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {healthStatus.overall === 'healthy' ? 'Systems Healthy' : healthStatus.overall === 'needs_qr_scan' ? 'Scan QR' : 'Attention'}
                </span>
                {healthStatus.inboundAlertsCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-rose-500 text-white animate-pulse">
                    {healthStatus.inboundAlertsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className={
          ['copilot', 'transit', 'vip', 'dormant', 'inventory', 'reorder', 'loyalty', 'smart_bundles'].includes(activeTab)
            ? 'p-0 sm:p-4 lg:p-6 mx-auto w-full h-full' 
            : 'p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto'
        }>
          {/* Multi-Store Executive HQ Mode Banner */}
          {activeStore === 'ALL' && (
            <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-purple-950/70 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                  HQ
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-white text-xs tracking-wider uppercase">Multi-Store Executive HQ Mode Active</h4>
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40 uppercase">Consolidated</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">Aggregating real-time POS revenue, inventory velocity & customer intelligence across all Cobb outlets.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHealthModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span>Network Health</span>
                </button>
              </div>
            </div>
          )}

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

      {/* System Health & DevOps Watchdog Modal */}
      <SystemHealthModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        API_BASE={API_BASE}
        darkMode={darkMode}
      />

      {/* Progressive Web App Install Banner */}
      <PwaInstallBanner darkMode={darkMode} />
    </>
  );
};

export default Layout;
