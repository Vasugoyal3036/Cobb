import React from 'react';
import { Target, Receipt, TrendingUp, Sparkles } from 'lucide-react';

/**
 * AppleWatchRings
 * Concentric 3-Ring Activity Halo Tracker for Cobb POS:
 * - Outer Ring (Rose/Amber): Sales Target Progress
 * - Middle Ring (Cyan/Blue): Checkouts Volume vs Pace
 * - Inner Ring (Emerald): Retail Gross Margin Retained
 */
export default function AppleWatchRings({
  size = 110,
  todaySales = 0,
  dailyTarget = 100000,
  todayBills = 0,
  expectedBills = 20,
  targetMargin = 27,
  actualMargin = 27,
  formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  showLegend = true,
  className = ''
}) {
  const salesPct = dailyTarget > 0 ? Math.min(100, Math.max(0, (todaySales / dailyTarget) * 100)) : 0;
  const billsPct = expectedBills > 0 ? Math.min(100, Math.max(0, (todayBills / expectedBills) * 100)) : 0;
  const marginPct = targetMargin > 0 ? Math.min(100, Math.max(0, (actualMargin / targetMargin) * 100)) : 0;

  // Concentric circle geometry (center at 60, 60 in 120x120 viewBox)
  const center = 60;
  const strokeWidth = 8;
  const gap = 3;

  const r1 = 48; // Outer: Target
  const r2 = r1 - strokeWidth - gap; // 37: Bills
  const r3 = r2 - strokeWidth - gap; // 26: Margin

  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;

  const offset1 = c1 * (1 - salesPct / 100);
  const offset2 = c2 * (1 - billsPct / 100);
  const offset3 = c3 * (1 - marginPct / 100);

  const allClosed = salesPct >= 100 && billsPct >= 100 && marginPct >= 100;

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-3.5 select-none ${className}`}>
      {/* SVG Concentric Rings */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className="transform -rotate-90 overflow-visible"
        >
          <defs>
            {/* Gradient 1: Target (Rose / Amber) */}
            <linearGradient id="ringTarget" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Gradient 2: Bills (Cyan / Electric Blue) */}
            <linearGradient id="ringBills" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Gradient 3: Margin (Emerald / Mint) */}
            <linearGradient id="ringMargin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            {/* Subtle Neon Drop Shadows */}
            <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#f59e0b" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background Track Circles */}
          <circle cx={center} cy={center} r={r1} fill="none" stroke="#f43f5e" strokeWidth={strokeWidth} opacity="0.16" />
          <circle cx={center} cy={center} r={r2} fill="none" stroke="#06b6d4" strokeWidth={strokeWidth} opacity="0.16" />
          <circle cx={center} cy={center} r={r3} fill="none" stroke="#10b981" strokeWidth={strokeWidth} opacity="0.16" />

          {/* Active Ring 1: Target */}
          <circle
            cx={center}
            cy={center}
            r={r1}
            fill="none"
            stroke="url(#ringTarget)"
            strokeWidth={strokeWidth}
            strokeDasharray={c1}
            strokeDashoffset={offset1}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            filter={salesPct >= 100 ? "url(#ringGlow)" : undefined}
          />

          {/* Active Ring 2: Bills */}
          <circle
            cx={center}
            cy={center}
            r={r2}
            fill="none"
            stroke="url(#ringBills)"
            strokeWidth={strokeWidth}
            strokeDasharray={c2}
            strokeDashoffset={offset2}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />

          {/* Active Ring 3: Margin */}
          <circle
            cx={center}
            cy={center}
            r={r3}
            fill="none"
            stroke="url(#ringMargin)"
            strokeWidth={strokeWidth}
            strokeDasharray={c3}
            strokeDashoffset={offset3}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Badge / Percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {allClosed ? (
            <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
          ) : (
            <span className="text-xs font-black font-mono tracking-tight text-white drop-shadow">
              {salesPct.toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Interactive Legend (if enabled) */}
      {showLegend && (
        <div className="flex flex-col gap-1 text-[11px] font-mono leading-tight">
          {/* Ring 1 Legend */}
          <div className="flex items-center gap-1.5" title={`Sales: ${formatCurrency(todaySales)} of ${formatCurrency(dailyTarget)}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-400 shrink-0 shadow-xs" />
            <span className="text-slate-400 text-[10px] uppercase font-bold">Target:</span>
            <span className="font-black text-amber-300">{salesPct.toFixed(0)}%</span>
            <span className="text-[10px] text-slate-500">({formatCurrency(todaySales)})</span>
          </div>

          {/* Ring 2 Legend */}
          <div className="flex items-center gap-1.5" title={`Checkouts: ${todayBills} of ${expectedBills} expected pace`}>
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shrink-0 shadow-xs" />
            <span className="text-slate-400 text-[10px] uppercase font-bold">Bills:</span>
            <span className="font-black text-cyan-300">{todayBills}</span>
            <span className="text-[10px] text-slate-500">/ {expectedBills} pace</span>
          </div>

          {/* Ring 3 Legend */}
          <div className="flex items-center gap-1.5" title={`Gross Margin: ${actualMargin}% retained vs ${targetMargin}% target`}>
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 shrink-0 shadow-xs" />
            <span className="text-slate-400 text-[10px] uppercase font-bold">Margin:</span>
            <span className="font-black text-emerald-300">{actualMargin}%</span>
            <span className="text-[10px] text-slate-500">retained</span>
          </div>
        </div>
      )}
    </div>
  );
}
