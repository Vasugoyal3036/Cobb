import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Scissors, Plus, CheckCircle, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';

/**
 * Alterations & Tailoring Operations Desk
 * Real-time monitoring of customer alterations, tailoring jobs due, and instant slip creation.
 * Replaces legacy hourly rush / best sellers widgets with a high-utility operational command card.
 */
const LivePulseFeed = ({
  setActiveTab,
  darkMode,
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
      const sortedActive = [...activeList].sort((a, b) => {
        const order = { 'Pending': 1, 'In Progress': 2, 'Ready for Pickup': 3 };
        return (order[a.status] || 5) - (order[b.status] || 5);
      });
      // Show active slips in the mini tile
      setRecentAlterations(sortedActive.slice(0, 4));

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

    // 1. Try local API first for 100% sync with alterations.json
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
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadAlterations();
    }, 60000);
    return () => {
      clearInterval(interval);
      if (typeof unsubPromise === 'function') unsubPromise();
      else if (unsubPromise?.then) unsubPromise.then(unsub => typeof unsub === 'function' && unsub());
    };
  }, [loadAlterations]);

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all glass-card-obsidian ${
      darkMode ? 'bg-[#0e1320] border-[#1c2436] text-slate-100' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* Header with Badges */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span>Alterations &amp; Tailoring Desk</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Customer garment fitting &amp; delivery tracker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {alterationsSummary.dueToday > 0 && (
            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
              <Clock className="w-3 h-3" />
              <span>{alterationsSummary.dueToday} Due Today</span>
            </span>
          )}
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            alterationsSummary.activeJobs > 0
              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25 font-mono'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
          }`}>
            {alterationsSummary.activeJobs > 0
              ? `${alterationsSummary.activeJobs} Active Jobs`
              : '0 Active'}
          </span>
        </div>
      </div>

      {/* Slips List */}
      <div className="space-y-2">
        {recentAlterations.length > 0 ? (
          recentAlterations.map((slip, idx) => {
            const token = slip.tokenNumber || `ALT-${String(slip.id || '').slice(-4).toUpperCase()}`;
            const isCompleted = slip.status === 'Completed';
            const isReady = slip.status === 'Ready for Pickup';
            return (
              <div
                key={slip.id || idx}
                onClick={() => typeof setActiveTab === 'function' && setActiveTab('alterations')}
                className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-indigo-500/40 transition-all cursor-pointer group"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10.5px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                      {token}
                    </span>
                    <p className="font-bold truncate text-[11.5px] text-slate-200 group-hover:text-indigo-300 transition-colors">
                      {slip.customerName || 'Customer'}
                    </p>
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                    <span>{slip.category} x {slip.quantity || 1}</span>
                    <span>•</span>
                    <span className="text-slate-400">{slip.expectedDate || 'Today'}</span>
                    {slip.customerPhone && (
                      <>
                        <span>•</span>
                        <span className="text-slate-400">{slip.customerPhone}</span>
                      </>
                    )}
                  </p>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border whitespace-nowrap ${
                  isCompleted 
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : isReady
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {slip.status || 'Pending'}
                </span>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5 bg-slate-900/20 dark:bg-black/20 rounded-xl border border-slate-800/30">
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> All Customer Alteration Jobs Caught Up
            </span>
            <span className="text-[11px] text-slate-400">0 active pending tickets in queue</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-200/40 dark:border-white/[0.06] flex items-center justify-between text-xs font-bold">
        <button
          type="button"
          onClick={() => typeof setActiveTab === 'function' && setActiveTab('alterations')}
          className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Open Full Alterations Desk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowAlterationModal?.(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          title="Create New Alteration Slip"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Slip</span>
        </button>
      </div>
    </div>
  );
};

export default LivePulseFeed;
