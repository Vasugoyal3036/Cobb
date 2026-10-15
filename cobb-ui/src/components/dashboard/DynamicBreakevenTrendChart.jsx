import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Calendar, 
  Info, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  X,
  Maximize2
} from 'lucide-react';

export default function DynamicBreakevenTrendChart({
  history = [],
  baseDailyBEP = 13468,
  baseDailyOpEx = 3367,
  targetMarginPct = 27,
  darkMode = true,
  formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  onClose = null,
  embedded = false
}) {
  const [timeframe, setTimeframe] = useState('ALL'); // '7D' | '14D' | 'ALL'
  const [hoveredDay, setHoveredDay] = useState(null);
  const [showBaseLine, setShowBaseLine] = useState(true);

  // Filter history based on timeframe
  const filteredHistory = useMemo(() => {
    if (!Array.isArray(history) || history.length === 0) return [];
    if (timeframe === '7D') return history.slice(-7);
    if (timeframe === '14D') return history.slice(-14);
    return history;
  }, [history, timeframe]);

  // Aggregate metrics for selected timeframe
  const summary = useMemo(() => {
    let totalSales = 0;
    let totalOpEx = 0;
    let profitDays = 0;
    let deficitDays = 0;
    let netCompoundedPnl = 0;

    filteredHistory.forEach((day) => {
      totalSales += Number(day.sales || 0);
      totalOpEx += Number(day.dailyOpEx || baseDailyOpEx);
      if (day.isLoss) deficitDays++;
      else if (day.status === 'PROFIT') profitDays++;
      netCompoundedPnl += Number(day.netDailyProfit || 0);
    });

    const winRate = filteredHistory.length > 0 
      ? Math.round((profitDays / filteredHistory.length) * 100) 
      : 0;

    return {
      totalSales,
      totalOpEx,
      profitDays,
      deficitDays,
      daysCount: filteredHistory.length,
      winRate,
      netCompoundedPnl,
      isProfitable: netCompoundedPnl >= 0
    };
  }, [filteredHistory, baseDailyOpEx]);

  // SVG Chart Dimensions & Scale
  const chartWidth = 720;
  const chartHeight = 280;
  const padding = { top: 35, right: 30, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Compute maximum scale value
  const maxDataVal = useMemo(() => {
    let max = Math.max(baseDailyBEP * 1.5, 45000);
    filteredHistory.forEach((d) => {
      const s = Number(d.sales || 0);
      const b = Number(d.adjustedBEPTwoWay || d.adjustedBEP || 0);
      if (s > max) max = s;
      if (b > max) max = b;
    });
    // Round up to nice thousands
    return Math.ceil((max * 1.15) / 10000) * 10000;
  }, [filteredHistory, baseDailyBEP]);

  // Coordinate mappers
  const getY = (val) => {
    const clamped = Math.max(0, Math.min(maxDataVal, Number(val || 0)));
    return padding.top + innerHeight - (clamped / maxDataVal) * innerHeight;
  };

  const getX = (index, total) => {
    if (total <= 1) return padding.left + innerWidth / 2;
    const step = innerWidth / (total - 1);
    return padding.left + index * step;
  };

  // Y-axis tick values (4 steps)
  const yTicks = [0, maxDataVal * 0.25, maxDataVal * 0.5, maxDataVal * 0.75, maxDataVal];

  // Build SVG path for Dynamic BEP Line
  const bepLinePath = useMemo(() => {
    if (filteredHistory.length === 0) return '';
    const points = filteredHistory.map((d, i) => {
      const x = getX(i, filteredHistory.length);
      const y = getY(d.adjustedBEPTwoWay !== undefined ? d.adjustedBEPTwoWay : d.adjustedBEP);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  }, [filteredHistory, maxDataVal]);

  const activeDay = hoveredDay || filteredHistory[filteredHistory.length - 1] || null;

  return (
    <div className={`rounded-3xl border shadow-xl overflow-hidden transition-all ${
      darkMode 
        ? 'bg-slate-950/95 border-amber-500/30 text-white shadow-amber-950/20' 
        : 'bg-white border-amber-200 text-slate-900 shadow-amber-100/50'
    }`}>
      {/* Top Header & Timeframe Selector */}
      <div className={`p-5 sm:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-amber-50/60 border-amber-200/70'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-xs">
              <Scale className="w-3 h-3 text-amber-400" /> Dynamic Break-Even Curve
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              Shift Target vs Actual Sales
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-100 flex items-center gap-2">
            <span>Visual Deficit &amp; Recovery Compounding</span>
          </h3>
          <p className="text-xs text-slate-400">
            Amber line dynamically climbs with unrecovered deficits and dips with profit cushions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Timeframe Tabs */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 text-xs font-mono font-bold ${
            darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {['7D', '14D', 'ALL'].map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf === 'ALL' ? 'Month' : tf}
              </button>
            ))}
          </div>

          {/* Toggle Baseline */}
          <button
            type="button"
            onClick={() => setShowBaseLine(!showBaseLine)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              showBaseLine
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
            title="Toggle Base ₹13,468 line"
          >
            <span>Base Ref</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Ribbon: High-Level Period Summary */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 sm:p-5 border-b font-mono text-xs ${
        darkMode ? 'bg-slate-900/30 border-slate-800/80' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Period Sales</span>
          <span className="text-base font-black text-slate-200 mt-0.5 block">{formatCurrency(summary.totalSales)}</span>
          <span className="text-[10px] text-slate-500">{summary.daysCount} days recorded</span>
        </div>
        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Win Rate</span>
          <span className="text-base font-black text-emerald-400 mt-0.5 block">{summary.winRate}% Met</span>
          <span className="text-[10px] text-slate-500">{summary.profitDays} Win / {summary.deficitDays} Loss</span>
        </div>
        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Period P&amp;L</span>
          <span className={`text-base font-black mt-0.5 block ${summary.isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.isProfitable ? `+${formatCurrency(summary.netCompoundedPnl)}` : `-${formatCurrency(Math.abs(summary.netCompoundedPnl))}`}
          </span>
          <span className="text-[10px] text-slate-500">{summary.isProfitable ? 'Pure Profit Pocketed' : 'Unrecovered Deficit'}</span>
        </div>
        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Base Daily Hurdle</span>
          <span className="text-base font-black text-amber-400 mt-0.5 block">{formatCurrency(baseDailyBEP)}</span>
          <span className="text-[10px] text-slate-500">₹{baseDailyOpEx.toLocaleString('en-IN')}/day OpEx</span>
        </div>
      </div>

      {/* Interactive Active Day Inspector Banner */}
      {activeDay && (
        <div className={`mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs font-mono transition-all ${
          activeDay.isMet 
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            <span className="font-black text-slate-200 text-sm">
              📅 {activeDay.date} ({activeDay.dayName})
            </span>
            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
              activeDay.isMet ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
            }`}>
              {activeDay.isMet ? '🎉 Breakeven Met' : `Deficit: -${formatCurrency(activeDay.gap)}`}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span>Sales: <strong className="text-white">{formatCurrency(activeDay.sales)}</strong></span>
            <span>Target BEP: <strong className="text-amber-400">{formatCurrency(activeDay.adjustedBEPTwoWay || activeDay.adjustedBEP)}</strong></span>
            <span>Net P&amp;L: <strong className={activeDay.netDailyProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {activeDay.netDailyProfit >= 0 ? `+${formatCurrency(activeDay.netDailyProfit)}` : `-${formatCurrency(Math.abs(activeDay.netDailyProfit))}`}
            </strong></span>
            <span>Next Day Target: <strong className="text-indigo-300">{formatCurrency(activeDay.nextDayBEPTwoWay || activeDay.nextDayBEP)}</strong></span>
          </div>
        </div>
      )}

      {/* SVG Chart Container */}
      <div className="p-4 sm:p-6 overflow-x-auto custom-scrollbar">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto min-w-[580px] overflow-visible select-none"
        >
          <defs>
            {/* Emerald Gradient for Profitable Days */}
            <linearGradient id="barProfitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.4" />
            </linearGradient>

            {/* Rose Gradient for Deficit Days */}
            <linearGradient id="barDeficitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#be123c" stopOpacity="0.35" />
            </linearGradient>

            {/* Amber Glow for Dynamic BEP Line */}
            <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Horizontal Grid Lines & Y-axis Labels */}
          {yTicks.map((tickVal, idx) => {
            const y = getY(tickVal);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke={darkMode ? '#334155' : '#e2e8f0'}
                  strokeDasharray="4 4"
                  strokeOpacity="0.4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  ₹{Math.round(tickVal / 1000)}k
                </text>
              </g>
            );
          })}

          {/* Base Breakeven Target Reference Line (₹13,468) */}
          {showBaseLine && (
            <g>
              <line
                x1={padding.left}
                y1={getY(baseDailyBEP)}
                x2={chartWidth - padding.right}
                y2={getY(baseDailyBEP)}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                strokeOpacity="0.5"
              />
              <text
                x={chartWidth - padding.right}
                y={getY(baseDailyBEP) - 6}
                textAnchor="end"
                fill="#fbbf24"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Base BEP: {formatCurrency(baseDailyBEP)}
              </text>
            </g>
          )}

          {/* Actual Daily Sales Bars */}
          {filteredHistory.map((day, i) => {
            const x = getX(i, filteredHistory.length);
            const y = getY(day.sales);
            const zeroY = getY(0);
            const barHeight = Math.max(2, zeroY - y);
            const barWidth = Math.min(28, Math.max(10, innerWidth / (filteredHistory.length * 1.8)));
            const isHovered = hoveredDay?.date === day.date;

            return (
              <g
                key={day.date}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredDay(day)}
                onClick={() => setHoveredDay(day)}
              >
                {/* Highlight aura behind bar on hover */}
                {isHovered && (
                  <rect
                    x={x - barWidth / 2 - 4}
                    y={y - 4}
                    width={barWidth + 8}
                    height={barHeight + 8}
                    rx="8"
                    fill={day.isMet ? '#10b981' : '#f43f5e'}
                    fillOpacity="0.25"
                  />
                )}

                {/* Sales Bar */}
                <rect
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="6"
                  fill={day.isMet ? 'url(#barProfitGrad)' : 'url(#barDeficitGrad)'}
                  stroke={isHovered ? '#ffffff' : (day.isMet ? '#34d399' : '#fb7185')}
                  strokeWidth={isHovered ? 2 : 1}
                />

                {/* Date Label on X Axis */}
                <text
                  x={x}
                  y={chartHeight - padding.bottom + 18}
                  textAnchor="middle"
                  fill={isHovered ? '#f8fafc' : '#94a3b8'}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {day.date.slice(8)}
                </text>
                <text
                  x={x}
                  y={chartHeight - padding.bottom + 30}
                  textAnchor="middle"
                  fill={isHovered ? '#fbbf24' : '#64748b'}
                  fontSize="8.5"
                  fontFamily="sans-serif"
                >
                  {day.dayName}
                </text>
              </g>
            );
          })}

          {/* Dynamic Stepped BEP Target Line */}
          {bepLinePath && (
            <path
              d={bepLinePath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glowLine)"
            />
          )}

          {/* Dynamic BEP Target Point Markers */}
          {filteredHistory.map((day, i) => {
            const x = getX(i, filteredHistory.length);
            const targetBEP = day.adjustedBEPTwoWay !== undefined ? day.adjustedBEPTwoWay : day.adjustedBEP;
            const y = getY(targetBEP);
            const isHovered = hoveredDay?.date === day.date;

            return (
              <g
                key={`bep-${day.date}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredDay(day)}
                onClick={() => setHoveredDay(day)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill="#0f172a"
                  stroke="#f59e0b"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend & Guide Footer */}
      <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
        darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span>
            <span className="text-slate-200 font-bold">Profitable Day (Sales ≥ BEP)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 inline-block"></span>
            <span className="text-slate-200 font-bold">Deficit Day (Carries Forward)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-amber-400 inline-block shadow-xs"></span>
            <span className="text-amber-300 font-bold">Dynamic Adjusted BEP Target</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span>Tap/hover any bar to inspect daily loss &amp; profit adjustments</span>
        </div>
      </div>
    </div>
  );
}
