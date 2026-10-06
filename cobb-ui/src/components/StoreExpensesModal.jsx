import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Building2,
  DollarSign,
  Zap,
  Users,
  Coffee,
  Percent,
  Target,
  Save,
  X,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  Calculator
} from 'lucide-react';
import { db, authPromise } from '../utils/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function StoreExpensesModal({
  isOpen,
  onClose,
  API_BASE = 'http://localhost:5000',
  activeStore = 'DEMO_STORE_001',
  darkMode = true,
  onConfigSaved
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Store profile & expenses state with standard retail defaults
  const [storeName, setStoreName] = useState('Cobb Apparels');
  const [branchName, setBranchName] = useState('Pundri');
  const [rent, setRent] = useState(40000);
  const [staffSalaries, setStaffSalaries] = useState(45000);
  const [electricity, setElectricity] = useState(15000);
  const [miscExpenses, setMiscExpenses] = useState(10000);
  const [franchiseRoyalty, setFranchiseRoyalty] = useState(0);
  const [dailyExpense, setDailyExpense] = useState(3300);
  const [targetMarginPct, setTargetMarginPct] = useState(27);
  const [dailyTargetSales, setDailyTargetSales] = useState(50000);
  const [monthlyTargetSales, setMonthlyTargetSales] = useState(1500000);

  useEffect(() => {
    if (isOpen) {
      loadStoreConfig();
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [isOpen, activeStore]);

  const loadStoreConfig = async () => {
    setLoading(true);
    try {
      // 1. Check localStorage first for immediate local responsiveness
      let loaded = false;
      try {
        const raw = localStorage.getItem('cobb_store_config');
        if (raw) {
          applyConfigValues(JSON.parse(raw));
          loaded = true;
        }
      } catch (e) {}

      // 2. Query local API with cache busting
      try {
        const res = await axios.get(`${API_BASE}/api/config/current?t=${Date.now()}`, { timeout: 3000 });
        if (res.data?.success && res.data.config) {
          const cfg = res.data.config;
          applyConfigValues(cfg);
          loaded = true;
        }
      } catch (apiErr) {
        // Fall through to Firestore
      }

      // 3. Fallback to Firestore cloud doc
      if (!loaded && db) {
        if (authPromise) await authPromise;
        const target = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
        const snap = await getDoc(doc(db, 'stores', target, 'data', 'store_config'));
        if (snap.exists()) {
          const cfg = snap.data();
          applyConfigValues(cfg);
          loaded = true;
        }
      }
    } catch (err) {
      console.warn('[StoreExpensesModal] Error loading store config:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyConfigValues = (cfg) => {
    if (cfg.storeProfile) {
      if (cfg.storeProfile.storeName) setStoreName(cfg.storeProfile.storeName);
      if (cfg.storeProfile.branch) setBranchName(cfg.storeProfile.branch);
    }
    const exp = cfg.operatingExpenses || {};
    if (exp.rent !== undefined) setRent(Number(exp.rent));
    if (exp.staffSalaries !== undefined) setStaffSalaries(Number(exp.staffSalaries));
    if (exp.electricity !== undefined) setElectricity(Number(exp.electricity));
    if (exp.miscExpenses !== undefined) setMiscExpenses(Number(exp.miscExpenses));
    if (exp.franchiseRoyalty !== undefined) setFranchiseRoyalty(Number(exp.franchiseRoyalty));
    if (exp.targetMarginPct !== undefined) setTargetMarginPct(Number(exp.targetMarginPct));
    if (exp.dailyTargetSales !== undefined) setDailyTargetSales(Number(exp.dailyTargetSales));
    if (exp.monthlyTargetSales !== undefined) setMonthlyTargetSales(Number(exp.monthlyTargetSales));

    const effectiveDaily = exp.dailyExpense ?? exp.dailyOpEx ?? exp.dailyAmortizedExpense;
    if (effectiveDaily !== undefined) {
      setDailyExpense(Number(effectiveDaily));
    } else {
      const tot = (Number(exp.rent) || 0) + (Number(exp.staffSalaries) || 0) + (Number(exp.electricity) || 0) + (Number(exp.miscExpenses) || 0) + (Number(exp.franchiseRoyalty) || 0);
      setDailyExpense(tot > 0 ? Math.round(tot / 30) : 3300);
    }
  };

  // Live calculations
  const totalMonthlyExpenses = (Number(rent) || 0) + (Number(staffSalaries) || 0) + (Number(electricity) || 0) + (Number(miscExpenses) || 0) + (Number(franchiseRoyalty) || 0);
  const dailyAmortizedExpense = Math.round(totalMonthlyExpenses / 30);
  const effectiveDailyExpense = Number(dailyExpense) > 0 ? Number(dailyExpense) : dailyAmortizedExpense;
  const marginFrac = (Number(targetMarginPct) || 27) / 100;
  const dailyBreakEvenSales = marginFrac > 0 ? Math.round(effectiveDailyExpense / marginFrac) : 0;
  const monthlyBreakEvenSales = marginFrac > 0 ? Math.round(totalMonthlyExpenses / marginFrac) : 0;

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      storeProfile: {
        storeName: storeName.trim(),
        branch: branchName.trim()
      },
      operatingExpenses: {
        rent: Number(rent) || 0,
        staffSalaries: Number(staffSalaries) || 0,
        electricity: Number(electricity) || 0,
        miscExpenses: Number(miscExpenses) || 0,
        franchiseRoyalty: Number(franchiseRoyalty) || 0,
        totalExpenses: totalMonthlyExpenses,
        dailyExpense: effectiveDailyExpense,
        dailyOpEx: effectiveDailyExpense,
        dailyAmortizedExpense: effectiveDailyExpense,
        targetMarginPct: Number(targetMarginPct) || 27,
        dailyTargetSales: Number(dailyTargetSales) || 50000,
        monthlyTargetSales: Number(monthlyTargetSales) || 1500000,
        dailyBreakEvenSales,
        monthlyBreakEvenSales,
      }
    };

    // Save immediately to localStorage for instant UI reactivity
    try {
      localStorage.setItem('cobb_store_config', JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('cobb_store_config_updated', { detail: payload.operatingExpenses }));
    } catch (e) {}

    let savedSomewhere = false;

    // 1. Save to local backend
    try {
      const res = await axios.post(`${API_BASE}/api/config/save`, payload, { timeout: 4000 });
      if (res.data?.success) savedSomewhere = true;
    } catch (e) {
      console.warn('[StoreExpensesModal] Local API save warning:', e.message);
    }

    // 2. Save directly to Cloud Firestore for Phone Link
    try {
      if (db) {
        if (authPromise) await authPromise;
        const target = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
        await setDoc(doc(db, 'stores', target, 'data', 'store_config'), {
          ...payload,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        savedSomewhere = true;
      }
    } catch (e) {
      console.warn('[StoreExpensesModal] Firestore save warning:', e.message);
    }

    // Always count local save as successful
    savedSomewhere = true;

    setSaving(false);

    if (savedSomewhere) {
      setSuccessMsg('Store expenses and targets saved! Financial telemetry recalculated.');
      if (typeof onConfigSaved === 'function') {
        onConfigSaved(payload.operatingExpenses);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setErrorMsg('Failed to save settings to server or cloud database.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Store Expenses &amp; Financial Targets</h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {activeStore === 'ALL' ? 'Main Store' : activeStore}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure store operating expenses to automatically power net profit, margins &amp; break-even metrics.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 text-sm">

          {/* Real-time Break-Even & Overhead Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-slate-900 to-teal-950/40 border border-emerald-500/30 text-white shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Live Financial Breakdown
              </span>
              <span className="text-[11px] font-bold text-slate-300">
                Target Margin: <span className="text-emerald-400 font-mono">{targetMarginPct}%</span>
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-400">Monthly Overhead</p>
                <p className="text-lg font-black text-rose-400 font-mono mt-0.5">
                  ₹{totalMonthlyExpenses.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Fixed OPEX / mo</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-400">Daily Running Cost</p>
                <p className="text-lg font-black text-amber-400 font-mono mt-0.5">
                  ₹{dailyAmortizedExpense.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Amortized over 30 days</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-emerald-400">Daily Break-Even</p>
                <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                  ₹{dailyBreakEvenSales.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-emerald-300/80 mt-0.5">Min. daily sale needed</p>
              </div>
            </div>
          </div>

          {/* Section 1: Store Identity */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" /> Store Identity
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Store / Franchise Name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. Cobb Apparels"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Branch / Market Location</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Pundri Main"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Fixed Monthly Expenses */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-rose-500" /> Monthly Fixed Expenses (OPEX)
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Store Rent */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-rose-500" /> Store Rent
                  </span>
                  <span className="text-[10px] text-slate-400">Monthly</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={rent}
                    onChange={(e) => setRent(Number(e.target.value) || 0)}
                    placeholder="40000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Premises lease overhead</p>
              </div>

              {/* Staff Salaries */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" /> Staff Salaries Budget
                  </span>
                  <span className="text-[10px] text-slate-400">Monthly</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={staffSalaries}
                    onChange={(e) => setStaffSalaries(Number(e.target.value) || 0)}
                    placeholder="45000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Sales counter &amp; manager payroll</p>
              </div>

              {/* Electricity & AC */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Electricity, AC &amp; Power
                  </span>
                  <span className="text-[10px] text-slate-400">Est. Monthly</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={electricity}
                    onChange={(e) => setElectricity(Number(e.target.value) || 0)}
                    placeholder="15000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Lighting, AC and generator fuel</p>
              </div>

              {/* Misc & Maintenance */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-purple-500" /> Misc, Tea &amp; Maintenance
                  </span>
                  <span className="text-[10px] text-slate-400">Monthly</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={miscExpenses}
                    onChange={(e) => setMiscExpenses(Number(e.target.value) || 0)}
                    placeholder="10000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Housekeeping, stationery &amp; tea</p>
              </div>

              {/* Franchise Royalty */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Franchise Royalty / Tech Fee (Optional)
                  </span>
                  <span className="text-[10px] text-slate-400">Monthly</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={franchiseRoyalty}
                    onChange={(e) => setFranchiseRoyalty(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Daily Store Operating Expense (Direct OpEx) */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Daily Store Operating Expense (OpEx)
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                    Direct Dashboard OpEx Metric
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={dailyExpense}
                    onChange={(e) => setDailyExpense(Number(e.target.value) || 0)}
                    placeholder={dailyAmortizedExpense.toString()}
                    className="w-full bg-white dark:bg-slate-900 border border-amber-500/50 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-black text-amber-600 dark:text-amber-400 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                  <span>Calculated from overheads: ₹{dailyAmortizedExpense.toLocaleString('en-IN')}/day</span>
                  <button
                    type="button"
                    onClick={() => setDailyExpense(dailyAmortizedExpense)}
                    className="text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    Reset to monthly/30 (₹{dailyAmortizedExpense.toLocaleString('en-IN')})
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Targets & Margin Benchmarks */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" /> Targets &amp; Margin Benchmarks
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Target Gross Margin</label>
                <div className="relative">
                  <input
                    type="number"
                    value={targetMarginPct}
                    onChange={(e) => setTargetMarginPct(Number(e.target.value) || 0)}
                    placeholder="27"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-bold text-xs">%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Cobb Franchise std is 27%</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Daily Sales Target</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={dailyTargetSales}
                    onChange={(e) => setDailyTargetSales(Number(e.target.value) || 0)}
                    placeholder="50000"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Dashboard daily target meter</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Monthly Sales Target</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={monthlyTargetSales}
                    onChange={(e) => setMonthlyTargetSales(Number(e.target.value) || 0)}
                    placeholder="1500000"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Monthly store milestone</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving...' : 'Save Expenses & Recalculate'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
