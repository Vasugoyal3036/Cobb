import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Scissors,
  Search,
  Plus,
  Calendar,
  User,
  Phone,
  CheckCircle,
  Clock,
  Trash2,
  Printer,
  RefreshCw,
  AlertTriangle,
  Send,
  Copy,
  Check,
  Filter,
  X,
  Sparkles,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
  Tag,
  Zap
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import AlterationSlipModal from '../AlterationSlipModal';

export default function AlterationsTab({
  darkMode = true,
  activeStore = 'DEMO_STORE_001',
  API_BASE = 'http://localhost:5000',
  formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  openThermalModal
}) {
  const [alterations, setAlterations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [noticeMessage, setNoticeMessage] = useState(null);

  // Timezone-safe local date string helper (YYYY-MM-DD)
  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getLocalDateString(0), []);
  const yesterdayStr = useMemo(() => getLocalDateString(-1), []);

  // Filter States (default to 'active' pipeline to match dashboard tile!)
  const [dateFilter, setDateFilter] = useState('active'); // 'active' | 'today' | 'yesterday' | 'custom' | 'all'
  const [customDate, setCustomDate] = useState(getLocalDateString(0));
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Pending' | 'In Progress' | 'Ready for Pickup' | 'Completed'
  const [tailorFilter, setTailorFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Load Alterations from Node API + Firestore real-time sync
  const fetchAlterations = useCallback(async () => {
    setLoading(true);
    let loadedFromApi = false;
    const targetStore = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;

    // Safety fallback to clear loading spinner
    const timer = setTimeout(() => setLoading(false), 2500);

    // 1. Try local API first for fast data
    try {
      const res = await axios.get(`${API_BASE}/api/alterations?storeId=${targetStore}`);
      const rawData = res.data;
      const items = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.items) ? rawData.items : null);
      if (items && items.length > 0) {
        setAlterations(items);
        loadedFromApi = true;
        setLoading(false);
      }
    } catch (apiErr) {
      console.warn('[Alterations] API fetch note:', apiErr.message);
    }

    // 2. Real-time Firestore synchronization (always active when db available)
    if (db) {
      try {
        const alterationsRef = collection(db, `stores/${targetStore}/alterations`);
        const q = query(alterationsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const slips = [];
          snapshot.forEach((d) => {
            const data = d.data();
            slips.push({
              id: d.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
            });
          });
          if (slips.length > 0 || !loadedFromApi) {
            setAlterations(slips);
          }
          setLoading(false);
          clearTimeout(timer);
        }, (err) => {
          console.error('[Alterations] Firestore listener error:', err);
          setLoading(false);
          clearTimeout(timer);
        });

        return unsubscribe;
      } catch (fsErr) {
        console.warn('[Alterations] Firestore fallback error:', fsErr);
        setLoading(false);
        clearTimeout(timer);
      }
    } else {
      setLoading(false);
      clearTimeout(timer);
    }
  }, [API_BASE, activeStore]);

  useEffect(() => {
    const unsubPromise = fetchAlterations();
    return () => {
      if (typeof unsubPromise === 'function') unsubPromise();
      else if (unsubPromise?.then) unsubPromise.then(unsub => typeof unsub === 'function' && unsub());
    };
  }, [fetchAlterations]);

  // Derived filter options
  const tailors = useMemo(() => {
    return ['all', ...new Set(alterations.map(a => a.tailorName).filter(Boolean))];
  }, [alterations]);

  const categories = useMemo(() => {
    return ['all', ...new Set(alterations.map(a => a.category).filter(Boolean))];
  }, [alterations]);

  // Filtered Alterations List
  const filteredAlterations = useMemo(() => {
    return alterations.filter((slip) => {
      // 1. Date / Pipeline Filter
      const createdDate = slip.createdAt ? slip.createdAt.split('T')[0] : '';
      const expDate = slip.expectedDate || '';

      if (dateFilter === 'active') {
        if (slip.status === 'Completed') return false;
      } else if (dateFilter === 'today') {
        if (createdDate !== todayStr && expDate !== todayStr) return false;
      } else if (dateFilter === 'yesterday') {
        if (createdDate !== yesterdayStr && expDate !== yesterdayStr) return false;
      } else if (dateFilter === 'custom') {
        if (createdDate !== customDate && expDate !== customDate) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        if ((slip.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      // 3. Tailor Filter
      if (tailorFilter !== 'all') {
        if ((slip.tailorName || '').toLowerCase() !== tailorFilter.toLowerCase()) return false;
      }

      // 4. Category Filter
      if (categoryFilter !== 'all') {
        if ((slip.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (slip.customerName || '').toLowerCase().includes(q);
        const matchPhone = (slip.phone || '').includes(q);
        const matchToken = (slip.tokenNumber || slip.id || '').toLowerCase().includes(q);
        const matchTailor = (slip.tailorName || '').toLowerCase().includes(q);
        const matchCat = (slip.category || '').toLowerCase().includes(q);
        const matchInst = (slip.instructions || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchToken && !matchTailor && !matchCat && !matchInst) {
          return false;
        }
      }

      return true;
    });
  }, [alterations, dateFilter, customDate, todayStr, yesterdayStr, statusFilter, tailorFilter, categoryFilter, searchQuery]);

  // KPI Metrics Summary (100% synchronized with Dashboard Tile metrics)
  const summaryKpis = useMemo(() => {
    // 1. GLOBAL STORE PIPELINE (Matches dashboard tile numbers directly)
    const allActive = alterations.filter(s => s.status !== 'Completed');
    const globalPending = alterations.filter(s => s.status === 'Pending' || s.status === 'In Progress').length;
    const globalReady = alterations.filter(s => s.status === 'Ready for Pickup').length;
    const globalCompleted = alterations.filter(s => s.status === 'Completed').length;
    const activeUnits = allActive.reduce((acc, s) => acc + (parseInt(s.quantity, 10) || 1), 0);

    const dueTodayCount = alterations.filter(s => 
      s.expectedDate === todayStr && s.status !== 'Completed'
    ).length;

    const overdueCount = alterations.filter(s => 
      s.expectedDate && s.expectedDate < todayStr && s.status !== 'Completed'
    ).length;

    // 2. CURRENT FILTERED VIEW
    const totalCount = filteredAlterations.length;
    const totalUnits = filteredAlterations.reduce((acc, s) => acc + (parseInt(s.quantity, 10) || 1), 0);

    return {
      activeCount: allActive.length,
      activeUnits,
      globalPending,
      globalReady,
      globalCompleted,
      dueTodayCount,
      overdueCount,
      totalCount,
      totalUnits
    };
  }, [alterations, filteredAlterations, todayStr]);

  // Status Update Handler
  const updateStatus = async (slipId, newStatus) => {
    try {
      // 1. Update local API
      try {
        await axios.put(`${API_BASE}/api/alterations/${slipId}`, { status: newStatus });
      } catch (e) {
        console.warn('API status update note:', e.message);
      }

      // 2. Update Firestore
      if (db) {
        try {
          const targetStore = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
          const docRef = doc(db, `stores/${targetStore}/alterations`, slipId);
          await updateDoc(docRef, { 
            status: newStatus,
            ...(newStatus === 'Completed' ? { completedAt: new Date().toISOString() } : {})
          });
        } catch (fsErr) {
          console.warn('Firestore status note:', fsErr.message);
        }
      }

      // 3. Update React state immediately
      setAlterations(prev => prev.map(s => (s.id === slipId || s.tokenNumber === slipId) ? { ...s, status: newStatus } : s));

      setNoticeMessage(`✅ Alteration #${slipId} updated to "${newStatus}"`);
      setTimeout(() => setNoticeMessage(null), 3000);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Delete Slip Handler
  const deleteSlip = async (slipId) => {
    if (!window.confirm(`Are you sure you want to delete Alteration #${slipId}?`)) return;
    try {
      try {
        await axios.delete(`${API_BASE}/api/alterations/${slipId}`);
      } catch (e) {
        console.warn('API delete note:', e.message);
      }

      if (db) {
        try {
          const targetStore = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
          const docRef = doc(db, `stores/${targetStore}/alterations`, slipId);
          await deleteDoc(docRef);
        } catch (fsErr) {
          console.warn('Firestore delete note:', fsErr.message);
        }
      }

      setAlterations(prev => prev.filter(s => s.id !== slipId && s.tokenNumber !== slipId));
      setNoticeMessage(`🗑️ Alteration #${slipId} deleted.`);
      setTimeout(() => setNoticeMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting slip:', err);
    }
  };

  // Copy token number
  const handleCopyToken = (token) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // WhatsApp Alert dispatch for customer pickup
  const handleSendWhatsAppNotification = (slip) => {
    const cleanPhone = (slip.phone || '').replace(/[^0-9]/g, '');
    const message = `Greetings from *Cobb Garments, Pundri*! ✂️\n\n` +
      `Dear *${slip.customerName}*,\n` +
      `Your alteration job for *${slip.category}* (Token *#${slip.tokenNumber || slip.id}*) is now *READY FOR PICKUP*! 🎉\n\n` +
      `📍 *Store:* Cobb Italy, Pundri\n` +
      `Please bring your token slip or show this message at the counter.\n\n` +
      `Thank you for choosing Cobb! 😊`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className={`p-4 md:p-6 lg:p-8 animate-in fade-in duration-300 max-w-7xl mx-auto space-y-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      
      {/* Toast Notification Banner */}
      {noticeMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* HEADER SECTION (Matching LiveBillsTab) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                Alterations & Tailor Desk
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                Daily garment alterations, tailoring jobs, deadlines & WhatsApp pickup alerts
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions: Refresh + New Slip */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAlterations}
            disabled={loading}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              darkMode
                ? 'bg-[#131622] border-[#2e3342] text-slate-300 hover:text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
            }`}
            title="Refresh Alterations Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Alteration Slip</span>
          </button>
        </div>
      </div>

      {/* FILTER & DATE CONTROLS TOOLBAR (Identical to LiveBillsTab) */}
      <div
        className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3.5 transition-all ${
          darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {/* Left: Date Preset Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setDateFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dateFilter === 'active'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : darkMode
                ? 'bg-[#171b26] text-slate-300 hover:text-white border border-[#2e3342]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Active Pipeline</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              dateFilter === 'active' ? 'bg-indigo-500 text-white' : 'bg-slate-700/60 text-slate-300'
            }`}>
              {summaryKpis.activeCount}
            </span>
          </button>

          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : darkMode
                ? 'bg-[#171b26] text-slate-300 hover:text-white border border-[#2e3342]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today's Jobs
          </button>

          <button
            onClick={() => setDateFilter('yesterday')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilter === 'yesterday'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : darkMode
                ? 'bg-[#171b26] text-slate-300 hover:text-white border border-[#2e3342]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Yesterday
          </button>

          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : darkMode
                ? 'bg-[#171b26] text-slate-300 hover:text-white border border-[#2e3342]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Orders ({alterations.length})
          </button>

          {/* Custom Date Picker */}
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[11px] font-bold text-slate-400">Date:</span>
            <div className="relative">
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setDateFilter('custom');
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border focus:outline-none transition cursor-pointer ${
                  dateFilter === 'custom'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                    : darkMode
                    ? 'bg-[#171b26] border-[#2e3342] text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Right: Dropdown Filters & Search */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              darkMode
                ? 'bg-[#171b26] border-[#2e3342] text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">⚡ All Status</option>
            <option value="Pending">⏳ Pending</option>
            <option value="In Progress">🧵 In Progress</option>
            <option value="Ready for Pickup">📦 Ready for Pickup</option>
            <option value="Completed">✅ Completed</option>
          </select>

          {/* Tailor Dropdown */}
          <select
            value={tailorFilter}
            onChange={(e) => setTailorFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              darkMode
                ? 'bg-[#171b26] border-[#2e3342] text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">✂️ All Tailors</option>
            {tailors.filter(t => t !== 'all').map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Name, Phone, Token..."
              className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none transition w-full sm:w-52 ${
                darkMode
                  ? 'bg-[#171b26] border-[#2e3342] text-white focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* KPI METRICS SUMMARY BAR (100% Synced with Dashboard Tile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Active Pipeline Work Orders */}
        <div
          className={`p-4 rounded-2xl border transition ${
            darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Pipeline
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white">
            {summaryKpis.activeCount} <span className="text-xs font-semibold text-slate-400">active jobs</span>
          </div>
          <div className="text-[11px] mt-1 font-medium text-slate-400">
            {summaryKpis.activeUnits} garments in queue • {summaryKpis.totalCount} in view
          </div>
        </div>

        {/* Card 2: Due Today / Urgent Deadlines */}
        <div
          className={`p-4 rounded-2xl border transition ${
            summaryKpis.overdueCount > 0
              ? (darkMode ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50/60 border-rose-200 shadow-sm')
              : (darkMode ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50/60 border-amber-200 shadow-sm')
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              summaryKpis.overdueCount > 0 ? 'text-rose-400' : 'text-amber-400'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5" /> Due & Overdue
            </span>
            <div className={`p-2 rounded-xl ${summaryKpis.overdueCount > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${summaryKpis.overdueCount > 0 ? 'text-rose-400' : 'text-amber-400'}`}>
            {summaryKpis.dueTodayCount} <span className="text-xs font-semibold text-slate-400">due today</span>
          </div>
          <div className="text-[11px] mt-1 font-medium text-slate-400">
            {summaryKpis.overdueCount > 0 ? (
              <span className="text-rose-400 font-bold">⚠️ {summaryKpis.overdueCount} jobs past promised date</span>
            ) : (
              'All tailoring deadlines on schedule'
            )}
          </div>
        </div>

        {/* Card 3: Ready for Pickup */}
        <div
          className={`p-4 rounded-2xl border transition ${
            darkMode ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50/60 border-blue-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" /> Ready for Pickup
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-400">
            {summaryKpis.globalReady} <span className="text-xs font-semibold text-slate-400">parcels</span>
          </div>
          <div className="text-[11px] mt-1 font-medium text-blue-300/80">
            Finished by tailor, awaiting customer visit
          </div>
        </div>

        {/* Card 4: Tailor Workshop Queue */}
        <div
          className={`p-4 rounded-2xl border transition ${
            darkMode ? 'bg-indigo-950/20 border-indigo-900/40' : 'bg-indigo-50/60 border-indigo-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Tailor Workshop
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {summaryKpis.globalPending} <span className="text-xs font-semibold text-slate-400">cutting/stitching</span>
          </div>
          <div className="text-[11px] mt-1 font-medium text-indigo-400/80">
            {summaryKpis.globalCompleted} completed historically
          </div>
        </div>
      </div>

      {/* DETAILED ALTERATIONS TABLE (Matching LiveBillsTab Table Style) */}
      <div
        className={`rounded-2xl border shadow-sm overflow-hidden ${
          darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead
              className={`text-[10px] uppercase font-bold tracking-wider border-b ${
                darkMode ? 'bg-slate-900/60 text-slate-400 border-[#222736]' : 'bg-slate-50 text-slate-500 border-slate-100'
              }`}
            >
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Token & Date</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Customer Details</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Garment & Instructions</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Assigned Tailor</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-center">Expected By</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-center">Status</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-[#1e2333]' : 'divide-slate-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                      <span>Loading alteration slips...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAlterations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-14 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3">
                      <Scissors className="w-7 h-7" />
                    </div>
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                      No alteration slips found for this period.
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Change the date filter or tap "New Alteration Slip" to create one.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAlterations.map((slip) => {
                  const token = slip.tokenNumber || slip.id;
                  const isOverdue = slip.expectedDate && slip.expectedDate < todayStr && slip.status !== 'Completed';
                  const isDueToday = slip.expectedDate === todayStr && slip.status !== 'Completed';

                  return (
                    <tr
                      key={slip.id}
                      className={`transition-colors ${
                        darkMode ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Token & Created Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                            {token}
                          </span>
                          <button
                            onClick={() => handleCopyToken(token)}
                            className="text-slate-400 hover:text-white transition p-1"
                            title="Copy Token Number"
                          >
                            {copiedToken === token ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          {slip.createdAt ? new Date(slip.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Today'}
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                            {slip.customerName || 'Walk-in Shopper'}
                          </span>
                          {slip.phone && (
                            <span className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {slip.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Garment Category & Instructions */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            {slip.category || 'Garment'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({slip.quantity || 1} {slip.quantity === 1 ? 'pc' : 'pcs'})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {slip.instructions || 'Standard fitting adjustment.'}
                        </p>
                      </td>

                      {/* Assigned Tailor */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          {slip.tailorName || 'Akshat Goyal'}
                        </span>
                        <div className="text-[10px] text-slate-400">Cobb Master Tailor</div>
                      </td>

                      {/* Expected By Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-xs">
                            {slip.expectedDate || 'Today'}
                          </span>
                          {isOverdue ? (
                            <span className="mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                              ⚠️ OVERDUE
                            </span>
                          ) : isDueToday ? (
                            <span className="mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              DUE TODAY
                            </span>
                          ) : (
                            <span className="mt-0.5 text-[10px] text-slate-400">On Track</span>
                          )}
                        </div>
                      </td>

                      {/* Status Dropdown / Cycle */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        <select
                          value={slip.status || 'Pending'}
                          onChange={(e) => updateStatus(slip.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            slip.status === 'Completed'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : slip.status === 'Ready for Pickup'
                              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                              : slip.status === 'In Progress'
                              ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <option value="Pending">⏳ Pending</option>
                          <option value="In Progress">🧵 In Progress</option>
                          <option value="Ready for Pickup">📦 Ready for Pickup</option>
                          <option value="Completed">✅ Completed</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Thermal Print Slip */}
                          <button
                            onClick={() => {
                              if (openThermalModal) {
                                openThermalModal({
                                  receiptType: 'alteration',
                                  alterationData: {
                                    tokenNumber: token,
                                    customerName: slip.customerName,
                                    customerPhone: slip.phone,
                                    item: slip.category,
                                    type: slip.instructions || 'Alteration',
                                    deliveryDate: slip.expectedDate,
                                    notes: slip.instructions
                                  }
                                });
                              }
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition flex items-center gap-1 cursor-pointer"
                            title="Print Thermal Job Card"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Slip</span>
                          </button>

                          {/* WhatsApp Ready Notification */}
                          {slip.phone && (
                            <button
                              onClick={() => handleSendWhatsAppNotification(slip)}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition flex items-center gap-1 cursor-pointer"
                              title="Notify customer via WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Notify</span>
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => deleteSlip(slip.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete Alteration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Alteration Slip Modal */}
      <AlterationSlipModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        darkMode={darkMode}
        storeId={activeStore}
        API_BASE={API_BASE}
        onSlipCreated={(newSlip) => {
          setAlterations(prev => [newSlip, ...prev]);
        }}
      />
    </div>
  );
}
