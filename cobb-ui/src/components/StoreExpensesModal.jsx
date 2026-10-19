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
  Calculator,
  UserPlus,
  Trash2,
  Award,
  ChevronDown,
  ChevronUp,
  UserCheck,
  HelpCircle,
  Check,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { db, authPromise } from '../utils/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const DEFAULT_SALESMEN = [
  { id: '2800003', empCode: '2800003', name: 'Vikas', salary: 16000, mtdSales: 0 },
  { id: '3200014', empCode: '3200014', name: 'Pawan', salary: 18000, mtdSales: 0 },
  { id: '0001001', empCode: '0001001', name: 'Simran', salary: '', mtdSales: 0 },
  { id: '0000180', empCode: '0000180', name: 'Akhil', salary: '', mtdSales: 0 }
];

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
  const [storeName, setStoreName] = useState('Goyal - House Of Fashion (Pundri Flagship)');
  const [branchName, setBranchName] = useState('Pundri Flagship');
  const [rent, setRent] = useState(40000);
  const [electricity, setElectricity] = useState(10000);
  const [miscExpenses, setMiscExpenses] = useState(5000);
  const [franchiseRoyalty, setFranchiseRoyalty] = useState(0);
  const [dailyExpense, setDailyExpense] = useState(3267);
  const [targetMarginPct, setTargetMarginPct] = useState(25);
  const [dailyTargetSales, setDailyTargetSales] = useState(50000);
  const [monthlyTargetSales, setMonthlyTargetSales] = useState(900000);

  // Dynamic Salesmen and Incentive calculation state
  const [salesmen, setSalesmen] = useState(DEFAULT_SALESMEN);
  const [incentiveMode, setIncentiveMode] = useState('target'); // 'target' (100% On-Target Budget) | 'live' (Live MTD Sales Achievement)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffCode, setNewStaffCode] = useState('');
  const [newStaffSalary, setNewStaffSalary] = useState('');

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
      let loaded = false;
      let loadedCfg = null;

      // 1. Check localStorage first for immediate local responsiveness
      try {
        const raw = localStorage.getItem('cobb_store_config');
        if (raw) {
          loadedCfg = JSON.parse(raw);
          applyConfigValues(loadedCfg);
          loaded = true;
        }
      } catch (e) {}

      // 2. Query local API with cache busting
      try {
        const res = await axios.get(`${API_BASE}/api/config/current?t=${Date.now()}`, { timeout: 3000 });
        if (res.data?.success && res.data.config) {
          loadedCfg = res.data.config;
          applyConfigValues(loadedCfg);
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
          loadedCfg = snap.data();
          applyConfigValues(loadedCfg);
          loaded = true;
        }
      }

      // 4. Fetch live MTD sales for each salesman to power the live achievement mode
      await fetchLiveStaffMtdSales();

    } catch (err) {
      console.warn('[StoreExpensesModal] Error loading store config:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveStaffMtdSales = async () => {
    const mtdMap = {};
    let found = false;

    // Try local staff API first
    try {
      const res = await axios.get(`${API_BASE}/api/staff/leaderboard?period=this_month`, { timeout: 3000 });
      if (res.data && Array.isArray(res.data.staffList)) {
        res.data.staffList.forEach(st => {
          if (st.empCode) mtdMap[st.empCode] = Number(st.totalSales) || 0;
          if (st.name) mtdMap[st.name.toLowerCase().trim()] = Number(st.totalSales) || 0;
        });
        found = true;
      }
    } catch (e) {}

    // Fallback to Firestore staff leaderboard
    if (!found && db) {
      try {
        const target = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
        const lSnap = await getDoc(doc(db, 'stores', target, 'data', 'staff_leaderboard'));
        if (lSnap.exists()) {
          const lData = lSnap.data();
          const list = lData?.periods?.this_month?.staffList || lData?.staffList || [];
          list.forEach(st => {
            if (st.empCode) mtdMap[st.empCode] = Number(st.totalSales) || 0;
            if (st.name) mtdMap[st.name.toLowerCase().trim()] = Number(st.totalSales) || 0;
          });
          found = true;
        }
      } catch (fsErr) {}
    }

    if (found) {
      setSalesmen(prev => prev.map(s => {
        const matchedSales = mtdMap[s.empCode] || mtdMap[s.id] || mtdMap[s.name?.toLowerCase().trim()];
        return {
          ...s,
          mtdSales: matchedSales !== undefined ? matchedSales : (s.mtdSales || 0)
        };
      }));
    }
  };

  const applyConfigValues = (cfg) => {
    if (cfg.storeProfile) {
      if (cfg.storeProfile.storeName) setStoreName(cfg.storeProfile.storeName);
      if (cfg.storeProfile.branch) setBranchName(cfg.storeProfile.branch);
    }
    const exp = cfg.operatingExpenses || {};
    if (exp.rent !== undefined) setRent(Number(exp.rent));
    if (exp.electricity !== undefined) setElectricity(Number(exp.electricity));
    if (exp.miscExpenses !== undefined) setMiscExpenses(Number(exp.miscExpenses));
    if (exp.franchiseRoyalty !== undefined) setFranchiseRoyalty(Number(exp.franchiseRoyalty));
    if (exp.targetMarginPct !== undefined) setTargetMarginPct(Number(exp.targetMarginPct));
    if (exp.dailyTargetSales !== undefined) setDailyTargetSales(Number(exp.dailyTargetSales));
    if (exp.monthlyTargetSales !== undefined) setMonthlyTargetSales(Number(exp.monthlyTargetSales));

    // Load salesmen list if available
    if (exp.salesmanSalaries && Array.isArray(exp.salesmanSalaries) && exp.salesmanSalaries.length > 0) {
      setSalesmen(exp.salesmanSalaries.map(s => ({
        id: s.id || s.empCode || `staff_${Math.random()}`,
        empCode: s.empCode || s.id || '',
        name: s.name || 'Sales Staff',
        salary: s.salary !== undefined && s.salary !== null && s.salary !== '' ? Number(s.salary) : '',
        mtdSales: Number(s.mtdSales) || 0
      })));
    }

    if (exp.staffSalariesBreakdown?.incentiveMode) {
      setIncentiveMode(exp.staffSalariesBreakdown.incentiveMode);
    }

    const effectiveDaily = exp.dailyExpense ?? exp.dailyOpEx ?? exp.dailyAmortizedExpense;
    if (effectiveDaily !== undefined) {
      setDailyExpense(Number(effectiveDaily));
    }
  };

  // =========================================================================
  // CORE DYNAMIC LOGIC: ACTIVE STAFF FILTER & EQUAL TARGET ALLOCATION
  // =========================================================================
  // Rule: Only salesmen whose salary is filled (> 0) count as active.
  // Those with empty or 0 salary no longer work here.
  const activeSalesmen = salesmen.filter(
    s => s.salary !== '' && s.salary !== null && s.salary !== undefined && Number(s.salary) > 0
  );
  const activeSalesmenCount = activeSalesmen.length;

  // Monthly target divided equally among active staff only
  const mTarget = Number(monthlyTargetSales) > 0 ? Number(monthlyTargetSales) : 900000;
  const targetPerSalesman = activeSalesmenCount > 0 ? Math.round(mTarget / activeSalesmenCount) : mTarget;

  // Calculate incentive for each salesman based on target achievement:
  // - >= 95% of target => 1.0%
  // - >= 75% of target => 0.75%
  // - >= 50% of target (half) => 0.50%
  // - < 50% of target => 0.0%
  const getSalesmanAchievementAndIncentive = (s) => {
    const isFilled = s.salary !== '' && s.salary !== null && s.salary !== undefined && Number(s.salary) > 0;
    if (!isFilled) {
      return {
        isActive: false,
        rate: 0,
        amount: 0,
        slabBadge: 'Inactive / Left',
        slabColor: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
        achievementPct: 0,
        salesBasis: 0,
        target: 0
      };
    }

    if (incentiveMode === 'target') {
      // On-Target Budget: Assume target achievement (100% >= 95% tier)
      const rate = 1.0;
      const amount = Math.round((targetPerSalesman * rate) / 100);
      return {
        isActive: true,
        rate: 1.0,
        amount,
        slabBadge: '≥ 95% Target (1.0%)',
        slabColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        achievementPct: 100,
        salesBasis: targetPerSalesman,
        target: targetPerSalesman
      };
    } else {
      // Live MTD Sales Achievement Mode:
      const sales = Number(s.mtdSales) || 0;
      const ach = targetPerSalesman > 0 ? (sales / targetPerSalesman) * 100 : 0;
      let rate = 0;
      let slabBadge = '< 50% Target (0%)';
      let slabColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20';

      if (ach >= 95) {
        rate = 1.0;
        slabBadge = '≥ 95% Target (1.0%)';
        slabColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      } else if (ach >= 75) {
        rate = 0.75;
        slabBadge = '≥ 75% Target (0.75%)';
        slabColor = 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
      } else if (ach >= 50) {
        rate = 0.5;
        slabBadge = '≥ 50% Target (0.5%)';
        slabColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      } else {
        rate = 0;
        slabBadge = '< 50% Target (0%)';
        slabColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      }

      const amount = Math.round((sales * rate) / 100);
      return {
        isActive: true,
        rate,
        amount,
        slabBadge,
        slabColor,
        achievementPct: Math.round(ach),
        salesBasis: sales,
        target: targetPerSalesman
      };
    }
  };

  // Staff Totals
  const totalBaseSalaries = activeSalesmen.reduce((sum, s) => sum + (Number(s.salary) || 0), 0);
  const totalIncentives = activeSalesmen.reduce((sum, s) => {
    const res = getSalesmanAchievementAndIncentive(s);
    return sum + res.amount;
  }, 0);
  const dynamicStaffSalaries = totalBaseSalaries + totalIncentives;

  // Monthly & Daily Overhead Calculations
  const totalMonthlyExpenses = (Number(rent) || 0) + dynamicStaffSalaries + (Number(electricity) || 0) + (Number(miscExpenses) || 0) + (Number(franchiseRoyalty) || 0);
  const dailyAmortizedExpense = Math.round(totalMonthlyExpenses / 30);
  const effectiveDailyExpense = Number(dailyExpense) > 0 ? Number(dailyExpense) : dailyAmortizedExpense;
  const marginFrac = (Number(targetMarginPct) || 25) / 100;
  const dailyBreakEvenSales = marginFrac > 0 ? Math.round(effectiveDailyExpense / marginFrac) : 0;
  const monthlyBreakEvenSales = marginFrac > 0 ? Math.round(totalMonthlyExpenses / marginFrac) : 0;

  // Salesmen handlers
  const handleSalaryChange = (id, val) => {
    setSalesmen(prev => prev.map(s => {
      if (s.id === id || s.empCode === id) {
        return { ...s, salary: val === '' ? '' : Math.max(0, Number(val)) };
      }
      return s;
    }));
  };

  const handleMtdSalesChange = (id, val) => {
    setSalesmen(prev => prev.map(s => {
      if (s.id === id || s.empCode === id) {
        return { ...s, mtdSales: val === '' ? 0 : Math.max(0, Number(val)) };
      }
      return s;
    }));
  };

  const handleAddSalesman = () => {
    if (!newStaffName.trim()) return;
    const code = newStaffCode.trim() || `EMP${String(Math.floor(1000 + Math.random() * 9000))}`;
    setSalesmen(prev => [
      ...prev,
      {
        id: code,
        empCode: code,
        name: newStaffName.trim(),
        salary: newStaffSalary !== '' ? Number(newStaffSalary) : '',
        mtdSales: 0
      }
    ]);
    setNewStaffName('');
    setNewStaffCode('');
    setNewStaffSalary('');
    setShowAddForm(false);
  };

  const handleRemoveSalesman = (id) => {
    setSalesmen(prev => prev.filter(s => s.id !== id && s.empCode !== id));
  };

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
        staffSalaries: dynamicStaffSalaries,
        electricity: Number(electricity) || 0,
        miscExpenses: Number(miscExpenses) || 0,
        franchiseRoyalty: Number(franchiseRoyalty) || 0,
        totalExpenses: totalMonthlyExpenses,
        dailyExpense: effectiveDailyExpense,
        dailyOpEx: effectiveDailyExpense,
        dailyAmortizedExpense: effectiveDailyExpense,
        targetMarginPct: Number(targetMarginPct) || 25,
        dailyTargetSales: Number(dailyTargetSales) || 50000,
        monthlyTargetSales: Number(monthlyTargetSales) || 900000,
        dailyBreakEvenSales,
        monthlyBreakEvenSales,
        salesmanSalaries: salesmen.map(s => ({
          id: s.id || s.empCode,
          empCode: s.empCode || s.id,
          name: s.name,
          salary: s.salary !== '' && s.salary !== null && s.salary !== undefined ? Number(s.salary) : '',
          mtdSales: Number(s.mtdSales) || 0,
          isActive: Boolean(s.salary !== '' && s.salary !== null && Number(s.salary) > 0)
        })),
        staffSalariesBreakdown: {
          totalBaseSalaries,
          totalIncentives,
          dynamicStaffSalaries,
          activeSalesmenCount,
          targetPerSalesman,
          incentiveMode
        }
      }
    };

    // Save immediately to localStorage for instant UI reactivity
    try {
      localStorage.setItem('cobb_store_config', JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('cobb_store_config_updated', { detail: payload.operatingExpenses }));
    } catch (e) {}

    let savedSomewhere = false;

    // 1. Save to local backend config
    try {
      const res = await axios.post(`${API_BASE}/api/config/save`, payload, { timeout: 4000 });
      if (res.data?.success) savedSomewhere = true;
    } catch (e) {
      console.warn('[StoreExpensesModal] Local API save warning:', e.message);
    }

    // 2. Also sync individual staff targets and incentive slabs to backend staff_config
    try {
      const staffOverridesUpdate = {};
      salesmen.forEach(s => {
        const code = s.empCode || s.id;
        const isActive = s.salary !== '' && s.salary !== null && Number(s.salary) > 0;
        staffOverridesUpdate[code] = {
          name: s.name,
          target: isActive ? targetPerSalesman : 0,
          isInactive: !isActive
        };
      });

      await axios.post(`${API_BASE}/api/staff/config`, {
        monthlyStoreTarget: mTarget,
        staffTarget: targetPerSalesman,
        incentiveSlabs: {
          tier1: { threshold: Math.round(targetPerSalesman * 0.95), rate: 1.0, label: "≥ 95% (1.0%)" },
          tier2: { threshold: Math.round(targetPerSalesman * 0.75), rate: 0.75, label: "≥ 75% (0.75%)" },
          tier3: { threshold: Math.round(targetPerSalesman * 0.50), rate: 0.5, label: "≥ 50% (0.5%)" },
          tier4: { threshold: 0, rate: 0, label: "< 50% (0%)" }
        },
        staffOverrides: staffOverridesUpdate
      }, { timeout: 4000 });
    } catch (staffCfgErr) {
      console.debug('[StoreExpensesModal] Staff config sync note:', staffCfgErr.message);
    }

    // 3. Save directly to Cloud Firestore for Phone Link (Firebase)
    try {
      if (db) {
        if (authPromise) await authPromise;
        const target = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
        
        await setDoc(doc(db, 'stores', target, 'data', 'store_config'), {
          ...payload,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Update staff_config in Firestore too
        await setDoc(doc(db, 'stores', target, 'data', 'staff_config'), {
          monthlyStoreTarget: mTarget,
          staffTarget: targetPerSalesman,
          activeSalesmenCount,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        savedSomewhere = true;
      }
    } catch (e) {
      console.warn('[StoreExpensesModal] Firestore save warning:', e.message);
    }

    savedSomewhere = true;
    setSaving(false);

    if (savedSomewhere) {
      setSuccessMsg('Store expenses, staff salaries & dynamic incentives saved! Daily OpEx recalculated.');
      if (typeof onConfigSaved === 'function') {
        onConfigSaved(payload.operatingExpenses);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMsg('Failed to save settings to server or cloud database.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[94vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Store Expenses &amp; Daily OpEx</h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {activeStore === 'ALL' ? 'Main Store' : activeStore}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dynamic staff salary, target division &amp; automatic achievement incentives
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 text-sm custom-scrollbar">

          {/* Real-time Break-Even & Overhead Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/50 border border-emerald-500/30 text-white shadow-lg space-y-3">
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
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <p className="text-[10px] uppercase font-bold text-slate-400">Monthly Overhead</p>
                <p className="text-lg font-black text-rose-400 font-mono mt-0.5">
                  ₹{totalMonthlyExpenses.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Fixed OPEX (Rent + Staff + Power)</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <p className="text-[10px] uppercase font-bold text-slate-400">Daily Running Cost (OpEx)</p>
                <p className="text-lg font-black text-amber-400 font-mono mt-0.5">
                  ₹{dailyAmortizedExpense.toLocaleString('en-IN')}<span className="text-xs text-slate-400 font-normal">/day</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Amortized over 30 days</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <p className="text-[10px] uppercase font-bold text-emerald-400">Daily Break-Even Sales</p>
                <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                  ₹{dailyBreakEvenSales.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-emerald-300/80 mt-0.5">Min. daily sale needed</p>
              </div>
            </div>
          </div>

          {/* Section 1: Dynamic Staff Salaries & Target-Based Incentive Calculation */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-blue-500/30 dark:border-blue-500/20 space-y-4">
            
            {/* Staff Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Staff Salaries &amp; Dynamic Target Incentives
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Store target is divided equally among staff with filled salaries. Unfilled staff are treated as former employees.
                </p>
              </div>

              {/* Mode Toggle: On-Target Budget vs Live MTD Sales */}
              <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIncentiveMode('target')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    incentiveMode === 'target'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Calculate incentive based on hitting store monthly target"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>On-Target (100% Goal)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIncentiveMode('live')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    incentiveMode === 'live'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Calculate incentive based on actual MTD sales so far"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Live MTD Earned</span>
                </button>
              </div>
            </div>

            {/* Target Division & Slabs Rules Banner */}
            <div className="p-3.5 rounded-xl bg-blue-500/10 dark:bg-blue-950/40 border border-blue-500/20 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400 uppercase text-[10px] tracking-wider">
                    Target Split:
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    Store Target <strong>₹{mTarget.toLocaleString('en-IN')}</strong> ÷ <strong>{activeSalesmenCount} active staff</strong> =
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-300 font-black font-mono">
                    ₹{targetPerSalesman.toLocaleString('en-IN')} / salesman
                  </span>
                </div>

                <div className="text-[11px] text-slate-500">
                  {incentiveMode === 'target' ? 'Mode: 100% Target Met (1.0% Rate)' : 'Mode: Live MTD Achievement'}
                </div>
              </div>

              {/* Slabs Reference Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-blue-500/15 text-[10.5px]">
                <span className="text-slate-400 font-bold uppercase text-[9px]">Slabs:</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  ≥ 95% of target: 1.0%
                </span>
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20">
                  ≥ 75% of target: 0.75%
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                  ≥ 50% (half): 0.50%
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-400 font-bold border border-slate-500/20">
                  &lt; 50%: 0.0%
                </span>
              </div>
            </div>

            {/* Salesmen List */}
            <div className="space-y-2.5">
              {salesmen.map((s) => {
                const isWorking = s.salary !== '' && s.salary !== null && s.salary !== undefined && Number(s.salary) > 0;
                const calc = getSalesmanAchievementAndIncentive(s);
                const totalStaffCost = isWorking ? (Number(s.salary) || 0) + calc.amount : 0;

                return (
                  <div
                    key={s.id || s.empCode}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isWorking
                        ? 'bg-white dark:bg-slate-900 border-blue-500/40 shadow-xs'
                        : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Left: Staff Name & Code */}
                      <div className="flex items-center gap-3 min-w-[170px]">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                          isWorking ? 'bg-blue-500 text-white shadow-xs' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{s.name}</span>
                            <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isWorking
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}>
                              {isWorking ? 'Active' : 'Left / Inactive'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">Code: {s.empCode || s.id}</span>
                        </div>
                      </div>

                      {/* Middle: Base Salary Input */}
                      <div className="flex-1 max-w-[190px]">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Base Monthly Salary
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            value={s.salary}
                            onChange={(e) => handleSalaryChange(s.id, e.target.value)}
                            placeholder="Leave empty if left"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Right: Divided Target, Live MTD & Incentive */}
                      <div className="flex flex-col sm:items-end justify-center min-w-[210px] text-xs">
                        {isWorking ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-500">
                                Target: <strong className="text-blue-500 font-mono">₹{targetPerSalesman.toLocaleString('en-IN')}</strong>
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${calc.slabColor}`}>
                                {calc.slabBadge}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-slate-400">
                                {incentiveMode === 'live' ? `MTD: ₹${Number(s.mtdSales).toLocaleString('en-IN')}` : 'Target Met'} • 
                              </span>
                              <span className="text-xs font-black font-mono text-emerald-500">
                                Inc: +₹{calc.amount.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                                = ₹{totalStaffCost.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            No salary entered • Excluded from target &amp; incentive
                          </div>
                        )}
                      </div>

                      {/* Delete action */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSalesman(s.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer self-end sm:self-center"
                        title="Remove staff entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Salesman Form / Button */}
            {showAddForm ? (
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-500/40 space-y-3">
                <span className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Add Salesman to Roster
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="Salesman Name (e.g. Rahul)"
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={newStaffCode}
                    onChange={(e) => setNewStaffCode(e.target.value)}
                    placeholder="Emp Code (optional)"
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    value={newStaffSalary}
                    onChange={(e) => setNewStaffSalary(e.target.value)}
                    placeholder="Base Salary (₹)"
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSalesman}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs"
                  >
                    Add Staff
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-800 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Another Salesman</span>
              </button>
            )}

            {/* Total Staff Cost Summary Bar */}
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Active Staff Total:
                </span>
                <span className="text-slate-500 font-mono">
                  Base: <strong>₹{totalBaseSalaries.toLocaleString('en-IN')}</strong> + Incentive: <strong className="text-emerald-500">₹{totalIncentives.toLocaleString('en-IN')}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Staff OPEX:</span>
                <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                  ₹{dynamicStaffSalaries.toLocaleString('en-IN')}<span className="text-xs font-normal text-slate-400">/mo</span>
                </span>
              </div>
            </div>

          </div>

          {/* Section 2: Other Store Overheads */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" /> Store Overheads (Rent, Power &amp; Misc)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
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

              {/* Electricity & AC */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Electricity &amp; AC
                  </span>
                  <span className="text-[10px] text-slate-400">Monthly</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={electricity}
                    onChange={(e) => setElectricity(Number(e.target.value) || 0)}
                    placeholder="10000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Lighting &amp; power overhead</p>
              </div>

              {/* Misc & Maintenance */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-purple-500" /> Misc &amp; Tea
                  </span>
                  <span className="text-[10px] text-slate-400">Monthly</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={miscExpenses}
                    onChange={(e) => setMiscExpenses(Number(e.target.value) || 0)}
                    placeholder="5000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Stationery &amp; daily refreshments</p>
              </div>

            </div>

            {/* Daily Store Operating Expense (Direct OpEx) Result */}
            <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" /> Daily Store Operating Expense (Daily OpEx)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                    Calculated: ₹{dailyAmortizedExpense.toLocaleString('en-IN')}/day
                  </span>
                  <button
                    type="button"
                    onClick={() => setDailyExpense(dailyAmortizedExpense)}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    Sync to ₹{dailyAmortizedExpense}
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  value={dailyExpense}
                  onChange={(e) => setDailyExpense(Number(e.target.value) || 0)}
                  placeholder={dailyAmortizedExpense.toString()}
                  className="w-full bg-white dark:bg-slate-900 border border-amber-500/50 rounded-lg pl-7 pr-3 py-2 text-sm font-mono font-black text-amber-600 dark:text-amber-400 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                Powers the Daily Expenses &amp; Net Earned (Pocket Khata), Daily Break-Even meter, and executive telemetry.
              </p>
            </div>

          </div>

          {/* Section 3: Targets & Margin Benchmarks */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" /> Store Targets &amp; Margin Benchmarks
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Target Gross Margin</label>
                <div className="relative">
                  <input
                    type="number"
                    value={targetMarginPct}
                    onChange={(e) => setTargetMarginPct(Number(e.target.value) || 0)}
                    placeholder="25"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-bold text-xs">%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Benchmark margin is 25%</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Monthly Sales Target</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={monthlyTargetSales}
                    onChange={(e) => setMonthlyTargetSales(Number(e.target.value) || 0)}
                    placeholder="900000"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-blue-500 font-semibold mt-1">Divided among {activeSalesmenCount} active staff</p>
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
                <p className="text-[10px] text-slate-400 mt-1">Daily dashboard target meter</p>
              </div>
            </div>
          </div>

          {/* Section 4: Store Identity */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" /> Store Profile
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Store / Franchise Name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. Goyal - House Of Fashion"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Branch / Market Location</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Pundri Flagship"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                />
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
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
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
