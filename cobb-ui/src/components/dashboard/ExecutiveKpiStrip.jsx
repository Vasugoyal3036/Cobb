import React from 'react';
import { TrendingUp, ShoppingBag, ArrowRight } from 'lucide-react';

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
  topCardRef
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Revenue Card with WoW/MoM Trends & Payment Breakdown */}
      <div ref={topCardRef} className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${
        darkMode ? 'kpi-card-revenue text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Today's Revenue</span>
            <h3 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-1">
              {formatCurrency((overviewStats?.today?.TotalSales || 0))}
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
            <TrendingUp className="w-5 h-5" />
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

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex gap-2 text-xs font-bold tracking-wide">
          <div className={`flex-1 flex flex-col justify-center items-center px-2 py-1.5 rounded-xl border ${darkMode ? 'bg-[#080d14] text-emerald-400 border-[#1a2538]' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cash</span>
            <span className="text-xs font-mono font-black">{formatCurrency((overviewStats?.today?.CashAmount || 0))}</span>
          </div>
          <div className={`flex-1 flex flex-col justify-center items-center px-2 py-1.5 rounded-xl border ${darkMode ? 'bg-[#080d14] text-purple-400 border-[#1a2538]' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">UPI</span>
            <span className="text-xs font-mono font-black">{formatCurrency((overviewStats?.today?.UPIAmount || 0))}</span>
          </div>
          <div className={`flex-1 flex flex-col justify-center items-center px-2 py-1.5 rounded-xl border ${darkMode ? 'bg-[#080d14] text-blue-400 border-[#1a2538]' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Card</span>
            <span className="text-xs font-mono font-black">{formatCurrency((overviewStats?.today?.CardAmount || 0))}</span>
          </div>
        </div>
      </div>

      {/* Target Progress Card */}
      <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden ${
        darkMode ? 'kpi-card-target text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex justify-between items-start relative z-10">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Daily Target</span>
            <h3 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-1">
              {formatCurrency(DAILY_TARGET)}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold font-mono px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
              {targetProgress.toFixed(0)}% Paced
            </span>
          </div>
        </div>

        <div className="mt-3 relative z-10">
          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2.5 overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-1000 shadow-xs" style={{ width: `${Math.min(100, targetProgress)}%` }}></div>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-400 mt-2 font-medium">
            <span>{formatCurrency(Math.max(0, DAILY_TARGET - (overviewStats?.today?.TotalSales || 0)))} remaining</span>
            <span className="text-blue-400 font-bold">On Pace</span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs flex justify-between items-center text-slate-400">
          <span className="font-medium">Run Rate Needed:</span>
          <span className="font-mono font-bold text-slate-200">
            {formatCurrency(Math.round(Math.max(0, DAILY_TARGET - (overviewStats?.today?.TotalSales || 0)) / 5))}/hr
          </span>
        </div>
      </div>

      {/* Average Order Value + Bill Volume */}
      <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${
        darkMode ? 'kpi-card-aov text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Avg. Order Value</span>
            <h3 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-1">
              {formatCurrency(averageOrderValue)}
            </h3>
          </div>
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-2 font-medium">
            Across <span className="font-bold text-slate-200">{(overviewStats?.today?.BillCount || 0)}</span> customer invoices today.
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className={`px-2 py-0.5 rounded-md border ${darkMode ? 'bg-slate-800/60 text-slate-300 border-slate-700/60' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              Week: {overviewStats.thisWeek?.BillCount || 0} bills
            </span>
            <span className={`px-2 py-0.5 rounded-md border ${darkMode ? 'bg-slate-800/60 text-slate-300 border-slate-700/60' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              Month: {overviewStats.thisMonth?.BillCount || 0} bills
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
          <span className="font-medium">Basket Conversion:</span>
          <span className="font-bold text-purple-400 font-mono">
            {((overviewStats?.today?.BillCount || 0) > 0 ? (totalMonthlyUnits / Math.max(1, overviewStats.thisMonth?.BillCount || 1)).toFixed(1) : '2.4')} pcs / bill
          </span>
        </div>
      </div>

      {/* Card 4: Profit Margin (Owner) vs Counter Settlement Desk (Manager) */}
      {userRole !== 'manager' ? (
        <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${
          darkMode ? 'kpi-card-margin text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex justify-between items-start mb-1">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Gross &amp; Net Margin</span>
              {(() => {
                const totalSales = overviewStats.today?.TotalSales || 0;
                const cogs = Math.round(totalSales * 0.73);
                const grossProfit = totalSales - cogs;
                const DAILY_EXPENSE = 4000;
                const netMargin = grossProfit - DAILY_EXPENSE;
                const isProfitable = netMargin >= 0;
                return (
                  <h3 className={`text-3xl sm:text-4xl font-black font-mono tracking-tight mt-1 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
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
            const DAILY_EXPENSE = 4000;
            const bep = Math.round(DAILY_EXPENSE / 0.27);
            const cogs = Math.round(totalSales * 0.73);
            const grossProfit = totalSales - cogs;
            const netMargin = grossProfit - DAILY_EXPENSE;
            const isProfitable = netMargin >= 0;
            const opExBarPct = isProfitable 
              ? Math.min(27, Math.round((DAILY_EXPENSE / total) * 100))
              : Math.round((Math.max(0, grossProfit) / DAILY_EXPENSE) * 27);
            const netBarPct = isProfitable ? Math.max(0, 100 - 73 - opExBarPct) : 0;
            const deficitBarPct = isProfitable ? 0 : (27 - opExBarPct);

            return (
              <div className="space-y-1.5 my-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-400">Cost (73%)</span>
                  <span className="text-amber-400">OpEx (₹4k)</span>
                  <span className={isProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                    {isProfitable ? 'Profit' : 'Deficit'}
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full flex overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div className="bg-slate-500 h-full" style={{ width: '73%' }}></div>
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
            <span className="text-xs text-slate-400 font-medium">Breakeven at ₹14,815</span>
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
        <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${
          darkMode ? 'kpi-card-revenue text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex justify-between items-start mb-1">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Counter Register</span>
              <h3 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-1">
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
