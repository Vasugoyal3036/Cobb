import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Trophy,
  Award,
  Crown,
  Users,
  TrendingUp,
  Percent,
  Target,
  DollarSign,
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Settings,
  Flame,
  ShoppingBag,
  Receipt,
  Layers,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Info,
  Save,
  Filter,
  Search,
  Check,
  Zap,
  ArrowUpRight,
  UserPlus,
  Edit3,
  UserCheck,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { db, hasConfig } from '../../utils/firebase';

export default function StaffLeaderboardTab({ API_BASE = 'http://localhost:5000' }) {
  const { addToast } = useToast();
  const { activeStore } = useAuth();
  const [activeView, setActiveView] = useState('leaderboard'); // 'leaderboard' | 'daily_logs'
  const [period, setPeriod] = useState('all_time');
  const [loading, setLoading] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [savingDaily, setSavingDaily] = useState(false);
  const [dailyFilterStaff, setDailyFilterStaff] = useState('ALL');
  const [dailySearchQuery, setDailySearchQuery] = useState('');
  const [expandedDayKey, setExpandedDayKey] = useState(null);

  const [configForm, setConfigForm] = useState({
    monthlyStoreTarget: 400000,
    staffTarget: 400000,
    dailyStoreTarget: 13333,
    defaultCommissionPct: 1.0,
    incentiveSlabs: {
      tier1: { threshold: 400000, rate: 1.0, label: "≥ ₹4,00,000 (1.0%)" },
      tier2: { threshold: 300000, rate: 0.75, label: "≥ ₹3,00,000 (0.75%)" },
      tier3: { threshold: 200000, rate: 0.5, label: "≤ ₹2,00,000 (0.5%)" }
    },
    staffOverrides: {}
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Manage Salesman Name Modal state
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameForm, setNameForm] = useState({
    empCode: '',
    name: '',
    target: 400000,
    isCustomCode: false
  });
  const [savingName, setSavingName] = useState(false);

  // Cached bundle state for 0ms period switching and instant offline loads
  const [rawBundle, setRawBundle] = useState(() => {
    try {
      const c = localStorage.getItem('cobb_staff_leaderboard_cache');
      return c ? JSON.parse(c) : null;
    } catch (e) {
      return null;
    }
  });

  // Cached day-to-day history
  const [dailyHistory, setDailyHistory] = useState(() => {
    try {
      const c = localStorage.getItem('cobb_staff_daily_history_cache');
      return c ? JSON.parse(c) : [];
    } catch (e) {
      return [];
    }
  });

  // Extract the active period data from bundle whenever period or rawBundle updates
  useEffect(() => {
    if (rawBundle) {
      if (rawBundle.periods && rawBundle.periods[period]) {
        setLeaderboardData(rawBundle.periods[period]);
      } else if (rawBundle.period === period) {
        setLeaderboardData(rawBundle);
      }
      if (rawBundle.dailyHistory && rawBundle.dailyHistory.length > 0) {
        setDailyHistory(rawBundle.dailyHistory);
      }
    }
  }, [period, rawBundle]);

  const fetchLeaderboard = async (forceFresh = false) => {
    if (!rawBundle?.periods?.[period] || forceFresh) {
      setLoading(true);
    }
    try {
      // 1. First attempt to fetch the full bundle for 0ms period switching
      const targetUrl = `${API_BASE}/api/staff/leaderboard?period=bundle`;
      const res = await axios.get(targetUrl);
      if (res.data) {
        setRawBundle(res.data);
        if (res.data.dailyHistory) {
          setDailyHistory(res.data.dailyHistory);
          try {
            localStorage.setItem('cobb_staff_daily_history_cache', JSON.stringify(res.data.dailyHistory));
          } catch (e) {}
        }
        try {
          localStorage.setItem('cobb_staff_leaderboard_cache', JSON.stringify(res.data));
        } catch (e) {}

        if (res.data.periods && res.data.periods[period]) {
          setLeaderboardData(res.data.periods[period]);
        } else {
          setLeaderboardData(res.data);
        }
      }
    } catch (err) {
      // 2. Cloud Fallback to Firebase Firestore (for phone link)
      if (hasConfig && db) {
        try {
          const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
          const { doc, getDoc } = await import('firebase/firestore');
          const snap = await getDoc(doc(db, 'stores', storeId, 'data', 'staff_leaderboard'));
          if (snap.exists()) {
            const data = snap.data();
            setRawBundle(data);
            if (data.dailyHistory) {
              setDailyHistory(data.dailyHistory);
            }
            if (data.periods && data.periods[period]) {
              setLeaderboardData(data.periods[period]);
            } else {
              setLeaderboardData(data);
            }
            return;
          }
        } catch (fsErr) {
          console.debug('[StaffLeaderboard] Firestore cloud fallback note:', fsErr.message);
        }
      }

      // 3. Fallback to period-specific query if bundle is unavailable
      try {
        const fallbackRes = await axios.get(`${API_BASE}/api/staff/leaderboard?period=${period}`);
        if (fallbackRes.data) {
          setLeaderboardData(fallbackRes.data);
        }
      } catch (fbErr) {
        console.error('Failed to load staff leaderboard:', fbErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/staff/daily`);
      if (res.data && res.data.dailyHistory) {
        setDailyHistory(res.data.dailyHistory);
        try {
          localStorage.setItem('cobb_staff_daily_history_cache', JSON.stringify(res.data.dailyHistory));
        } catch (e) {}
      }
    } catch (err) {
      if (hasConfig && db) {
        try {
          const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
          const { doc, getDoc } = await import('firebase/firestore');
          const snap = await getDoc(doc(db, 'stores', storeId, 'data', 'staff_daily_history'));
          if (snap.exists() && snap.data().dailyHistory) {
            setDailyHistory(snap.data().dailyHistory);
          }
        } catch (fsErr) {
          console.debug('[StaffLeaderboard] Daily history cloud fallback note:', fsErr.message);
        }
      }
    }
  };

  const fetchConfig = async () => {
    try {
      const cached = localStorage.getItem('cobb_staff_config_cache');
      if (cached) setConfigForm(JSON.parse(cached));
    } catch (e) {}

    try {
      const res = await axios.get(`${API_BASE}/api/staff/config`, { timeout: 3000 });
      if (res.data) {
        setConfigForm(res.data);
        try {
          localStorage.setItem('cobb_staff_config_cache', JSON.stringify(res.data));
        } catch (e) {}
      }
    } catch (err) {
      if (hasConfig && db) {
        try {
          const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
          const { doc, getDoc } = await import('firebase/firestore');
          const snap = await getDoc(doc(db, 'stores', storeId, 'data', 'staff_config'));
          if (snap.exists()) {
            const raw = snap.data();
            const configData = raw.staffOverrides ? raw : (raw.staff || raw);
            setConfigForm(prev => ({ ...prev, ...configData }));
          }
        } catch (fsErr) {}
      }
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  useEffect(() => {
    fetchConfig();
    fetchDailyHistory();

    // Real-time Firestore sync for staff config (salesman names, overrides & targets)
    let unsubscribe = null;
    if (hasConfig && db) {
      try {
        const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
        import('firebase/firestore').then(({ doc, onSnapshot }) => {
          unsubscribe = onSnapshot(doc(db, 'stores', storeId, 'data', 'staff_config'), (snap) => {
            if (snap.exists()) {
              const raw = snap.data();
              const configData = raw.staffOverrides ? raw : (raw.staff || raw);
              if (configData) {
                setConfigForm(prev => ({ ...prev, ...configData }));
                try {
                  localStorage.setItem('cobb_staff_config_cache', JSON.stringify(configData));
                } catch (e) {}
              }
            }
          }, (err) => {
            console.debug('[StaffLeaderboard] Firestore config live listener note:', err.message);
          });
        }).catch(() => {});
      } catch (e) {}
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeStore]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await axios.post(`${API_BASE}/api/staff/config`, configForm);
      try {
        localStorage.setItem('cobb_staff_config_cache', JSON.stringify(configForm));
      } catch (e) {}

      // Backup config to Firestore if available
      if (hasConfig && db) {
        try {
          const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'stores', storeId, 'data', 'staff_config'), configForm, { merge: true });
        } catch (fsErr) {
          console.debug('[StaffLeaderboard] Firestore config backup note:', fsErr.message);
        }
      }

      if (addToast) addToast('Commission & Targets updated successfully!', 'success');
      setShowConfigModal(false);
      fetchLeaderboard(true);
    } catch (err) {
      if (addToast) addToast('Failed to save config: ' + err.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Explicit Save & Sync Day-to-Day Data action
  const handleSaveDailyData = async () => {
    setSavingDaily(true);
    try {
      // 1. Post to backend to guarantee disk file is saved
      const res = await axios.post(`${API_BASE}/api/staff/daily/save`, { dailyHistory });
      
      // 2. Also save into local storage
      try {
        localStorage.setItem('cobb_staff_daily_history_cache', JSON.stringify(dailyHistory));
      } catch (e) {}

      // 3. Backup to Firebase Firestore for phone link
      if (hasConfig && db) {
        try {
          const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'stores', storeId, 'data', 'staff_daily_history'), {
            totalDays: dailyHistory.length,
            dailyHistory,
            lastSavedAt: new Date().toISOString()
          }, { merge: true });
        } catch (fsErr) {
          console.debug('Firestore daily backup note:', fsErr.message);
        }
      }

      if (addToast) {
        addToast(`✅ Saved ${dailyHistory.length} days of staff records to local & cloud!`, 'success');
      }
    } catch (err) {
      console.error('Error saving daily data:', err);
      if (addToast) addToast('Failed to save day-to-day data: ' + err.message, 'error');
    } finally {
      setSavingDaily(false);
    }
  };

  // Open modal to assign or edit a salesman's name
  const handleOpenNameModal = (staffItem = null) => {
    if (staffItem) {
      const override = configForm.staffOverrides?.[staffItem.empCode];
      const isMissing = !override?.name?.trim() && Boolean(staffItem.isMissingName || staffItem.name?.startsWith('Staff #') || staffItem.name === 'Store Direct Billing' || staffItem.name === 'Store Counter / Unassigned');
      setNameForm({
        empCode: staffItem.empCode || '',
        name: override?.name?.trim() || (isMissing ? '' : staffItem.name),
        target: override?.target || staffItem.targetAmount || configForm.staffTarget || 400000,
        isCustomCode: false
      });
    } else {
      const unnamed = allDetectedStaffCodes.find(s => s.isMissingName);
      setNameForm({
        empCode: unnamed ? unnamed.empCode : (allDetectedStaffCodes[0]?.empCode || ''),
        name: '',
        target: configForm.staffTarget || 400000,
        isCustomCode: false
      });
    }
    setShowNameModal(true);
  };

  // Save new salesman name (Cloud-First & Resilient across Web, Phone Link & PC)
  const handleSaveSalesmanName = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!nameForm.empCode || !nameForm.name?.trim()) {
      if (addToast) addToast('Please enter both Employee Code and Salesman Name', 'error');
      return;
    }

    const cleanCode = String(nameForm.empCode).trim();
    const cleanName = String(nameForm.name).trim();
    const targetVal = parseInt(nameForm.target) || configForm.staffTarget || 400000;

    setSavingName(true);
    try {
      // 1. Immediately update local React config & localStorage
      const updatedOverrides = {
        ...(configForm.staffOverrides || {}),
        [cleanCode]: {
          name: cleanName,
          target: targetVal
        }
      };
      const updatedConfig = { ...configForm, staffOverrides: updatedOverrides };
      setConfigForm(updatedConfig);
      try {
        localStorage.setItem('cobb_staff_config_cache', JSON.stringify(updatedConfig));
      } catch (e) {}

      // 2. Immediately patch in-memory active leaderboard data
      if (leaderboardData && leaderboardData.staff) {
        const updatedStaff = leaderboardData.staff.map(s => {
          if (s.empCode === cleanCode) {
            return { ...s, name: cleanName, isMissingName: false, hasCustomOverride: true, targetAmount: targetVal };
          }
          return s;
        });
        setLeaderboardData({ ...leaderboardData, staff: updatedStaff });
      }

      // Also patch rawBundle for 0ms period switching
      let updatedBundle = null;
      if (rawBundle && rawBundle.periods) {
        const updatedPeriods = { ...rawBundle.periods };
        Object.keys(updatedPeriods).forEach(pKey => {
          if (updatedPeriods[pKey]?.staff) {
            updatedPeriods[pKey] = {
              ...updatedPeriods[pKey],
              staff: updatedPeriods[pKey].staff.map(s => {
                if (s.empCode === cleanCode) {
                  return { ...s, name: cleanName, isMissingName: false, hasCustomOverride: true, targetAmount: targetVal };
                }
                return s;
              })
            };
          }
        });
        updatedBundle = { ...rawBundle, periods: updatedPeriods };
        setRawBundle(updatedBundle);
        try {
          localStorage.setItem('cobb_staff_leaderboard_cache', JSON.stringify(updatedBundle));
        } catch (e) {}
      }

      // 3. Save to Firebase Firestore (Primary Cloud Database for Phone Link)
      if (hasConfig && db) {
        try {
          const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
          const { doc, setDoc } = await import('firebase/firestore');
          
          await setDoc(doc(db, 'stores', storeId, 'data', 'staff_config'), updatedConfig, { merge: true });
          
          if (updatedBundle && updatedBundle.periods) {
            await setDoc(doc(db, 'stores', storeId, 'data', 'staff_leaderboard'), {
              periods: updatedBundle.periods,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (fsErr) {
          console.warn('[StaffLeaderboard] Firestore save note:', fsErr.message);
        }
      }

      // 4. Also notify local backend if reachable (e.g. if on store PC or local network)
      try {
        await axios.post(`${API_BASE}/api/staff/set-name`, {
          empCode: cleanCode,
          name: cleanName,
          target: targetVal
        }, { timeout: 3000 });
      } catch (apiErr) {
        // Expected when user is outside the store network on mobile 4G / phone link
        console.log('[StaffLeaderboard] Local API sync note (saved to cloud):', apiErr.message);
      }

      if (addToast) {
        addToast(`✅ Salesman "${cleanName}" saved for Code ${cleanCode}!`, 'success');
      }

      setShowNameModal(false);
    } catch (err) {
      console.error('Failed to set salesman name:', err);
      if (addToast) addToast('Failed to save name: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSavingName(false);
    }
  };

  // Remove name override
  const handleRemoveNameOverride = async (empCode) => {
    const cleanCode = String(empCode).trim();
    try {
      const updatedOverrides = { ...(configForm.staffOverrides || {}) };
      delete updatedOverrides[cleanCode];
      const updatedConfig = { ...configForm, staffOverrides: updatedOverrides };
      setConfigForm(updatedConfig);
      try {
        localStorage.setItem('cobb_staff_config_cache', JSON.stringify(updatedConfig));
      } catch (e) {}

      if (hasConfig && db) {
        try {
          const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'stores', storeId, 'data', 'staff_config'), updatedConfig, { merge: true });
        } catch (fsErr) {}
      }

      try {
        await axios.delete(`${API_BASE}/api/staff/override/${cleanCode}`, { timeout: 3000 });
      } catch (apiErr) {
        console.log('[StaffLeaderboard] Local API delete override note:', apiErr.message);
      }

      if (addToast) addToast(`Reset override for Employee #${cleanCode}`, 'info');
    } catch (err) {
      if (addToast) addToast('Failed to remove override: ' + err.message, 'error');
    }
  };

  // Dynamically resolve staffList: ALWAYS override with configForm.staffOverrides if set
  const staffList = React.useMemo(() => {
    const rawList = leaderboardData?.staff || [];
    return rawList.map(s => {
      const override = configForm.staffOverrides?.[s.empCode];
      if (override?.name?.trim()) {
        const cleanName = override.name.trim();
        return {
          ...s,
          name: cleanName,
          isMissingName: false,
          hasCustomOverride: true,
          targetAmount: override.target || s.targetAmount || configForm.staffTarget || 400000
        };
      }
      return s;
    });
  }, [leaderboardData?.staff, configForm.staffOverrides, configForm.staffTarget]);

  // Dynamically resolve daily history with custom salesman names
  const mappedDailyHistory = React.useMemo(() => {
    if (!dailyHistory || !dailyHistory.length) return [];
    return dailyHistory.map(day => ({
      ...day,
      staff: (day.staff || []).map(s => {
        const override = configForm.staffOverrides?.[s.empCode];
        if (override?.name?.trim()) {
          return {
            ...s,
            name: override.name.trim(),
            isMissingName: false,
            hasCustomOverride: true
          };
        }
        return s;
      })
    }));
  }, [dailyHistory, configForm.staffOverrides]);

  const summary = leaderboardData?.summary || {};

  // Extract month-by-month historical data from bundle
  const availableMonths = rawBundle?.availableMonths || [];
  const monthlyHistory = rawBundle?.monthlyHistory || [];
  const availableDates = rawBundle?.availableDates || [];
  const selectedMonthObj = availableMonths.find(m => m.key === period);
  const isExactDate = /^\d{4}-\d{2}-\d{2}$/.test(period);
  const selectedDateObj = isExactDate ? mappedDailyHistory.find(d => d.date === period) : null;

  // Separate ranked named staff from unassigned direct counter
  const rankedStaff = staffList.filter(s => !s.isUnassigned);
  const unassignedSales = staffList.find(s => s.isUnassigned);

  const top1 = rankedStaff[0];
  const top2 = rankedStaff[1];
  const top3 = rankedStaff[2];

  // Helper to badge incentive slabs
  const getSlabBadge = (rate, slabLabel) => {
    if (rate >= 1.0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <Sparkles className="w-3 h-3 text-amber-500" />
          {slabLabel || '≥ 4L (1.0%)'}
        </span>
      );
    }
    if (rate >= 0.75) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
          <TrendingUp className="w-3 h-3 text-cyan-500" />
          {slabLabel || '≥ 3L (0.75%)'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
        {slabLabel || '≤ 2L (0.5%)'}
      </span>
    );
  };

  // Filter daily history
  const filteredDailyHistory = mappedDailyHistory.filter(day => {
    if (dailySearchQuery) {
      const q = dailySearchQuery.toLowerCase();
      const matchDate = day.formattedDate?.toLowerCase().includes(q) || day.date?.includes(q) || day.dayOfWeek?.toLowerCase().includes(q);
      const matchStaff = day.staff?.some(s => s.name?.toLowerCase().includes(q));
      if (!matchDate && !matchStaff) return false;
    }
    if (dailyFilterStaff !== 'ALL') {
      const hasStaff = day.staff?.some(s => s.empCode === dailyFilterStaff && s.sales > 0);
      if (!hasStaff) return false;
    }
    return true;
  });

  // Unique staff list for filter dropdown
  const allStaffOptions = [];
  mappedDailyHistory.forEach(day => {
    (day.staff || []).forEach(s => {
      if (!s.isUnassigned && !allStaffOptions.some(o => o.empCode === s.empCode)) {
        allStaffOptions.push({ empCode: s.empCode, name: s.name });
      }
    });
  });

  // Comprehensive list of all detected employee codes in store
  const allDetectedStaffCodes = React.useMemo(() => {
    const map = new Map();
    // 1. From active leaderboard
    staffList.forEach(s => {
      if (s.empCode) {
        const override = configForm.staffOverrides?.[s.empCode];
        const resolvedName = override?.name?.trim() || s.name;
        const isMissing = !override?.name?.trim() && Boolean(s.isMissingName || s.name?.startsWith('Staff #') || s.name === 'Store Direct Billing' || s.name === 'Store Counter / Unassigned');
        map.set(s.empCode, {
          empCode: s.empCode,
          name: resolvedName,
          isMissingName: isMissing,
          isUnassigned: Boolean(s.isUnassigned),
          sales: s.totalSales || 0
        });
      }
    });
    // 2. From daily history
    mappedDailyHistory.forEach(day => {
      (day.staff || []).forEach(s => {
        if (s.empCode && !map.has(s.empCode)) {
          const override = configForm.staffOverrides?.[s.empCode];
          const resolvedName = override?.name?.trim() || s.name;
          const isMissing = !override?.name?.trim() && Boolean(s.isMissingName || s.name?.startsWith('Staff #') || s.name === 'Store Direct Billing' || s.name === 'Store Counter / Unassigned');
          map.set(s.empCode, {
            empCode: s.empCode,
            name: resolvedName,
            isMissingName: isMissing,
            isUnassigned: Boolean(s.isUnassigned),
            sales: s.sales || 0
          });
        }
      });
    });
    // 3. From staff overrides in config
    if (configForm.staffOverrides) {
      Object.entries(configForm.staffOverrides).forEach(([code, obj]) => {
        if (obj?.name?.trim()) {
          const existing = map.get(code);
          if (existing) {
            existing.name = obj.name.trim();
            existing.isMissingName = false;
          } else {
            map.set(code, {
              empCode: code,
              name: obj.name.trim(),
              isMissingName: false,
              isUnassigned: code === '0000000',
              sales: 0
            });
          }
        }
      });
    }
    return Array.from(map.values());
  }, [staffList, mappedDailyHistory, configForm.staffOverrides]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Banner & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-6 rounded-3xl border border-amber-500/20 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
              <Trophy className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Sales Staff Leaderboard & Daily Records
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {rawBundle?.periods ? 'Cloud Synced' : 'Live Sync'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Calendar className="w-3 h-3 text-blue-500" />
              {dailyHistory.length} Days Recorded
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Salesperson attribution, day-to-day data persistence, and tiered commission payouts
            </p>
          </div>
        </div>

        {/* View Mode Switcher + Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs font-bold">
            <button
              onClick={() => setActiveView('leaderboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                activeView === 'leaderboard'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Leaderboard
            </button>
            <button
              onClick={() => setActiveView('daily_logs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                activeView === 'daily_logs'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Day-to-Day Data ({dailyHistory.length})
            </button>
          </div>

          {/* Save Day-to-Day Data Button */}
          <button
            onClick={handleSaveDailyData}
            disabled={savingDaily}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition"
            title="Save and backup all day-to-day staff data locally and to cloud"
          >
            <Save className={`w-3.5 h-3.5 ${savingDaily ? 'animate-bounce' : ''}`} />
            <span>{savingDaily ? 'Saving...' : 'Save Day Data'}</span>
          </button>

          {/* Add / Edit Salesman Name Button */}
          <button
            onClick={() => handleOpenNameModal()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm transition"
            title="Assign or add a salesman name to any employee code"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Salesman</span>
          </button>

          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            Targets & Slabs
          </button>

          <button
            onClick={() => {
              fetchLeaderboard(true);
              fetchDailyHistory();
            }}
            className="p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* INCENTIVE LOGIC & SLABS BANNER (User Rule Highlight) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900/5 dark:to-slate-900/40 p-4 sm:p-5 rounded-3xl border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl font-black text-sm flex items-center justify-center shadow">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Store Staff Incentive Structure
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                Target: ₹4,00,000 / month
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Tiered commission slabs automatically calculated on net apparel sales achieved
            </p>
          </div>
        </div>

        {/* The 3 Slabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-white/80 dark:bg-slate-900/80 border border-amber-500/30 p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
              1%
            </span>
            <div>
              <div className="font-black text-slate-900 dark:text-white">≥ ₹4,00,000</div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">1.0% Full Target</span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 border border-cyan-500/30 p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
            <span className="w-6 h-6 rounded-lg bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center">
              .75
            </span>
            <div>
              <div className="font-black text-slate-900 dark:text-white">≥ ₹3,00,000</div>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">0.75% High Tier</span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
            <span className="w-6 h-6 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-black text-xs flex items-center justify-center">
              .5
            </span>
            <div>
              <div className="font-black text-slate-900 dark:text-white">≤ ₹2,00,000</div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">0.5% Base Tier</span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: MAIN LEADERBOARD */}
      {activeView === 'leaderboard' && (
        <div className="space-y-6">
          {/* Timeframe Filters Bar */}
          <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Quick Rolling Periods */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'all_time', label: 'All Time' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    period === p.id
                      ? 'bg-amber-500 text-white font-bold shadow'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Historical Month Selector */}
            {availableMonths.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase px-1">
                  Months:
                </span>
                {availableMonths.map(m => {
                  const isSelected = period === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setPeriod(m.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
                        isSelected
                          ? 'bg-amber-500 text-white shadow'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>{m.shortLabel || m.label}</span>
                      <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                        isSelected ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {m.totalBills}b
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Date Selector Dropdown for Day-to-Day */}
            {dailyHistory.length > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  Day:
                </span>
                <select
                  value={isExactDate ? period : ''}
                  onChange={(e) => {
                    if (e.target.value) setPeriod(e.target.value);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="">Specific Day...</option>
                  {dailyHistory.slice(0, 30).map(d => (
                    <option key={d.date} value={d.date}>
                      {d.formattedDate} ({d.dayOfWeek?.slice(0, 3)}) - ₹{d.storeGrossSales?.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active Period Indicator Banner */}
          {(selectedMonthObj || selectedDateObj) && (
            <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1 shadow">
                  <Calendar className="w-4 h-4" />
                  {selectedDateObj ? 'DAY VIEW' : 'MONTH FILTER'}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {selectedDateObj
                        ? `${selectedDateObj.formattedDate} (${selectedDateObj.dayOfWeek}) Performance`
                        : `${selectedMonthObj.label} Performance & Leaderboard`}
                    </span>
                    <span className="text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">
                      {period}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Gross Store: <strong className="text-slate-700 dark:text-slate-200 font-bold">₹{(selectedDateObj ? selectedDateObj.storeGrossSales : selectedMonthObj.grossSales).toLocaleString('en-IN')}</strong> • {(selectedDateObj ? selectedDateObj.storeTotalBills : selectedMonthObj.totalBills)} bills • {(selectedDateObj ? selectedDateObj.storeTotalItems : selectedMonthObj.totalQuantity)} garments
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPeriod('all_time')}
                className="self-start sm:self-center text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Reset to All Time
              </button>
            </div>
          )}

          {/* KPI Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Active Associates</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {summary.activeStaffCount || rankedStaff.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Attributed to {summary.totalBills || 0} customer bills
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Staff Sales Volume</span>
                <Flame className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                ₹{Number(rankedStaff.reduce((sum, s) => sum + s.totalSales, 0)).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                {rankedStaff.reduce((sum, s) => sum + s.totalItems, 0)} garments sold
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Incentive Accrued</span>
                <Percent className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                ₹{Number(summary.totalCommissionAccrued || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Slab rates (0.5% - 1.0%)
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Avg Ticket (AOV)</span>
                <ShoppingBag className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                ₹{Number(summary.avgStoreBasketValue || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Storewide per-transaction ticket
              </div>
            </div>
          </div>

          {/* Gamified Podium (Top 3 Performers) */}
          {rankedStaff.length > 0 && (
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Trophy className="w-64 h-64 text-amber-400" />
              </div>

              <div className="relative z-10 mb-6">
                <span className="text-xs font-black tracking-widest uppercase text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                  🏆 Top Performers Podium
                </span>
                <h2 className="text-xl font-black mt-2">
                  Hall of Fame & Top Commission Earners
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
                {/* Rank 2 (Silver) */}
                {top2 ? (
                  <div className="order-2 md:order-1 bg-slate-800/60 border border-slate-700/80 rounded-3xl p-5 flex flex-col items-center text-center relative hover:border-slate-500 transition group">
                    <div className="w-14 h-14 rounded-2xl bg-slate-300 text-slate-900 font-black text-xl flex items-center justify-center shadow-lg border-2 border-white mb-3">
                      2
                    </div>
                    <span className="text-xs font-bold text-slate-300 bg-slate-700/80 px-2.5 py-0.5 rounded-full mb-1">
                      🥈 Silver Star
                    </span>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <h3 className="text-lg font-bold text-white">{top2.name}</h3>
                      <button
                        onClick={() => handleOpenNameModal(top2)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white transition"
                        title={top2.isMissingName ? "Add Salesman Name" : "Edit Salesman Name"}
                      >
                        {top2.isMissingName ? <UserPlus className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> : <Edit3 className="w-3 h-3" />}
                      </button>
                    </div>
                    {top2.isMissingName && (
                      <button
                        onClick={() => handleOpenNameModal(top2)}
                        className="mb-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ Add Salesman Name</span>
                      </button>
                    )}
                    <p className="text-xs text-slate-400 mb-2 font-mono">Code: {top2.empCode}</p>
                    <div className="mb-3">
                      {getSlabBadge(top2.commissionRate, top2.incentiveSlab)}
                    </div>

                    <div className="w-full bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Sales:</span>
                        <span className="font-bold text-white">₹{top2.totalSales.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Incentive ({top2.commissionRate}%):</span>
                        <span className="font-bold text-emerald-400">₹{top2.totalPayout.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Target:</span>
                        <span className="font-bold text-amber-400">{top2.achievementPct}%</span>
                      </div>
                    </div>
                  </div>
                ) : <div className="order-2 md:order-1" />}

                {/* Rank 1 (Gold Champion) */}
                {top1 ? (
                  <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/20 via-slate-800/90 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 flex flex-col items-center text-center relative shadow-2xl shadow-amber-500/20 hover:scale-[1.02] transition transform duration-200 group">
                    <div className="absolute -top-4 bg-amber-500 text-slate-950 p-2 rounded-full shadow-lg">
                      <Crown className="w-6 h-6 fill-current" />
                    </div>
                    <div className="w-18 h-18 rounded-3xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-xl border-4 border-amber-300 mt-2 mb-3">
                      1
                    </div>
                    <span className="text-xs font-black text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/40 mb-1">
                      👑 Store Champion
                    </span>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <h3 className="text-xl font-black text-white">{top1.name}</h3>
                      <button
                        onClick={() => handleOpenNameModal(top1)}
                        className="p-1 rounded-lg text-amber-300 hover:bg-white/10 transition"
                        title={top1.isMissingName ? "Add Salesman Name" : "Edit Salesman Name"}
                      >
                        {top1.isMissingName ? <UserPlus className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> : <Edit3 className="w-3 h-3 text-slate-400 hover:text-white" />}
                      </button>
                    </div>
                    {top1.isMissingName && (
                      <button
                        onClick={() => handleOpenNameModal(top1)}
                        className="mb-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ Add Salesman Name</span>
                      </button>
                    )}
                    <p className="text-xs text-amber-200/70 mb-2 font-mono">Code: {top1.empCode}</p>
                    <div className="mb-4">
                      {getSlabBadge(top1.commissionRate, top1.incentiveSlab)}
                    </div>

                    <div className="w-full bg-slate-950/80 p-4 rounded-2xl border border-amber-500/30 space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Total Sales:</span>
                        <span className="text-base font-black text-amber-400">₹{top1.totalSales.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Incentive ({top1.commissionRate}%):</span>
                        <span className="font-black text-emerald-400">₹{top1.totalPayout.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Target Reached:</span>
                        <span className="font-bold text-white">{top1.achievementPct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full"
                          style={{ width: `${Math.min(top1.achievementPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : <div className="order-1 md:order-2" />}

                {/* Rank 3 (Bronze) */}
                {top3 ? (
                  <div className="order-3 bg-slate-800/60 border border-slate-700/80 rounded-3xl p-5 flex flex-col items-center text-center relative hover:border-slate-500 transition group">
                    <div className="w-14 h-14 rounded-2xl bg-amber-700/80 text-white font-black text-xl flex items-center justify-center shadow-lg border-2 border-amber-600 mb-3">
                      3
                    </div>
                    <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full mb-1">
                      🥉 Star Associate
                    </span>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <h3 className="text-lg font-bold text-white">{top3.name}</h3>
                      <button
                        onClick={() => handleOpenNameModal(top3)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white transition"
                        title={top3.isMissingName ? "Add Salesman Name" : "Edit Salesman Name"}
                      >
                        {top3.isMissingName ? <UserPlus className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> : <Edit3 className="w-3 h-3" />}
                      </button>
                    </div>
                    {top3.isMissingName && (
                      <button
                        onClick={() => handleOpenNameModal(top3)}
                        className="mb-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ Add Salesman Name</span>
                      </button>
                    )}
                    <p className="text-xs text-slate-400 mb-2 font-mono">Code: {top3.empCode}</p>
                    <div className="mb-3">
                      {getSlabBadge(top3.commissionRate, top3.incentiveSlab)}
                    </div>

                    <div className="w-full bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Sales:</span>
                        <span className="font-bold text-white">₹{top3.totalSales.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Incentive ({top3.commissionRate}%):</span>
                        <span className="font-bold text-emerald-400">₹{top3.totalPayout.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Target:</span>
                        <span className="font-bold text-amber-400">{top3.achievementPct}%</span>
                      </div>
                    </div>
                  </div>
                ) : <div className="order-3" />}
              </div>
            </div>
          )}

          {/* Main Leaderboard Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Full Sales Staff Performance Matrix
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  {rankedStaff.length} Associates
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Incentive: 400k (1%) • 300k (0.75%) • ≤ 200k (0.5%)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Rank & Associate</th>
                    <th className="px-6 py-3.5">Total Sales</th>
                    <th className="px-6 py-3.5">Target Progress</th>
                    <th className="px-6 py-3.5">Bills & Units</th>
                    <th className="px-6 py-3.5">AOV / Basket</th>
                    <th className="px-6 py-3.5">Incentive Slab</th>
                    <th className="px-6 py-3.5 text-right">Incentive Payout</th>
                    <th className="px-6 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rankedStaff.map((staff, idx) => (
                    <tr
                      key={staff.empCode}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            idx === 0 ? 'bg-amber-400 text-slate-950 font-bold' :
                            idx === 1 ? 'bg-slate-300 text-slate-900' :
                            idx === 2 ? 'bg-amber-700 text-white' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-normal">
                                ({staff.empCode})
                              </span>
                              <button
                                onClick={() => handleOpenNameModal(staff)}
                                className={`p-1 rounded-lg transition ${
                                  staff.isMissingName
                                    ? 'text-amber-500 hover:bg-amber-500/10'
                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                                title={staff.isMissingName ? "Add Salesman Name" : "Edit Salesman Name"}
                              >
                                {staff.isMissingName ? (
                                  <UserPlus className="w-3.5 h-3.5" />
                                ) : (
                                  <Edit3 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            {staff.isMissingName ? (
                              <button
                                onClick={() => handleOpenNameModal(staff)}
                                className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold transition shadow-sm"
                              >
                                <UserPlus className="w-2.5 h-2.5" />
                                <span>No salesman name listed • Click to Add</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 mt-0.5">
                                {staff.topCategories?.slice(0, 2).map((c, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                  >
                                    {c.category}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-base">
                        ₹{staff.totalSales.toLocaleString('en-IN')}
                      </td>

                      <td className="px-6 py-4">
                        <div className="w-36">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {staff.achievementPct}%
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              of ₹{staff.targetAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                staff.achievementPct >= 100
                                  ? 'bg-emerald-500'
                                  : staff.achievementPct >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(staff.achievementPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {staff.billCount} bills
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {staff.totalItems} items ({staff.upt} UPT)
                        </div>
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                        ₹{staff.aov.toLocaleString('en-IN')}
                      </td>

                      <td className="px-6 py-4">
                        {getSlabBadge(staff.commissionRate, staff.incentiveSlab)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                          ₹{staff.totalPayout.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          at {staff.commissionRate}% rate
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {staff.isMissingName && (
                            <button
                              onClick={() => handleOpenNameModal(staff)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm transition flex items-center gap-1"
                              title="Add salesman name for this associate"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Add Name</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedStaff(staff)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Unassigned Counter Sales Row */}
                  {unassignedSales && (
                    <tr className="bg-slate-50/70 dark:bg-slate-800/30 text-slate-500">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">
                            POS
                          </div>
                          <div>
                            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                              <span>{unassignedSales.name}</span>
                              <button
                                onClick={() => handleOpenNameModal(unassignedSales)}
                                className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                                title="Assign a salesman name to direct counter code"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Assign Name</span>
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Direct counter sales without staff tag ({unassignedSales.empCode})
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                        ₹{unassignedSales.totalSales.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">General Counter</td>
                      <td className="px-6 py-4 text-xs">
                        {unassignedSales.billCount} bills ({unassignedSales.totalItems} items)
                      </td>
                      <td className="px-6 py-4 text-xs font-bold">
                        ₹{unassignedSales.aov.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">N/A (Store POS)</td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-slate-400">₹0</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedStaff(unassignedSales)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DAY-TO-DAY DATA & PERSISTENT HISTORY LOGS */}
      {activeView === 'daily_logs' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap flex-1">
              {/* Search by date or keyword */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search date (e.g. 01 Oct, Sep, Thu)..."
                  value={dailySearchQuery}
                  onChange={(e) => setDailySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Filter by Staff Member */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={dailyFilterStaff}
                  onChange={(e) => setDailyFilterStaff(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="ALL">All Sales Associates</option>
                  {allStaffOptions.map(o => (
                    <option key={o.empCode} value={o.empCode}>
                      {o.name} ({o.empCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">
                Showing {filteredDailyHistory.length} of {dailyHistory.length} days
              </span>
              <button
                onClick={handleSaveDailyData}
                disabled={savingDaily}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save to Disk & Cloud</span>
              </button>
            </div>
          </div>

          {/* Daily Cards / Records Grid */}
          <div className="space-y-3">
            {filteredDailyHistory.map(day => {
              const isExpanded = expandedDayKey === day.date;
              const namedStaffOnDay = (day.staff || []).filter(s => !s.isUnassigned);

              return (
                <div
                  key={day.date}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition shadow-sm ${
                    day.date === period
                      ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Day Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-center min-w-[56px]">
                        <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 block">
                          {day.dayOfWeek?.slice(0, 3)}
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-white leading-tight block">
                          {day.day}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900 dark:text-white">
                            {day.formattedDate}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {day.date}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span>Store Gross: <strong className="text-slate-800 dark:text-slate-200 font-bold">₹{day.storeGrossSales?.toLocaleString('en-IN')}</strong></span>
                          <span>•</span>
                          <span>{day.storeTotalBills} bills ({day.storeTotalItems} items)</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Champion Associate of the Day */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {day.topStaff ? (
                        <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                          <Crown className="w-4 h-4 text-amber-500" />
                          <div className="text-xs">
                            <span className="font-black text-slate-900 dark:text-white block">
                              {day.topStaff.name}: ₹{day.topStaff.sales?.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              +₹{day.topStaff.commission} incentive ({day.topStaff.commissionRate}%)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          POS Counter Direct Billing
                        </span>
                      )}

                      {/* Right Action buttons */}
                      <button
                        onClick={() => {
                          setPeriod(day.date);
                          setActiveView('leaderboard');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1"
                      >
                        <span>Leaderboard</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setExpandedDayKey(isExpanded ? null : day.date)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                        title="Toggle Staff Breakdown"
                      >
                        <ChevronDown className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Staff Performance Breakdown on this day */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-2 mb-1">
                        <span>Associate Breakdown for {day.formattedDate}</span>
                        <span>Daily Target: ₹13,333 / associate</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {day.staff.map((s, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex flex-col justify-between ${
                              s.isUnassigned
                                ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-2">
                              <div>
                                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                                  {s.rank && <span className="text-amber-500">#{s.rank}</span>}
                                  {s.name}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {s.bills} bills • {s.items} items
                                </span>
                              </div>
                              {!s.isUnassigned && getSlabBadge(s.commissionRate, s.slabLabel)}
                            </div>

                            <div className="flex justify-between items-baseline pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                              <span className="font-black text-slate-900 dark:text-white text-sm">
                                ₹{s.sales.toLocaleString('en-IN')}
                              </span>
                              {!s.isUnassigned ? (
                                <span className="font-black text-emerald-600 dark:text-emerald-400">
                                  ₹{s.commission} ({s.commissionRate}%)
                                </span>
                              ) : (
                                <span className="text-slate-400 font-semibold text-[11px]">POS Counter</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredDailyHistory.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
                  No Daily Records Found
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Try adjusting your search query or associate filter
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff Drill-Down Modal */}
      {selectedStaff && (() => {
        const override = configForm.staffOverrides?.[selectedStaff.empCode];
        const staffName = override?.name?.trim() || selectedStaff.name;
        const isMissing = !override?.name?.trim() && selectedStaff.isMissingName;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {staffName}
                    {selectedStaff.badge && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        {selectedStaff.badge}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-500 font-mono">
                      Employee ID: {selectedStaff.empCode}
                    </p>
                    <button
                      onClick={() => {
                        const staffToEdit = { ...selectedStaff, name: staffName, isMissingName: isMissing };
                        setSelectedStaff(null);
                        handleOpenNameModal(staffToEdit);
                      }}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isMissing ? 'Assign Name' : 'Edit Name'}</span>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Revenue</span>
                    <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      ₹{selectedStaff.totalSales.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Incentive Payout</span>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      ₹{selectedStaff.totalPayout.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                      {selectedStaff.commissionRate}% rate ({selectedStaff.incentiveSlab})
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Top Product Categories Sold
                  </h4>
                  <div className="space-y-2">
                    {selectedStaff.topCategories && selectedStaff.topCategories.length > 0 ? (
                      selectedStaff.topCategories.map((cat, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {cat.category}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">{cat.qty} pcs</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              ₹{cat.sales.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">No category data recorded</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-right">
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Manage Salesman Names Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Assign Salesman Name
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add or update salesman names for employee codes on the leaderboard
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNameModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Form */}
              <form onSubmit={handleSaveSalesmanName} className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Employee Code
                  </label>
                  {!nameForm.isCustomCode ? (
                    <div className="space-y-2">
                      <select
                        value={nameForm.empCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__custom__') {
                            setNameForm({ ...nameForm, empCode: '', isCustomCode: true });
                          } else {
                            const found = allDetectedStaffCodes.find(s => s.empCode === val);
                            const isMissing = found?.isMissingName || found?.name?.startsWith('Staff #') || found?.name === 'Store Direct Billing';
                            setNameForm({
                              ...nameForm,
                              empCode: val,
                              name: isMissing ? '' : (found?.name || '')
                            });
                          }
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                      >
                        <option value="">-- Select Employee Code from POS --</option>
                        {allDetectedStaffCodes.map(s => (
                          <option key={s.empCode} value={s.empCode}>
                            Code {s.empCode} {s.isMissingName ? '⚠️ (No Name Listed)' : `— ${s.name}`}
                          </option>
                        ))}
                        <option value="__custom__">➕ Type Custom / New Employee Code...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 2800003 or 3200014"
                          value={nameForm.empCode}
                          onChange={(e) => setNameForm({ ...nameForm, empCode: e.target.value })}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setNameForm({ ...nameForm, isCustomCode: false, empCode: allDetectedStaffCodes[0]?.empCode || '' })}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                        >
                          Pick from List
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400">Enter the numeric code printed on employee POS bills</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Salesman Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikas, Pawan, Simran, Akhil..."
                    value={nameForm.name}
                    onChange={(e) => setNameForm({ ...nameForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <span className="text-[11px] text-slate-500">This name will display on the leaderboard, top podium, and day-to-day reports.</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Monthly Sales Target (₹)
                  </label>
                  <input
                    type="number"
                    value={nameForm.target || 400000}
                    onChange={(e) => setNameForm({ ...nameForm, target: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400">Default store benchmark is ₹4,00,000 / month</span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNameModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingName}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    {savingName ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Salesman Name</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Directory of Detected Staff Codes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    <span>Store Sales Staff Directory ({allDetectedStaffCodes.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">1-click to rename</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  {allDetectedStaffCodes.map(s => {
                    const isNamed = !s.isMissingName;
                    return (
                      <div
                        key={s.empCode}
                        className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isNamed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}>
                            {isNamed ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{s.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({s.empCode})
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {isNamed ? '✓ Salesman name registered' : '⚠️ No salesman name listed'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              handleOpenNameModal(s);
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              s.isMissingName
                                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{s.isMissingName ? '+ Add Name' : 'Edit'}</span>
                          </button>

                          {configForm.staffOverrides?.[s.empCode] && (
                            <button
                              onClick={() => handleRemoveNameOverride(s.empCode)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition"
                              title="Reset Name Override"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target & Commission Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Commission & Target Settings
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Monthly Store Target (₹)
                </label>
                <input
                  type="number"
                  value={configForm.monthlyStoreTarget || 400000}
                  onChange={(e) => setConfigForm({ ...configForm, monthlyStoreTarget: parseInt(e.target.value) || 0, staffTarget: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-slate-500">Active monthly baseline target (e.g. ₹4,00,000)</span>
              </div>

              {/* Slabs summary */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Active Incentive Slabs:
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">≥ ₹4,00,000 (Target Met)</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">1.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">≥ ₹3,00,000 (75% Target)</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">0.75%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">≤ ₹2,00,000 (Base Tier)</span>
                    <span className="font-bold text-slate-600 dark:text-slate-300">0.5%</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                >
                  {savingConfig ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
