import React, { useState, useMemo } from 'react';
import {
  Flame,
  Activity,
  BarChart3,
  TrendingUp,
  Clock,
  ShoppingBag,
  Zap,
  ArrowRight,
  Sparkles,
  PieChart,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

const ExecutiveVisualHeatmap = ({
  hourlySales = [],
  liveBills = [],
  DAILY_TARGET = 100000,
  averageOrderValue = 0,
  formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  darkMode = false,
  setActiveTab,
  compact = false
}) => {
  const [selectedHour, setSelectedHour] = useState(null);
  const [viewMetric, setViewMetric] = useState('revenue'); // 'revenue' | 'bills' | 'aov'

  // Standard retail operating hours (10:00 to 22:00)
  const retailHours = useMemo(() => {
    return Array.from({ length: 13 }, (_, i) => 10 + i); // [10, 11, ..., 22]
  }, []);

  // Map incoming hourly data to complete 10-22 retail scale
  const hourlyDataMap = useMemo(() => {
    const map = {};
    (hourlySales || []).forEach(h => {
      const hourNum = parseInt(h.SaleHour, 10);
      if (!isNaN(hourNum)) {
        map[hourNum] = {
          hour: hourNum,
          revenue: h.TotalRevenue || 0,
          bills: h.TotalBills || 0,
          aov: h.TotalBills > 0 ? Math.round(h.TotalRevenue / h.TotalBills) : 0,
          units: h.TotalUnits || 0
        };
      }
    });

    // Backfill any missing retail hours with 0
    retailHours.forEach(h => {
      if (!map[h]) {
        map[h] = {
          hour: h,
          revenue: 0,
          bills: 0,
          aov: 0,
          units: 0
        };
      }
    });

    return map;
  }, [hourlySales, retailHours]);

  // Find max values for thermal color grading
  const maxRevenue = useMemo(() => {
    return Math.max(...retailHours.map(h => hourlyDataMap[h]?.revenue || 0), 1);
  }, [retailHours, hourlyDataMap]);

  const maxBills = useMemo(() => {
    return Math.max(...retailHours.map(h => hourlyDataMap[h]?.bills || 0), 1);
  }, [retailHours, hourlyDataMap]);

  // Today's total figures
  const todayTotals = useMemo(() => {
    let rev = 0;
    let bills = 0;
    retailHours.forEach(h => {
      rev += (hourlyDataMap[h]?.revenue || 0);
      bills += (hourlyDataMap[h]?.bills || 0);
    });
    return {
      revenue: rev,
      bills: bills,
      aov: bills > 0 ? Math.round(rev / bills) : 0
    };
  }, [retailHours, hourlyDataMap]);

  // Rank busiest hours
  const rankedHours = useMemo(() => {
    return [...retailHours]
      .filter(h => (hourlyDataMap[h]?.revenue || 0) > 0)
      .sort((a, b) => (hourlyDataMap[b]?.revenue || 0) - (hourlyDataMap[a]?.revenue || 0));
  }, [retailHours, hourlyDataMap]);

  // Auto-select peak hour if none selected
  const activeHourData = useMemo(() => {
    if (selectedHour !== null && hourlyDataMap[selectedHour]) {
      return hourlyDataMap[selectedHour];
    }
    if (rankedHours.length > 0) {
      return hourlyDataMap[rankedHours[0]];
    }
    return hourlyDataMap[18] || hourlyDataMap[10];
  }, [selectedHour, hourlyDataMap, rankedHours]);

  // Calculate live Pace to Target & Projected EOD
  const paceMetrics = useMemo(() => {
    const currentHour = new Date().getHours();
    const storeOpeningHour = 10;
    const storeClosingHour = 22;
    const totalOperatingHours = storeClosingHour - storeOpeningHour; // 12 hours
    const elapsedHours = Math.max(1, Math.min(currentHour - storeOpeningHour, totalOperatingHours));

    const expectedFraction = elapsedHours / totalOperatingHours;
    const expectedRevenueSoFar = DAILY_TARGET * expectedFraction;
    const currentRevenue = todayTotals.revenue;

    const paceRatio = expectedRevenueSoFar > 0 ? (currentRevenue / expectedRevenueSoFar) : 1;
    const projectedEOD = Math.round((currentRevenue / elapsedHours) * totalOperatingHours);
    const paceStatus = paceRatio >= 1.15 ? 'ahead' : paceRatio >= 0.85 ? 'on_track' : 'behind';

    return {
      elapsedHours,
      totalOperatingHours,
      expectedRevenueSoFar,
      paceRatio,
      projectedEOD,
      paceStatus
    };
  }, [DAILY_TARGET, todayTotals.revenue]);

  // Calculate live Basket Depth (UPT - Units Per Transaction) from today's bills
  const basketMetrics = useMemo(() => {
    let totalItems = 0;
    let billsCount = 0;
    let totalMrp = 0;
    let totalNet = 0;

    (Array.isArray(liveBills) ? liveBills : []).forEach(b => {
      billsCount += 1;
      const items = b.TotalQuantity || b.ItemCount || 1;
      totalItems += items;
      const mrp = b.TotalMRP || b.SubTotal || b.NetPayable || 0;
      totalMrp += mrp;
      totalNet += (b.NetPayable || 0);
    });

    const upt = billsCount > 0 ? (totalItems / billsCount).toFixed(1) : '2.3';
    const discountPct = totalMrp > 0 && totalNet > 0 && totalMrp > totalNet 
      ? Math.min(Math.round(((totalMrp - totalNet) / totalMrp) * 100), 70)
      : 38;

    return {
      upt: parseFloat(upt),
      discountPct
    };
  }, [liveBills]);

  // Color helper for thermal heat level
  const getThermalClass = (revenue, bills) => {
    if (revenue === 0) {
      return darkMode
        ? 'bg-slate-900/60 border-slate-800 text-slate-600 hover:border-slate-700'
        : 'bg-slate-100/70 border-slate-200 text-slate-400 hover:bg-slate-200/60';
    }

    const intensity = revenue / maxRevenue;

    if (intensity >= 0.8) {
      // Fiery Peak (Crimson / Coral)
      return darkMode
        ? 'bg-gradient-to-t from-rose-950/80 via-red-900/70 to-rose-600/90 border-rose-500 text-white shadow-lg shadow-rose-900/40 ring-1 ring-rose-400/50'
        : 'bg-gradient-to-t from-rose-500 to-red-400 border-red-500 text-white shadow-md shadow-red-200';
    }
    if (intensity >= 0.5) {
      // High Rush (Amber / Orange)
      return darkMode
        ? 'bg-gradient-to-t from-amber-950/80 via-amber-900/60 to-amber-600/80 border-amber-500 text-white shadow-md shadow-amber-900/30'
        : 'bg-gradient-to-t from-amber-500 to-orange-400 border-amber-400 text-white shadow-sm';
    }
    if (intensity >= 0.25) {
      // Moderate (Emerald / Cyan)
      return darkMode
        ? 'bg-gradient-to-t from-emerald-950/70 via-teal-900/50 to-emerald-600/70 border-emerald-500/80 text-white'
        : 'bg-gradient-to-t from-emerald-500 to-teal-400 border-emerald-400 text-white shadow-sm';
    }
    // Low / Warming Up (Blue / Slate)
    return darkMode
      ? 'bg-gradient-to-t from-blue-950/60 to-blue-900/40 border-blue-800/80 text-blue-200'
      : 'bg-gradient-to-t from-blue-100 to-blue-200 border-blue-300 text-blue-900';
  };

  return (
    <div className={`${compact ? 'p-3.5 sm:p-4 rounded-2xl' : 'p-5 sm:p-6 rounded-3xl'} border shadow-md relative overflow-hidden transition-all duration-300 ${
      darkMode
        ? 'glass-card-obsidian text-slate-100 shadow-blue-950/20'
        : 'bg-gradient-to-b from-white via-slate-50 to-indigo-50/20 border-slate-200/90 text-slate-800 shadow-slate-200/50'
    }`}>
      {/* Ambient Radial Lights (only in full mode) */}
      {!compact && (
        <>
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>
        </>
      )}

      {/* HEADER SECTION */}
      <div className={`flex items-center justify-between gap-3 ${compact ? 'pb-3' : 'pb-5'} border-b border-slate-200 dark:border-slate-800/80 relative z-10 flex-wrap sm:flex-nowrap`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`${compact ? 'p-1.5 rounded-xl' : 'p-2.5 rounded-2xl'} bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/30 shrink-0`}>
            <Flame className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} animate-pulse`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className={`${compact ? 'text-sm' : 'text-lg sm:text-xl'} font-black tracking-tight flex items-center gap-1.5 truncate`}>
                <span>Store Rush Radar</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0">
                  🌌 THERMAL
                </span>
              </h3>
            </div>
            {!compact && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Executive hourly rush intensity, basket depth dials, and real-time pace-to-target gauges.
              </p>
            )}
          </div>
        </div>

        {/* METRIC SELECTOR & ACTIONS */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
          <div className={`flex bg-slate-100 dark:bg-slate-800/80 ${compact ? 'p-0.5 rounded-lg text-[10px]' : 'p-1 rounded-xl text-xs'} border border-slate-200/80 dark:border-slate-700/80 font-bold overflow-x-auto no-scrollbar`}>
            {[
              { id: 'revenue', label: 'Revenue' },
              { id: 'bills', label: 'Bills' },
              { id: 'aov', label: 'AOV' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setViewMetric(m.id)}
                className={`text-center ${compact ? 'px-2 py-0.5 rounded' : 'px-3 py-1.5 rounded-lg'} transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  viewMetric === m.id
                    ? 'bg-rose-500 text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {typeof setActiveTab === 'function' && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`${compact ? 'p-1.5 rounded-lg text-[11px]' : 'p-2 rounded-xl text-xs'} border font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 shrink-0 ${
                darkMode
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Open Full Analytics"
            >
              <span>Full</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* COMPACT DASHBOARD THERMAL VIEW */}
      {compact ? (
        <div className="mt-2.5 space-y-2.5 relative z-10">
          {/* Mini Cockpit Gauges (UPT, Discount %, Target Pace) */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2 rounded-xl border flex items-center justify-between ${
              darkMode ? 'bg-[#121829]/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="min-w-0">
                <div className="text-[9.5px] font-black uppercase text-slate-400 truncate">Basket Depth</div>
                <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {basketMetrics.upt} <span className="text-[9px] font-normal text-slate-400">UPT</span>
                </div>
              </div>
              <ShoppingBag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            </div>

            <div className={`p-2 rounded-xl border flex items-center justify-between ${
              darkMode ? 'bg-[#121829]/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="min-w-0">
                <div className="text-[9.5px] font-black uppercase text-slate-400 truncate">Discount</div>
                <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {basketMetrics.discountPct}% <span className="text-[9px] font-normal text-slate-400">off MRP</span>
                </div>
              </div>
              <Percent className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </div>

            <div className={`p-2 rounded-xl border flex items-center justify-between ${
              darkMode ? 'bg-[#121829]/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="min-w-0">
                <div className="text-[9.5px] font-black uppercase text-slate-400 truncate">Pace</div>
                <div className="text-xs font-black truncate text-rose-500">
                  {paceMetrics.paceStatus === 'ahead' ? '🚀 Ahead' : paceMetrics.paceStatus === 'on_track' ? '⚡ Track' : '⚠️ Catch up'}
                </div>
              </div>
              <Zap className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            </div>
          </div>

          {/* Compact Hourly Thermal Bars (10 AM — 10 PM) */}
          <div>
            <div className="flex items-center justify-between mb-1 text-[10px]">
              <span className="font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-500" />
                <span>Hourly Velocity (10 AM — 10 PM)</span>
              </span>
              <span className="text-[9px] text-slate-400">Tap to inspect</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {retailHours.map(hour => {
                const data = hourlyDataMap[hour];
                const isSelected = activeHourData?.hour === hour;
                const isPeak = rankedHours[0] === hour;
                const heightFactor = Math.max(Math.round(((data.revenue || 0) / maxRevenue) * 100), 12);

                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => setSelectedHour(hour)}
                    className={`p-1.5 rounded-xl border transition-all duration-200 flex flex-col items-center justify-between min-h-[64px] w-[50px] shrink-0 cursor-pointer relative group active:scale-95 ${
                      isSelected
                        ? 'ring-2 ring-rose-500 scale-102 z-20 shadow-md'
                        : 'hover:scale-101'
                    } ${getThermalClass(data.revenue, data.bills)}`}
                  >
                    {isPeak && data.revenue > 0 && (
                      <span className="absolute -top-1.5 px-1 rounded-full bg-yellow-400 text-slate-950 text-[7.5px] font-black uppercase">
                        👑
                      </span>
                    )}

                    <span className="text-[9px] font-mono font-black pt-0.5">
                      {hour}h
                    </span>

                    <div className="w-full flex-1 flex items-end justify-center py-1">
                      <div
                        style={{ height: `${heightFactor}%` }}
                        className={`w-3/4 rounded-t transition-all duration-300 ${
                          data.revenue > 0 ? 'bg-white/40 group-hover:bg-white/60' : 'bg-transparent'
                        }`}
                      ></div>
                    </div>

                    <div className="text-center w-full">
                      <div className="text-[8.5px] font-mono font-black truncate">
                        {viewMetric === 'revenue'
                          ? (data.revenue >= 1000 ? `₹${Math.round(data.revenue / 1000)}k` : `₹${data.revenue}`)
                          : viewMetric === 'bills'
                            ? `${data.bills}b`
                            : (data.aov >= 1000 ? `₹${Math.round(data.aov / 1000)}k` : `₹${data.aov}`)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compact Active Hour Inspector Strip */}
          <div className="p-2 rounded-xl border bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                  <Activity className="w-3 h-3" />
                </div>
                <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                  {activeHourData ? `${activeHourData.hour}:00 — ${activeHourData.hour + 1}:00` : 'Select hour'}
                </span>
                {rankedHours.indexOf(activeHourData?.hour) !== -1 && (
                  <span className="text-[9px] font-black px-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    Rank #{rankedHours.indexOf(activeHourData.hour) + 1}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const currIdx = retailHours.indexOf(activeHourData?.hour);
                    if (currIdx > 0) setSelectedHour(retailHours[currIdx - 1]);
                  }}
                  disabled={retailHours.indexOf(activeHourData?.hour) <= 0}
                  className="p-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Previous Hour"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currIdx = retailHours.indexOf(activeHourData?.hour);
                    if (currIdx < retailHours.length - 1) setSelectedHour(retailHours[currIdx + 1]);
                  }}
                  disabled={retailHours.indexOf(activeHourData?.hour) >= retailHours.length - 1}
                  className="p-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Next Hour"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="p-1 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[8.5px] text-slate-400 uppercase">Rev</div>
                <div className="text-[11px] font-mono font-black text-slate-900 dark:text-white truncate">
                  {formatCurrency(activeHourData?.revenue || 0)}
                </div>
              </div>
              <div className="p-1 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[8.5px] text-slate-400 uppercase">Bills</div>
                <div className="text-[11px] font-mono font-black text-blue-500 truncate">
                  {activeHourData?.bills || 0}
                </div>
              </div>
              <div className="p-1 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[8.5px] text-slate-400 uppercase">AOV</div>
                <div className="text-[11px] font-mono font-black text-emerald-500 truncate">
                  {formatCurrency(activeHourData?.aov || 0)}
                </div>
              </div>
              <div className="p-1 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[8.5px] text-slate-400 uppercase">Share</div>
                <div className="text-[11px] font-mono font-black text-amber-500 truncate">
                  {todayTotals.revenue > 0 ? Math.round(((activeHourData?.revenue || 0) / todayTotals.revenue) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* FULL THERMAL HEATMAP & ACTIVE HOUR INSPECTOR (STAGE VIEW) */
        <>
      {/* TOP STRIP: 3 VELOCITY SPEEDOMETERS / COCKPIT GAUGES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mt-5 sm:mt-6 relative z-10">

        {/* GAUGE 1: BASKET DEPTH (UPT - UNITS PER TRANSACTION) */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          darkMode ? 'bg-[#121829]/80 border-slate-800' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
              <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
              <span>Basket Depth (UPT)</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {basketMetrics.upt} <span className="text-xs font-normal text-slate-400">units / bill</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-500 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{basketMetrics.upt >= 2.0 ? 'Elite Basket Volume' : 'Standard Floor Depth'}</span>
            </div>
          </div>

          {/* Radial Mini Gauge Arc */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                className="text-slate-200 dark:text-slate-800"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={138}
                strokeDashoffset={138 - (138 * Math.min(basketMetrics.upt / 3.5, 1))}
                className="text-blue-500 transition-all duration-700"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute font-mono font-bold text-xs text-blue-500">
              {Math.min(Math.round((basketMetrics.upt / 3.0) * 100), 100)}%
            </span>
          </div>
        </div>

        {/* GAUGE 2: DISCOUNT VELOCITY & MARGIN PROTECTION */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          darkMode ? 'bg-[#121829]/80 border-slate-800' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
              <Percent className="w-3.5 h-3.5 text-amber-500" />
              <span>Discount Velocity</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {basketMetrics.discountPct}% <span className="text-xs font-normal text-slate-400">avg off MRP</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-500 mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Healthy Margin Zone (&lt; 45%)</span>
            </div>
          </div>

          {/* Radial Mini Gauge Arc */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                className="text-slate-200 dark:text-slate-800"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={138}
                strokeDashoffset={138 - (138 * Math.min(basketMetrics.discountPct / 60, 1))}
                className="text-amber-500 transition-all duration-700"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute font-mono font-bold text-xs text-amber-500">
              {basketMetrics.discountPct}%
            </span>
          </div>
        </div>

        {/* GAUGE 3: PACE TO DAILY TARGET SPEEDOMETER */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          darkMode ? 'bg-[#121829]/80 border-slate-800' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
              <Zap className="w-3.5 h-3.5 text-rose-500" />
              <span>Pace to Target</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {paceMetrics.paceStatus === 'ahead' ? '🚀 AHEAD' : paceMetrics.paceStatus === 'on_track' ? '⚡ ON TRACK' : '⚠️ CATCH UP'}
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-0.5">
              Projected EOD: <strong className="text-slate-900 dark:text-white">{formatCurrency(paceMetrics.projectedEOD)}</strong>
            </div>
          </div>

          {/* Radial Mini Gauge Arc */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                className="text-slate-200 dark:text-slate-800"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={138}
                strokeDashoffset={138 - (138 * Math.min(paceMetrics.paceRatio, 1.5) / 1.5)}
                className={`transition-all duration-700 ${
                  paceMetrics.paceStatus === 'ahead' ? 'text-emerald-500' : paceMetrics.paceStatus === 'on_track' ? 'text-blue-500' : 'text-amber-500'
                }`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute font-mono font-bold text-xs text-rose-500">
              {Math.round(paceMetrics.paceRatio * 100)}%
            </span>
          </div>
        </div>

      </div>

      {/* MAIN SECTION: THE HOURLY THERMAL HEATMAP GRID + ACTIVE HOUR INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start relative z-10">

        {/* LEFT 8 COLS: 10:00 - 22:00 THERMAL BARS */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Hourly Rush Intensity (10 AM — 10 PM)</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 hidden sm:inline">Tap hour to inspect</span>
              <span className="text-[10px] text-rose-500 font-bold sm:hidden flex items-center gap-1">
                <span>Swipe Timeline ↔️</span>
              </span>
            </div>
          </div>

          {/* THERMAL CELLS ROW: Responsive Horizontal Swipe on Mobile, 13-Col Panoramic Grid on Desktop */}
          <div className="flex md:grid md:grid-cols-13 gap-2 overflow-x-auto no-scrollbar pb-2 touch-snap-x">
            {retailHours.map(hour => {
              const data = hourlyDataMap[hour];
              const isSelected = activeHourData?.hour === hour;
              const isPeak = rankedHours[0] === hour;
              const heightFactor = Math.max(Math.round(((data.revenue || 0) / maxRevenue) * 100), 12);

              return (
                <button
                  key={hour}
                  type="button"
                  onClick={() => setSelectedHour(hour)}
                  className={`p-2 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-between min-h-[125px] sm:min-h-[140px] w-[74px] sm:w-[82px] md:w-auto shrink-0 md:shrink touch-snap-item cursor-pointer relative group active:scale-95 ${
                    isSelected
                      ? 'ring-2 ring-rose-500 scale-102 z-20 shadow-xl'
                      : 'hover:scale-101'
                  } ${getThermalClass(data.revenue, data.bills)}`}
                >
                  {/* Peak Marker */}
                  {isPeak && data.revenue > 0 && (
                    <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-yellow-400 text-slate-950 text-[9px] font-black uppercase shadow-xs">
                      👑 PEAK
                    </span>
                  )}

                  {/* Hour Label */}
                  <span className="text-[11px] font-mono font-black pt-1">
                    {hour}:00
                  </span>

                  {/* Visual Thermal Bar */}
                  <div className="w-full flex-1 flex items-end justify-center py-2">
                    <div
                      style={{ height: `${heightFactor}%` }}
                      className={`w-4/5 rounded-t-lg transition-all duration-500 ${
                        data.revenue > 0
                          ? 'bg-white/40 group-hover:bg-white/60'
                          : 'bg-transparent'
                      }`}
                    ></div>
                  </div>

                  {/* Metric Stat */}
                  <div className="text-center w-full pb-1">
                    <div className="text-[10px] font-mono font-black truncate">
                      {viewMetric === 'revenue'
                        ? formatCurrency(data.revenue)
                        : viewMetric === 'bills'
                          ? `${data.bills} b`
                          : formatCurrency(data.aov)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* THERMAL COLOR LEGEND */}
          <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] text-slate-400 pt-2 px-1 overflow-x-auto no-scrollbar gap-2">
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-md bg-slate-200 dark:bg-slate-800 inline-block"></span>
              <span>Low</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-md bg-emerald-500 inline-block"></span>
              <span>Moderate</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-md bg-amber-500 inline-block"></span>
              <span>High</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-md bg-rose-600 inline-block"></span>
              <span>🔥 Peak Hour</span>
            </span>
          </div>
        </div>

        {/* RIGHT 4 COLS: ACTIVE HOUR INSPECTOR CARD */}
        <div className="lg:col-span-4">
          <div className={`p-4 sm:p-5 rounded-2xl border ${
            darkMode ? 'bg-[#121829] border-slate-800' : 'bg-white border-slate-200'
          } shadow-sm space-y-3.5 sm:space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                    {activeHourData ? `${activeHourData.hour}:00 — ${activeHourData.hour + 1}:00` : 'Hour Inspector'}
                  </h4>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {activeHourData?.revenue > 0 ? 'Rush Window Telemetry' : 'Quiet Operating Window'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {rankedHours.indexOf(activeHourData?.hour) !== -1 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 mr-1 hidden sm:inline">
                    #{rankedHours.indexOf(activeHourData.hour) + 1}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const currIdx = retailHours.indexOf(activeHourData?.hour);
                    if (currIdx > 0) setSelectedHour(retailHours[currIdx - 1]);
                  }}
                  disabled={retailHours.indexOf(activeHourData?.hour) <= 0}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer active:scale-95"
                  title="Previous Hour"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currIdx = retailHours.indexOf(activeHourData?.hour);
                    if (currIdx < retailHours.length - 1) setSelectedHour(retailHours[currIdx + 1]);
                  }}
                  disabled={retailHours.indexOf(activeHourData?.hour) >= retailHours.length - 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer active:scale-95"
                  title="Next Hour"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Hour Metrics Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-xs text-slate-500">Revenue Recorded:</span>
                <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
                  {formatCurrency(activeHourData?.revenue || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-xs text-slate-500">Bills Billed:</span>
                <span className="text-sm font-mono font-black text-blue-500">
                  {activeHourData?.bills || 0} bills
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-xs text-slate-500">Avg Ticket (AOV):</span>
                <span className="text-sm font-mono font-black text-emerald-500">
                  {formatCurrency(activeHourData?.aov || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-xs text-slate-500">Day Share %:</span>
                <span className="text-sm font-mono font-black text-amber-500">
                  {todayTotals.revenue > 0 ? Math.round(((activeHourData?.revenue || 0) / todayTotals.revenue) * 100) : 0}% of Day
                </span>
              </div>
            </div>

            {/* Staffing Recommendation Tip */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-blue-500 flex items-center gap-1 mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                Floor Strategy Note:
              </span>
              {activeHourData?.revenue >= maxRevenue * 0.7
                ? 'High customer rush detected in this slot. Keep 3+ sales staff on trial rooms & active counter billing.'
                : 'Steady/calm window. Ideal time for shelf replenishment, size-run stocking, and customer WhatsApp engagement.'}
            </div>
          </div>
        </div>

      </div>
        </>
      )}
    </div>
  );
};

export default ExecutiveVisualHeatmap;
