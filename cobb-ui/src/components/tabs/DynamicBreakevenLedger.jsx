import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Info,
  DollarSign,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  Scale
} from 'lucide-react';
import { calculateDynamicBreakeven } from '../../utils/dynamicBreakevenEngine';
import DynamicBreakevenTrendChart from '../dashboard/DynamicBreakevenTrendChart';
import { db } from '../../utils/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export default function DynamicBreakevenLedger({
  dailySales = [],
  expenses = [],
  storeConfig = null,
  pnlData = null,
  overviewStats = null,
  darkMode = true,
  formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  activeStore = 'DEMO_STORE_001',
  API_BASE = 'http://localhost:5000'
}) {
  const [cloudSales, setCloudSales] = useState([]);
  const [cloudBreakevenData, setCloudBreakevenData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showFormulaGuide, setShowFormulaGuide] = useState(false);
  const [simulationExtraSales, setSimulationExtraSales] = useState(0);
  const [bepMode, setBepMode] = useState('two_way'); // 'two_way' (both profit & loss adjust BEP) | 'loss_only' (floor at base)

  // 1. Cloud Firestore Listener for Phone Link / Remote sync
  useEffect(() => {
    const storeDocId = activeStore && activeStore !== 'ALL' ? activeStore : 'DEMO_STORE_001';
    let unsubBEP = null;
    let unsubSales = null;

    if (db) {
      try {
        unsubBEP = onSnapshot(doc(db, 'stores', storeDocId, 'data', 'dynamic_breakeven'), (snap) => {
          if (snap.exists()) {
            setCloudBreakevenData(snap.data());
          }
        }, (err) => console.warn('[DynamicBEP] Firestore BEP listener error:', err.message));

        unsubSales = onSnapshot(doc(db, 'stores', storeDocId, 'data', 'daily_sales'), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const list = data?.sales || data?.rows || data?.items || [];
            if (Array.isArray(list) && list.length > 0) {
              setCloudSales(list);
            }
          }
        }, (err) => console.warn('[DynamicBEP] Firestore sales listener error:', err.message));
      } catch (err) {
        console.warn('[DynamicBEP] Firestore init listener error:', err.message);
      }
    }

    return () => {
      if (unsubBEP) unsubBEP();
      if (unsubSales) unsubSales();
    };
  }, [activeStore]);

  // 2. Select the richest daily sales data available
  const effectiveDailySales = useMemo(() => {
    if (Array.isArray(dailySales) && dailySales.length > 0) return dailySales;
    if (cloudSales.length > 0) return cloudSales;
    return [];
  }, [dailySales, cloudSales]);

  // 3. Compute the dynamic day-by-day compounding breakeven
  const computedData = useMemo(() => {
    return calculateDynamicBreakeven({
      dailySales: effectiveDailySales,
      expenses,
      storeConfig,
      pnlData,
      overviewStats
    });
  }, [effectiveDailySales, expenses, storeConfig, pnlData, overviewStats]);

  // Merge with server synced data if present
  const data = computedData || cloudBreakevenData || {
    baseDailyOpEx: 3367,
    targetMarginPct: 27,
    baseDailyBEP: 13467,
    today: {
      date: new Date().toISOString().split('T')[0],
      sales: 0,
      baseBEP: 13467,
      carriedLossFromPreviousDays: 0,
      salesNeededForCarriedLoss: 0,
      adjustedBEPToday: 13467,
      remainingToBreakevenToday: 13467,
      isTodayBreakevenMet: false,
      todayProgressPct: 0,
      netDailyProfitToday: -3367,
      status: 'LOSS'
    },
    monthSummary: {
      totalDeficitIncurred: 0,
      totalProfitsRecovered: 0,
      currentUnrecoveredDeficit: 0,
      daysTracked: 0,
      lossDaysCount: 0,
      profitDaysCount: 0
    },
    history: []
  };

  const today = data.today || {};
  const monthSummary = data.monthSummary || {};
  const history = data.history || [];

  // What-if simulator computation:
  const simSales = (today.sales || 0) + Number(simulationExtraSales || 0);
  const simGrossProfit = Math.round(simSales * (data.targetMarginPct / 100));
  const simNetProfit = simGrossProfit - (data.baseDailyOpEx || 3367);
  const simCarriedLossAfter = Math.max(0, (today.carriedLossFromPreviousDays || 0) - simNetProfit);
  const simTomorrowBEP = Math.round(((data.baseDailyOpEx || 3367) + simCarriedLossAfter) / (data.targetMarginPct / 100));

  // Copy summary to clipboard for WhatsApp sharing
  const handleCopySummary = () => {
    const text = `📊 *COBB PUNDRI - DAILY BREAKEVEN & LOSS REPORT*
📅 Date: ${today.date}
━━━━━━━━━━━━━━━━━━━
🎯 *Today's Breakeven Target:* ${formatCurrency(today.adjustedBEPToday)}
   • Base Daily Cost Target: ${formatCurrency(today.baseBEP)}
   • Carried Deficit Recoup: ${formatCurrency(today.salesNeededForCarriedLoss)}
⚠️ *Prev Days' Combined Loss:* ${formatCurrency(today.carriedLossFromPreviousDays)}
💰 *Today's Current Sales:* ${formatCurrency(today.sales)} (${today.todayProgressPct}% Met)
${today.isTodayBreakevenMet ? '🎉 *STATUS: BREAKEVEN ACHIEVED!*' : `📉 *REMAINING TO BEP:* ${formatCurrency(today.remainingToBreakevenToday)}`}
━━━━━━━━━━━━━━━━━━━
📈 *Month-to-Date Performance:*
   • Profitable Days: ${monthSummary.profitDaysCount}
   • Deficit Days: ${monthSummary.lossDaysCount}
   • Unrecovered Deficit: ${formatCurrency(monthSummary.currentUnrecoveredDeficit)}
🚀 *Live Phone Link:* https://cobb-store.web.app`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Top Banner / Explanation */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
        darkMode 
          ? 'bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border-amber-500/30 shadow-amber-950/20' 
          : 'bg-gradient-to-br from-amber-50/80 via-white to-slate-50 border-amber-200 shadow-amber-100/50'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-xs">
                <Scale className="w-3 h-3 text-amber-400 animate-pulse" /> Dynamic Rolling Breakeven
              </span>
              <span className={`text-xs font-mono font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Compounding Daily Deficit &amp; Recovery Engine
              </span>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <h3 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-amber-400">
                {today.adjustedBEPToday === 0 ? '₹0 (100% Pre-Paid 🎉)' : formatCurrency(today.adjustedBEPToday)}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  today.isSurplus
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : today.isDeficit
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {today.isSurplus
                    ? `+${formatCurrency(today.surplusProfit)} Profit Cushion (Target Discounted)`
                    : today.isDeficit
                      ? `+${formatCurrency(today.carriedDeficit)} Prev Deficit Added`
                      : 'Clean Slate: Base Breakeven'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Base: {formatCurrency(data.baseDailyBEP)}
                </span>
              </div>
            </div>

            <p className={`text-xs max-w-2xl font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Calculates daily profit and loss for every single day. If any day incurs a deficit, the loss raises tomorrow's break-even target. If a day makes a profit surplus, the excess profit cushions and lowers tomorrow's break-even target.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowFormulaGuide(!showFormulaGuide)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{showFormulaGuide ? 'Hide Rule' : 'How It Works'}</span>
            </button>
            <button
              onClick={handleCopySummary}
              className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
                copied
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Report!' : 'Share WhatsApp'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Formula Explanation */}
        {showFormulaGuide && (
          <div className={`mt-5 p-4 rounded-2xl border text-xs space-y-2.5 ${
            darkMode ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-white border-amber-200 text-slate-700'
          }`}>
            <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
              <Info className="w-4 h-4" /> 2-Way Rolling Breakeven &amp; Profit/Loss Compounding Rule
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-bold text-slate-400 block text-[11px] uppercase">1. Fixed Store OpEx</span>
                <p className="font-mono font-bold text-slate-200 text-sm mt-0.5">₹1,01,000 / month</p>
                <p className="text-[11px] text-slate-400 mt-1">₹3,367 daily cost (Rent: 40k, Staff: 45k, Power: 15k, Misc: 1k)</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-bold text-slate-400 block text-[11px] uppercase">2. Base Break-Even Target</span>
                <p className="font-mono font-bold text-slate-200 text-sm mt-0.5">₹13,467 / day</p>
                <p className="text-[11px] text-slate-400 mt-1">₹3,367 ÷ 27% retail gross margin = ₹13,467 sales required to cover costs.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-bold text-slate-400 block text-[11px] uppercase">3. Both Profit &amp; Loss Compound</span>
                <p className="font-mono font-bold text-amber-400 text-sm mt-0.5">Adjusted BEP = (OpEx ± Balance) ÷ 27%</p>
                <p className="text-[11px] text-slate-400 mt-1">If store makes a ₹1,000 loss, next day BEP rises to ₹17,171 to recover it. If store makes a ₹1,000 profit, next day BEP drops to ₹8,767 because yesterday already pre-paid ₹1,000 of expenses!</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4 Hero KPI Cards for Today */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Dynamic Breakeven Target */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Today's Adjusted Target</p>
              <h3 className="text-2xl font-black mt-1 font-mono text-amber-400">
                {today.adjustedBEPToday === 0 ? '₹0 (100% Pre-Paid 🎉)' : formatCurrency(today.adjustedBEPToday)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Base: {formatCurrency(data.baseDailyBEP)}</span>
            {today.isDeficit && (
              <span className="text-rose-400 block font-mono">
                + {formatCurrency(today.salesNeededForCarriedLoss)} to recoup prev loss
              </span>
            )}
            {today.isSurplus && (
              <span className="text-emerald-400 block font-mono">
                - {formatCurrency(today.salesDiscountFromSurplus)} pre-funded by profit cushion
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Cumulative Previous Balance (Profit Cushion or Deficit) */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode 
            ? today.isSurplus 
              ? 'bg-emerald-950/20 border-emerald-800/40' 
              : today.isDeficit 
                ? 'bg-rose-950/20 border-rose-800/40' 
                : 'bg-slate-900/90 border-slate-800'
            : today.isSurplus 
              ? 'bg-emerald-50/70 border-emerald-200' 
              : today.isDeficit 
                ? 'bg-rose-50/70 border-rose-200' 
                : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${
                today.isSurplus ? 'text-emerald-400' : today.isDeficit ? 'text-rose-400' : 'text-slate-400'
              }`}>
                {today.isSurplus ? 'Combined Profit Cushion' : today.isDeficit ? 'Combined Previous Deficit' : 'Carried P&L Balance'}
              </p>
              <h3 className={`text-2xl font-black mt-1 font-mono ${
                today.isSurplus ? 'text-emerald-400' : today.isDeficit ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {today.isSurplus 
                  ? `+${formatCurrency(today.surplusProfit)}` 
                  : today.isDeficit 
                    ? `-${formatCurrency(today.carriedDeficit)}` 
                    : '₹0 (Even)'}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              today.isSurplus 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : today.isDeficit 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {today.isSurplus ? <Sparkles className="w-5 h-5 text-emerald-400" /> : today.isDeficit ? <ShieldAlert className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 font-medium">
            {today.isSurplus 
              ? `Pre-funds today's OpEx by ${formatCurrency(today.surplusProfit)} (reduces BEP target by -${formatCurrency(today.salesDiscountFromSurplus)}) 🎉` 
              : today.isDeficit 
                ? `Unrecovered deficit from prior days, adding +${formatCurrency(today.salesNeededForCarriedLoss)} sales target` 
                : 'All prior days balanced. Operating at base break-even.'}
          </p>
        </div>

        {/* Card 3: Today's Progress */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today's Sales</p>
              <h3 className={`text-2xl font-black mt-1 font-mono ${
                today.isTodayBreakevenMet ? 'text-emerald-400' : 'text-slate-100'
              }`}>
                {formatCurrency(today.sales)}
              </h3>
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-1 rounded-lg border ${
              today.isTodayBreakevenMet 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}>
              {today.todayProgressPct}%
            </span>
          </div>

          <div className="mt-3">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${
                  today.isTodayBreakevenMet 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                    : 'bg-gradient-to-r from-amber-500 to-indigo-500'
                }`}
                style={{ width: `${Math.min(100, today.todayProgressPct)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-medium">
              <span>{today.isTodayBreakevenMet ? '🎉 Breakeven Achieved' : `${formatCurrency(today.remainingToBreakevenToday)} remaining`}</span>
              <span className="font-mono">{today.todayProgressPct}% Met</span>
            </div>
          </div>
        </div>

        {/* Card 4: Month Recovery Balance */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Month Ledger Summary</p>
              <h3 className="text-2xl font-black mt-1 font-mono text-slate-100">
                {monthSummary.daysTracked} Days
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-400">{monthSummary.profitDaysCount} Profitable</span>
            <span className="text-slate-500">•</span>
            <span className="text-rose-400">{monthSummary.lossDaysCount} Deficit</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-mono">Net Deficit: {formatCurrency(monthSummary.currentUnrecoveredDeficit)}</span>
          </div>
        </div>
      </div>

      {/* Visual Dynamic BEP vs Sales Compounding Curve Chart */}
      <DynamicBreakevenTrendChart
        history={history}
        baseDailyBEP={data.baseDailyBEP || 13468}
        baseDailyOpEx={data.baseDailyOpEx || 3367}
        targetMarginPct={data.targetMarginPct || 27}
        darkMode={darkMode}
        formatCurrency={formatCurrency}
        embedded={true}
      />

      {/* Compounding Historical Audit Ledger Table */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-2">
              <span>Day-by-Day Compounding Audit Ledger</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                {data.monthKey || 'Current Month'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Exact historical timeline: tracks each day's sales, margin, profit/loss, and the resulting dynamic break-even target.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 2-Way Mode Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setBepMode('two_way')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  bepMode === 'two_way'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Both Profits and Losses adjust the BEP: Losses raise target, Profits lower target"
              >
                ⚡ 2-Way (Profit &amp; Loss)
              </button>
              <button
                type="button"
                onClick={() => setBepMode('loss_only')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  bepMode === 'loss_only'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Only Losses raise target, Profits reset back to base ₹13,467"
              >
                🛡️ Deficit Floor
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Profit
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span> Deficit
              </span>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className={`border-b ${darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'} uppercase font-bold text-[10px] tracking-wider`}>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Gross Sales</th>
                <th className="py-3 px-4">Day OpEx + Cost</th>
                <th className="py-3 px-4">Day Margin (27%)</th>
                <th className="py-3 px-4">Day Net P&amp;L</th>
                <th className="py-3 px-4 bg-amber-500/5 text-amber-400">
                  {bepMode === 'two_way' ? 'Carried P&L (Before)' : 'Carried Loss (Before)'}
                </th>
                <th className="py-3 px-4 bg-amber-500/10 text-amber-300">Adjusted BEP Target</th>
                <th className="py-3 px-4">Target Met?</th>
                <th className="py-3 px-4 bg-rose-500/5 text-rose-400">
                  {bepMode === 'two_way' ? 'P&L Balance to Next Day' : 'Loss Carried to Next Day'}
                </th>
                <th className="py-3 px-4 bg-indigo-500/5 text-indigo-300">Next Day's New BEP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                    No sales recorded for this period yet.
                  </td>
                </tr>
              ) : (
                history.map((row) => {
                  const isToday = row.date === today.date;
                  const isLoss = row.isLoss;
                  const isProfit = row.status === 'PROFIT';
                  const rowBEP = bepMode === 'two_way' 
                    ? (row.adjustedBEPTwoWay !== undefined ? row.adjustedBEPTwoWay : row.adjustedBEP)
                    : (row.adjustedBEPLossOnly !== undefined ? row.adjustedBEPLossOnly : row.adjustedBEP);
                  const nextBEP = bepMode === 'two_way'
                    ? (row.nextDayBEPTwoWay !== undefined ? row.nextDayBEPTwoWay : row.nextDayBEP)
                    : (row.nextDayBEPLossOnly !== undefined ? row.nextDayBEPLossOnly : row.nextDayBEP);
                  const isTargetMet = row.sales >= rowBEP;
                  const targetGap = Math.max(0, rowBEP - row.sales);

                  return (
                    <tr
                      key={row.date}
                      className={`transition-colors hover:bg-slate-800/40 ${
                        isToday 
                          ? 'bg-amber-500/10 border-l-4 border-l-amber-400 font-bold' 
                          : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{row.date}</span>
                          <span className="text-[10px] text-slate-500">({row.dayName})</span>
                          {isToday && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black uppercase">
                              Today
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sales */}
                      <td className="py-3 px-4 font-black text-slate-100">
                        {formatCurrency(row.sales)}
                        <span className="text-[10px] text-slate-500 font-normal ml-1">({row.bills}b)</span>
                      </td>

                      {/* Day OpEx */}
                      <td className="py-3 px-4 text-slate-400">
                        {formatCurrency(row.totalCost)}
                        {row.pettyExpenses > 0 && (
                          <span className="text-[10px] text-rose-400 ml-1">
                            (+{formatCurrency(row.pettyExpenses)} exp)
                          </span>
                        )}
                      </td>

                      {/* Gross Margin */}
                      <td className="py-3 px-4 text-slate-300">
                        {formatCurrency(row.grossProfit)}
                      </td>

                      {/* Day Net P&L */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black border ${
                          isProfit 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                            : isLoss 
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {isProfit ? `+${formatCurrency(row.profitAmount)}` : `-${formatCurrency(row.lossAmount)}`}
                          {isProfit ? ' ▲' : isLoss ? ' ▼' : ''}
                        </span>
                      </td>

                      {/* Carried Balance (Before) */}
                      <td className="py-3 px-4 bg-amber-500/5 font-bold">
                        {bepMode === 'two_way' ? (
                          row.carriedBalanceBefore > 0 ? (
                            <span className="text-emerald-400 font-bold">+{formatCurrency(row.carriedBalanceBefore)} (Surplus)</span>
                          ) : row.carriedBalanceBefore < 0 ? (
                            <span className="text-rose-400 font-bold">-{formatCurrency(Math.abs(row.carriedBalanceBefore))} (Deficit)</span>
                          ) : (
                            <span className="text-slate-500">₹0</span>
                          )
                        ) : (
                          row.carriedLossBefore > 0 ? (
                            <span className="text-rose-400">+{formatCurrency(row.carriedLossBefore)}</span>
                          ) : (
                            <span className="text-slate-500">₹0</span>
                          )
                        )}
                      </td>

                      {/* Adjusted BEP Target */}
                      <td className="py-3 px-4 bg-amber-500/10 font-black text-amber-300">
                        {rowBEP === 0 ? (
                          <span className="text-emerald-400 font-black">₹0 (Pre-Paid 🎉)</span>
                        ) : (
                          formatCurrency(rowBEP)
                        )}
                      </td>

                      {/* Target Met? */}
                      <td className="py-3 px-4">
                        {isTargetMet ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Met (+{formatCurrency(row.sales - rowBEP)})
                          </span>
                        ) : (
                          <span className="text-rose-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Gap {formatCurrency(targetGap)}
                          </span>
                        )}
                      </td>

                      {/* Balance Carried to Next Day */}
                      <td className="py-3 px-4 bg-rose-500/5 font-bold">
                        {bepMode === 'two_way' ? (
                          row.carriedBalanceAfter > 0 ? (
                            <span className="text-emerald-400">+{formatCurrency(row.carriedBalanceAfter)} (Surplus)</span>
                          ) : row.carriedBalanceAfter < 0 ? (
                            <span className="text-rose-400">-{formatCurrency(Math.abs(row.carriedBalanceAfter))} (Deficit)</span>
                          ) : (
                            <span className="text-slate-500">₹0 (Balanced)</span>
                          )
                        ) : (
                          row.carriedLossAfter > 0 ? (
                            <span className="text-rose-400">-{formatCurrency(row.carriedLossAfter)}</span>
                          ) : (
                            <span className="text-emerald-400">₹0 (Cleared)</span>
                          )
                        )}
                      </td>

                      {/* Next Day's New BEP */}
                      <td className="py-3 px-4 bg-indigo-500/5 font-black text-indigo-300">
                        {nextBEP === 0 ? (
                          <span className="text-emerald-400 font-black">₹0 (Pre-Paid 🎉)</span>
                        ) : (
                          formatCurrency(nextBEP)
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive What-If Simulator */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h4 className="font-black text-sm uppercase tracking-wider text-slate-200">
            End-Of-Day "What-If" Breakeven Simulator
          </h4>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Simulate how much more sales you make before store closing tonight, and see exactly what tomorrow's breakeven target will adjust to:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Add Expected Night Sales: +{formatCurrency(simulationExtraSales)}
            </label>
            <input
              type="range"
              min="0"
              max="30000"
              step="500"
              value={simulationExtraSales}
              onChange={(e) => setSimulationExtraSales(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>+₹0</span>
              <span>+₹15,000</span>
              <span>+₹30,000</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Simulated Total Today</span>
            <p className="text-base font-black font-mono text-slate-200 mt-0.5">
              {formatCurrency(simSales)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Simulated P&amp;L: <span className={simNetProfit >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {simNetProfit >= 0 ? `+${formatCurrency(simNetProfit)}` : `-${formatCurrency(Math.abs(simNetProfit))}`}
              </span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs">
            <span className="text-amber-400 block text-[10px] uppercase font-bold">Tomorrow's New Breakeven</span>
            <p className="text-lg font-black font-mono text-amber-300 mt-0.5">
              {formatCurrency(simTomorrowBEP)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {simCarriedLossAfter > 0 ? `Carrying ${formatCurrency(simCarriedLossAfter)} loss into tomorrow` : '🎉 Complete recovery! Base breakeven target tomorrow'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
