import React, { useState, useEffect } from 'react';
import RolePinModal from './RolePinModal';
import axios from 'axios';
import OrsLogo from './OrsLogo';
import SetupWizardModal from './SetupWizardModal';
import SystemHealthModal from './SystemHealthModal';
import SystemPowerModal from './SystemPowerModal';
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
  Truck,
  Printer,
  Bell,
  BellRing,
  Volume2
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
      { id: "staff_leaderboard", label: "Staff Leaderboard & Incentives", icon: Trophy, colorClass: "text-amber-600 dark:text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "pocket_khata", label: "Pocket Khata (Expenses)", icon: Wallet, colorClass: "text-amber-600 dark:text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "hold_desk", label: "Hold & Reserve Desk", icon: AlarmClock, colorClass: "text-amber-600 dark:text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "save_the_sale", label: "Save-The-Sale Network", icon: Network, colorClass: "text-emerald-600 dark:text-emerald-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border-l-2 border-emerald-500" },
      { id: "returns", label: "Product Exchanges", icon: RotateCcw, colorClass: "text-amber-600 dark:text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "alterations", label: "Alteration Desk", icon: Scissors, colorClass: "text-indigo-600 dark:text-indigo-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border-l-2 border-indigo-500" },
      { id: "topmovers", label: "Top Movers & Size Demand", icon: Flame, colorClass: "text-rose-600 dark:text-rose-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border-l-2 border-rose-500" },
      { id: "sizematrix", label: "Size Matrix Heatmap", icon: Grid, colorClass: "text-blue-600 dark:text-blue-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border-l-2 border-blue-500" },
      { id: "transit", label: "Goods In Transit", icon: Truck, colorClass: "text-orange-600 dark:text-orange-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border-l-2 border-orange-500" },
      { id: "deadstock", label: "Inventory", icon: Package },
      { id: "depreciation_clock", label: "⏳ Depreciation Clock", icon: Clock, colorClass: "text-rose-600 dark:text-rose-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border-l-2 border-rose-500" },
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

import { useAuth, AVAILABLE_STORES, ROLE_PERMISSIONS, ROLE_LABELS } from '../context/AuthContext';
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
  openThermalModal,
  API_BASE,
  notificationsEnabled = false,
  onEnableNotifications,
  onTestNotification,
  playCheckoutChime,
  systemStatus = null,
  onTriggerSystemTest,
  onTriggerTestAlert
}) => {

  const {
    role: contextRole, switchRole, activeStore, switchStore, user,
    verifyPin, changePin, roleRequiresPin, rememberOwner, setRememberOwner,
  } = useAuth();
  const currentRole = contextRole || propUserRole || 'owner';

  // ── PIN modal state ───────────────────────────────────────
  const [pinModal, setPinModal] = useState(null); // { targetRole: 'owner'|'manager' } | null

  const handleRoleSwitch = (targetRole) => {
    if (roleRequiresPin(targetRole)) {
      setPinModal({ targetRole });
    } else {
      switchRole(targetRole);
    }
  };
  // ─────────────────────────────────────────────────────────
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [healthStatus, setHealthStatus] = useState({ overall: 'healthy', inboundAlertsCount: 0 });
  const [showPowerModal, setShowPowerModal] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('cobb_right_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleRightSidebar = () => {
    setIsRightSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('cobb_right_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

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

  // RBAC: Filter navigation items based on role using ROLE_PERMISSIONS map
  // owner → null (all tabs), manager → operational set, cashier → counter-only set
  const allowedTabs = ROLE_PERMISSIONS[currentRole] ?? null; // null means all

  const filteredNavigation = navigationItems.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      allowedTabs === null || allowedTabs.includes(item.id)
    )
  })).filter(cat => cat.items.length > 0);

  const roleInfo = ROLE_LABELS[currentRole] || ROLE_LABELS.owner;

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
      <div className={`fixed lg:static inset-y-0 left-0 w-64 lg:my-4 lg:ml-4 lg:mr-2 lg:h-[calc(100vh-32px)] lg:rounded-[2rem] flex flex-col z-40 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${darkMode ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]' : 'bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}>
        <div className={`p-5 pb-4 flex justify-between items-center border-b ${darkMode ? 'border-white/[0.06]' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <OrsLogo size={42} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-lg font-black tracking-wider leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>ORS</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">CRM</span>
              </div>
              <p className={`text-[10px] font-bold tracking-tight uppercase truncate mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Complete CRM Solutions
              </p>
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
      <div className={`flex-1 overflow-auto relative min-w-0 pb-20 lg:pb-0 transition-colors duration-200 lg:my-4 lg:mx-2 lg:rounded-[2rem] border ${darkMode ? 'bg-[#0f1115] border-white/[0.05] shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200/50 shadow-sm'}`}>

        {/* Top App Bar (Mobile Only — Android-style single row) */}
        <header className={`lg:hidden px-4 py-2 border-b sticky top-0 z-30 transition-colors backdrop-blur-lg ${
          darkMode ? 'bg-[#0d1017]/90 border-white/[0.06] text-white' : 'bg-white/90 border-slate-200/80 text-slate-800'
        }`}>
          <div className="flex items-center justify-between gap-3">
            {/* Left: Hamburger + Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors cursor-pointer ${
                  darkMode ? 'bg-white/[0.06] text-white active:bg-white/10' : 'bg-slate-100 text-slate-700 active:bg-slate-200'
                }`}
                title="Navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
              </button>
              <div className="flex items-center gap-2">
                <OrsLogo size={32} showGlow={false} />
                <div className="leading-tight">
                  <span className={`font-black text-sm tracking-wide block leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>ORS</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Cobb CRM</span>
                </div>
              </div>
            </div>

            {/* Center: Store + Role chip */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold ${
                darkMode ? 'bg-blue-500/10 border-blue-500/25 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                <Store className="w-3 h-3 shrink-0" />
                <select
                  value={activeStore}
                  onChange={(e) => switchStore(e.target.value)}
                  className="bg-transparent font-bold focus:outline-none cursor-pointer text-inherit max-w-[80px] truncate"
                >
                  {AVAILABLE_STORES.map(store => (
                    <option key={store.id} value={store.id} className={darkMode ? 'bg-[#0b0e17] text-white' : 'bg-white text-slate-800'}>
                      {store.shortName || store.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  const cycle = { owner: 'manager', manager: 'cashier', cashier: 'owner' };
                  handleRoleSwitch(cycle[currentRole] || 'owner');
                }}
                className={`px-2 py-1 rounded-full font-bold text-[10px] border flex items-center gap-1 cursor-pointer ${
                  currentRole === 'owner'
                    ? darkMode ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                    : currentRole === 'manager'
                      ? darkMode ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-800 border-blue-200'
                      : darkMode ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {currentRole === 'owner' ? '👑' : currentRole === 'manager' ? '👔' : '🧾'}
                <span>{currentRole === 'owner' ? 'Owner' : currentRole === 'manager' ? 'Mgr' : 'Cashier'}</span>
              </button>
            </div>

            {/* Right: Status indicators */}
            <div className="flex items-center gap-2 shrink-0">
              {/* POS Status dot */}
              <button
                type="button"
                onClick={() => setShowPowerModal(true)}
                className="relative flex items-center justify-center w-9 h-9 rounded-2xl cursor-pointer active:scale-95 transition-all"
                title={`POS: ${(systemStatus?.isOnline ?? true) ? 'Online' : 'Offline'}`}
              >
                <span className="relative flex h-3 w-3">
                  {(systemStatus?.isOnline ?? true) && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    (systemStatus?.isOnline ?? true) ? 'bg-emerald-500' : systemStatus?.status === 'unresponsive' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}></span>
                </span>
              </button>

              {/* Bell / Push Alerts */}
              <button
                type="button"
                onClick={async () => {
                  if (notificationsEnabled) {
                    setShowAlertModal(true);
                  } else {
                    if (typeof onEnableNotifications === 'function') await onEnableNotifications();
                  }
                }}
                className={`relative w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                  darkMode ? 'bg-white/[0.06] text-slate-300 active:bg-white/10' : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                }`}
                title="Notification alerts"
              >
                {notificationsEnabled ? <BellRing className="w-4 h-4 text-indigo-400" /> : <Bell className="w-4 h-4" />}
                <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                  notificationsEnabled ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'
                }`} />
              </button>

              {/* Dark Mode toggle */}
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className={`w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                  darkMode ? 'bg-white/[0.06] text-amber-400 active:bg-white/10' : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                }`}
                title={darkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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

      {/* Right Operations & Telemetry Rail (Double Sidebar Layout) */}
      <aside
        style={{ contain: 'paint' }}
        className={`hidden lg:flex flex-col shrink-0 z-30 transition-[width] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-[width] transform-gpu ${
          isRightSidebarCollapsed ? 'w-[68px]' : 'w-[280px]'
        } lg:my-4 lg:mr-4 lg:ml-2 lg:h-[calc(100vh-32px)] lg:rounded-[2rem] border overflow-hidden ${
          darkMode
            ? 'bg-[#0e1320] border-[#1c2436] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] text-white'
            : 'bg-white border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-slate-800'
        }`}
      >
        {/* Top Header / Collapse Toggle */}
        <div className={`p-3.5 pb-3 flex items-center justify-between border-b gap-2 ${
          darkMode ? 'border-white/[0.06]' : 'border-slate-100'
        }`}>
          <div className={`flex items-center gap-2 min-w-0 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
          }`}>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0 whitespace-nowrap">
              <span className="font-black text-xs uppercase tracking-wider block leading-none">Operations</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block mt-0.5">Control Rail</span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded-xl border transition-all duration-300 cursor-pointer shrink-0 ${
              isRightSidebarCollapsed ? 'mx-auto' : ''
            } ${
              darkMode ? 'bg-[#0b0f19] border-[#1c2436] text-slate-400 hover:text-white hover:bg-[#141a2c]' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title={isRightSidebarCollapsed ? "Expand sidebar rail" : "Collapse sidebar rail"}
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
              isRightSidebarCollapsed ? 'rotate-180' : 'rotate-0'
            }`} />
          </button>
        </div>

        {/* Scrollable Rail Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3.5 transition-opacity duration-300 ease-in-out">
          {/* 1. Store Selector */}
          <div
            onClick={() => { if (isRightSidebarCollapsed) setIsRightSidebarCollapsed(false); }}
            className={`p-2 rounded-2xl border transition-all duration-300 flex items-center gap-2 overflow-hidden ${
              isRightSidebarCollapsed ? 'cursor-pointer hover:border-blue-400/50 justify-center' : ''
            } ${
              darkMode ? 'bg-[#0b0e17]/80 border-white/[0.06]' : 'bg-slate-50 border-slate-200/80'
            }`}
            title={`Active Store: ${AVAILABLE_STORES.find(s => s.id === activeStore)?.name || 'Store'} (Click to switch)`}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className={`flex-1 min-w-0 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
              isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Store Outlet</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {AVAILABLE_STORES.find(s => s.id === activeStore)?.shortName || 'STORE'}
                </span>
              </div>
              <select
                value={activeStore}
                onChange={(e) => switchStore(e.target.value)}
                className={`w-full text-xs font-bold rounded-lg py-1 px-1.5 focus:outline-none cursor-pointer border ${
                  darkMode ? 'border-[#1e2638] text-white bg-[#0f1422]' : 'border-slate-200 text-slate-800 bg-white shadow-xs'
                }`}
                title="Switch Cobb Store Branch"
              >
                {AVAILABLE_STORES.map(store => (
                  <option key={store.id} value={store.id} className={darkMode ? "bg-[#0b0f19] text-white py-1" : "bg-white text-slate-800 py-1"}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Role Switcher Pill */}
          <div
            className={`p-2 rounded-2xl border flex items-center gap-2 overflow-hidden transition-all duration-300 ${
              isRightSidebarCollapsed ? 'justify-center cursor-pointer' : 'justify-between'
            } ${darkMode ? 'bg-[#0b0e17]/80 border-white/[0.06]' : 'bg-slate-50 border-slate-200/80'}`}
            onClick={() => {
              if (isRightSidebarCollapsed) {
                const cycle = { owner: 'manager', manager: 'cashier', cashier: 'owner' };
                handleRoleSwitch(cycle[currentRole] || 'owner');
              }
            }}
            title={`Role: ${currentRole} (Click to switch)`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              currentRole === 'owner'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : currentRole === 'manager'
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            }`}>
              {currentRole === 'owner' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <div className={`flex-1 min-w-0 flex items-center justify-between gap-1 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
              isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
            }`}>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Role Access</span>
                <span className={`text-xs font-black truncate block ${
                  currentRole === 'owner' ? 'text-amber-400' : currentRole === 'manager' ? 'text-blue-400' : 'text-emerald-400'
                }`}>
                  {currentRole === 'owner' ? '👑 Owner' : currentRole === 'manager' ? '👔 Manager' : '🧾 Cashier'}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const cycle = { owner: 'manager', manager: 'cashier', cashier: 'owner' };
                  handleRoleSwitch(cycle[currentRole] || 'owner');
                }}
                className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                  darkMode ? 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
                }`}
                title="Switch Role (PIN protected)"
              >
                PIN Switch
              </button>
            </div>
          </div>

          {/* 3. Global Search */}
          <div
            onClick={() => { if (isRightSidebarCollapsed) setIsRightSidebarCollapsed(false); }}
            className={`relative flex items-center p-2 rounded-2xl border transition-all duration-300 overflow-hidden ${
              isRightSidebarCollapsed ? 'justify-center cursor-pointer hover:border-slate-500' : ''
            } ${
              darkMode ? 'bg-[#0b0e17]/80 border-white/[0.06]' : 'bg-slate-50 border-slate-200/80'
            }`}
            title="Search: Bill / Item / Phone (Click to expand)"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-400 shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div className={`flex-1 min-w-0 relative ml-2 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
              isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
            }`}>
              <input
                type="text"
                placeholder="Search: Bill / Item / Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleGlobalSearch}
                className={`w-full pr-7 py-1 text-xs font-medium focus:outline-none bg-transparent ${
                  darkMode ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
                }`}
              />
              <kbd className={`absolute right-0 top-1 px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded border pointer-events-none ${
                darkMode ? 'bg-[#151b2a] border-[#252f44] text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-600'
              }`}>
                ↵
              </kbd>
            </div>
          </div>

          {/* 4. Live Systems Telemetry */}
          <div className="space-y-2">
            <p className={`text-[10px] font-bold uppercase tracking-wider px-1 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden whitespace-nowrap ${
              isRightSidebarCollapsed ? 'h-0 opacity-0 my-0 py-0' : 'h-4 opacity-100'
            } ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Hardware & Telemetry
            </p>

            {/* POS Power & Online Status */}
            <button
              type="button"
              onClick={() => setShowPowerModal(true)}
              className={`w-full p-2 rounded-2xl border transition-all duration-300 flex items-center gap-2 overflow-hidden text-left cursor-pointer group ${
                isRightSidebarCollapsed ? 'justify-center' : 'justify-between'
              } ${
                (systemStatus?.isOnline ?? true)
                  ? darkMode
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                  : systemStatus?.status === 'unresponsive'
                    ? darkMode
                      ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300 animate-pulse'
                      : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 animate-pulse'
                    : darkMode
                      ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300'
                      : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
              }`}
              title="Store POS Hardware & Power Status"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                <span className="relative flex h-3 w-3">
                  {(systemStatus?.isOnline ?? true) && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    (systemStatus?.isOnline ?? true) ? 'bg-emerald-500' : systemStatus?.status === 'unresponsive' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}></span>
                </span>
              </div>
              <div className={`flex-1 min-w-0 flex items-center justify-between transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
              }`}>
                <div className="min-w-0">
                  <p className="text-xs font-black tracking-tight truncate">
                    {(systemStatus?.isOnline ?? true) ? 'POS Online' : systemStatus?.status === 'unresponsive' ? 'POS Power Cut' : 'POS Closed'}
                  </p>
                  <p className="text-[9.5px] opacity-70 truncate">Hardware & Power</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </button>

            {/* Systems Watchdog & Health */}
            <button
              type="button"
              onClick={() => setShowHealthModal(true)}
              className={`w-full p-2 rounded-2xl border transition-all duration-300 flex items-center gap-2 overflow-hidden text-left cursor-pointer group ${
                isRightSidebarCollapsed ? 'justify-center' : 'justify-between'
              } ${
                darkMode ? 'bg-[#0b0e17]/80 hover:bg-[#121828] border-white/[0.06]' : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80'
              }`}
              title="System Health, Watchdog & Backups"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 relative">
                <Activity className="w-4 h-4" />
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                  healthStatus.overall === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
              </div>
              <div className={`flex-1 min-w-0 flex items-center justify-between transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
              }`}>
                <div className="min-w-0">
                  <p className={`text-xs font-bold uppercase tracking-wider truncate ${
                    healthStatus.overall === 'healthy' ? 'text-emerald-400' : healthStatus.overall === 'needs_qr_scan' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {healthStatus.overall === 'healthy' ? 'Systems Healthy' : healthStatus.overall === 'needs_qr_scan' ? 'Scan QR' : 'Attention'}
                  </p>
                  <p className="text-[9.5px] text-slate-400 truncate">DevOps Watchdog</p>
                </div>
                {healthStatus.inboundAlertsCount > 0 ? (
                  <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-rose-500 text-white animate-pulse shrink-0">
                    {healthStatus.inboundAlertsCount}
                  </span>
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </div>
            </button>

            {/* Push & Notification Bar Alert Pill */}
            <button
              type="button"
              onClick={() => setShowAlertModal(true)}
              className={`w-full p-2 rounded-2xl border transition-all duration-300 flex items-center gap-2 overflow-hidden text-left cursor-pointer group active:scale-[0.98] ${
                isRightSidebarCollapsed ? 'justify-center' : 'justify-between'
              } ${
                notificationsEnabled
                  ? darkMode
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                  : darkMode
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300 animate-pulse'
                    : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 animate-pulse'
              }`}
              title="Phone Notification Bar Alerts (Click to test / view)"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                notificationsEnabled ? 'text-emerald-400 bg-emerald-500/20' : 'text-amber-400 bg-amber-500/20'
              }`}>
                {notificationsEnabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </div>
              <div className={`flex-1 min-w-0 flex items-center justify-between transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
              }`}>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">
                    {notificationsEnabled ? 'Push Alerts Live' : 'Enable Alerts'}
                  </p>
                  <p className="text-[9.5px] opacity-75 truncate">Firebase Notification Bar</p>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${notificationsEnabled ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              </div>
            </button>
          </div>

          {/* 5. Quick Actions Dock */}
          <div className="space-y-2">
            <p className={`text-[10px] font-bold uppercase tracking-wider px-1 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden whitespace-nowrap ${
              isRightSidebarCollapsed ? 'h-0 opacity-0 my-0 py-0' : 'h-4 opacity-100'
            } ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Quick Actions
            </p>

            {/* AI Copilot */}
            <button
              type="button"
              onClick={() => setActiveTab('copilot')}
              className={`w-full p-2 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all duration-300 shadow-xs cursor-pointer border overflow-hidden ${
                isRightSidebarCollapsed ? 'justify-center' : ''
              } ${
                activeTab === 'copilot'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-md shadow-purple-500/30 ring-1 ring-purple-400'
                  : darkMode
                    ? 'bg-purple-950/30 hover:bg-purple-900/50 text-purple-300 border-purple-800/50'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
              }`}
              title="Cobb AI Copilot"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              </div>
              <span className={`truncate whitespace-nowrap transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
              }`}>
                Cobb AI Copilot
              </span>
            </button>

            {/* EOD Cash Recon */}
            <button
              type="button"
              onClick={() => setShowReconModal(true)}
              className={`w-full p-2 rounded-2xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2.5 transition-all duration-300 shadow-xs cursor-pointer overflow-hidden ${
                isRightSidebarCollapsed ? 'justify-center' : ''
              }`}
              title="EOD Cash Register Reconciliation"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <span className={`truncate whitespace-nowrap transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
              }`}>
                EOD Cash Recon
              </span>
            </button>

            {/* Daily EOD Report */}
            <button
              type="button"
              onClick={handleGenerateEodReport}
              className={`w-full p-2 rounded-2xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2.5 transition-all duration-300 shadow-xs cursor-pointer overflow-hidden ${
                isRightSidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Generate Daily EOD Report for Owner"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <span className={`truncate whitespace-nowrap transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
              }`}>
                Daily EOD Report
              </span>
            </button>

            {/* POS Setup & DB */}
            <button
              type="button"
              onClick={() => setShowSetupModal(true)}
              className={`w-full p-2 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all duration-300 border cursor-pointer overflow-hidden ${
                isRightSidebarCollapsed ? 'justify-center' : ''
              } ${
                darkMode
                  ? 'bg-[#0b0f19] text-blue-400 hover:bg-[#121828] hover:text-white border-[#1e2638]'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
              }`}
              title="Configure Database, Presets & Store Profile"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                <Database className="w-4 h-4 text-blue-400" />
              </div>
              <span className={`truncate whitespace-nowrap transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
              }`}>
                POS Setup & DB
              </span>
            </button>
          </div>
        </div>

        {/* Footer / Theme & Dark Mode Controls */}
        <div className={`p-2.5 border-t mt-auto ${
          darkMode ? 'border-white/[0.06] bg-[#0c101c]' : 'border-slate-100 bg-slate-50'
        }`}>
          <div
            onClick={() => setDarkMode(!darkMode)}
            className={`p-1.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all duration-300 overflow-hidden ${
              isRightSidebarCollapsed ? 'justify-center' : 'justify-between'
            } ${
              darkMode ? 'bg-[#0b0f19] hover:bg-[#121828] border-[#1e2638] text-amber-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </div>
            <span className={`text-xs font-semibold whitespace-nowrap transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
              isRightSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'
            } ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {darkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
        </div>
      </aside>

      {/* PIN Auth Modal for Role Switching */}
      {pinModal && (
        <RolePinModal
          targetRole={pinModal.targetRole}
          darkMode={darkMode}
          verifyPin={verifyPin}
          changePin={changePin}
          rememberOwner={rememberOwner}
          setRememberOwner={setRememberOwner}
          onSuccess={() => {
            switchRole(pinModal.targetRole);
            setPinModal(null);
          }}
          onCancel={() => setPinModal(null)}
        />
      )}

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

      {/* Checkout Push Notification Info & Controls Modal */}
      {showAlertModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAlertModal(false)}
        >
          <div 
            className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
              darkMode ? 'bg-[#0f1422] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <BellRing className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Checkout Push Alerts</h3>
                  <p className="text-xs text-slate-400">Firebase Link Live Notification Service</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAlertModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-300">
                    {notificationsEnabled ? 'Device Connected & Active' : 'Permission Pending'}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  FCM + WebSockets
                </span>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Notification Format Preview</p>
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-emerald-400 font-mono">🧾 New Sale: ₹4,599 | Bill #1042</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Items: 3 • Pay: UPI • Staff: Rahul • Cust: Amit Sharma
                  </p>
                  <p className="text-[10px] text-slate-400 pt-1">
                    👉 Tapping notification immediately expands the exact bill on this phone.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trigger Real-time Push Alert Tests</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof onTriggerTestAlert === 'function') onTriggerTestAlert('vip');
                      else if (typeof onTestNotification === 'function') onTestNotification();
                    }}
                    className="py-2 px-3 rounded-xl font-bold text-[11px] bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>💎 VIP Sale</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof onTriggerTestAlert === 'function') onTriggerTestAlert('discount');
                    }}
                    className="py-2 px-3 rounded-xl font-bold text-[11px] bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>⚠️ Heavy Discount</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof onTriggerTestAlert === 'function') onTriggerTestAlert('cancelled');
                    }}
                    className="py-2 px-3 rounded-xl font-bold text-[11px] bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>🚫 Voided Sale</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof onTriggerTestAlert === 'function') onTriggerTestAlert('eod');
                    }}
                    className="py-2 px-3 rounded-xl font-bold text-[11px] bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>📊 EOD Digest</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (typeof onTestNotification === 'function') {
                      await onTestNotification();
                    }
                  }}
                  className="w-full py-2 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98] mt-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Test Standard Sale Alert</span>
                </button>

                {!notificationsEnabled ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (typeof onEnableNotifications === 'function') {
                        await onEnableNotifications();
                      }
                    }}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/30"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Grant Notification Permission</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Push & In-App Alerts Active</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (typeof onEnableNotifications === 'function') {
                          await onEnableNotifications();
                        }
                      }}
                      className="text-[10px] text-emerald-300 underline cursor-pointer hover:text-white"
                    >
                      Re-sync
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store POS System & Power Modal */}
      <SystemPowerModal
        isOpen={showPowerModal}
        onClose={() => setShowPowerModal(false)}
        systemStatus={systemStatus}
        onTriggerTestAlert={onTriggerSystemTest}
        activeStore={activeStore}
        darkMode={darkMode}
      />

      {/* Progressive Web App Install Banner */}
      <PwaInstallBanner darkMode={darkMode} />
    </>
  );
};

export default Layout;
