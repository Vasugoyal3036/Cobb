import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
  activeStore = 'DEMO_STORE_001',
  API_BASE = 'http://localhost:5000'
}) => {
  const [recentAlterations, setRecentAlterations] = useState([]);
  const [alterationsSummary, setAlterationsSummary] = useState({
    totalJobs: 0,
    activeJobs: 0,
    pendingJobs: 0,
    readyJobs: 0,
    dueToday: 0
  });

  const loadAlterations = useCallback(async () => {
    const targetStore = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
    const today = new Date().toISOString().split('T')[0];
    let fetched = false;

    // Helper to calculate exact matching metrics
    const processItems = (items) => {
      const activeList = items.filter(s => s.status !== 'Completed');
      const sorted = [...items].sort((a, b) => {
        const order = { 'Pending': 1, 'In Progress': 2, 'Ready for Pickup': 3, 'Completed': 4 };
        return (order[a.status] || 5) - (order[b.status] || 5);
      });
      // Show active first in the mini tile
      const displaySlips = activeList.length > 0 ? sorted.filter(s => s.status !== 'Completed').slice(0, 3) : sorted.slice(0, 3);
      setRecentAlterations(displaySlips);

      const pendingJobs = items.filter(s => s.status === 'Pending' || s.status === 'In Progress').length;
      const readyJobs = items.filter(s => s.status === 'Ready for Pickup').length;
      const dueToday = items.filter(s => s.expectedDate === today && s.status !== 'Completed').length;
      const activeJobs = activeList.length;

      setAlterationsSummary({
        totalJobs: items.length,
        activeJobs,
        pendingJobs,
        readyJobs,
        dueToday
      });
    };

    // 1. Try local API first for 100% sync with alterations.json & menu
    try {
      const res = await axios.get(`${API_BASE}/api/alterations?storeId=${targetStore}`);
      const rawData = res.data;
      const items = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.items) ? rawData.items : null);
      if (items && items.length > 0) {
        processItems(items);
        fetched = true;
      }
    } catch (e) {
      // Fall through to Firestore
    }

    // 2. Firestore listener for real-time live sync across local & phone link
    if (db) {
      try {
        const alterationsRef = collection(db, `stores/${targetStore}/alterations`);
        const q = query(alterationsRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const slips = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            slips.push({ 
              id: doc.id, 
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
            });
          });
          if (slips.length > 0 || !fetched) {
            processItems(slips);
          }
        }, (err) => {
          console.warn('[LivePulseFeed] Firestore listener note:', err.message);
        });
        return unsubscribe;
      } catch (err) {
        console.warn('[LivePulseFeed] Firestore fallback note:', err.message);
      }
    }
  }, [API_BASE, activeStore]);

  useEffect(() => {
    const unsubPromise = loadAlterations();
    const interval = setInterval(loadAlterations, 15000);
    return () => {
      clearInterval(interval);
      if (typeof unsubPromise === 'function') unsubPromise();
      else if (unsubPromise?.then) unsubPromise.then(unsub => typeof unsub === 'function' && unsub());
    };
  }, [loadAlterations]);

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
            onClick={() => typeof setActiveTab === 'function' && setActiveTab('alterations')}
            className="cursor-pointer group flex flex-col justify-between md:border-l md:border-slate-800/60 md:pl-4 hover:bg-slate-50 dark:hover:bg-[#151a26] rounded-xl transition-colors p-2 -m-2"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-[#1c2436]">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  Alteration Desk
                </span>
                <div className="flex items-center gap-1">
                  {alterationsSummary.dueToday > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                      {alterationsSummary.dueToday} Due
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                    {alterationsSummary.pendingJobs > 0 ? `${alterationsSummary.pendingJobs} Pending` : `${alterationsSummary.totalJobs || recentAlterations.length} Active`}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 mt-2">
                {recentAlterations.length > 0 ? (
                  recentAlterations.map((slip, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-900/30 border border-slate-800/40 hover:border-indigo-500/30 transition-all">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-indigo-400">{slip.tokenNumber || slip.id}</span>
                          <p className="font-bold truncate text-[11px] text-slate-200">{slip.customerName || 'Customer'}</p>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {slip.category} x {slip.quantity || 1} • {slip.expectedDate || 'Today'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border whitespace-nowrap ${
                        slip.status === 'Completed' 
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : slip.status === 'Ready for Pickup'
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}>
                        {slip.status || 'Pending'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    No active alteration slips today. Tap below to create.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-[#1c2436] flex items-center justify-between text-[11px] font-bold">
              <span className="text-indigo-400 group-hover:underline flex items-center gap-1">
                Open Alterations Desk <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAlterationModal?.(true);
                }}
                className="px-2 py-0.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 flex items-center gap-1 transition"
                title="Create New Alteration Slip"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePulseFeed;
