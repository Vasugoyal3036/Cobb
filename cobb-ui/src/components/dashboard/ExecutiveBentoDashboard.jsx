import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import axios from 'axios';

/**
 * SyncCounter — isolated 1-second ticker.
 * Extracted from ExecutiveBentoDashboard so the 1s interval only re-renders
 * this tiny span instead of the entire dashboard component.
 */
const SyncCounter = React.memo(function SyncCounter({ resetSignal }) {
  const [sec, setSec] = useState(4);
  useEffect(() => {
    setSec(0);
  }, [resetSignal]);
  useEffect(() => {
    const t = setInterval(() => setSec(prev => prev >= 60 ? 1 : prev + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono">Synced {sec}s ago</span>;
});

import {
  Activity,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Layers,
  Package,
  Plus,
  Receipt,
  RefreshCw,
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
  Tag,
  ShoppingBag,
  Eye,
  Printer,
  Sliders,
  Check,
  X,
  Wifi,
  WifiOff,
  Tv
} from 'lucide-react';

import ExecutiveKpiStrip from './ExecutiveKpiStrip';
import GoodsInTransitDesk from '../GoodsInTransitDesk';
import QuickToolsWidget from './QuickToolsWidget';
import MultiStoreFleetMatrix from './MultiStoreFleetMatrix';

const AlterationSlipModal = lazy(() => import('../AlterationSlipModal'));
const MissionControlModal = lazy(() => import('./MissionControlModal'));

/**
 * Redesigned Executive Command Center Bento Dashboard
 * Sleek, high-contrast Obsidian Glassmorphism command center for Cobb Retail Operations.
 * Streamlined: Removes gamified racing & redundant rush heatmaps to maximize operational focus.
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
    setDailySales,
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

  // Primary Perspective Switcher: 'bento' (Executive Command Center), 'counter' (Counter Operations Cockpit), 'fleet' (Multi-Store Fleet)
  const [activePerspective, setActivePerspective] = useState('bento');
  const [showMissionControl, setShowMissionControl] = useState(false);

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
  const [syncResetSignal, setSyncResetSignal] = useState(0);
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

  // 1-tap Cloud Force Sync trigger
  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResetSignal(s => s + 1);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cobb_force_sync'));
    }
    // Also directly refresh daily sales so MTD in calendar updates immediately
    try {
      const res = await axios.get(`${API_BASE}/api/sales/daily-month?t=${Date.now()}`);
      const raw = res?.data;
      const items = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : null);
      if (items && items.length > 0) {
        if (typeof setDailySales === 'function') {
          setDailySales(items);
        }
      } else {
        // Fallback directly to Firestore doc on Phone Link / remote
        try {
          const { db } = await import('../../utils/firebase.js');
          if (db) {
            const { doc, getDoc } = await import('firebase/firestore');
            const targetStore = (typeof localStorage !== 'undefined' && localStorage.getItem('cobb_active_store') === 'STORE_02') ? 'STORE_002' : 'DEMO_STORE_001';
            let snap = await getDoc(doc(db, 'stores', targetStore, 'data', 'sales_daily-month'));
            if (!snap.exists()) {
              snap = await getDoc(doc(db, 'stores', targetStore, 'data', 'sales_daily_month'));
            }
            if (snap.exists()) {
              const data = snap.data();
              const cloudItems = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : null);
              if (cloudItems && cloudItems.length > 0 && typeof setDailySales === 'function') {
                setDailySales(cloudItems);
              }
            }
          }
        } catch (cErr) {
          console.warn('[DASHBOARD SYNC] Firestore fallback notice:', cErr.message);
        }
      }
    } catch (e) {
      console.warn('[SYNC] Direct daily sales sync notice:', e.message);
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
      }, 1000);
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

        const resolvedMode = (upi > 0 && cash === 0 && card === 0)
          ? 'upi'
          : (card > 0 && cash === 0 && upi === 0)
            ? 'card'
            : (cash > 0 && upi === 0 && card === 0)
              ? 'cash'
              : mode;

        if (pulseModeFilter === 'cash' && resolvedMode.includes('cash')) {
          // match
        } else if (pulseModeFilter === 'upi' && resolvedMode.includes('upi')) {
          // match
        } else if (pulseModeFilter === 'card' && resolvedMode.includes('card')) {
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

  const daysInCurMonth = useMemo(
    () => new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate(),
    [calendarDate]
  );

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300 pb-12">
      {/* =========================================================================
          TOP COMMAND STRIP: STORE TELEMETRY, SENTRY & PERSPECTIVE SELECTOR
          ========================================================================= */}
      <div className="glass-card-obsidian p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg shadow-black/20 border border-slate-200/80 dark:border-white/[0.08]">
        {/* Left: Brand Identity & Telemetry Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 border border-white/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                <span>Executive Command Center</span>
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                {activeStore || 'DEMO_STORE_001'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Cloud Sentry Online</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-500 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>Offline (Local Cache)</span>
                  </span>
                )}
              </span>
              <span>•</span>
              <SyncCounter resetSignal={syncResetSignal} />
            </div>
          </div>
        </div>

        {/* Right: Actions, Force Sync & Perspective Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-white/[0.08] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Force immediate sync with Cloud Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Force Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => typeof setActiveTab === 'function' && setActiveTab('owner_hub')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-white/[0.08] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Open Store Controls & Mobile Inputs"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Store Inputs</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMissionControl(true)}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Open Fullscreen TV Wall / Mission Control Mode (Ctrl+Shift+T)"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV Wall</span>
          </button>

          {/* Perspective Selector Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/50 p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.08] text-xs font-bold overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: 'bento', label: '📊 Command Center' },
              { id: 'counter', label: '🏷️ Counter Desk' },
              { id: 'fleet', label: '🏢 Multi-Store Fleet' }
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
          (Visible in 'bento' and 'counter' perspectives)
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
          TIER 2: REDESIGNED EXECUTIVE BENTO GRID (12 COLUMNS)
          ========================================================================= */}
      {activePerspective === 'bento' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* ---------------------------------------------------------------------
              LEFT WING (7 COLUMNS): LIVE STORE PULSE STREAM & COUNTER COCKPIT
              --------------------------------------------------------------------- */}
          <div className="lg:col-span-7 space-y-5">
            {/* CARD A1: LIVE STORE PULSE STREAM */}
            <div className="glass-card-obsidian rounded-2xl overflow-hidden flex flex-col h-[480px]">
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
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
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
                    if (upi > 0 && cash === 0 && card === 0) mode = 'UPI / Online';
                    else if (card > 0 && cash === 0 && upi === 0) mode = 'Debit / Credit Card';
                    else if ((cash > 0 && upi > 0) || (cash > 0 && card > 0) || (upi > 0 && card > 0))
                      mode = 'Split Payment';
                    else if (cash > 0) mode = 'Cash';
                    else mode = mode || 'Cash';

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

            {/* CARD A2: COUNTER SPEED OPERATIONS DESK (QUICK TOOLS COCKPIT) */}
            <div className="glass-card-obsidian rounded-2xl overflow-hidden p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08]">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-inherit">
                <span className="p-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black shadow-sm">
                  🏷️
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Counter Operations Cockpit
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Barcode scanner, promotional offer calculator, customer holds &amp; pocket khata
                  </p>
                </div>
              </div>

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
          </div>

          {/* ---------------------------------------------------------------------
              RIGHT WING (5 COLUMNS): STRATEGIC OPERATIONS, CALENDAR & SUPPLY CHAIN
              --------------------------------------------------------------------- */}
          <div className="lg:col-span-5 space-y-5">
            {/* CARD B1: SALES PERFORMANCE CALENDAR */}
            <div className="glass-card-obsidian p-4 sm:p-5 rounded-2xl relative overflow-visible border border-slate-200/80 dark:border-white/[0.08]">
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

            {/* CARD B3: GOODS IN TRANSIT DESK */}
            <GoodsInTransitDesk
              formatCurrency={formatCurrency}
              darkMode={darkMode}
              API_BASE={API_BASE}
              setActiveTab={setActiveTab}
            />

            {/* CARD B4: WHATSAPP AUTOMATION ENGINE CAPSULE */}
            <div className="glass-card-obsidian p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 border border-slate-200/80 dark:border-white/[0.08]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <span>WhatsApp Customer Automation</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
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
        </div>
      )}

      {/* =========================================================================
          FOCUSED PERSPECTIVE: COUNTER OPERATIONS COCKPIT
          ========================================================================= */}
      {activePerspective === 'counter' && (
        <div className="space-y-5">
          <div className="glass-card-obsidian rounded-2xl overflow-hidden p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08]">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-inherit">
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
        </div>
      )}

      {/* =========================================================================
          FOCUSED PERSPECTIVE: MULTI-STORE FLEET BENCHMARK MATRIX (STORE 01 VS STORE 02)
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
