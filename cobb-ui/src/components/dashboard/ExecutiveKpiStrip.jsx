import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  ArrowRight, 
  Settings, 
  Scale, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Sliders, 
  X, 
  Maximize2,
  LineChart,
  RotateCcw
} from 'lucide-react';
import AppleWatchRings from './AppleWatchRings';
import DynamicBreakevenTrendChart from './DynamicBreakevenTrendChart';
import { calculateDynamicBreakeven } from '../../utils/dynamicBreakevenEngine';

const ExecutiveKpiStrip = ({
  darkMode,
  formatCurrency,
  overviewStats,
  DAILY_TARGET,
  targetProgress,
  userRole,
  setActiveTab,
  setShowReconModal,
  topCardRef,
  pnlData,
  dailySales = []
}) => {
  const [localExpConfig, setLocalExpConfig] = useState(() => {
    try {
      const raw = localStorage.getItem('cobb_store_config');
      return raw ? JSON.parse(raw)?.operatingExpenses : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const handleUpdate = (e) => {
      try {
        const raw = localStorage.getItem('cobb_store_config');
        const parsed = e?.detail || (raw ? JSON.parse(raw)?.operatingExpenses : null);
        if (parsed) setLocalExpConfig(parsed);
      } catch (err) {}
    };
    const handleOpenChart = () => setShowTrendChartModal(true);
    const handleFocusBreakeven = () => {
      const el = document.getElementById('dashboard-breakeven-card');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    window.addEventListener('cobb_store_config_updated', handleUpdate);
    window.addEventListener('cobb_open_breakeven_chart', handleOpenChart);
    window.addEventListener('cobb_focus_breakeven', handleFocusBreakeven);

    return () => {
      window.removeEventListener('cobb_store_config_updated', handleUpdate);
      window.removeEventListener('cobb_open_breakeven_chart', handleOpenChart);
      window.removeEventListener('cobb_focus_breakeven', handleFocusBreakeven);
    };
  }, []);

  // Merge with precedence given to immediate local edits over pnlData
  const expCfg = {
    ...(pnlData?.operatingExpenses || {}),
    ...(localExpConfig || {})
  };
  const targetMargin = Number(expCfg?.targetMarginPct ?? 27);
  const marginFrac = targetMargin / 100;

  const totalMonthlyExp = Number(expCfg?.totalExpenses ?? 101000);
  const DAILY_EXPENSE = Number(
    expCfg?.dailyExpense ??
    expCfg?.dailyOpEx ??
    expCfg?.dailyAmortizedExpense ??
    Math.round(totalMonthlyExp / 30)
  );
  const bep = Number(
    expCfg?.dailyBreakEvenSales ??
    (marginFrac > 0 ? Math.round(DAILY_EXPENSE / marginFrac) : Math.round(DAILY_EXPENSE / 0.27))
  );

  const dynamicBEPData = useMemo(() => {
    return calculateDynamicBreakeven({
      dailySales,
      storeConfig: localExpConfig ? { operatingExpenses: localExpConfig } : null,
      pnlData,
      overviewStats
    });
  }, [dailySales, localExpConfig, pnlData, overviewStats]);

  // --- Dynamic Daily Breakeven Figures ---
  const todayAdjustedBEP = dynamicBEPData?.today?.adjustedBEPToday !== undefined 
    ? dynamicBEPData.today.adjustedBEPToday 
    : bep;
  const isSurplus = dynamicBEPData?.today?.isSurplus;
  const isDeficit = dynamicBEPData?.today?.isDeficit;
  const surplusProfit = dynamicBEPData?.today?.surplusProfit || 0;
  const carriedDeficit = dynamicBEPData?.today?.carriedDeficit || 0;
  const salesAdjustmentAmount = dynamicBEPData?.today?.salesAdjustmentAmount || Math.round((carriedDeficit || surplusProfit) / (marginFrac || 0.27));

  const todaySales = Number(overviewStats?.today?.TotalSales || 0);
  const isTodayBreakevenMet = todaySales >= todayAdjustedBEP;
  const remainingTodayBEP = Math.max(0, todayAdjustedBEP - todaySales);
  const todayBEPProgressPct = todayAdjustedBEP > 0
    ? Math.min(100, Math.round((todaySales / todayAdjustedBEP) * 100))
    : 100;
  const todayGrossProfit = Math.round(todaySales * marginFrac);
  const todayNetProfit = todayGrossProfit - DAILY_EXPENSE;
  const isTodayProfitable = todayNetProfit >= 0;

  // Real-time store operating pace estimate (store opens 10:00, closes 20:30)
  const now = new Date();
  const currentHourFloat = now.getHours() + (now.getMinutes() / 60);
  const storeClosingHour = 20.5;
  const storeOpeningHour = 10.0;
  const hoursLeftToday = Math.max(1, Math.min(10.5, storeClosingHour - Math.max(storeOpeningHour, currentHourFloat)));
  const hourlyRunRateNeeded = Math.round(remainingTodayBEP / hoursLeftToday);
  const billsNeededEstimate = Math.ceil(remainingTodayBEP / 3500);

  // --- Monthly Breakeven Figures ---
  const monthlyFixedOpEx = totalMonthlyExp;
  const monthlyBEP = marginFrac > 0
    ? Math.round(monthlyFixedOpEx / marginFrac)
    : Math.round(monthlyFixedOpEx / 0.27);
  const mtdSales = Number(overviewStats?.thisMonth?.TotalSales || 0);
  const isMonthBEPMet = mtdSales >= monthlyBEP;
  const remainingMonthBEP = Math.max(0, monthlyBEP - mtdSales);
  const monthBEPProgressPct = monthlyBEP > 0
    ? Math.min(100, Math.round((mtdSales / monthlyBEP) * 100))
    : 100;
  const monthRollingBalance = dynamicBEPData?.monthSummary?.rollingNetBalance !== undefined
    ? dynamicBEPData.monthSummary.rollingNetBalance
    : (Math.round(mtdSales * marginFrac) - monthlyFixedOpEx);
  const isMonthProfitable = monthRollingBalance >= 0;

  const currentDayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, daysInMonth - currentDayOfMonth);
  const dailyPaceNeededForMonth = Math.round(remainingMonthBEP / daysRemainingInMonth);
  const projectedMonthSales = Math.round((mtdSales / Math.max(1, currentDayOfMonth)) * daysInMonth);
  const mtdMarginEarned = Math.round(mtdSales * marginFrac);
  const costCoveredPct = monthlyFixedOpEx > 0 ? Math.min(100, Math.round((mtdMarginEarned / monthlyFixedOpEx) * 100)) : 100;

  const profitDaysCount = dynamicBEPData?.monthSummary?.profitDaysCount || 0;
  const lossDaysCount = dynamicBEPData?.monthSummary?.lossDaysCount || 0;
  const totalDaysTracked = dynamicBEPData?.monthSummary?.daysTracked || Math.max(1, currentDayOfMonth);

  // Component States
  const [targetViewMode, setTargetViewMode] = useState('rings');
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [simExtraSales, setSimExtraSales] = useState(5000);
  const [showTrendChartModal, setShowTrendChartModal] = useState(false);

  // --- Feature 3: Live Breakeven Celebration Fanfare Engine ---
  const todayDateStr = now.toISOString().slice(0, 10);

  const triggerBreakevenCelebration = (isManual = false) => {
    window.dispatchEvent(new CustomEvent('cobb_celebrate', {
      detail: {
        title: '🏆 DAILY BREAKEVEN CONQUERED!',
        subtitle: `Store cleared today's hurdle of ${formatCurrency(todayAdjustedBEP)}! Current sales hit ${formatCurrency(todaySales)}. All further sales are 100% PURE PROFIT!`,
        badge: 'Pure Profit Zone',
        type: 'breakeven_cleared'
      }
    }));
  };

  useEffect(() => {
    if (isTodayBreakevenMet && todaySales > 0 && todayAdjustedBEP > 0) {
      const fanfareKey = `cobb_bep_celebrated_${todayDateStr}`;
      if (!localStorage.getItem(fanfareKey)) {
        localStorage.setItem(fanfareKey, 'true');
        triggerBreakevenCelebration(false);
      }
    }
  }, [isTodayBreakevenMet, todaySales, todayAdjustedBEP, todayDateStr]);

  // --- Feature 5: What-If Simulator Real-Time Computation ---
  const simTotalSales = todaySales + Number(simExtraSales || 0);
  const simExtraMargin = Math.round(Number(simExtraSales || 0) * marginFrac);
  const simTodayNetProfit = todayNetProfit + simExtraMargin;
  
  const carriedBalanceBeforeToday = dynamicBEPData?.today?.carriedBalance !== undefined
    ? dynamicBEPData.today.carriedBalance
    : (isDeficit ? -carriedDeficit : surplusProfit);
  
  const simRollingBalanceAfter = carriedBalanceBeforeToday + simTodayNetProfit;
  
  let simTomorrowCost = DAILY_EXPENSE;
  if (simRollingBalanceAfter < 0) {
    simTomorrowCost = DAILY_EXPENSE + Math.abs(simRollingBalanceAfter);
  } else if (simRollingBalanceAfter > 0) {
    simTomorrowCost = Math.max(0, DAILY_EXPENSE - simRollingBalanceAfter);
  }
  const simTomorrowBEP = marginFrac > 0 ? Math.round(simTomorrowCost / marginFrac) : 0;
  const isSimTomorrowPrePaid = simTomorrowBEP === 0;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
        {/* =========================================================================
            CARD 1: REVENUE CARD WITH TRENDS & PAYMENT BREAKDOWN
            ========================================================================= */}
        <div ref={topCardRef} className={`col-span-1 p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${
          darkMode ? 'kpi-card-revenue text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">Today's Revenue</span>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-1">
                {formatCurrency(todaySales)}
              </h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-2">
            {/* vs Yesterday */}
            <div className="flex items-center gap-1.5">
              {(() => {
                const diff = (overviewStats?.yesterday?.TotalSales || 0) > 0
                  ? ((((overviewStats?.today?.TotalSales || 0) - (overviewStats?.yesterday?.TotalSales || 0)) / (overviewStats?.yesterday?.TotalSales || 0)) * 100).toFixed(1)
                  : (overviewStats?.today?.TotalSales || 0) > 0 ? 100 : 0;
                const isUp = diff >= 0;
                return (
                  <>
                    <span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded border ${
                      isUp 
                        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' 
                        : 'text-rose-400 bg-rose-950/40 border-rose-800/50'
                    }`}>
                      {isUp ? '↑' : '↓'} {Math.abs(diff)}%
                    </span>
                    <span className="text-slate-400 text-xs font-medium">vs yest</span>
                  </>
                );
              })()}
            </div>
            {/* vs Last Week */}
            <div className="flex items-center gap-1.5">
              {(() => {
                const thisW = overviewStats?.thisWeek?.TotalSales || 0;
                const lastW = overviewStats?.lastWeek?.TotalSales || 0;
                const diff = lastW > 0 ? (((thisW - lastW) / lastW) * 100).toFixed(1) : (thisW > 0 ? 100 : 0);
                const isUp = diff >= 0;
                return (
                  <>
                    <span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded border ${
                      isUp 
                        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' 
                        : 'text-rose-400 bg-rose-950/40 border-rose-800/50'
                    }`}>
                      {isUp ? '↑' : '↓'} {Math.abs(diff)}%
                    </span>
                    <span className="text-slate-400 text-xs font-medium">WoW</span>
                  </>
                );
              })()}
            </div>
            {/* vs Last Month */}
            <div className="flex items-center gap-1.5">
              {(() => {
                const thisM = overviewStats?.thisMonth?.TotalSales || 0;
                const lastM = overviewStats?.lastMonth?.TotalSales || 0;
                const diff = lastM > 0 ? (((thisM - lastM) / lastM) * 100).toFixed(1) : (thisM > 0 ? 100 : 0);
                const isUp = diff >= 0;
                return (
                  <>
                    <span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded border ${
                      isUp 
                        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' 
                        : 'text-rose-400 bg-rose-950/40 border-rose-800/50'
                    }`}>
                      {isUp ? '↑' : '↓'} {Math.abs(diff)}%
                    </span>
                    <span className="text-slate-400 text-xs font-medium">MoM</span>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-1.5 text-xs font-bold tracking-wide">
            <div className={`flex flex-col justify-center items-center py-1.5 px-1 rounded-xl border ${darkMode ? 'bg-[#080d14]/90 text-emerald-400 border-[#1a2538]' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">Cash</span>
              <span className="text-xs sm:text-sm font-mono font-black">{formatCurrency((overviewStats?.today?.CashAmount || 0))}</span>
            </div>
            <div className={`flex flex-col justify-center items-center py-1.5 px-1 rounded-xl border ${darkMode ? 'bg-[#080d14]/90 text-purple-400 border-[#1a2538]' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
              <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">UPI</span>
              <span className="text-xs sm:text-sm font-mono font-black">{formatCurrency((overviewStats?.today?.UPIAmount || 0))}</span>
            </div>
            <div className={`flex flex-col justify-center items-center py-1.5 px-1 rounded-xl border ${darkMode ? 'bg-[#080d14]/90 text-blue-400 border-[#1a2538]' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
              <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">Card</span>
              <span className="text-xs sm:text-sm font-mono font-black">{formatCurrency((overviewStats?.today?.CardAmount || 0))}</span>
            </div>
          </div>

          {setShowReconModal && (
            <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-medium">Counter Drawer</span>
              <button
                type="button"
                onClick={() => setShowReconModal(true)}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Reconcile</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            CARD 2: DAILY SALES TARGET / PACE (APPLE WATCH RINGS OR BAR)
            ========================================================================= */}
        <div className={`col-span-1 p-3.5 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden ${
          darkMode ? 'kpi-card-target text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">Daily Target</span>
                {userRole === 'owner' && (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('cobb_open_store_expenses'))}
                    className="p-0.5 rounded text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Click to edit Daily Target & Store Expenses"
                  >
                    <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                )}
              </div>
              <h3 className="text-lg sm:text-2xl lg:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(DAILY_TARGET)}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTargetViewMode((m) => (m === 'rings' ? 'bar' : 'rings'))}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 hover:bg-white/20 text-slate-300 transition-all cursor-pointer"
                title={targetViewMode === 'rings' ? 'Switch to Bar View' : 'Switch to 3-Ring Activity Halo'}
              >
                {targetViewMode === 'rings' ? '⭕ Rings' : '📊 Bar'}
              </button>
              <span className="text-[10px] sm:text-xs font-bold font-mono px-1.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                {targetProgress.toFixed(0)}%
              </span>
            </div>
          </div>

          {targetViewMode === 'rings' ? (
            <div className="my-2 relative z-10 flex items-center justify-center">
              <AppleWatchRings
                size={92}
                todaySales={overviewStats?.today?.TotalSales || 0}
                dailyTarget={DAILY_TARGET}
                todayBills={overviewStats?.today?.BillCount || 0}
                expectedBills={Math.max(15, Math.round(DAILY_TARGET / 3500))}
                targetMargin={targetMargin}
                actualMargin={targetMargin}
                formatCurrency={formatCurrency}
                showLegend={true}
              />
            </div>
          ) : (
            <div className="mt-2.5 relative z-10">
              <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-1000 shadow-xs"
                  style={{ width: `${Math.min(100, targetProgress)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-400 mt-1.5 font-medium">
                <span>{formatCurrency(Math.max(0, DAILY_TARGET - (overviewStats?.today?.TotalSales || 0)))} left</span>
                <span className="text-blue-400 font-bold hidden sm:inline">On Pace</span>
              </div>
            </div>
          )}

          <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-xs flex justify-between items-center text-slate-400 relative z-10">
            <span className="font-medium">Run Rate:</span>
            <span className="font-mono font-bold text-slate-200">
              {formatCurrency(Math.round(Math.max(0, DAILY_TARGET - (overviewStats?.today?.TotalSales || 0)) / 5))}/hr
            </span>
          </div>
        </div>

        {/* =========================================================================
            CARD 3: DAILY BREAKEVEN (DETAILED 2-WAY DYNAMIC METRIC ENGINE + SIMULATOR)
            ========================================================================= */}
        <div id="dashboard-breakeven-card" className={`col-span-1 p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden ${
          darkMode ? 'kpi-card-daily-bep bg-slate-900/95 border-amber-500/30 text-white shadow-amber-950/20' : 'bg-white border-amber-200 text-slate-900 shadow-amber-50'
        }`}>
          <div className="space-y-2 relative z-10">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-wider block">Daily Breakeven</span>
                  {userRole === 'owner' && (
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new Event('cobb_open_store_expenses'))}
                      className="p-0.5 rounded text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                      title="Click to edit Daily OpEx & Margin %"
                    >
                      <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black font-mono tracking-tight text-amber-400 mt-0.5">
                  {todayAdjustedBEP === 0 ? '₹0 (Pre-Paid 🎉)' : formatCurrency(todayAdjustedBEP)}
                </h3>
              </div>

              <div className="flex flex-col items-end gap-1">
                {/* Feature 3: Celebration button or status pill */}
                {isTodayBreakevenMet ? (
                  <button
                    type="button"
                    onClick={() => triggerBreakevenCelebration(true)}
                    className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 font-black text-[9.5px] flex items-center gap-1 shadow-sm cursor-pointer animate-pulse hover:scale-105 transition-transform"
                    title="Replay Breakeven Fanfare & Confetti Explosion"
                  >
                    <Sparkles className="w-3 h-3 text-slate-950 fill-slate-950" /> Fanfare 🎉
                  </button>
                ) : (
                  <span className={`text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-lg border ${
                    isSurplus 
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : isDeficit 
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {isSurplus 
                      ? `+${formatCurrency(surplusProfit)} Cushion` 
                      : isDeficit 
                        ? `+${formatCurrency(carriedDeficit)} Deficit` 
                        : 'Base Target'}
                  </span>
                )}
                <span className="text-[10px] font-mono text-slate-400">
                  Base: {formatCurrency(bep)}
                </span>
              </div>
            </div>

            {/* Feature 5: Expandable What-If Simulator Panel */}
            {showWhatIf ? (
              <div className="p-3 rounded-xl border border-amber-500/40 bg-slate-950/90 space-y-2 animate-fade-in font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-amber-400" /> What-If Sales Simulator
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWhatIf(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Extra Sales Today:</span>
                    <span className="font-bold text-amber-300">+{formatCurrency(simExtraSales)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="1000"
                    value={simExtraSales}
                    onChange={(e) => setSimExtraSales(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex gap-1 pt-0.5">
                    {[2000, 5000, 10000, 20000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSimExtraSales(amt)}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] border cursor-pointer ${
                          simExtraSales === amt 
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' 
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        +₹{amt / 1000}k
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSimExtraSales(0)}
                      className="px-1.5 py-0.5 rounded text-[9.5px] border bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 ml-auto cursor-pointer flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> 0
                    </button>
                  </div>
                </div>

                {/* Simulated Impact Box */}
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Simulated Today Sales:</span>
                    <span className="font-bold text-slate-200">{formatCurrency(simTotalSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Today Net Profit:</span>
                    <span className={`font-bold ${simTodayNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {simTodayNetProfit >= 0 ? `+${formatCurrency(simTodayNetProfit)}` : `-${formatCurrency(Math.abs(simTodayNetProfit))}`}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1">
                    <span className="text-amber-400 font-bold">Tomorrow's New BEP:</span>
                    <span className={`font-bold ${isSimTomorrowPrePaid ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {isSimTomorrowPrePaid ? '₹0 (100% Pre-Paid 🎉)' : formatCurrency(simTomorrowBEP)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Detailed Financial Sub-Grid (OpEx Cost vs Gross Margin) */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs font-mono">
                  <div className={`p-1.5 rounded-xl border flex flex-col justify-center ${darkMode ? 'bg-[#080d14]/70 border-[#1a2538]' : 'bg-amber-50/60 border-amber-200/70'}`}>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Base Daily OpEx</span>
                    <span className="font-bold text-slate-200 mt-0.5">₹{DAILY_EXPENSE.toLocaleString('en-IN')}/day</span>
                    <span className="text-[9px] text-slate-400">Fixed Cost (27%)</span>
                  </div>
                  <div className={`p-1.5 rounded-xl border flex flex-col justify-center ${darkMode ? 'bg-[#080d14]/70 border-[#1a2538]' : 'bg-emerald-50/60 border-emerald-200/70'}`}>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Margin Earned</span>
                    <span className="font-bold text-emerald-400 mt-0.5">+{formatCurrency(todayGrossProfit)}</span>
                    <span className="text-[9px] text-slate-400">{Math.round((todaySales * marginFrac) > 0 ? ((todaySales * marginFrac) / DAILY_EXPENSE) * 100 : 0)}% of Daily OpEx</span>
                  </div>
                </div>

                {/* Progress Bar & Gap Info */}
                <div className="pt-1">
                  <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 shadow-xs ${
                        isTodayBreakevenMet
                          ? 'bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500'
                          : 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400'
                      }`}
                      style={{ width: `${Math.min(100, todayBEPProgressPct)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px] mt-1.5 font-medium">
                    <span className="text-slate-400 font-mono">
                      Sales: {formatCurrency(todaySales)} <span className="font-bold text-amber-400">({todayBEPProgressPct}%)</span>
                    </span>
                    {isTodayBreakevenMet ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Met Today
                      </span>
                    ) : (
                      <span className="text-amber-400 font-mono font-bold">
                        {formatCurrency(remainingTodayBEP)} left
                      </span>
                    )}
                  </div>
                </div>

                {/* Pacing / Pure Profit Indicator */}
                <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono pt-0.5">
                  {isTodayBreakevenMet ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" /> Pure Profit Mode Active!
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      Pace needed: <strong className="text-amber-300">~{formatCurrency(hourlyRunRateNeeded)}/hr</strong> ({billsNeededEstimate} bills)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowWhatIf(true)}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 cursor-pointer flex items-center gap-0.5"
                    title="Simulate extra sales impact on tomorrow's BEP"
                  >
                    <Sliders className="w-2.5 h-2.5" /> What-If
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer info: Net P&L & Quick Actions */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10.5px] flex justify-between items-center text-slate-400 relative z-10">
            <div className="flex items-center gap-1 font-mono font-bold">
              <span className="text-slate-500 dark:text-slate-400 font-normal">Today Net:</span>
              <span className={isTodayProfitable ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                {isTodayProfitable ? `+${formatCurrency(todayNetProfit)}` : `-${formatCurrency(Math.abs(todayNetProfit))}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTrendChartModal(true)}
                className="font-bold text-slate-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer transition-colors"
                title="View Visual Compounding Curve Chart"
              >
                <LineChart className="w-3 h-3 text-amber-400" />
                <span>Chart</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab ? setActiveTab('pocket_khata') : window.dispatchEvent(new Event('cobb_open_store_expenses'))}
                className="font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer transition-colors"
                title="Open Dynamic Breakeven Ledger"
              >
                <span>Ledger</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 4: MONTHLY BREAKEVEN (DETAILED MTD OPEX RECOVERY & CUMULATIVE HEALTH)
            ========================================================================= */}
        <div className={`col-span-1 p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden ${
          darkMode ? 'kpi-card-monthly-bep bg-slate-900/95 border-indigo-500/30 text-white shadow-indigo-950/20' : 'bg-white border-indigo-200 text-slate-900 shadow-indigo-50'
        }`}>
          <div className="space-y-2 relative z-10">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-wider block">Monthly Breakeven</span>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black font-mono tracking-tight text-indigo-400 dark:text-indigo-300 mt-0.5">
                  {formatCurrency(monthlyBEP)}
                </h3>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  Day {currentDayOfMonth}/{daysInMonth} ({monthBEPProgressPct}%)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  OpEx: ₹{Math.round(monthlyFixedOpEx / 1000)}k/mo
                </span>
              </div>
            </div>

            {/* Detailed Financial Sub-Grid (Fixed OpEx vs MTD Margin Earned) */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs font-mono">
              <div className={`p-1.5 rounded-xl border flex flex-col justify-center ${darkMode ? 'bg-[#080d14]/70 border-[#1a2538]' : 'bg-indigo-50/60 border-indigo-200/70'}`}>
                <span className="text-[9px] text-slate-400 uppercase font-bold">Monthly OpEx</span>
                <span className="font-bold text-slate-200 mt-0.5">₹{monthlyFixedOpEx.toLocaleString('en-IN')}</span>
                <span className="text-[9px] text-slate-400">Rent 40k • Staff 45k</span>
              </div>
              <div className={`p-1.5 rounded-xl border flex flex-col justify-center ${darkMode ? 'bg-[#080d14]/70 border-[#1a2538]' : 'bg-purple-50/60 border-purple-200/70'}`}>
                <span className="text-[9px] text-slate-400 uppercase font-bold">MTD Margin</span>
                <span className="font-bold text-indigo-300 mt-0.5">+{formatCurrency(mtdMarginEarned)}</span>
                <span className="text-[9px] text-slate-400">{costCoveredPct}% Cost Covered</span>
              </div>
            </div>

            {/* Monthly Progress Bar & Gap Info */}
            <div className="pt-1">
              <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-1000 shadow-xs ${
                    isMonthBEPMet
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400'
                      : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, monthBEPProgressPct)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10.5px] mt-1.5 font-medium">
                <span className="text-slate-400 font-mono">
                  MTD: {formatCurrency(mtdSales)} <span className="font-bold text-indigo-400">({monthBEPProgressPct}%)</span>
                </span>
                {isMonthBEPMet ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> BEP Covered!
                  </span>
                ) : (
                  <span className="text-indigo-400 dark:text-indigo-300 font-mono font-bold">
                    {formatCurrency(remainingMonthBEP)} left
                  </span>
                )}
              </div>
            </div>

            {/* Pacing / Projected Month-End Health */}
            <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono pt-0.5">
              {isMonthBEPMet ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Full Month Cost Covered!
                </span>
              ) : (
                <span className="text-slate-400">
                  Pace needed: <strong className="text-indigo-300">{formatCurrency(dailyPaceNeededForMonth)}/day</strong> ({daysRemainingInMonth}d left)
                </span>
              )}
              <span className="text-slate-500">Pacing: {formatCurrency(projectedMonthSales)}</span>
            </div>
          </div>

          {/* Footer info: Month Rolling P&L & Link to Financial Details */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10.5px] flex justify-between items-center text-slate-400 relative z-10">
            <div className="flex items-center gap-1 font-mono font-bold">
              <span className="text-slate-500 dark:text-slate-400 font-normal">Month:</span>
              <span className={isMonthProfitable ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                {isMonthProfitable ? `+${formatCurrency(monthRollingBalance)}` : `-${formatCurrency(Math.abs(monthRollingBalance))}`}
              </span>
              <span className="text-[9.5px] text-slate-500 font-normal">
                ({profitDaysCount}W/{lossDaysCount}L)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTrendChartModal(true)}
                className="font-bold text-slate-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer transition-colors"
                title="View Visual Compounding Curve Chart"
              >
                <LineChart className="w-3 h-3 text-indigo-400" />
                <span>Chart</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab ? setActiveTab('pocket_khata') : setActiveTab('pnl')}
                className="font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer transition-colors"
                title="View Monthly Financial Ledger"
              >
                <span>Overview</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 4: Modal Trend Chart Overlay */}
      {showTrendChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-slide-up">
            <DynamicBreakevenTrendChart
              history={dynamicBEPData?.history || []}
              baseDailyBEP={bep}
              baseDailyOpEx={DAILY_EXPENSE}
              targetMarginPct={targetMargin}
              darkMode={darkMode}
              formatCurrency={formatCurrency}
              onClose={() => setShowTrendChartModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ExecutiveKpiStrip;
