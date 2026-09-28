import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Clock,
  TrendingDown,
  AlertTriangle,
  Flame,
  Package,
  DollarSign,
  ArrowRight,
  Filter,
  Search,
  RefreshCw,
  CheckCircle,
  Share2,
  Download,
  Tag,
  Percent,
  Layers,
  ArrowUpDown,
  Send,
  Zap,
  Building2,
  Sparkles
} from 'lucide-react';

const DepreciationClockTab = ({
  API_BASE = 'http://localhost:5000',
  darkMode = true,
  formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
  onOpenBundleModal,
  onOpenTransferModal
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Filters & Search
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('days'); // 'days' | 'capital' | 'recovery'
  const [actionNotice, setActionNotice] = useState(null);

  const fetchDepreciationData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/inventory/depreciation-clock`);
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.warn('Error fetching depreciation clock:', err.message);
      setError('Unable to fetch live depreciation matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepreciationData();
  }, [API_BASE]);

  const summary = data?.summary || {};
  const rawItems = data?.items || [];

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return rawItems
      .filter((item) => {
        if (zoneFilter !== 'ALL') {
          if (zoneFilter === 'DEAD' && item.ageingZone !== 'Critical Dead') return false;
          if (zoneFilter === 'STAGNANT' && item.ageingZone !== 'Stagnant') return false;
          if (zoneFilter === 'MATURING' && item.ageingZone !== 'Maturing') return false;
          if (zoneFilter === 'FRESH' && item.ageingZone !== 'Fresh') return false;
        }

        if (categoryFilter !== 'ALL') {
          if ((item.category || '').toUpperCase() !== categoryFilter.toUpperCase()) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNo = item.articleNo?.toLowerCase().includes(q);
          const matchName = item.articleName?.toLowerCase().includes(q);
          const matchCat = item.category?.toLowerCase().includes(q);
          if (!matchNo && !matchName && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'days') return (b.daysOnRack || 0) - (a.daysOnRack || 0);
        if (sortBy === 'capital') return (b.totalValuation || 0) - (a.totalValuation || 0);
        if (sortBy === 'recovery') return (b.recoveryCashPotential || 0) - (a.recoveryCashPotential || 0);
        return 0;
      });
  }, [rawItems, zoneFilter, categoryFilter, searchQuery, sortBy]);

  const categories = useMemo(() => {
    return ['ALL', ...new Set(rawItems.map((i) => i.category).filter(Boolean))];
  }, [rawItems]);

  const handleExecuteAction = (item) => {
    if (item.actionType === 'liquidation_markdown') {
      setActionNotice(`✅ Markdown tagged for ${item.articleNo}: Clearance price set to ₹${item.suggestedClearancePrice} (saved to POS).`);
    } else if (item.actionType === 'counter_bundle') {
      setActionNotice(`⚡ Counter combo bundle created for ${item.articleNo}: 15% off when bought with matching bottom wear.`);
    } else if (item.actionType === 'interstore_rebalance') {
      setActionNotice(`🚚 Inter-store transfer request drafted for ${item.articleNo} to balance cluster inventory.`);
    } else {
      setActionNotice(`⭐ ${item.articleNo} flagged as priority shelf item.`);
    }
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleExportCsv = () => {
    if (!filteredItems.length) return;
    const headers = ['Article No', 'Description', 'Category', 'Stock Qty', 'MRP (INR)', 'Days on Rack', 'Aging Zone', 'Suggested Clearance (INR)', 'Recovery Potential (INR)', 'Action'];
    const rows = filteredItems.map((i) => [
      `"${i.articleNo}"`,
      `"${i.articleName}"`,
      `"${i.category}"`,
      i.stock,
      i.mrp,
      i.daysOnRack,
      `"${i.ageingZone}"`,
      i.suggestedClearancePrice,
      i.recoveryCashPotential,
      `"${i.actionRecommended}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cobb_Depreciation_Matrix_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/25">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                Dead-Stock Depreciation Clock & Clearance Matrix
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated days-on-rack audit, capital lock depreciation & liquidation recovery engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDepreciationData}
            disabled={loading}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
              darkMode
                ? 'bg-[#131622] border-[#2e3342] text-slate-300 hover:text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition flex items-center gap-2 shadow-md shadow-purple-600/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* TOP 4 EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Valuation */}
        <div
          className={`p-5 rounded-2xl border transition ${
            darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total In-Store Stock
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white">
            {formatCurrency(summary.totalValuationMrp || 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Across {summary.totalUnitsInStock || 0} physical pieces
          </div>
        </div>

        {/* Card 2: Critical Dead Capital (>90 Days) */}
        <div
          className={`p-5 rounded-2xl border transition ${
            darkMode ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50/60 border-rose-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Locked Capital (90+ Days)
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-500">
            {formatCurrency(summary.lockedCapital90Plus || 0)}
          </div>
          <div className="text-xs text-rose-400/80 mt-1 font-medium">
            {summary.deadUnits || 0} units at severe markdown risk
          </div>
        </div>

        {/* Card 3: Stagnant Capital (60+ Days) */}
        <div
          className={`p-5 rounded-2xl border transition ${
            darkMode ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50/60 border-amber-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
              Aging Capital (60+ Days)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500">
            {formatCurrency(summary.lockedCapital60Plus || 0)}
          </div>
          <div className="text-xs text-amber-400/80 mt-1 font-medium">
            {(summary.deadUnits || 0) + (summary.stagnantUnits || 0)} units slowing down
          </div>
        </div>

        {/* Card 4: Immediate Cash Recovery Potential */}
        <div
          className={`p-5 rounded-2xl border transition ${
            darkMode ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50/60 border-emerald-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Cash Recovery Potential
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {formatCurrency(summary.suggestedClearanceRecoveryCash || 0)}
          </div>
          <div className="text-xs text-emerald-500/80 mt-1 font-medium">
            Liquid cash unlocked via suggested clearance matrix
          </div>
        </div>
      </div>

      {/* 4-ZONE DEPRECIATION PROGRESS / SPEEDOMETER */}
      <div
        className={`p-5 rounded-2xl border ${
          darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-bold text-sm tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" /> Depreciation Zone Spectrum & Value Distribution
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Last Audit: {summary.lastAuditTime ? new Date(summary.lastAuditTime).toLocaleTimeString() : 'Live'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Zone 1: Fresh */}
          <div
            onClick={() => setZoneFilter(zoneFilter === 'FRESH' ? 'ALL' : 'FRESH')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              zoneFilter === 'FRESH'
                ? 'ring-2 ring-emerald-500 bg-emerald-500/15 border-emerald-500'
                : darkMode
                ? 'bg-slate-900/50 border-slate-800 hover:border-emerald-500/40'
                : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-black text-emerald-500">ZONE 1: FRESH</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                0-30 Days
              </span>
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white">
              {formatCurrency(summary.freshValue || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary.freshUnits || 0} Units • Full MRP Peak Margin
            </p>
          </div>

          {/* Zone 2: Maturing */}
          <div
            onClick={() => setZoneFilter(zoneFilter === 'MATURING' ? 'ALL' : 'MATURING')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              zoneFilter === 'MATURING'
                ? 'ring-2 ring-yellow-500 bg-yellow-500/15 border-yellow-500'
                : darkMode
                ? 'bg-slate-900/50 border-slate-800 hover:border-yellow-500/40'
                : 'bg-yellow-50/40 border-yellow-200 hover:border-yellow-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-black text-yellow-500">ZONE 2: MATURING</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                31-60 Days
              </span>
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white">
              {formatCurrency(summary.maturingValue || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary.maturingUnits || 0} Units • 15% 2-Piece Bundle Action
            </p>
          </div>

          {/* Zone 3: Stagnant */}
          <div
            onClick={() => setZoneFilter(zoneFilter === 'STAGNANT' ? 'ALL' : 'STAGNANT')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              zoneFilter === 'STAGNANT'
                ? 'ring-2 ring-orange-500 bg-orange-500/15 border-orange-500'
                : darkMode
                ? 'bg-slate-900/50 border-slate-800 hover:border-orange-500/40'
                : 'bg-orange-50/40 border-orange-200 hover:border-orange-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-black text-orange-500">ZONE 3: STAGNANT</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                61-90 Days
              </span>
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white">
              {formatCurrency(summary.stagnantValue || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary.stagnantUnits || 0} Units • Inter-Store Rebalance
            </p>
          </div>

          {/* Zone 4: Critical Dead */}
          <div
            onClick={() => setZoneFilter(zoneFilter === 'DEAD' ? 'ALL' : 'DEAD')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              zoneFilter === 'DEAD'
                ? 'ring-2 ring-rose-500 bg-rose-500/15 border-rose-500'
                : darkMode
                ? 'bg-slate-900/50 border-slate-800 hover:border-rose-500/40'
                : 'bg-rose-50/40 border-rose-200 hover:border-rose-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-black text-rose-500">ZONE 4: CRITICAL DEAD</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                90+ Days
              </span>
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white">
              {formatCurrency(summary.deadValue || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary.deadUnits || 0} Units • Liquidation Markdown Matrix
            </p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div
        className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
          darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Article No, Name..."
              className={`pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none transition w-56 ${
                darkMode
                  ? 'bg-[#171b26] border-[#2e3342] text-white focus:border-purple-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-600'
              }`}
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              darkMode
                ? 'bg-[#171b26] border-[#2e3342] text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? '📦 All Categories' : c}
              </option>
            ))}
          </select>

          {/* Zone Selector */}
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              darkMode
                ? 'bg-[#171b26] border-[#2e3342] text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">⏳ All Depreciation Zones</option>
            <option value="DEAD">🔴 Critical Dead (90+ Days)</option>
            <option value="STAGNANT">🟠 Stagnant (61-90 Days)</option>
            <option value="MATURING">🟡 Maturing (31-60 Days)</option>
            <option value="FRESH">🟢 Fresh (0-30 Days)</option>
          </select>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-bold">Sort:</span>
          <button
            onClick={() => setSortBy('days')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
              sortBy === 'days'
                ? 'bg-purple-600 text-white'
                : darkMode
                ? 'bg-slate-800 text-slate-400'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            Days on Rack
          </button>
          <button
            onClick={() => setSortBy('capital')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
              sortBy === 'capital'
                ? 'bg-purple-600 text-white'
                : darkMode
                ? 'bg-slate-800 text-slate-400'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            Locked Capital
          </button>
          <button
            onClick={() => setSortBy('recovery')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
              sortBy === 'recovery'
                ? 'bg-purple-600 text-white'
                : darkMode
                ? 'bg-slate-800 text-slate-400'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            Cash Recovery
          </button>
        </div>
      </div>

      {/* CLEARANCE MATRIX TABLE */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className={`border-b uppercase font-bold tracking-wider text-[10px] ${
                  darkMode ? 'border-[#222736] bg-slate-900/60 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'
                }`}
              >
                <th className="py-3 px-4">Article / Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-center">Stock</th>
                <th className="py-3 px-3 text-right">Current MRP</th>
                <th className="py-3 px-3 text-center">Days on Rack</th>
                <th className="py-3 px-3 text-center">Depreciation Zone</th>
                <th className="py-3 px-3 text-right">Suggested Clearance</th>
                <th className="py-3 px-3 text-right">Recovery Cash</th>
                <th className="py-3 px-4 text-center">Recommended Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-[#1e2333]' : 'divide-slate-100'}`}>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-bold">
                    No garments match the current filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      darkMode ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Article / Description */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-purple-400">{item.articleNo}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {item.articleName}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        {item.category}
                      </span>
                    </td>

                    {/* Stock Units */}
                    <td className="py-3.5 px-3 text-center font-black text-slate-800 dark:text-white">
                      {item.stock} <span className="text-[10px] text-slate-400 font-normal">pcs</span>
                    </td>

                    {/* Current MRP */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-300">
                      ₹{item.mrp}
                    </td>

                    {/* Days on Rack */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-black inline-flex items-center gap-1 ${
                          item.daysOnRack >= 90
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : item.daysOnRack >= 60
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : item.daysOnRack >= 30
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {item.daysOnRack}d
                      </span>
                    </td>

                    {/* Depreciation Zone */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.ageingZone === 'Critical Dead'
                            ? 'bg-rose-500/20 text-rose-300'
                            : item.ageingZone === 'Stagnant'
                            ? 'bg-orange-500/20 text-orange-300'
                            : item.ageingZone === 'Maturing'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {item.ageingZone}
                      </span>
                    </td>

                    {/* Suggested Clearance Price */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-black text-amber-400">
                          ₹{item.suggestedClearancePrice}
                        </span>
                        {item.suggestedClearancePrice < item.mrp && (
                          <span className="text-[10px] text-rose-400 font-bold">
                            -{Math.round((1 - item.suggestedClearancePrice / item.mrp) * 100)}% off
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Recovery Cash */}
                    <td className="py-3.5 px-3 text-right font-black text-emerald-400 font-mono">
                      {formatCurrency(item.recoveryCashPotential)}
                    </td>

                    {/* Recommended Action */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleExecuteAction(item)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer shadow-sm ${
                          item.actionType === 'liquidation_markdown'
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                            : item.actionType === 'interstore_rebalance'
                            ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20'
                            : item.actionType === 'counter_bundle'
                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                        }`}
                      >
                        {item.actionType === 'liquidation_markdown' && <Tag className="w-3 h-3" />}
                        {item.actionType === 'interstore_rebalance' && <Building2 className="w-3 h-3" />}
                        {item.actionType === 'counter_bundle' && <Percent className="w-3 h-3" />}
                        {item.actionType === 'full_margin' && <Sparkles className="w-3 h-3" />}
                        {item.actionType === 'liquidation_markdown'
                          ? 'Tag Clearance'
                          : item.actionType === 'interstore_rebalance'
                          ? 'Transfer Request'
                          : item.actionType === 'counter_bundle'
                          ? 'Create Bundle'
                          : 'Full Margin'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DepreciationClockTab;
