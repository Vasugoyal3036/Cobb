import React, { useState, useEffect } from 'react';
import { BarChart3, Zap, ArrowRight, Flame, Crown, Scissors, Plus } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';

const LivePulseFeed = ({
  hourlySales,
  liveBills,
  vips,
  setActiveTab,
  darkMode,
  todayTopArticlesLoading,
  todayTopArticles,
  setShowAlterationModal,
  activeStore = 'DEMO_STORE_001'
}) => {
  const [recentAlterations, setRecentAlterations] = useState([]);

  useEffect(() => {
    const targetStore = activeStore === 'ALL' ? 'DEMO_STORE_001' : activeStore;
    const alterationsRef = collection(db, `stores/${targetStore}/alterations`);
    const q = query(alterationsRef, orderBy('createdAt', 'desc'), limit(3));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const slips = [];
      snapshot.forEach((doc) => {
        slips.push({ id: doc.id, ...doc.data() });
      });
      setRecentAlterations(slips);
    });

    return () => unsubscribe();
  }, [activeStore]);

  // --- Hourly Rush data ---
  const hourlyData = Array.isArray(hourlySales) ? hourlySales : [];
  const maxHourlyRev = Math.max(1, ...hourlyData.map(h => h.TotalRevenue || 0));
  const peakHour = hourlyData.length > 0 ? hourlyData.reduce((best, h) => (h.TotalRevenue || 0) > (best.TotalRevenue || 0) ? h : best, hourlyData[0]) : null;
  const storeHours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const hourMap = Object.fromEntries(hourlyData.map(h => [h.SaleHour, h]));

  // --- Today's Bills derived metrics ---
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayBills = (Array.isArray(liveBills) ? liveBills : []).filter(b => {
    const d = b.BillDate ? b.BillDate.trim() : (b.BillTime ? b.BillTime.slice(0, 10) : '');
    return d === todayStr;
  });
  const totalItems = todayBills.reduce((s, b) => s + (b.TotalQty || 0), 0);
  const avgItemsPerBill = todayBills.length > 0 ? (totalItems / todayBills.length).toFixed(1) : '0';
  const totalCash = todayBills.reduce((s, b) => s + (b.CashAmount || 0), 0);
  const totalDigital = todayBills.reduce((s, b) => s + (b.UpiAmount || 0) + (b.CardAmount || 0), 0);
  const totalCollection = totalCash + totalDigital;
  const digitalPct = totalCollection > 0 ? Math.round((totalDigital / totalCollection) * 100) : 0;

  // --- VIP detection: today's shoppers who are also in VIP list ---
  const vipList = Array.isArray(vips) ? vips : [];
  const vipPhoneMap = Object.fromEntries(vipList.map(v => [v.Phone?.trim(), v]));
  const todayVips = todayBills
    .filter(b => vipPhoneMap[b.Phone?.trim()])
    .map(b => ({ ...b, vipData: vipPhoneMap[b.Phone?.trim()] }))
    .slice(0, 3);

  return (
    <div className="space-y-4">
      {/* LONG TILE 1: HOURLY SALES VELOCITY & PEAK RUSH */}
      <div 
        onClick={() => typeof setActiveTab === 'function' && setActiveTab('hourly')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer group hover:border-indigo-500/50 ${
          darkMode ? 'bg-[#0e1320] border-[#1c2436] text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1c2436]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <span>Hourly Rush Curve &amp; Floor Velocity</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-[11px] text-slate-400">
                Live sales distribution across store opening hours
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-bold text-indigo-400">
              <Zap className="w-3.5 h-3.5" />
              <span>{peakHour ? `${peakHour.SaleHour > 12 ? peakHour.SaleHour - 12 : peakHour.SaleHour}${peakHour.SaleHour >= 12 ? ' PM' : ' AM'} Peak` : 'Live Tracking'}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 group-hover:underline">
              <span>Full Heatmap</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Banner Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-3.5 items-center">
          {/* Left Stats Block (4 cols) */}
          <div className="md:col-span-4 grid grid-cols-3 md:grid-cols-1 gap-2">
            <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Basket Depth</span>
              <div className="text-right">
                <span className="text-sm font-black font-mono text-cyan-400">{avgItemsPerBill}</span>
                <span className="text-[9px] text-slate-500 ml-1">pcs/bill</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Digital Share</span>
              <div className="text-right">
                <span className="text-sm font-black font-mono text-emerald-400">{digitalPct}%</span>
                <span className="text-[9px] text-slate-500 ml-1">UPI/Card</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Floor Volume</span>
              <div className="text-right">
                <span className="text-sm font-black font-mono text-amber-400">{totalItems}</span>
                <span className="text-[9px] text-slate-500 ml-1">pcs ({todayBills.length} bills)</span>
              </div>
            </div>
          </div>

          {/* Right Sparkline Bar Chart (8 cols) */}
          <div className="md:col-span-8 flex flex-col justify-end">
            <div className="h-16 flex items-end gap-1.5 px-2 pt-2 bg-slate-900/30 rounded-xl border border-slate-800/50">
              {storeHours.map(hour => {
                const match = hourMap[hour];
                const rev = match ? match.TotalRevenue || 0 : 0;
                const heightPct = maxHourlyRev > 0 ? Math.max(10, Math.round((rev / maxHourlyRev) * 100)) : 10;
                const isPeak = peakHour && peakHour.SaleHour === hour && rev > 0;
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center h-full justify-end group/bar relative">
                    <div 
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${
                        isPeak 
                          ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]' 
                          : rev > 0 
                            ? 'bg-indigo-500 group-hover/bar:bg-indigo-400' 
                            : 'bg-slate-700/20'
                      }`}
                    />
                    {rev > 0 && (
                      <div className="absolute -top-7 hidden group-hover/bar:flex flex-col items-center z-20 pointer-events-none">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white border border-slate-700 whitespace-nowrap font-mono shadow-md">
                          ₹{rev.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1.5 px-2">
              <span>10 AM</span>
              <span>12 PM</span>
              <span>2 PM</span>
              <span>4 PM</span>
              <span>6 PM</span>
              <span>8 PM</span>
              <span>9 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* LONG TILE 2: TODAY'S TOP MOVERS & VIP SHOPPER RADAR */}
      <div className={`p-4 rounded-2xl border transition-all ${
        darkMode ? 'bg-[#0e1320] border-[#1c2436] text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sub-Panel 1: Top Moving Articles */}
          <div 
            onClick={() => typeof setActiveTab === 'function' && setActiveTab('monthly_products')}
            className="cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-[#1c2436]">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  Today's Best Sellers
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Top Velocity
                </span>
              </div>

              <div className="space-y-1.5">
                {todayTopArticlesLoading ? (
                  <div className="py-4 text-center text-xs text-slate-500">Loading movers...</div>
                ) : todayTopArticles.length > 0 ? (
                  todayTopArticles.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-900/30 border border-slate-800/40 hover:border-emerald-500/30 transition-all">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold truncate text-[11px] text-slate-200">{item.ArticleName || item.ArticleNo}</p>
                        <p className="text-[10px] text-slate-500 truncate">{item.ArticleNo} • {item.Category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-black font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/15">
                          {item.UnitsSold} sold
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500">No multi-unit articles recorded yet today</div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-[#1c2436] flex items-center justify-between text-[11px] font-bold text-emerald-400 group-hover:underline">
              <span>View Product Catalog Breakdown</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Sub-Panel 2: Alteration Desk */}
          <div 
            onClick={() => setShowAlterationModal?.(true)}
            className="cursor-pointer group flex flex-col justify-between md:border-l md:border-slate-800/60 md:pl-4 hover:bg-slate-50 dark:hover:bg-[#151a26] rounded-xl transition-colors p-2 -m-2"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-[#1c2436]">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  Alteration Desk
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                  {recentAlterations.length} Recent
                </span>
              </div>

              <div className="space-y-1.5 mt-2">
                {recentAlterations.length > 0 ? (
                  recentAlterations.map((slip, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-900/30 border border-slate-800/40 hover:border-indigo-500/30 transition-all">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold truncate text-[11px] text-slate-200">{slip.customerName || 'Customer'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {slip.category} x {slip.quantity}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                        slip.status === 'Completed' 
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {slip.status || 'Pending'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    No recent alteration slips. Create one below.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-[#1c2436] flex items-center justify-between text-[11px] font-bold text-indigo-500 dark:text-indigo-400 group-hover:underline">
              <span>Create New Slip</span>
              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePulseFeed;
