import React from 'react';
import { TrendingUp, ShoppingBag, ArrowRight, Settings } from 'lucide-react';

const ExecutiveKpiStrip = ({
  darkMode,
  formatCurrency,
  overviewStats,
  DAILY_TARGET,
  targetProgress,
  averageOrderValue,
  totalMonthlyUnits,
  userRole,
  setActiveTab,
  setShowReconModal,
  topCardRef,
  pnlData
}) => {
  const [localExpConfig, setLocalExpConfig] = React.useState(() => {
    try {
      const raw = localStorage.getItem('cobb_store_config');
      return raw ? JSON.parse(raw)?.operatingExpenses : null;
    } catch (e) {
      return null;
    }
  });

  React.useEffect(() => {
    const handleUpdate = (e) => {
      try {
        const raw = localStorage.getItem('cobb_store_config');
        const parsed = e?.detail || (raw ? JSON.parse(raw)?.operatingExpenses : null);
        if (parsed) setLocalExpConfig(parsed);
      } catch (err) {}
    };
    window.addEventListener('cobb_store_config_updated', handleUpdate);
    return () => window.removeEventListener('cobb_store_config_updated', handleUpdate);
  }, []);

  // Merge with precedence given to immediate local edits over pnlData
  const expCfg = {
    ...(pnlData?.operatingExpenses || {}),
    ...(localExpConfig || {})
  };
  const targetMargin = Number(expCfg?.targetMarginPct ?? 27);
  const marginFrac = targetMargin / 100;
  const cogsFrac = 1 - marginFrac;
  const cogsPct = Math.round(cogsFrac * 100);

  const totalMonthlyExp = Number(expCfg?.totalExpenses ?? 110000);
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
  const opExFormatted = DAILY_EXPENSE >= 1000 
    ? `${(DAILY_EXPENSE / 1000).toFixed(DAILY_EXPENSE % 1000 === 0 ? 0 : 1)}k` 
    : DAILY_EXPENSE.toLocaleString('en-IN');
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
      {/* Revenue Card with WoW/MoM Trends & Payment Breakdown */}
      <div ref={topCardRef} className={`col-span-2 lg:col-span-1 p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${
        darkMode ? 'kpi-card-revenue text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">Today's Revenue</span>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-1">
              {formatCurrency((overviewStats?.today?.TotalSales || 0))}
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
      </div>

      {/* Target Progress Card */}
      <div className={`col-span-1 lg:col-span-1 p-3.5 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden ${
        darkMode ? 'kpi-card-target text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex justify-between items-start relative z-10">
          <div>
            <div className="flex items-center gap-1">
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
            <h3 className="text-lg sm:text-2xl lg:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-1">
              {formatCurrency(DAILY_TARGET)}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] sm:text-xs font-bold font-mono px-1.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
              {targetProgress.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="mt-2.5 relative z-10">
          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-1000 shadow-xs" style={{ width: `${Math.min(100, targetProgress)}%` }}></div>
          </div>
          <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-400 mt-1.5 font-medium">
            <span>{formatCurrency(Math.max(0, DAILY_TARGET - (overviewStats?.today?.TotalSales || 0)))} left</span>
            <span className="text-blue-400 font-bold hidden sm:inline">On Pace</span>
          </div>
        </div>

        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-xs flex justify-between items-center text-slate-400">
          <span className="font-medium">Run Rate:</span>
          <span className="font-mono font-bold text-slate-200">
            {formatCurrency(Math.round(Math.max(0, DAILY_TARGET - (overviewStats?.today?.TotalSales || 0)) / 5))}/hr
          </span>
        </div>
      </div>

      {/* Average Order Value + Bill Volume */}
      <div className={`col-span-1 lg:col-span-1 p-3.5 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${
        darkMode ? 'kpi-card-aov text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">Avg Ticket (ABV)</span>
            <h3 className="text-lg sm:text-2xl lg:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-1">
              {formatCurrency(averageOrderValue)}
            </h3>
          </div>
          <div className="p-1.5 sm:p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 shrink-0">
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="mt-2">
          <div className="text-[10px] sm:text-xs text-slate-400 mb-1 font-medium">
            Across <span className="font-bold text-slate-200">{(overviewStats?.today?.BillCount || 0)}</span> bills today
          </div>
          <div className="flex flex-wrap gap-1 text-[10px] sm:text-xs font-medium">
            <span className={`px-1.5 py-0.5 rounded border ${darkMode ? 'bg-slate-800/60 text-slate-300 border-slate-700/60' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              Wk: {overviewStats.thisWeek?.BillCount || 0}
            </span>
            <span className={`px-1.5 py-0.5 rounded border ${darkMode ? 'bg-slate-800/60 text-slate-300 border-slate-700/60' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              Mo: {overviewStats.thisMonth?.BillCount || 0}
            </span>
          </div>
        </div>

        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium">Basket:</span>
          <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">
            {((overviewStats?.today?.BillCount || 0) > 0 ? (totalMonthlyUnits / Math.max(1, overviewStats.thisMonth?.BillCount || 1)).toFixed(1) : '2.4')} pcs
          </span>
        </div>
      </div>

      {/* Card 4: Profit Margin (Owner) vs Counter Settlement Desk (Manager) */}
      {userRole !== 'manager' ? (
        <div className={`col-span-2 lg:col-span-1 p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${
          darkMode ? 'kpi-card-margin text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">Gross &amp; Net Margin</span>
                {userRole === 'owner' && (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('cobb_open_store_expenses'))}
                    className="p-0.5 rounded text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Click to edit Daily OpEx & Margin %"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                )}
              </div>
              {(() => {
                const totalSales = overviewStats.today?.TotalSales || 0;
                const cogs = Math.round(totalSales * cogsFrac);
                const grossProfit = totalSales - cogs;
                const netMargin = grossProfit - DAILY_EXPENSE;
                const isProfitable = netMargin >= 0;
                return (
                  <h3 className={`text-2xl sm:text-3xl font-black font-mono tracking-tight mt-1 ${isProfitable ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    {isProfitable ? `+${formatCurrency(netMargin)}` : `-${formatCurrency(Math.abs(netMargin))}`}
                  </h3>
                );
              })()}
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/30 bg-amber-500/15 text-amber-300">
              Owner Only
            </span>
          </div>

          {(() => {
            const totalSales = overviewStats.today?.TotalSales || 0;
            const total = totalSales > 0 ? totalSales : 1;
            const cogs = Math.round(totalSales * cogsFrac);
            const grossProfit = totalSales - cogs;
            const netMargin = grossProfit - DAILY_EXPENSE;
            const isProfitable = netMargin >= 0;
            const targetMarginInt = Math.round(marginFrac * 100);
            const opExBarPct = isProfitable 
              ? Math.min(targetMarginInt, Math.round((DAILY_EXPENSE / total) * 100))
              : (DAILY_EXPENSE > 0 ? Math.round((Math.max(0, grossProfit) / DAILY_EXPENSE) * targetMarginInt) : 0);
            const netBarPct = isProfitable ? Math.max(0, 100 - cogsPct - opExBarPct) : 0;
            const deficitBarPct = isProfitable ? 0 : (targetMarginInt - opExBarPct);

            return (
              <div className="space-y-1.5 my-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-500 dark:text-slate-400">Cost ({cogsPct}%)</span>
                  <span className="text-amber-500 dark:text-amber-400">OpEx (₹{opExFormatted})</span>
                  <span className={isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {isProfitable ? 'Profit' : 'Deficit'}
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full flex overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div className="bg-slate-500 h-full" style={{ width: `${cogsPct}%` }}></div>
                  <div className="bg-amber-400 h-full" style={{ width: `${Math.max(2, opExBarPct)}%` }}></div>
                  {isProfitable ? (
                    <div className="bg-emerald-500 h-full" style={{ width: `${Math.max(2, netBarPct)}%` }}></div>
                  ) : (
                    <div className="bg-rose-400/80 h-full" style={{ width: `${Math.max(2, deficitBarPct)}%` }}></div>
                  )}
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>₹{Math.round(cogs / 1000)}k COGS</span>
                  <span>{isProfitable ? '🎉 Profitable' : `₹${Math.max(0, bep - totalSales)} to BEP`}</span>
                </div>
              </div>
            );
          })()}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('cobb_open_store_expenses'))}
              className="text-xs text-slate-400 hover:text-emerald-400 font-medium transition-colors cursor-pointer flex items-center gap-1"
              title="Click to edit Daily OpEx & Breakeven"
            >
              <span>Breakeven at {formatCurrency(bep)}</span>
              <Settings className="w-2.5 h-2.5 opacity-60" />
            </button>
            <button
              onClick={() => setActiveTab('pnl')}
              className="font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Full P&amp;L</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className={`col-span-2 lg:col-span-1 p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${
          darkMode ? 'kpi-card-revenue text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex justify-between items-start mb-1">
            <div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">Counter Register</span>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-1">
                {formatCurrency((overviewStats?.today?.CashAmount || 0) + (overviewStats?.today?.UPIAmount || 0) + (overviewStats?.today?.CardAmount || 0))}
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
              Live Drawer
            </span>
          </div>

          {(() => {
            const cash = overviewStats?.today?.CashAmount || 0;
            const card = overviewStats?.today?.CardAmount || 0;
            const upi = overviewStats?.today?.UPIAmount || 0;
            const total = (cash + card + upi) || 1;
            const cashPct = Math.round((cash / total) * 100);
            const upiPct = Math.round((upi / total) * 100);
            const cardPct = Math.round((card / total) * 100);
            return (
              <div className="space-y-1.5 my-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-emerald-400">Cash ({cashPct}%)</span>
                  <span className="text-purple-400">UPI ({upiPct}%)</span>
                  <span className="text-blue-400">Card ({cardPct}%)</span>
                </div>
                <div className={`w-full h-2 rounded-full flex overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} p-0.5 gap-0.5`}>
                  <div className="bg-emerald-500 h-full rounded-l-full" style={{ width: `${cashPct}%` }}></div>
                  <div className="bg-purple-500 h-full" style={{ width: `${upiPct}%` }}></div>
                  <div className="bg-blue-500 h-full rounded-r-full" style={{ width: `${cardPct}%` }}></div>
                </div>
                <div className="text-xs text-slate-400 text-center font-medium">
                  EOD reconciliation at 8:30 PM
                </div>
              </div>
            );
          })()}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs">
            <span className="text-xs text-slate-400 font-medium">Cashier Settlement</span>
            <button
              onClick={() => setShowReconModal && setShowReconModal(true)}
              className="font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Reconcile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveKpiStrip;
