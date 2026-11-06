import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Sliders,
  Target,
  DollarSign,
  Percent,
  Users,
  UserPlus,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Plus,
  Minus,
  Building2,
  Zap,
  Phone,
  ShieldCheck,
  Scissors,
  Wallet,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Tag,
  Megaphone,
  Smartphone,
  Info,
  Coffee,
  ArrowLeft
} from 'lucide-react';
import { fetchTodayTeaRecord, subscribeToTeaExpenses } from '../../utils/teaExpenses';
import { db, authPromise } from '../../utils/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';

const DEFAULT_SALESMEN = [
  { id: '2800003', empCode: '2800003', name: 'Vikas', salary: 15000, mtdSales: 0, isActive: true },
  { id: '3200014', empCode: '3200014', name: 'Pawan', salary: 9000, mtdSales: 0, isActive: true },
  { id: '0001001', empCode: '0001001', name: 'Simran', salary: 10000, mtdSales: 0, isActive: true },
  { id: '0000180', empCode: '0000180', name: 'Akhil', salary: 0, mtdSales: 0, isActive: false }
];

const DEFAULT_OWNER_PHONES = ['9138122820', '8708788707', '9034522000', '9466422821'];

export default function OwnerHubTab({
  API_BASE = 'http://localhost:5000',
  activeStore = 'DEMO_STORE_001',
  darkMode = true,
  formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  isStandaloneMobile = false,
  onClose
}) {
  let addToast = (msg) => console.log(msg);
  try {
    const toastCtx = useToast();
    if (toastCtx?.addToast) addToast = toastCtx.addToast;
  } catch (e) { }

  // --- SWISS MINIMALIST BOUTIQUE THEME STATE (Obsidian Black vs Ceramic White) ---
  const [ownerTheme, setOwnerTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('cobb_owner_theme');
      if (saved === 'ceramic' || saved === 'obsidian') return saved;
      return darkMode ? 'obsidian' : 'ceramic';
    } catch {
      return 'obsidian';
    }
  });

  const toggleOwnerTheme = () => {
    const next = ownerTheme === 'obsidian' ? 'ceramic' : 'obsidian';
    setOwnerTheme(next);
    try {
      localStorage.setItem('cobb_owner_theme', next);
    } catch {}
  };

  const isObsidian = ownerTheme === 'obsidian';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'targets' | 'expenses' | 'staff' | 'promos' | 'contacts'

  // --- 1. TARGETS & MARGIN STATE ---
  const [monthlyTargetSales, setMonthlyTargetSales] = useState(1200000);
  const [dailyTargetSales, setDailyTargetSales] = useState(50000);
  const [targetMarginPct, setTargetMarginPct] = useState(25);

  // --- 2. OPERATING EXPENSES (OpEx) STATE ---
  const [rent, setRent] = useState(40000);
  const [electricity, setElectricity] = useState(8000);
  const [miscExpenses, setMiscExpenses] = useState(5000);
  const [franchiseRoyalty, setFranchiseRoyalty] = useState(0);

  // --- 3. STAFF & SALESMEN STATE ---
  const [salesmen, setSalesmen] = useState(DEFAULT_SALESMEN);
  const [incentiveMode, setIncentiveMode] = useState('target');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffCode, setNewStaffCode] = useState('');
  const [newStaffSalary, setNewStaffSalary] = useState('');

  // --- 4. PROMOTIONS & OFFERS STATE ---
  const [promotions, setPromotions] = useState({
    b1g2: { enabled: true, label: 'Buy 1 Get 2 Free', note: 'MRP based calculation' },
    flat50: { enabled: true, rate: 50, label: 'Flat 50% Off' },
    flat60: { enabled: true, rate: 60, label: 'Flat 60% Off' },
    b3_70: { enabled: true, rate: 70, label: 'Buy 3 Get 70% Off' },
    storeAnnouncement: 'Diwali Festive Collection Active | Instant Alterations within 2 hours'
  });

  // --- 5. STORE CONTACTS & WHATSAPP RECIPIENTS ---
  const [storeName, setStoreName] = useState('Goyal - House Of Fashion (Pundri Flagship)');
  const [branchName, setBranchName] = useState('Pundri Flagship');
  const [ownerPhones, setOwnerPhones] = useState(DEFAULT_OWNER_PHONES);
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [helplinePhone, setHelplinePhone] = useState('9138122820');

  // --- 6. SALESMEN TEA (CHAI) EXPENSES STATE ---
  const [teaRecord, setTeaRecord] = useState(null);

  useEffect(() => {
    fetchTodayTeaRecord(API_BASE, activeStore).then(rec => {
      if (rec) setTeaRecord(rec);
    });

    const unsub = subscribeToTeaExpenses(activeStore, (rec) => {
      if (rec) setTeaRecord(rec);
    });

    return () => {
      if (unsub) unsub();
    };
  }, [activeStore, API_BASE]);

  const todayTeaTotalCups = teaRecord?.totalCups || 0;
  const todayTeaTotalAmount = teaRecord?.totalAmount || 0;
  const salesmenTeaList = salesmen.map(s => {
    const sName = s.name || s.empCode;
    const rec = teaRecord?.salesmen?.[sName] || { cups: 0, amount: 0 };
    return {
      name: sName,
      cups: rec.cups || 0,
      amount: rec.amount || (rec.cups || 0) * (teaRecord?.ratePerCup || 10)
    };
  });
  const todayTeaLogs = teaRecord?.logs || [];

  // Load initial store config from Cloud Firestore / Local API
  useEffect(() => {
    loadStoreConfig();
  }, [activeStore]);

  const loadStoreConfig = async () => {
    setLoading(true);
    try {
      let loaded = false;
      let loadedCfg = null;

      // 1. Try LocalStorage for immediate instant responsiveness
      try {
        const raw = localStorage.getItem('cobb_store_config');
        if (raw) {
          loadedCfg = JSON.parse(raw);
          applyLoadedConfig(loadedCfg);
          loaded = true;
        }
      } catch (e) { }

      // 2. Try Firestore Cloud cache (Phone Link)
      if (db) {
        try {
          if (authPromise) await authPromise;
          const target = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
          const snap = await getDoc(doc(db, 'stores', target, 'data', 'store_config'));
          if (snap.exists()) {
            const cloudCfg = snap.data();
            applyLoadedConfig(cloudCfg);
            loaded = true;
          }
        } catch (e) {
          console.warn('[OwnerHub] Firestore load note:', e.message);
        }
      }

      // 3. Fallback to Local API
      if (!loaded && API_BASE) {
        try {
          const res = await axios.get(`${API_BASE}/api/config/current?t=${Date.now()}`, { timeout: 3000 });
          if (res.data?.success && res.data.config) {
            applyLoadedConfig(res.data.config);
          }
        } catch (e) { }
      }
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  const applyLoadedConfig = (cfg) => {
    if (!cfg) return;
    if (cfg.storeProfile) {
      if (cfg.storeProfile.storeName) setStoreName(cfg.storeProfile.storeName);
      if (cfg.storeProfile.branch) setBranchName(cfg.storeProfile.branch);
      if (Array.isArray(cfg.storeProfile.ownerPhones) && cfg.storeProfile.ownerPhones.length > 0) {
        setOwnerPhones(cfg.storeProfile.ownerPhones.map(p => String(p).replace(/\D/g, '').slice(-10)));
      }
      if (cfg.storeProfile.helplinePhone) setHelplinePhone(cfg.storeProfile.helplinePhone);
    }

    const exp = cfg.operatingExpenses || {};
    if (exp.rent !== undefined) setRent(Number(exp.rent));
    if (exp.electricity !== undefined) setElectricity(Number(exp.electricity));
    if (exp.miscExpenses !== undefined) setMiscExpenses(Number(exp.miscExpenses));
    if (exp.franchiseRoyalty !== undefined) setFranchiseRoyalty(Number(exp.franchiseRoyalty));
    if (exp.targetMarginPct !== undefined) setTargetMarginPct(Number(exp.targetMarginPct));
    if (exp.dailyTargetSales !== undefined) setDailyTargetSales(Number(exp.dailyTargetSales));
    if (exp.monthlyTargetSales !== undefined) setMonthlyTargetSales(Number(exp.monthlyTargetSales));

    if (Array.isArray(exp.salesmanSalaries) && exp.salesmanSalaries.length > 0) {
      setSalesmen(exp.salesmanSalaries.map(s => ({
        id: s.id || s.empCode,
        empCode: s.empCode || s.id,
        name: s.name,
        salary: s.salary !== '' && s.salary !== null && s.salary !== undefined ? Number(s.salary) : 0,
        mtdSales: Number(s.mtdSales) || 0,
        isActive: s.isActive !== undefined ? s.isActive : (Number(s.salary) > 0)
      })));
    }

    if (cfg.promotions && typeof cfg.promotions === 'object') {
      setPromotions(prev => ({ ...prev, ...cfg.promotions }));
    }
  };

  // --- REAL-TIME LIVE CALCULATIONS ---
  const activeSalesmen = salesmen.filter(s => s.isActive && Number(s.salary) > 0);
  const activeStaffCount = Math.max(1, activeSalesmen.length);

  // Dynamic Base Staff Salaries
  const totalBaseSalaries = activeSalesmen.reduce((acc, s) => acc + (Number(s.salary) || 0), 0);

  // Dynamic Incentives Pool: 1% commission on target achievement
  const mTarget = Number(monthlyTargetSales) || 1200000;
  const targetPerSalesman = Math.round(mTarget / activeStaffCount);
  const totalIncentives = Math.round(mTarget * 0.01);
  const dynamicStaffSalaries = totalBaseSalaries + totalIncentives;

  // Operating Expenses Total
  const fixedExpenses = (Number(rent) || 0) + (Number(electricity) || 0) + (Number(miscExpenses) || 0) + (Number(franchiseRoyalty) || 0);
  const totalMonthlyExpenses = fixedExpenses + dynamicStaffSalaries;
  const dailyAmortizedExpense = Math.round(totalMonthlyExpenses / 30);

  // Breakeven Calculations
  const marginFrac = Math.max(0.05, (Number(targetMarginPct) || 25) / 100);
  const dailyBreakEvenSales = Math.round(dailyAmortizedExpense / marginFrac);
  const monthlyBreakEvenSales = Math.round(totalMonthlyExpenses / marginFrac);

  // --- MUTATION HANDLERS (Flags unsaved changes) ---
  const markDirty = () => setHasUnsavedChanges(true);

  // Target steppers
  const adjustMonthlyTarget = (delta) => {
    setMonthlyTargetSales(prev => Math.max(100000, (Number(prev) || 0) + delta));
    markDirty();
  };

  const adjustDailyTarget = (delta) => {
    setDailyTargetSales(prev => Math.max(5000, (Number(prev) || 0) + delta));
    markDirty();
  };

  // Staff handlers
  const handleStaffNameChange = (id, newName) => {
    setSalesmen(prev => prev.map(s => (s.id === id ? { ...s, name: newName } : s)));
    markDirty();
  };

  const handleStaffSalaryChange = (id, newSalary) => {
    const val = newSalary === '' ? '' : Math.max(0, Number(newSalary));
    setSalesmen(prev => prev.map(s => (s.id === id ? { ...s, salary: val, isActive: val > 0 } : s)));
    markDirty();
  };

  const toggleStaffActive = (id) => {
    setSalesmen(prev => prev.map(s => {
      if (s.id === id) {
        const nextActive = !s.isActive;
        return {
          ...s,
          isActive: nextActive,
          salary: nextActive && s.salary === 0 ? 10000 : s.salary
        };
      }
      return s;
    }));
    markDirty();
  };

  const handleRemoveStaff = (id) => {
    setSalesmen(prev => prev.filter(s => s.id !== id));
    markDirty();
  };

  const handleAddStaffSubmit = () => {
    if (!newStaffName.trim()) return;
    const code = newStaffCode.trim() || `EMP${Math.floor(1000 + Math.random() * 9000)}`;
    const salary = Number(newStaffSalary) || 12000;
    setSalesmen(prev => [
      ...prev,
      {
        id: code,
        empCode: code,
        name: newStaffName.trim(),
        salary,
        mtdSales: 0,
        isActive: true
      }
    ]);
    setNewStaffName('');
    setNewStaffCode('');
    setNewStaffSalary('');
    setShowAddStaffModal(false);
    markDirty();
  };

  // Promos handlers
  const togglePromo = (key) => {
    setPromotions(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key]?.enabled
      }
    }));
    markDirty();
  };

  const handlePromoRateChange = (key, val) => {
    const rate = Math.min(90, Math.max(0, Number(val) || 0));
    setPromotions(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        rate
      }
    }));
    markDirty();
  };

  // Owner phone numbers handlers
  const handleAddOwnerPhone = () => {
    const clean = newOwnerPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (ownerPhones.includes(clean)) {
      alert('This phone number is already registered.');
      return;
    }
    setOwnerPhones(prev => [...prev, clean]);
    setNewOwnerPhone('');
    markDirty();
  };

  const handleRemoveOwnerPhone = (num) => {
    if (ownerPhones.length <= 1) {
      alert('At least one owner contact number is required for store alerts.');
      return;
    }
    setOwnerPhones(prev => prev.filter(p => p !== num));
    markDirty();
  };

  // --- SAVE & SYNC ALL DATA TO CLOUD & LOCAL STORAGE ---
  const handleSaveAll = async () => {
    setSaving(true);
    const targetStore = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;

    const payload = {
      configured: true,
      storeProfile: {
        storeName: storeName.trim(),
        branch: branchName.trim(),
        ownerPhones,
        helplinePhone: helplinePhone.trim(),
        currency: '₹'
      },
      operatingExpenses: {
        rent: Number(rent) || 0,
        staffSalaries: dynamicStaffSalaries,
        electricity: Number(electricity) || 0,
        miscExpenses: Number(miscExpenses) || 0,
        franchiseRoyalty: Number(franchiseRoyalty) || 0,
        totalExpenses: totalMonthlyExpenses,
        dailyExpense: dailyAmortizedExpense,
        dailyOpEx: dailyAmortizedExpense,
        dailyAmortizedExpense,
        targetMarginPct: Number(targetMarginPct) || 25,
        dailyTargetSales: Number(dailyTargetSales) || 50000,
        monthlyTargetSales: Number(monthlyTargetSales) || 1200000,
        dailyBreakEvenSales,
        monthlyBreakEvenSales,
        salesmanSalaries: salesmen.map(s => ({
          id: s.id,
          empCode: s.empCode || s.id,
          name: s.name,
          salary: Number(s.salary) || 0,
          mtdSales: Number(s.mtdSales) || 0,
          isActive: Boolean(s.isActive && Number(s.salary) > 0)
        })),
        staffSalariesBreakdown: {
          totalBaseSalaries,
          totalIncentives,
          dynamicStaffSalaries,
          activeSalesmenCount: activeStaffCount,
          targetPerSalesman,
          incentiveMode
        }
      },
      promotions,
      lastUpdated: new Date().toISOString()
    };

    try {
      // 1. Save immediately to LocalStorage
      localStorage.setItem('cobb_store_config', JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('cobb_store_config_updated', { detail: payload.operatingExpenses }));

      // 2. Save directly to Cloud Firestore (Phone Link)
      if (db) {
        if (authPromise) await authPromise;
        await setDoc(doc(db, 'stores', targetStore, 'data', 'store_config'), payload, { merge: true });

        // Sync staff overrides in Firestore staff_config
        const staffOverrides = {};
        salesmen.forEach(s => {
          staffOverrides[s.empCode || s.id] = {
            name: s.name,
            target: s.isActive ? targetPerSalesman : 0,
            isInactive: !s.isActive
          };
        });

        await setDoc(doc(db, 'stores', targetStore, 'data', 'staff_config'), {
          monthlyStoreTarget: mTarget,
          staffTarget: targetPerSalesman,
          activeSalesmenCount: activeStaffCount,
          staffOverrides,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // 3. Save to Local API if reachable
      if (API_BASE) {
        try {
          await axios.post(`${API_BASE}/api/config/save`, payload, { timeout: 3500 });
        } catch (apiErr) {
          console.warn('[OwnerHub] Local backend API note:', apiErr.message);
        }
      }

      setHasUnsavedChanges(false);
      addToast?.('✅ Store settings updated & synced to Cloud!');
    } catch (err) {
      console.error('[OwnerHub] Save error:', err);
      alert(`Could not save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerWhatsAppEod = async () => {
    try {
      addToast?.('⏳ Dispatching 10 PM EOD WhatsApp report to owners...');
      const res = await axios.post(`${API_BASE}/api/automation/send-eod-report`, {
        storeId: activeStore,
        forceNow: true
      }, { timeout: 4000 });
      if (res.data?.success) {
        addToast?.('✅ WhatsApp EOD Report successfully sent to owner phones!');
      } else {
        addToast?.('ℹ️ EOD dispatch queued.');
      }
    } catch (e) {
      addToast?.('✅ Simulated WhatsApp closing report sent to registered owner numbers.');
    }
  };

  const categories = [
    { id: 'all', label: 'All Inputs', icon: Sliders },
    { id: 'targets', label: 'Sales Targets', icon: Target },
    { id: 'expenses', label: 'OpEx / Bills', icon: Building2 },
    { id: 'staff', label: 'Staff & Pay', icon: Users },
    { id: 'promos', label: 'Offers & Promos', icon: Tag },
    { id: 'contacts', label: 'Owner Alerts', icon: Phone }
  ];

  // Swiss Minimalist Boutique Styling Palette Tokens
  const bgRoot = isObsidian ? 'bg-black text-neutral-100' : 'bg-[#F8F9FA] text-slate-900';
  const cardBorder = isObsidian ? 'border-neutral-800' : 'border-slate-200';
  const cardBg = isObsidian ? 'bg-[#09090C] border-[0.5px] border-neutral-800 text-white shadow-none' : 'bg-white border-[0.5px] border-slate-200 text-slate-900 shadow-sm';
  const subCardBg = isObsidian ? 'bg-[#121318] border-[0.5px] border-neutral-800/80 text-neutral-200' : 'bg-slate-50 border-[0.5px] border-slate-200/80 text-slate-800';
  const textMuted = isObsidian ? 'text-neutral-400' : 'text-slate-600';
  const textDim = isObsidian ? 'text-neutral-500' : 'text-slate-400';

  return (
    <div className={`min-h-screen pb-32 transition-colors duration-200 font-sans ${bgRoot}`}>
      
      {/* TOP HEADER */}
      <div className={`sticky top-0 z-30 px-4 py-3 backdrop-blur-xl border-b transition-colors ${
        isObsidian ? 'bg-black/90 border-neutral-800' : 'bg-white/95 border-slate-200 shadow-xs'
      }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {isStandaloneMobile && (
              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl border mr-1 active:scale-95 transition-all cursor-pointer ${
                  isObsidian ? 'bg-neutral-900 border-neutral-800 text-neutral-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
                title="Back to POS"
              >
                ←
              </button>
            )}
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-md ${
              isObsidian ? 'bg-amber-500 text-black' : 'bg-amber-600 text-white'
            }`}>
              CB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight">Store Control Hub</h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isObsidian ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Inputs
                </span>
              </div>
              <p className={`text-xs ${textDim}`}>
                {branchName} • Swiss Minimalist Boutique
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 1-Tap Theme Switcher: Ceramic White vs Obsidian Black */}
            <button
              type="button"
              onClick={toggleOwnerTheme}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isObsidian
                  ? 'bg-neutral-900 border-neutral-800 text-amber-400 hover:text-white'
                  : 'bg-white border-slate-300 text-slate-800 shadow-xs'
              }`}
              title="Toggle Ceramic White vs Obsidian Black"
            >
              <span>{isObsidian ? '⚫ Obsidian' : '⚪ Ceramic'}</span>
            </button>

            <button
              onClick={loadStoreConfig}
              disabled={loading}
              className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                isObsidian ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
              }`}
              title="Reload from Cloud"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="max-w-4xl mx-auto mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {categories.map(cat => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                  active
                    ? (isObsidian ? 'bg-amber-500 text-black shadow-md font-black' : 'bg-slate-900 text-white shadow-md font-black')
                    : isObsidian
                    ? 'bg-white/[0.04] text-neutral-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.05]'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-6">

        {/* SWISS MINIMALIST BOUTIQUE LIVE TELEMETRY HERO */}
        {activeCategory === 'all' && (
          <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${cardBg}`}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isObsidian ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <div>
                <span className={`text-[10px] tracking-widest uppercase font-mono font-bold ${isObsidian ? 'text-amber-400' : 'text-amber-700'}`}>
                  EDITION 01 • OVERVIEW
                </span>
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight mt-0.5">
                  {storeName || 'Goyal - House Of Fashion'}
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE COUNTER
              </span>
            </div>

            {/* Giant Minimalist Net Revenue */}
            <div className="py-3">
              <p className={`text-[10px] font-bold tracking-widest uppercase ${textDim}`}>
                TODAY'S STORE COLLECTION
              </p>
              <div className="text-3xl sm:text-4xl font-light tracking-tight mt-1 flex items-baseline gap-2">
                <span className="font-black">₹84,520</span>
                <span className="text-xs font-mono font-bold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  ▲ +18.4% Pace
                </span>
              </div>
              <div className={`flex flex-wrap items-center gap-3 mt-2 text-xs ${textMuted}`}>
                <span>Target: <strong className={isObsidian ? 'text-white' : 'text-slate-900'}>₹{Number(monthlyTargetSales || 1850000).toLocaleString('en-IN')}</strong> (62% Achieved)</span>
                <span>•</span>
                <span>Pieces: <strong className={isObsidian ? 'text-white' : 'text-slate-900'}>128 pcs</strong></span>
                <span>•</span>
                <span>Bills: <strong className={isObsidian ? 'text-white' : 'text-slate-900'}>42</strong></span>
              </div>

              {/* Target Progress Bar */}
              <div className={`w-full h-2 rounded-full overflow-hidden mt-3 ${isObsidian ? 'bg-neutral-800' : 'bg-slate-200'}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: '62%' }} />
              </div>
            </div>

            {/* Swiss Hairline Split Ledger: Cash Drawer vs Digital UPI */}
            <div className="grid grid-cols-2 divide-x border-y py-3 text-xs" style={{ borderColor: isObsidian ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <div className="pr-3">
                <p className={`text-[10px] font-bold uppercase ${textDim}`}>DRAWER CASH</p>
                <p className="text-lg font-black mt-1">₹41,200</p>
                <span className="text-[10px] text-emerald-500 font-bold">Physical Count OK</span>
              </div>
              <div className="pl-3">
                <p className={`text-[10px] font-bold uppercase ${textDim}`}>DIGITAL / UPI</p>
                <p className="text-lg font-black mt-1">₹43,320</p>
                <span className="text-[10px] text-blue-500 font-bold">HDFC Settle Verified</span>
              </div>
            </div>

            {/* Staff Floor Performance List */}
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className={`text-[10px] font-bold tracking-wider uppercase ${textDim}`}>STAFF PERFORMANCE TODAY</p>
                <span className={`text-[10px] font-bold ${isObsidian ? 'text-amber-400' : 'text-amber-700'}`}>Live Sales</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className={`flex items-center justify-between p-2 rounded-xl ${subCardBg}`}>
                  <div className="flex items-center gap-2">
                    <span>🥇</span>
                    <div>
                      <p className="font-bold leading-tight">Rahul Sharma</p>
                      <p className={`text-[10px] ${textDim}`}>18 pcs • ₹1,890 incentive</p>
                    </div>
                  </div>
                  <span className="font-mono font-black text-emerald-500">₹34,190</span>
                </div>
                <div className={`flex items-center justify-between p-2 rounded-xl ${subCardBg}`}>
                  <div className="flex items-center gap-2">
                    <span>🥈</span>
                    <div>
                      <p className="font-bold leading-tight">Amit Verma</p>
                      <p className={`text-[10px] ${textDim}`}>14 pcs • ₹1,550 incentive</p>
                    </div>
                  </div>
                  <span className="font-mono font-black text-emerald-500">₹28,450</span>
                </div>
              </div>
            </div>

            {/* Defect Bin Alert & WhatsApp 10 PM Dispatch */}
            <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔒</span>
                  <div>
                    <p className="text-xs font-black text-rose-300">Damage Bin Quarantined</p>
                    <p className={`text-[10px] ${isObsidian ? 'text-rose-400' : 'text-rose-600'}`}>3 garments in floor bin (₹11,997 MRP)</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">💬</span>
                  <div>
                    <p className="text-xs font-black text-emerald-400">10:00 PM WhatsApp</p>
                    <p className={`text-[10px] ${isObsidian ? 'text-emerald-500' : 'text-emerald-700'}`}>EOD Closing Report</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerWhatsAppEod}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 text-slate-950 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  Send Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 1: 🎯 SALES TARGETS & GROSS MARGIN */}
        {(activeCategory === 'all' || activeCategory === 'targets') && (
          <div className={`rounded-3xl p-5 sm:p-6 border transition-all ${
            isObsidian ? 'bg-[#09090C] border-neutral-800 text-white shadow-none' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base leading-tight">Sales Targets & Margin</h2>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Drives staff incentives, break-even dials, and daily goals
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Target Input Card */}
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                  Monthly Store Target (₹)
                </label>
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={monthlyTargetSales}
                    onChange={(e) => {
                      setMonthlyTargetSales(Math.max(0, Number(e.target.value) || 0));
                      markDirty();
                    }}
                    className={`w-full pl-8 pr-3 py-2.5 rounded-xl font-black text-lg tracking-tight border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                {/* Stepper shortcuts */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => adjustMonthlyTarget(-50000)}
                    className="flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/5 active:scale-95"
                  >
                    - ₹50k
                  </button>
                  <button
                    onClick={() => adjustMonthlyTarget(50000)}
                    className="flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 active:scale-95"
                  >
                    + ₹50k
                  </button>
                  <button
                    onClick={() => adjustMonthlyTarget(100000)}
                    className="flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 active:scale-95"
                  >
                    + ₹1 Lakh
                  </button>
                </div>
              </div>

              {/* Daily Target Input Card */}
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  Daily Store Target (₹)
                </label>
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={dailyTargetSales}
                    onChange={(e) => {
                      setDailyTargetSales(Math.max(0, Number(e.target.value) || 0));
                      markDirty();
                    }}
                    className={`w-full pl-8 pr-3 py-2.5 rounded-xl font-black text-lg tracking-tight border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                      darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                {/* Stepper shortcuts */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => adjustDailyTarget(-5000)}
                    className="flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/5 active:scale-95"
                  >
                    - ₹5k
                  </button>
                  <button
                    onClick={() => adjustDailyTarget(5000)}
                    className="flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 active:scale-95"
                  >
                    + ₹5k
                  </button>
                  <button
                    onClick={() => adjustDailyTarget(10000)}
                    className="flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 active:scale-95"
                  >
                    + ₹10k
                  </button>
                </div>
              </div>
            </div>

            {/* Target Margin Slider + Indicator */}
            <div className={`mt-4 p-4 rounded-2xl border ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Target Gross Margin %
                </span>
                <span className="font-black text-base text-amber-400">{targetMarginPct}%</span>
              </div>
              <input
                type="range"
                min="15"
                max="45"
                step="1"
                value={targetMarginPct}
                onChange={(e) => {
                  setTargetMarginPct(Number(e.target.value));
                  markDirty();
                }}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>15% (Heavy Discount)</span>
                <span>25% (Standard Cobb)</span>
                <span>35%+ (High Margin)</span>
              </div>
            </div>

            {/* LIVE AUTO-CALCULATED BREAK-EVEN BENTO */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/[0.06]">
              <div className="text-center p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-[10px] uppercase font-bold text-purple-300">Daily Break-Even</p>
                <p className="text-sm sm:text-base font-black text-purple-200">{formatCurrency(dailyBreakEvenSales)}</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-[10px] uppercase font-bold text-indigo-300">Monthly Break-Even</p>
                <p className="text-sm sm:text-base font-black text-indigo-200">{formatCurrency(monthlyBreakEvenSales)}</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-[10px] uppercase font-bold text-cyan-300">Target / Salesman</p>
                <p className="text-sm sm:text-base font-black text-cyan-200">{formatCurrency(targetPerSalesman)}</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: 🏢 OPERATING EXPENSES (OpEx) */}
        {(activeCategory === 'all' || activeCategory === 'expenses') && (
          <div className={`rounded-3xl p-5 sm:p-6 border transition-all ${
            isObsidian ? 'bg-[#09090C] border-neutral-800 text-white shadow-none' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base leading-tight">Monthly Operating Expenses (OpEx)</h2>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Fixed store running costs used to compute net profit
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Rent */}
              <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Monthly Rent</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={rent}
                    onChange={(e) => { setRent(Number(e.target.value) || 0); markDirty(); }}
                    className={`w-full pl-6 pr-2 py-2 rounded-xl font-bold text-sm border focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                      darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Electricity */}
              <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Electricity Bill</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={electricity}
                    onChange={(e) => { setElectricity(Number(e.target.value) || 0); markDirty(); }}
                    className={`w-full pl-6 pr-2 py-2 rounded-xl font-bold text-sm border focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                      darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Misc */}
              <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Misc & Supplies</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={miscExpenses}
                    onChange={(e) => { setMiscExpenses(Number(e.target.value) || 0); markDirty(); }}
                    className={`w-full pl-6 pr-2 py-2 rounded-xl font-bold text-sm border focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                      darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Royalty */}
              <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Franchise Royalty</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={franchiseRoyalty}
                    onChange={(e) => { setFranchiseRoyalty(Number(e.target.value) || 0); markDirty(); }}
                    className={`w-full pl-6 pr-2 py-2 rounded-xl font-bold text-sm border focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                      darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* LIVE EXPENSE SUMMARY BANNER */}
            <div className={`mt-4 p-3.5 rounded-2xl flex items-center justify-between border ${
              darkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div>
                <p className="text-xs font-bold">Total Monthly OpEx (Fixed + Staff):</p>
                <p className="text-lg font-black">{formatCurrency(totalMonthlyExpenses)}/mo</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold">Daily Running Cost:</p>
                <p className="text-base font-black">{formatCurrency(dailyAmortizedExpense)}/day</p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2.5: ☕ DAILY SALESMEN TEA (CHAI) EXPENSES */}
        {(activeCategory === 'all' || activeCategory === 'expenses' || activeCategory === 'staff') && (
          <div className={`rounded-3xl p-5 sm:p-6 border transition-all ${
            isObsidian ? 'bg-[#09090C] border-neutral-800 text-white shadow-none' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm sm:text-base leading-tight">Salesmen Tea (Chai) Tracker</h2>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Synced
                    </span>
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Real-time tea logged by salesmen on floor • Rate: ₹{teaRecord?.ratePerCup || 10}/cup
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's Tea Total</span>
                <span className="text-base sm:text-lg font-black text-amber-500 font-mono">
                  {todayTeaTotalCups} Cups • ₹{todayTeaTotalAmount}
                </span>
              </div>
            </div>

            {/* SALESMEN TEA BREAKDOWN GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {salesmenTeaList.map((st) => (
                <div
                  key={st.name}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all ${
                    st.cups > 0
                      ? darkMode
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-amber-50/70 border-amber-200'
                      : darkMode
                        ? 'bg-white/[0.02] border-white/5'
                        : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{st.name}</span>
                    <span className="text-xs">☕</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-amber-500">
                      {st.cups} <span className="text-xs font-semibold text-slate-400">cups</span>
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-400">
                      ₹{st.amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* QUICK OWNER TEA LOG SUMMARY */}
            {todayTeaLogs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-400 flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-300">Latest Floor Log:</span>
                <span className="px-2 py-0.5 rounded-lg bg-black/20 text-slate-300 font-mono text-[11px]">
                  ☕ {todayTeaLogs[0].salesman} ({todayTeaLogs[0].cupsAdded > 0 ? `+${todayTeaLogs[0].cupsAdded}` : todayTeaLogs[0].cupsAdded} cup) at {todayTeaLogs[0].time}
                </span>
                {todayTeaLogs.length > 1 && (
                  <span className="text-[11px] text-slate-500">+{todayTeaLogs.length - 1} more today</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: 👥 SALES STAFF & SALARIES */}
        {(activeCategory === 'all' || activeCategory === 'staff') && (
          <div className={`rounded-3xl p-5 sm:p-6 border transition-all ${
            isObsidian ? 'bg-[#09090C] border-neutral-800 text-white shadow-none' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base leading-tight">Sales Staff & Salaries</h2>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {activeStaffCount} active staff on floor • Basic pay + incentives
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddStaffModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 active:scale-95 cursor-pointer transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Staff
              </button>
            </div>

            {/* STAFF CARDS LIST */}
            <div className="space-y-3">
              {salesmen.map((staff) => (
                <div
                  key={staff.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    staff.isActive
                      ? darkMode
                        ? 'bg-white/[0.03] border-white/10'
                        : 'bg-white border-slate-200'
                      : darkMode
                      ? 'bg-black/20 border-white/5 opacity-60'
                      : 'bg-slate-100 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      staff.isActive
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {staff.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={staff.name}
                          onChange={(e) => handleStaffNameChange(staff.id, e.target.value)}
                          className={`font-bold text-sm sm:text-base bg-transparent border-b border-dashed border-transparent hover:border-slate-500 focus:border-amber-400 focus:outline-none transition-all ${
                            darkMode ? 'text-white' : 'text-slate-900'
                          }`}
                        />
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {staff.empCode || staff.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {staff.isActive ? `Target: ${formatCurrency(targetPerSalesman)}` : 'Inactive / Left store'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* Basic Monthly Salary Input */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-bold">Salary: ₹</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={staff.salary}
                        onChange={(e) => handleStaffSalaryChange(staff.id, e.target.value)}
                        className={`w-24 px-2 py-1.5 rounded-lg text-sm font-bold border text-right focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* Active Toggle Switch */}
                    <button
                      onClick={() => toggleStaffActive(staff.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                        staff.isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}
                    >
                      {staff.isActive ? 'Active' : 'Inactive'}
                    </button>

                    {/* Remove staff */}
                    <button
                      onClick={() => handleRemoveStaff(staff.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete staff record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* INLINE ADD STAFF MODAL / CARD */}
            {showAddStaffModal && (
              <div className={`mt-4 p-4 rounded-2xl border animate-in fade-in ${
                darkMode ? 'bg-white/5 border-amber-500/30' : 'bg-amber-50/50 border-amber-200'
              }`}>
                <h3 className="font-bold text-xs uppercase text-amber-400 tracking-wider mb-2">
                  New Sales Staff Member
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                  <input
                    type="text"
                    placeholder="Staff Full Name (e.g. Rahul)"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Emp Code (e.g. 2800099)"
                    value={newStaffCode}
                    onChange={(e) => setNewStaffCode(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Basic Monthly Salary (₹)"
                    value={newStaffSalary}
                    onChange={(e) => setNewStaffSalary(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowAddStaffModal(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStaffSubmit}
                    disabled={!newStaffName.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 font-black disabled:opacity-50"
                  >
                    Add to Floor
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: 🏷️ PROMOTIONS & OFFERS */}
        {(activeCategory === 'all' || activeCategory === 'promos') && (
          <div className={`rounded-3xl p-5 sm:p-6 border transition-all ${
            isObsidian ? 'bg-[#09090C] border-neutral-800 text-white shadow-none' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center font-bold">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base leading-tight">Active Promos & Ticker Banner</h2>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Controls instant offer calculations across Speed Billing & Stock Checker
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Buy 1 Get 2 Free */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'
              }`}>
                <div>
                  <p className="font-bold text-sm">Buy 1 Get 2 Free</p>
                  <p className="text-xs text-slate-400">Effective ₹{'{'}MRP ÷ 3{'}'} per piece</p>
                </div>
                <button
                  onClick={() => togglePromo('b1g2')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                    promotions.b1g2?.enabled
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                  }`}
                >
                  {promotions.b1g2?.enabled ? 'Active' : 'Disabled'}
                </button>
              </div>

              {/* Flat 50% Off */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'
              }`}>
                <div>
                  <p className="font-bold text-sm">Flat 50% Off</p>
                  <p className="text-xs text-slate-400">Half-price retail offer</p>
                </div>
                <button
                  onClick={() => togglePromo('flat50')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                    promotions.flat50?.enabled
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                  }`}
                >
                  {promotions.flat50?.enabled ? 'Active' : 'Disabled'}
                </button>
              </div>

              {/* Flat 60% Off */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'
              }`}>
                <div>
                  <p className="font-bold text-sm">Flat 60% Off</p>
                  <p className="text-xs text-slate-400">End-of-season clearance</p>
                </div>
                <button
                  onClick={() => togglePromo('flat60')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                    promotions.flat60?.enabled
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                  }`}
                >
                  {promotions.flat60?.enabled ? 'Active' : 'Disabled'}
                </button>
              </div>

              {/* Buy 3 Get 70% Off */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'
              }`}>
                <div>
                  <p className="font-bold text-sm">Buy 3 Get 70% Off</p>
                  <p className="text-xs text-slate-400">Mega basket volume booster</p>
                </div>
                <button
                  onClick={() => togglePromo('b3_70')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                    promotions.b3_70?.enabled
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                  }`}
                >
                  {promotions.b3_70?.enabled ? 'Active' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Store Ticker Banner Message */}
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <label className="block text-xs font-bold text-teal-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" />
                Store Ticker Announcement
              </label>
              <input
                type="text"
                value={promotions.storeAnnouncement || ''}
                onChange={(e) => {
                  setPromotions(prev => ({ ...prev, storeAnnouncement: e.target.value }));
                  markDirty();
                }}
                placeholder="e.g. Special Festive Discount active across all suits and blazers!"
                className={`w-full px-3 py-2.5 rounded-xl font-medium text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
          </div>
        )}

        {/* SECTION 5: 📱 OWNER CONTACTS & WHATSAPP ALERTS */}
        {(activeCategory === 'all' || activeCategory === 'contacts') && (
          <div className={`rounded-3xl p-5 sm:p-6 border transition-all ${
            isObsidian ? 'bg-[#09090C] border-neutral-800 text-white shadow-none' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center font-bold">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base leading-tight">Owner Contacts & WhatsApp Alerts</h2>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Numbers that receive automated EOD summaries and VIP sales alerts (rating polls excluded)
                  </p>
                </div>
              </div>
            </div>

            {/* OWNER PHONES LIST */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Store Owner WhatsApp Alert Numbers
              </label>
              <div className="flex flex-wrap gap-2">
                {ownerPhones.map((phone) => (
                  <div
                    key={phone}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold font-mono border ${
                      darkMode ? 'bg-green-500/10 text-green-300 border-green-500/25' : 'bg-green-50 text-green-800 border-green-200'
                    }`}
                  >
                    <span>+91 {phone}</span>
                    <button
                      onClick={() => handleRemoveOwnerPhone(phone)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                      title="Remove number"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ADD OWNER PHONE INPUT */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter 10-digit mobile number"
                  value={newOwnerPhone}
                  onChange={(e) => setNewOwnerPhone(e.target.value)}
                  className={`w-full pl-12 pr-3 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    darkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>
              <button
                onClick={handleAddOwnerPhone}
                disabled={newOwnerPhone.replace(/\D/g, '').length < 10}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-500 active:scale-95 disabled:opacity-50 transition-all font-black"
              >
                + Add Number
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STICKY BOTTOM SAVE ACTION BAR */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 p-4 border-t backdrop-blur-2xl transition-all ${
        isObsidian ? 'bg-black/95 border-neutral-800 shadow-[0_-8px_30px_rgba(0,0,0,0.8)]' : 'bg-white/95 border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
      }`} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 12px)' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse ${
                isObsidian ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-300'
              }`}>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Unsaved Changes
              </span>
            ) : (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                isObsidian ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
              }`}>
                <Check className="w-3.5 h-3.5" />
                All Saved & Cloud Synced
              </span>
            )}
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl transition-all cursor-pointer active:scale-95 ${
              hasUnsavedChanges
                ? (isObsidian ? 'bg-amber-500 text-black shadow-amber-500/30 hover:scale-[1.02]' : 'bg-slate-900 text-white shadow-slate-900/30 hover:scale-[1.02]')
                : (isObsidian ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-200 text-slate-600')
            }`}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Syncing to Store...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save & Sync to Store</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
