import React from 'react';
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
  AlertTriangle
} from 'lucide-react';

const navigationItems = [
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
      { id: "returns", label: "Returns & Exchanges", icon: RotateCcw, colorClass: "text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "topmovers", label: "Top Movers & Size Demand", icon: Flame, colorClass: "text-rose-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-rose-500/15 text-rose-400 font-bold border-l-2 border-rose-500" },
      { id: "sizematrix", label: "Size Matrix Heatmap", icon: Grid, colorClass: "text-blue-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-blue-500/15 text-blue-400 font-bold border-l-2 border-blue-500" },
      { id: "deadstock", label: "Inventory", icon: Package },
      { id: "vm_auditor", label: "VM Auditor", icon: Camera, colorClass: "text-purple-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-purple-500/15 text-purple-400 font-bold border-l-2 border-purple-500" },
      { id: "smart_bundles", label: "Smart Bundling", icon: Percent, colorClass: "text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-400 font-bold border-l-2 border-amber-500" },
      { id: "trend_forecast", label: "Trend Forecaster", icon: LineChart, colorClass: "text-indigo-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-indigo-500/15 text-indigo-400 font-bold border-l-2 border-indigo-500" },
      { id: "competitor_intel", label: "Competitor Intel", icon: Target, colorClass: "text-red-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-red-500/15 text-red-400 font-bold border-l-2 border-red-500" },
    ]
  },
  {
    category: "Marketing & CRM", items: [
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
  isListenerRunning
}) => {
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
            <p className="text-slate-500 text-xs font-medium ml-11">Smart CRM System</p>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-4 mt-6 overflow-y-auto custom-scrollbar">
          {navigationItems.map((cat, catIdx) => (
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
      <div className="flex-1 overflow-auto relative bg-slate-50 min-w-0 pb-20 lg:pb-0">

        {/* Top Navbar */}
        <div className="bg-white/80 backdrop-blur-md px-4 lg:px-8 py-3.5 border-b border-slate-200 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center sticky top-0 z-20">
          <div className="flex items-center gap-3 w-full md:w-full sm:max-w-lg">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="hidden p-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-200 transition-all cursor-pointer shrink-0"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Article / Phone / Name / Amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleGlobalSearch}
                className="w-full pl-9 pr-28 py-2 bg-slate-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
              />
              <div className="absolute right-2 top-1.5 hidden sm:flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-xs pointer-events-none">
                <Barcode className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Scanner Ready</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* EOD Cash Reconciliation Button */}
            <button
              onClick={() => setShowReconModal(true)}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1 shrink-0"
              title="EOD Cash Register Reconciliation"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EOD Cash</span>
            </button>

            {/* EOD WhatsApp Report Button */}
            <button
              onClick={handleGenerateEodReport}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1 shrink-0"
              title="Generate Daily EOD Report for Owner"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EOD Report</span>
            </button>

            {/* Dark Mode Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="dark-toggle-btn p-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-650 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center shrink-0"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Systems status badge */}
            <div className="status-badge flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm cursor-help shrink-0" title="Automation Engine Status">
              <div className="relative flex h-2 w-2">
                {(isGatewayRunning && isListenerRunning) && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isGatewayRunning && isListenerRunning ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                {isGatewayRunning && isListenerRunning ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </>
  );
};

export default Layout;
