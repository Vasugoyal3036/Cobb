import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Zap,
  Tag,
  Users,
  BarChart3,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Receipt,
  Search,
  Plus,
  Printer,
  Sparkles,
  ShoppingBag,
  Wallet,
  Calendar
} from 'lucide-react';
import { db } from '../utils/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function StoreSummaryLanding({
  activeStore = 'DEMO_STORE_001',
  AVAILABLE_STORES = [],
  liveBills = [],
  onNavigate,
  darkMode = true,
  theme = 'modern'
}) {
  const [pendingCount, setPendingCount] = useState(0);
  const [damagedCount, setDamagedCount] = useState(0);
  const [damagedMrp, setDamagedMrp] = useState(0);

  const API_BASE = window.location.protocol === 'app:' || window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : window.location.origin;

  const storeInfo = AVAILABLE_STORES.find(s => s.id === activeStore) || {
    shortName: 'Pundri Flagship',
    name: 'Goyal - House Of Fashion (Pundri)'
  };

  // Compute today's bill metrics from liveBills
  const todayIso = new Date().toISOString().split('T')[0];
  const todayBills = liveBills.filter(b => {
    const d = b.date || b.billDate || b.createdAt;
    return d && d.startsWith(todayIso);
  });
  const todaySales = todayBills.reduce((sum, b) => sum + (Number(b.netAmount || b.grandTotal || b.amount || 0)), 0);
  const todayPieces = todayBills.reduce((sum, b) => sum + (Number(b.totalQty || b.items?.length || 1)), 0);

  // Fetch real-time pending tags & damages count
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [ptagRes, dmgRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/api/pending-tags`),
          axios.get(`${API_BASE}/api/damages`)
        ]);
        if (ptagRes.status === 'fulfilled' && ptagRes.value.data?.summary) {
          setPendingCount(ptagRes.value.data.summary.activeCount || 0);
        }
        if (dmgRes.status === 'fulfilled' && dmgRes.value.data?.summary) {
          setDamagedCount(dmgRes.value.data.summary.quarantinedCount || 0);
          setDamagedMrp(dmgRes.value.data.summary.quarantinedMrp || 0);
        }
      } catch (e) {}
    };
    loadCounts();

    // Cloud Firestore live updates
    let unsubPtag = null;
    let unsubDmg = null;
    if (db) {
      try {
        const pRef = doc(db, 'stores', activeStore, 'data', 'pending_tags');
        unsubPtag = onSnapshot(pRef, snap => {
          if (snap.exists()) {
            const list = snap.data()?.tags || [];
            setPendingCount(list.filter(t => t.status === 'active').length);
          }
        }, () => {});

        const dRef = doc(db, 'stores', activeStore, 'data', 'damage_records');
        unsubDmg = onSnapshot(dRef, snap => {
          if (snap.exists()) {
            const dl = snap.data()?.damages || [];
            const q = dl.filter(d => d.status === 'quarantine');
            setDamagedCount(q.length);
            setDamagedMrp(q.reduce((s, it) => s + (Number(it.mrp) || 0), 0));
          }
        }, () => {});
      } catch (e) {}
    }

    return () => {
      if (unsubPtag) unsubPtag();
      if (unsubDmg) unsubDmg();
    };
  }, [API_BASE, activeStore]);

  // Visual Theme Variables
  const isPaper = theme === 'paper';
  const isContrast = theme === 'contrast';

  return (
    <div className={`space-y-6 pb-12 transition-all ${
      isPaper 
        ? 'text-[#2D2A26]' 
        : isContrast 
        ? 'text-white' 
        : darkMode ? 'text-white' : 'text-slate-900'
    }`}>
      {/* Top Welcome Header */}
      <div className={`p-6 rounded-3xl border transition-all shadow-lg ${
        isPaper
          ? 'bg-[#FBF8F2] border-[#E5DECF]'
          : isContrast
          ? 'bg-black border-2 border-white'
          : darkMode
          ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/40 border-slate-700/60'
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-2.5 w-2.5 rounded-full ${isContrast ? 'bg-white' : 'bg-emerald-500 animate-pulse'}`} />
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {storeInfo.name}
              </h2>
            </div>
            <p className={`text-xs ${isPaper ? 'text-[#7A7265]' : isContrast ? 'text-slate-300' : 'text-slate-400'}`}>
              Store Overview • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigate('billing', 'speed_billing')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition-all active:scale-95 ${
                isPaper
                  ? 'bg-[#B45309] hover:bg-[#92400E] text-white'
                  : isContrast
                  ? 'bg-white text-black hover:bg-slate-200'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-amber-500/20'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>New Bill (F1)</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('stock', 'pending_tags')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-2 ${
                isPaper
                  ? 'bg-white border-[#E5DECF] hover:bg-[#F3EFE6] text-[#B45309]'
                  : isContrast
                  ? 'bg-black text-white border-white hover:bg-slate-900'
                  : darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>B1G2 Tags ({pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('stock', 'pending_tags')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-2 ${
                isPaper
                  ? 'bg-red-50 border-red-200 hover:bg-red-100 text-red-700'
                  : isContrast
                  ? 'bg-black text-white border-white hover:bg-slate-900'
                  : darkMode
                  ? 'bg-red-500/15 hover:bg-red-500/25 border-red-500/30 text-red-400'
                  : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Damaged Bin ({damagedCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Summary Cards (Clean & High Contrast) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div 
          onClick={() => onNavigate('reports', 'live')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm hover:scale-[1.01] ${
            isPaper
              ? 'bg-[#FBF8F2] border-[#E5DECF]'
              : isContrast
              ? 'bg-black border-2 border-white'
              : darkMode
              ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-500 mb-2">
            <span>Today's Sales</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isContrast ? 'text-white' : 'text-emerald-500'
          }`}>
            ₹{todaySales.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {todayPieces} pcs sold in {todayBills.length} bills
          </p>
        </div>

        {/* Bills Count */}
        <div 
          onClick={() => onNavigate('reports', 'live')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm hover:scale-[1.01] ${
            isPaper
              ? 'bg-[#FBF8F2] border-[#E5DECF]'
              : isContrast
              ? 'bg-black border-2 border-white'
              : darkMode
              ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-blue-400 mb-2">
            <span>Today's Bills</span>
            <Receipt className="w-4 h-4" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isContrast ? 'text-white' : 'text-blue-400'
          }`}>
            {todayBills.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Avg: ₹{todayBills.length > 0 ? Math.round(todaySales / todayBills.length).toLocaleString('en-IN') : 0} / bill
          </p>
        </div>

        {/* Pending Tags */}
        <div 
          onClick={() => onNavigate('stock', 'pending_tags')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm hover:scale-[1.01] ${
            isPaper
              ? 'bg-[#FBF8F2] border-[#E5DECF]'
              : isContrast
              ? 'bg-black border-2 border-white'
              : darkMode
              ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-500 mb-2">
            <span>B1G2 Pending Tags</span>
            <Tag className="w-4 h-4" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isContrast ? 'text-white' : 'text-amber-500'
          }`}>
            {pendingCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Single pieces waiting for combo
          </p>
        </div>

        {/* Damaged Bin */}
        <div 
          onClick={() => onNavigate('stock', 'pending_tags')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm hover:scale-[1.01] ${
            isPaper
              ? 'bg-[#FBF8F2] border-[#E5DECF]'
              : isContrast
              ? 'bg-black border-2 border-white'
              : darkMode
              ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-red-500 mb-2">
            <span>Damaged Clothes</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isContrast ? 'text-white' : 'text-red-500'
          }`}>
            {damagedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            ₹{damagedMrp.toLocaleString('en-IN')} MRP quarantined
          </p>
        </div>
      </div>

      {/* 4 Large Clean Workspace Launcher Tiles */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
          Store Workspaces
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Workspace 1: Billing & Counter */}
          <div
            onClick={() => onNavigate('billing', 'speed_billing')}
            className={`p-6 rounded-3xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between hover:scale-[1.008] ${
              isPaper
                ? 'bg-[#FBF8F2] border-[#E5DECF] hover:border-[#B45309]'
                : isContrast
                ? 'bg-black border-2 border-white hover:bg-white/10'
                : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-amber-500/50'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-amber-500 shadow-md ${
                  isPaper ? 'bg-[#FAF3E7]' : isContrast ? 'bg-white text-black' : 'bg-amber-500/15'
                }`}>
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="text-lg font-black tracking-tight">
                ⚡ Billing & Counter
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Zero-Mouse Speed POS, Hold Bills, Product Exchanges, Alterations, Cash Drawer
              </p>
            </div>
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-200/40 dark:border-slate-800 text-[11px] font-bold text-amber-500">
              <span>Open Speed Billing (F1)</span>
              <span>→</span>
            </div>
          </div>

          {/* Workspace 2: Stock & Tags */}
          <div
            onClick={() => onNavigate('stock', 'pending_tags')}
            className={`p-6 rounded-3xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between hover:scale-[1.008] ${
              isPaper
                ? 'bg-[#FBF8F2] border-[#E5DECF] hover:border-[#B45309]'
                : isContrast
                ? 'bg-black border-2 border-white hover:bg-white/10'
                : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-rose-500/50'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-rose-500 shadow-md ${
                  isPaper ? 'bg-[#FDF2F2]' : isContrast ? 'bg-white text-black' : 'bg-rose-500/15'
                }`}>
                  <Tag className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="text-lg font-black tracking-tight">
                🏷️ Stock & Tags
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                B1G2 Pending Combo Tags, Damaged Clothes Bin, Stock Lookup, Reorder
              </p>
            </div>
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-200/40 dark:border-slate-800 text-[11px] font-bold text-rose-500">
              <span>Manage Tags & Defect Bin</span>
              <span>→</span>
            </div>
          </div>

          {/* Workspace 3: Customers & Khata */}
          <div
            onClick={() => onNavigate('customers', 'pocket_khata')}
            className={`p-6 rounded-3xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between hover:scale-[1.008] ${
              isPaper
                ? 'bg-[#FBF8F2] border-[#E5DECF] hover:border-[#B45309]'
                : isContrast
                ? 'bg-black border-2 border-white hover:bg-white/10'
                : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-blue-500/50'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-blue-500 shadow-md ${
                  isPaper ? 'bg-[#EFF6FF]' : isContrast ? 'bg-white text-black' : 'bg-blue-500/15'
                }`}>
                  <Users className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="text-lg font-black tracking-tight">
                👥 Customers & Khata
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Customer Udhar / Khata Ledger, Customer Directory, Loyalty Points & VIPs
              </p>
            </div>
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-200/40 dark:border-slate-800 text-[11px] font-bold text-blue-500">
              <span>View Customer Khata</span>
              <span>→</span>
            </div>
          </div>

          {/* Workspace 4: Store Reports */}
          <div
            onClick={() => onNavigate('reports', 'live')}
            className={`p-6 rounded-3xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between hover:scale-[1.008] ${
              isPaper
                ? 'bg-[#FBF8F2] border-[#E5DECF] hover:border-[#B45309]'
                : isContrast
                ? 'bg-black border-2 border-white hover:bg-white/10'
                : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-purple-500/50'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-purple-500 shadow-md ${
                  isPaper ? 'bg-[#FAF5FF]' : isContrast ? 'bg-white text-black' : 'bg-purple-500/15'
                }`}>
                  <BarChart3 className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h4 className="text-lg font-black tracking-tight">
                📊 Store Reports
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Today's Bills & Invoices, Monthly P&L, Staff Incentives, Day Close EOD
              </p>
            </div>
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-200/40 dark:border-slate-800 text-[11px] font-bold text-purple-500">
              <span>Open Reports & Sales</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
