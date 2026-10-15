import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Flame,
  Layers,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Scissors,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Trophy,
  Crown,
  Tag,
  ShoppingBag,
  Eye,
  Printer,
  Sliders,
  Check,
  X,
  Wifi,
  WifiOff,
  Tv,
  Minimize2,
  Maximize2
} from 'lucide-react';
import ExecutiveKpiStrip from './ExecutiveKpiStrip';
import GoodsInTransitDesk from '../GoodsInTransitDesk';
import StaffFloorRaceWidget from './StaffFloorRaceWidget';
import ExecutiveVisualHeatmap from './ExecutiveVisualHeatmap';
import QuickToolsWidget from './QuickToolsWidget';
import LivePulseFeed from './LivePulseFeed';
import MultiStoreFleetMatrix from './MultiStoreFleetMatrix';

const AlterationSlipModal = lazy(() => import('../AlterationSlipModal'));
const MissionControlModal = lazy(() => import('./MissionControlModal'));

/**
 * Unified Executive Bento Grid V2
 * Sleek Obsidian Glassmorphism command center for Cobb Retail Operations.
 */
const ExecutiveBentoDashboard = (props) => {
  const {
    userRole = 'owner',
    activeStore = 'DEMO_STORE_001',
    DAILY_TARGET = 100000,
    targetProgress = 0,
    averageOrderValue = 0,
    totalMonthlyUnits = 0,
    API_BASE = 'http://localhost:5000',
    darkMode = true,
    overviewStats = {},
    liveBills = [],
    dailySales = [],
    hourlySales = [],
    vips = [],
    automationDispatches = [],
    setActiveTab,
    setShowReconModal,
    setShowEodModal,
    formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
    pnlData,
    inventory = [],
    // Desk State & Handlers
    quickScanQuery,
    setQuickScanQuery,
    quickScanLoading,
    quickScanResult,
    setQuickScanResult,
    quickScanError,
    setQuickScanError,
    isScannerFocused,
    setIsScannerFocused,
    quickScanInputRef,
    handleQuickScan,
    calcOffer,
    setCalcOffer,
    calcMrp,
    setCalcMrp,
    b1g3Items,
    setB1g3Items,
    khataSummary,
    holds,
    todayTopArticles,
    todayTopArticlesLoading,
    showAlterationModal,
    setShowAlterationModal,
    handlePrintBill
  } = props;

  // Primary Perspective Switcher: 'bento' (Unified Bento V2), 'racing' (Floor Race & Rush Radar), 'counter' (Counter Tools)
  const [activePerspective, setActivePerspective] = useState('bento');
  const [showMissionControl, setShowMissionControl] = useState(false);
  const [racingTileSmall, setRacingTileSmall] = useState(true);
  // Global listener for TV Wall trigger & Ctrl+Shift+T
  useEffect(() => {
    const handleOpenTv = () => setShowMissionControl(true);

    const handleKey = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        setShowMissionControl(prev => !prev);
      }
    };

    window.addEventListener('cobb_open_mission_control', handleOpenTv);
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('cobb_open_mission_control', handleOpenTv);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Pulse River Search & Payment Filter
  const [pulseSearchQuery, setPulseSearchQuery] = useState('');
  const [pulseModeFilter, setPulseModeFilter] = useState('all'); // 'all' | 'cash' | 'upi' | 'card'

  // Sales Performance Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);

  // Live Sync ticker state & Cloud Sentry Offline Detection
  const [syncSecondsAgo, setSyncSecondsAgo] = useState(4);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSyncSecondsAgo((prev) => (prev >= 60 ? 1 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1-tap Cloud Force Sync trigger
  const handleManualSync = () => {
    setIsSyncing(true);
    setSyncSecondsAgo(0);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cobb_force_sync'));
    }
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  // 1-tap Target Victory Fanfare & Canvas Confetti trigger
  const handleManualCelebrate = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cobb_celebrate', {
          detail: {
            title: '🔥 STORE TARGET ON FIRE!',
            subtitle: `Floor sales ${formatCurrency(overviewStats?.today?.TotalSales || 0)} reached!`
          }
        })
      );
    }
  };

  // Keyboard shortcut Ctrl+S focus scanner listener
  useEffect(() => {
    const handleFocusScanner = () => {
      setActivePerspective('counter');
      setTimeout(() => {
        if (quickScanInputRef?.current) {
          quickScanInputRef.current.focus();
          quickScanInputRef.current.select?.();
        }
      }, 120);
    };
    window.addEventListener('cobb_focus_scanner', handleFocusScanner);
    return () => window.removeEventListener('cobb_focus_scanner', handleFocusScanner);
  }, [quickScanInputRef]);

  // Event listener to jump to Fleet Benchmark perspective
  useEffect(() => {
    const handleOpenFleet = () => setActivePerspective('fleet');
    window.addEventListener('cobb_open_fleet_benchmark', handleOpenFleet);
    return () => window.removeEventListener('cobb_open_fleet_benchmark', handleOpenFleet);
  }, []);

  // Filter today's bills for Live Store Pulse
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(
    () =>
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    [today]
  );

  const todayBills = useMemo(() => {
    return (Array.isArray(liveBills) ? liveBills : []).filter((b) => {
      const bDate = b.BillDate ? b.BillDate.trim() : b.BillTime ? b.BillTime.slice(0, 10) : '';
      return bDate === todayStr;
    });
  }, [liveBills, todayStr]);

  const filteredPulseBills = useMemo(() => {
    return todayBills.filter((bill) => {
      // Payment filter
      if (pulseModeFilter !== 'all') {
        const mode = String(bill.PaymentMode || '').toLowerCase();
        const cash = Number(bill.CashAmount || 0);
        const upi = Number(bill.UpiAmount || 0);
        const card = Number(bill.CardAmount || 0);

        if (pulseModeFilter === 'cash' && (mode.includes('cash') || (cash > 0 && upi === 0 && card === 0))) {
          // match
        } else if (pulseModeFilter === 'upi' && (mode.includes('upi') || (upi > 0 && cash === 0 && card === 0))) {
          // match
        } else if (pulseModeFilter === 'card' && (mode.includes('card') || (card > 0 && cash === 0 && upi === 0))) {
          // match
        } else {
          return false;
        }
      }

      // Query search
      if (!pulseSearchQuery.trim()) return true;
      const q = pulseSearchQuery.toLowerCase();
      const name = String(bill.CustomerName || bill.FirstName || '').toLowerCase();
      const billNo = String(bill.BillNumber || '').toLowerCase();
      const phone = String(bill.Phone || '');
      return name.includes(q) || billNo.includes(q) || phone.includes(q);
    });
  }, [todayBills, pulseModeFilter, pulseSearchQuery]);

  // Today Gross & Digital split calculation
  const totalTodayCash = useMemo(() => todayBills.reduce((acc, b) => acc + (Number(b.CashAmount) || 0), 0), [todayBills]);
  const totalTodayUPI = useMemo(() => todayBills.reduce((acc, b) => acc + (Number(b.UpiAmount) || 0), 0), [todayBills]);
  const totalTodayCard = useMemo(() => todayBills.reduce((acc, b) => acc + (Number(b.CardAmount) || 0), 0), [todayBills]);
  const totalTodayDigital = totalTodayUPI + totalTodayCard;
  const totalTodayGross = totalTodayCash + totalTodayDigital;

  // Month-to-date calendar metrics
  const mtdTotalSales = useMemo(() => {
    const curMonth = calendarDate.getMonth();
    const curYear = calendarDate.getFullYear();
    return (Array.isArray(dailySales) ? dailySales : []).reduce((sum, d) => {
      if (!d.SaleDate) return sum;
      const dt = new Date(d.SaleDate);
      if (dt.getMonth() === curMonth && dt.getFullYear() === curYear) {
        return sum + (Number(d.TotalSales) || 0);
      }
      return sum;
    }, 0);
  }, [dailySales, calendarDate]);

  const daysInCurMonth = useMemo(() => {
    return new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  }, [calendarDate]);

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300 pb-12">
      {/* =========================================================================
          COMMAND HEADER: SLEEK OBSIDIAN GLASS BAR
          ========================================================================= */}
      <div className="glass-header-bar p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-lg">
        {/* Left: Telemetry Beacon & Store Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-3.5 w-3.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"></span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                {activeStore === 'ALL'
                  ? 'All Stores Fleet Command'
                  : activeStore === 'STORE_02'
                    ? 'Cobb Branch 2 Command'
                    : 'Cobb Pundri Command'}
              </h1>
              <span
                className={`px-2.5 py-0.5 text-[10.5px] font-black rounded-full border shadow-xs tracking-wider uppercase shrink-0 ${
                  userRole === 'owner'
                    ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                }`}
              >
                {userRole === 'owner' ? '👑 Owner Mode' : '👔 Store Manager'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium flex-wrap">
              {/* Cloud Sentry Status Pill */}
              <span className={`px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 font-bold text-[10px] ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-amber-500/15 text-amber-500 dark:text-amber-300 border-amber-500/40 animate-pulse'
              }`}>
                {isOnline ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span>Cloud Synced</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-400" />
                    <span>Offline Cached</span>
                  </>
                )}
              </span>
              <span>•</span>
              <span className="font-mono">Synced {syncSecondsAgo}s ago</span>
              <span>•</span>
              <span>{todayBills.length} Bills Today</span>

              {/* 1-Tap Manual Force Sync */}
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                title="Force Sync POS & Cloud (Ctrl+Shift+R)"
                className="ml-1 px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 border border-blue-500/25 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
                <span className="text-[10px] font-bold">Sync Now</span>
                <span className="text-[8.5px] px-1 py-0.2 bg-black/20 dark:bg-white/10 rounded font-mono hidden sm:inline">⌃⇧R</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center/Right: Quick Actions & Perspective Selector */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5">
          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Celebrate Milestone Particle Burst */}
            <button
              type="button"
              onClick={handleManualCelebrate}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/25 flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Trigger Milestone Victory Fanfare & Confetti Burst"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Celebrate</span>
            </button>

            {/* Speed Billing POS */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('cobb_open_speed_billing'));
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Open POS Speed Billing (Ctrl+B / F1)"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Speed Bill</span>
              <span className="text-[9px] px-1 py-0.2 bg-black/30 rounded font-mono hidden sm:inline">⌃B</span>
            </button>

            {typeof setShowReconModal === 'function' && (
              <button
                type="button"
                onClick={() => setShowReconModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-white/[0.08] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                title="EOD Cash Drawer Reconcile"
              >
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Cash Recon</span>
              </button>
            )}

            {typeof setShowEodModal === 'function' && (
              <button
                type="button"
                onClick={() => setShowEodModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-white/[0.08] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                title="Generate EOD Store Summary"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">EOD</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowMissionControl(true)}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Open Fullscreen TV Wall / Mission Control Mode (Ctrl+Shift+T)"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV Wall</span>
            </button>
          </div>

          {/* Perspective Selector Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/50 p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.08] text-xs font-bold overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: 'bento', label: '✨ Executive Bento V2' },
              { id: 'racing', label: '🏁 Floor Race & Rush' },
              { id: 'counter', label: '🏷️ Counter Desk' }
            ].map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setActivePerspective(view.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-black flex items-center gap-1 whitespace-nowrap active:scale-95 ${
                  activePerspective === view.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/[0.1]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{view.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          TIER 1: HERO EXECUTIVE KPI STRIP (FROSTED GLASS MODULES)
          (Visible in 'bento', 'racing', and 'counter' perspectives)
          ========================================================================= */}
      {activePerspective !== 'fleet' && (
        <ExecutiveKpiStrip
          darkMode={darkMode}
          formatCurrency={formatCurrency}
          overviewStats={overviewStats}
          DAILY_TARGET={DAILY_TARGET}
          targetProgress={targetProgress}
          averageOrderValue={averageOrderValue}
          totalMonthlyUnits={totalMonthlyUnits}
          userRole={userRole}
          setActiveTab={setActiveTab}
          setShowReconModal={setShowReconModal}
          pnlData={pnlData}
          dailySales={dailySales}
        />
      )}

      {/* =========================================================================
          TIER 2: PRIMARY EXECUTIVE BENTO GRID (12 COLUMNS)
          (Visible in 'bento' mode)
          ========================================================================= */}
      {activePerspective === 'bento' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* ---------------------------------------------------------------------
              LEFT WING (7 COLUMNS): LIVE OPERATIONS STREAM & STORE TELEMETRY
              --------------------------------------------------------------------- */}
          <div className="lg:col-span-7 space-y-5">
            {/* CARD A1: LIVE STORE PULSE STREAM */}
            <div className="glass-card-obsidian rounded-2xl overflow-hidden flex flex-col h-[460px] sm:h-[480px]">
              {/* Card Header with Controls */}
              <div className="p-3.5 sm:p-4 border-b border-inherit flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Live Store Pulse</span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Real-time checkout river &amp; customer transactions
                    </p>
                  </div>
                </div>

                {/* Filter and View All Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mode Filters */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/40 p-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.06] text-[10px] font-bold">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'cash', label: '💵 Cash' },
                      { id: 'upi', label: '⚡ UPI' },
                      { id: 'card', label: '💳 Card' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPulseModeFilter(m.id)}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold ${
                          pulseModeFilter === m.id
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {typeof setActiveTab === 'function' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('live')}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-1"
                    >
                      <span>View All ({todayBills.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Instant Search Bar inside Pulse Card */}
              <div className="px-3.5 sm:px-4 py-2 border-b border-inherit bg-slate-100/40 dark:bg-black/20 flex items-center gap-2 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={pulseSearchQuery}
                  onChange={(e) => setPulseSearchQuery(e.target.value)}
                  placeholder="Filter today's stream by customer, phone, or bill #..."
                  className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                />
                {pulseSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPulseSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Pulse Stream Content */}
              <div className="divide-y divide-slate-100 dark:divide-white/[0.04] flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {filteredPulseBills.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center h-full">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-2 border border-blue-500/20">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                      {pulseSearchQuery ? 'No matching transactions' : 'No Bills Recorded Today Yet'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {pulseSearchQuery
                        ? 'Try clearing your search query'
                        : 'Store POS listening • checkouts will stream here in real time'}
                    </p>
                  </div>
                ) : (
                  filteredPulseBills.map((bill, idx) => {
                    // Resolve payment badge
                    let mode = bill.PaymentMode;
                    const cash = Number(bill.CashAmount || 0);
                    const upi = Number(bill.UpiAmount || 0);
                    const card = Number(bill.CardAmount || 0);
                    if (!mode || mode === 'Cash') {
                      if (upi > 0 && cash === 0 && card === 0) mode = 'UPI / Online';
                      else if (card > 0 && cash === 0 && upi === 0) mode = 'Debit / Credit Card';
                      else if ((cash > 0 && upi > 0) || (cash > 0 && card > 0) || (upi > 0 && card > 0))
                        mode = 'Split Payment';
                      else mode = mode || 'Cash';
                    }

                    const isUPI = mode === 'UPI / Online' || mode?.toLowerCase().includes('upi');
                    const isCard = mode === 'Debit / Credit Card' || mode?.toLowerCase().includes('card');
                    const isSplit = mode?.toLowerCase().includes('split');

                    const badgeStyle = isUPI
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : isCard
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : isSplit
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                    const badgeLabel = isUPI ? '⚡ UPI' : isCard ? '💳 Card' : isSplit ? '🔀 Split' : '💵 Cash';

                    const custName = bill.CustomerName?.trim() || bill.FirstName?.trim() || 'Guest Customer';
                    const initials = custName.slice(0, 2).toUpperCase();

                    return (
                      <div
                        key={bill.BillId || bill.BillNumber || idx}
                        onClick={() => typeof setActiveTab === 'function' && setActiveTab('live')}
                        className="p-3 sm:p-3.5 transition-colors flex justify-between items-center cursor-pointer group hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          {/* Avatar Initials */}
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-[11px] font-black text-slate-700 dark:text-slate-200 shrink-0 border border-slate-300/40 dark:border-white/[0.08]">
                            {initials}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-bold truncate text-slate-900 dark:text-slate-100 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                {custName}
                              </p>
                              <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                                {badgeLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span className="font-mono">
                                {new Date(bill.BillTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span>•</span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">#{bill.BillNumber}</span>
                              {bill.TotalQty && (
                                <>
                                  <span>•</span>
                                  <span>{bill.TotalQty} pcs</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs sm:text-sm font-mono font-black px-2.5 py-1 rounded-xl text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                            {formatCurrency(bill.Amount)}
                          </span>

                          {typeof handlePrintBill === 'function' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintBill(bill);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-all cursor-pointer"
                              title="Print Thermal Bill"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pulse Footer Summary */}
              <div className="p-2.5 sm:p-3 border-t border-inherit bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                <div className="flex items-center gap-3">
                  <span>
                    Gross: <strong className="text-slate-900 dark:text-white font-mono">{formatCurrency(totalTodayGross)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Cash: <strong className="text-emerald-500 font-mono">{formatCurrency(totalTodayCash)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Digital: <strong className="text-purple-400 font-mono">{formatCurrency(totalTodayDigital)}</strong>
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-400">
                  {todayBills.length} completed
                </div>
              </div>
            </div>

            {/* CARD A2: LIVE STORE INTELLIGENCE RIBBON */}
            <LivePulseFeed
              hourlySales={hourlySales}
              liveBills={liveBills}
              vips={vips}
              setActiveTab={setActiveTab}
              darkMode={darkMode}
              todayTopArticlesLoading={todayTopArticlesLoading}
              todayTopArticles={todayTopArticles}
              setShowAlterationModal={setShowAlterationModal}
              activeStore={activeStore}
              API_BASE={API_BASE}
            />

            {/* CARD A3: WHATSAPP AUTOMATION ENGINE CAPSULE */}
            <div className="glass-card-obsidian p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <span>WhatsApp Customer Automation</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    {Array.isArray(automationDispatches) && automationDispatches.length > 0
                      ? `${automationDispatches.length} messages dispatched today • Queue Active`
                      : 'Gateway listening • ready for instant bill notifications & offer blasts'}
                  </p>
                </div>
              </div>

              {typeof setActiveTab === 'function' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('broadcast')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-white/[0.08] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                >
                  <span>Broadcast Desk</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              RIGHT WING (5 COLUMNS): STRATEGIC TELEMETRY & SUPPLY CHAIN
              --------------------------------------------------------------------- */}
          <div className="lg:col-span-5 space-y-5">
            {/* CARD B1: SALES PERFORMANCE CALENDAR */}
            <div className="glass-card-obsidian p-4 sm:p-5 rounded-2xl relative overflow-visible">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-inherit">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                      Sales Performance Calendar
                    </h3>
                    <p className="text-[11px] text-slate-400">Click highlighted days for payment split</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-black/40 px-2 py-1 rounded-xl border border-slate-200/80 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))
                    }
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 min-w-[65px] text-center">
                    {calendarDate.toLocaleString('default', { month: 'short', year: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
                    }
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  {calendarDate.getMonth() !== new Date().getMonth() ||
                  calendarDate.getFullYear() !== new Date().getFullYear() ? (
                    <button
                      type="button"
                      onClick={() => setCalendarDate(new Date())}
                      className="text-[10px] font-bold text-blue-400 ml-1 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Now
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Month-to-date Pill */}
              <div className="mb-3 p-2.5 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400">MTD Total:</span>
                <span className="font-mono font-black text-slate-900 dark:text-white">
                  {formatCurrency(mtdTotalSales)}
                </span>
                <span className="text-slate-500 dark:text-slate-400">Avg:</span>
                <span className="font-mono font-bold text-emerald-500">
                  {formatCurrency(Math.round(mtdTotalSales / Math.max(1, daysInCurMonth)))}/d
                </span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div key={day} className="text-[10px] font-bold uppercase text-slate-400 text-center py-1">
                    {day}
                  </div>
                ))}

                {Array.from({
                  length: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay()
                }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8"></div>
                ))}

                {Array.from({
                  length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate()
                }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayData = (Array.isArray(dailySales) ? dailySales : []).find(
                    (d) => d.SaleDate && d.SaleDate.startsWith(dateStr)
                  );
                  const hasSales = dayData && dayData.TotalSales > 0;

                  const dayOfWeek = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).getDay();
                  let tooltipPositionClass = 'left-1/2 -translate-x-1/2';
                  if (dayOfWeek <= 1) tooltipPositionClass = 'left-0';
                  else if (dayOfWeek >= 5) tooltipPositionClass = 'right-0';

                  return (
                    <div key={day} className="relative flex items-center justify-center h-8">
                      <button
                        type="button"
                        onClick={() => {
                          if (hasSales) {
                            setSelectedCalendarDay(selectedCalendarDay === day ? null : day);
                          }
                        }}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-mono font-semibold transition-all ${
                          hasSales ? 'cursor-pointer' : 'cursor-default'
                        } ${
                          hasSales
                            ? selectedCalendarDay === day
                              ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/30 border border-blue-400 scale-105 font-black'
                              : darkMode
                                ? 'bg-blue-500/20 text-white font-bold border border-blue-500/40 hover:bg-blue-500/30 shadow-md shadow-[#0a0f1a]'
                                : 'bg-blue-100 text-blue-900 font-bold border border-blue-300 hover:bg-blue-200 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {day}
                      </button>

                      {/* Tooltip Popover */}
                      {hasSales && selectedCalendarDay === day && (
                        <div
                          className={`absolute bottom-full mb-2 w-52 bg-[#0e1422] border border-slate-700/80 text-white text-xs rounded-xl p-3 z-[60] shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${tooltipPositionClass}`}
                        >
                          <div className="font-bold border-b border-slate-800 pb-1 mb-1.5 text-slate-200 flex justify-between items-center">
                            <span>
                              {new Date(dateStr).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCalendarDay(null);
                              }}
                              className="text-slate-400 hover:text-white p-1 -mr-1 rounded cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex justify-between items-center mb-1 font-mono">
                            <span className="text-slate-400 font-sans">Total:</span>
                            <span className="font-black text-emerald-400">{formatCurrency(dayData.TotalSales)}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1 text-xs font-mono">
                            <span className="text-slate-400 font-sans flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>Cash:
                            </span>
                            <span>{formatCurrency(dayData.CashAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1 text-xs font-mono">
                            <span className="text-slate-400 font-sans flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>UPI:
                            </span>
                            <span>{formatCurrency(dayData.UPIAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-slate-400 font-sans flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>Card:
                            </span>
                            <span>{formatCurrency(dayData.CardAmount || 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CARD B2: GOODS IN TRANSIT DESK */}
            <GoodsInTransitDesk
              formatCurrency={formatCurrency}
              darkMode={darkMode}
              API_BASE={API_BASE}
              setActiveTab={setActiveTab}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          TIER 3: GAMIFIED FLOOR RACE GRAND PRIX & EXECUTIVE RUSH HEATMAP
          (Side-by-Side balanced split in 'bento', full stage in 'racing')
          ========================================================================= */}
      {(activePerspective === 'bento' || activePerspective === 'racing') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-inherit">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-black shadow-xs">
                🏁
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Floor Race Grand Prix &amp; Rush Velocity Radar
                </h3>
                <p className="text-[11px] text-slate-400">
                  Staff gamified racetracks &amp; 24-hour customer rush velocity
                </p>
              </div>
            </div>

            {activePerspective === 'bento' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRacingTileSmall(prev => !prev)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    darkMode
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title={racingTileSmall ? "Expand to Full Size" : "Make Tile Small"}
                >
                  {racingTileSmall ? (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-amber-500" />
                      <span className="hidden sm:inline">Expand Size</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-amber-500" />
                      <span className="hidden sm:inline">Make Small</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActivePerspective('racing')}
                  className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                >
                  <span>Stage Mode</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div
            className={`grid gap-5 sm:gap-6 items-start ${
              activePerspective === 'bento' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {/* Gamified Floor Race Grand Prix */}
            <StaffFloorRaceWidget
              darkMode={darkMode}
              formatCurrency={formatCurrency}
              API_BASE={API_BASE}
              activeStore={activeStore}
              setActiveTab={setActiveTab}
              compact={activePerspective === 'bento' && racingTileSmall}
            />

            {/* Executive Rush Heatmap & Velocity Radar */}
            <ExecutiveVisualHeatmap
              hourlySales={hourlySales}
              liveBills={liveBills}
              DAILY_TARGET={DAILY_TARGET}
              averageOrderValue={averageOrderValue}
              formatCurrency={formatCurrency}
              darkMode={darkMode}
              setActiveTab={setActiveTab}
              compact={activePerspective === 'bento' && racingTileSmall}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          TIER 4: HIGH-SPEED COUNTER OPERATIONS DESK (QUICK TOOLS COCKPIT)
          (Rendered at bottom in 'bento', or primary in 'counter')
          ========================================================================= */}
      {(activePerspective === 'bento' || activePerspective === 'counter') && (
        <div className="space-y-4">
          {activePerspective === 'counter' && (
            <div className="flex items-center gap-2 pb-2 border-b border-inherit">
              <span className="p-1.5 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-xs">
                🏷️
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Counter Speed Operations Cockpit
                </h3>
                <p className="text-[11px] text-slate-400">
                  Barcode matrix scanner, counter offer calculator, customer holds &amp; pocket khata
                </p>
              </div>
            </div>
          )}

          <QuickToolsWidget
            dashboardZone="all"
            overviewStats={overviewStats}
            khataSummary={khataSummary}
            holds={holds}
            quickScanInputRef={quickScanInputRef}
            quickScanQuery={quickScanQuery}
            setQuickScanQuery={setQuickScanQuery}
            isScannerFocused={isScannerFocused}
            setIsScannerFocused={setIsScannerFocused}
            quickScanResult={quickScanResult}
            setQuickScanResult={setQuickScanResult}
            quickScanError={quickScanError}
            setQuickScanError={setQuickScanError}
            handleQuickScan={handleQuickScan}
            setActiveTab={setActiveTab}
            calcOffer={calcOffer}
            setCalcOffer={setCalcOffer}
            calcMrp={calcMrp}
            setCalcMrp={setCalcMrp}
            b1g3Items={b1g3Items}
            setB1g3Items={setB1g3Items}
            formatCurrency={formatCurrency}
            darkMode={darkMode}
            setShowAlterationModal={setShowAlterationModal}
          />
        </div>
      )}

      {/* =========================================================================
          TIER 5: MULTI-STORE FLEET BENCHMARK MATRIX (STORE 01 VS STORE 02)
          ========================================================================= */}
      {activePerspective === 'fleet' && (
        <MultiStoreFleetMatrix
          darkMode={darkMode}
          formatCurrency={formatCurrency}
          overviewStats={overviewStats}
          hourlySales={hourlySales}
          liveBills={liveBills}
          DAILY_TARGET={DAILY_TARGET}
          activeStore={activeStore}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Alteration Slip Modal Integration */}
      {showAlterationModal && (
        <Suspense fallback={null}>
          <AlterationSlipModal
            isOpen={showAlterationModal}
            onClose={() => setShowAlterationModal(false)}
            activeStore={activeStore}
            API_BASE={API_BASE}
            darkMode={darkMode}
          />
        </Suspense>
      )}

      {/* Mission Control / TV Wall Fullscreen Experience */}
      {showMissionControl && (
        <Suspense fallback={null}>
          <MissionControlModal
            isOpen={showMissionControl}
            onClose={() => setShowMissionControl(false)}
            overviewStats={overviewStats}
            liveBills={liveBills}
            DAILY_TARGET={DAILY_TARGET}
            targetProgress={targetProgress}
            formatCurrency={formatCurrency}
            activeStore={activeStore}
          />
        </Suspense>
      )}

    </div>
  );
};

export default ExecutiveBentoDashboard;
