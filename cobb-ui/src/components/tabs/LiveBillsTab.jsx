import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Receipt,
  Clock,
  Calendar,
  Search,
  RefreshCw,
  Package,
  Wand2,
  ChevronDown,
  Copy,
  Check,
  CreditCard,
  Smartphone,
  Banknote,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Send,
  Sparkles,
  ArrowUpDown,
  Filter,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Scissors
} from 'lucide-react';
import AlterationSlipModal from '../AlterationSlipModal';

const LiveBillsTab = (props) => {
  const {
    API_BASE,
    darkMode,
    liveBills = [],
    setLiveBills,
    expandedBillId,
    setExpandedBillId,
    billItemsCache = {},
    setBillItemsCache,
    loadingBillItems,
    setLoadingBillItems,
    toggleBillExpansion,
    setSmartCoordinate,
    setShowCoordinateModal,
    formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`
  } = props;

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

  // Filter States
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'yesterday' | '7days' | 'custom'
  const [customDate, setCustomDate] = useState(yesterdayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'Cash' | 'UPI / Online' | 'Debit / Credit Card' | 'Split'
  
  // Data States
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedBillId, setCopiedBillId] = useState(null);
  const [copiedSummaryId, setCopiedSummaryId] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  
  const [showAlterationModal, setShowAlterationModal] = useState(false);
  const [alterationInitialData, setAlterationInitialData] = useState(null);

  // Fetch transactions from backend
  const fetchBills = useCallback(async (filterType = dateFilter, selectedCustomDate = customDate) => {
    setIsLoading(true);
    let url = `${API_BASE}/api/sales/live`;
    const params = new URLSearchParams();

    if (filterType === 'today') {
      params.append('date', 'today');
    } else if (filterType === 'yesterday') {
      params.append('date', 'yesterday');
    } else if (filterType === '7days') {
      params.append('days', '7');
    } else if (filterType === 'custom') {
      params.append('date', selectedCustomDate || yesterdayStr);
    }
    params.append('refresh', 'true');

    try {
      const res = await axios.get(`${url}?${params.toString()}`);
      if (res.data && Array.isArray(res.data)) {
        setBills(res.data);
        setLastFetchedAt(new Date());

        // Batch populate billItemsCache so bill details open with 0 latency
        const newItemsMap = {};
        res.data.forEach(bill => {
          if (bill.Items && bill.Items.length > 0) {
            newItemsMap[bill.BillId] = bill.Items;
          }
        });
        if (Object.keys(newItemsMap).length > 0 && typeof setBillItemsCache === 'function') {
          setBillItemsCache(prev => ({ ...prev, ...newItemsMap }));
        }

        // If currently viewing today, also sync back to liveBills in App.jsx
        if (filterType === 'today' && typeof setLiveBills === 'function') {
          setLiveBills(res.data);
        }
      }
    } catch (err) {
      console.warn('[TRANSACTIONS] API fetch failed, checking local liveBills fallback:', err);
      // Client-side fallback from liveBills prop (e.g. offline cloud sync)
      if (Array.isArray(liveBills) && liveBills.length > 0) {
        setBills(liveBills);
      }
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE, dateFilter, customDate, yesterdayStr, liveBills, setLiveBills, setBillItemsCache]);

  // Initial load and filter changes
  useEffect(() => {
    fetchBills(dateFilter, customDate);
  }, [dateFilter, customDate]);

  // Auto-refresh when viewing 'today' (every 25 seconds)
  useEffect(() => {
    if (dateFilter !== 'today') return;
    const interval = setInterval(() => {
      fetchBills('today');
    }, 25000);
    return () => clearInterval(interval);
  }, [dateFilter, fetchBills]);

  // Sync if today's liveBills updated from App.jsx parent poll
  useEffect(() => {
    if (dateFilter === 'today' && Array.isArray(liveBills) && liveBills.length > 0) {
      setBills(liveBills);
    }
  }, [liveBills, dateFilter]);

  // Filter bills client-side (handles search, payment mode, and date matching)
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      // Date filter matching (especially important for fallback/multi-day payloads)
      if (dateFilter === 'today') {
        const bDate = bill.BillDate || (bill.BillTime ? bill.BillTime.slice(0, 10) : '');
        if (bDate && bDate !== todayStr) return false;
      } else if (dateFilter === 'yesterday') {
        const bDate = bill.BillDate || (bill.BillTime ? bill.BillTime.slice(0, 10) : '');
        if (bDate && bDate !== yesterdayStr) return false;
      } else if (dateFilter === 'custom') {
        const bDate = bill.BillDate || (bill.BillTime ? bill.BillTime.slice(0, 10) : '');
        if (bDate && bDate !== customDate) return false;
      }

      // Payment Mode filter
      if (paymentFilter !== 'all') {
        if (paymentFilter === 'Split' && !bill.PaymentMode?.includes('Split')) return false;
        if (paymentFilter !== 'Split' && bill.PaymentMode !== paymentFilter) return false;
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const billNoMatch = bill.BillNumber?.toLowerCase()?.includes(q);
        const customerMatch = bill.CustomerName?.toLowerCase()?.includes(q) || bill.FirstName?.toLowerCase()?.includes(q);
        const phoneMatch = bill.Phone?.toLowerCase()?.includes(q);
        const itemMatch = (bill.Items || []).some(item => 
          item.ArticleName?.toLowerCase()?.includes(q) || 
          item.ArticleNo?.toLowerCase()?.includes(q) ||
          item.Color?.toLowerCase()?.includes(q) ||
          item.Size?.toLowerCase()?.includes(q)
        );
        if (!billNoMatch && !customerMatch && !phoneMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [bills, dateFilter, todayStr, yesterdayStr, customDate, paymentFilter, searchQuery]);

  // KPI Calculations on the filtered results
  const summaryKpis = useMemo(() => {
    let totalRev = 0;
    let totalQty = 0;
    let cashRev = 0;
    let upiRev = 0;
    let cardRev = 0;

    filteredBills.forEach(b => {
      const amt = Number(b.Amount || 0);
      totalRev += amt;
      totalQty += Number(b.TotalQty || (b.Items ? b.Items.reduce((s, i) => s + (Number(i.Quantity) || 1), 0) : 1));
      cashRev += Number(b.CashAmount || 0);
      upiRev += Number(b.UpiAmount || 0);
      cardRev += Number(b.CardAmount > 0 ? b.CardAmount : 0);
    });

    const count = filteredBills.length;
    const aov = count > 0 ? Math.round(totalRev / count) : 0;

    return {
      totalRev,
      count,
      totalQty,
      aov,
      cashRev,
      upiRev,
      cardRev
    };
  }, [filteredBills]);

  // Helper to copy text to clipboard
  const handleCopy = (text, id, type = 'bill') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'bill') {
      setCopiedBillId(id);
      setTimeout(() => setCopiedBillId(null), 2000);
    } else {
      setCopiedSummaryId(id);
      setTimeout(() => setCopiedSummaryId(null), 2000);
    }
  };

  // Helper to format date & time nicely
  const formatBillDateTime = (timeStr, dateStr) => {
    if (!timeStr) return '-';
    try {
      const d = new Date(timeStr);
      const isToday = (dateStr || timeStr.slice(0, 10)) === todayStr;
      const isYesterday = (dateStr || timeStr.slice(0, 10)) === yesterdayStr;
      
      const timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (isToday) return `Today, ${timeFormatted}`;
      if (isYesterday) return `Yesterday, ${timeFormatted}`;
      return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${timeFormatted}`;
    } catch (e) {
      return timeStr;
    }
  };

  // Pre-fill WhatsApp message with bill details
  const openWhatsAppBill = (bill) => {
    if (!bill.Phone) return;
    const items = billItemsCache[bill.BillId] || bill.Items || [];
    let itemsText = items.map(i => `• ${i.ArticleName} (${i.Size || 'Std'}, ${i.Color || 'Std'}) x${i.Quantity || 1} - ₹${i.NetPrice}`).join('\n');
    
    const text = `Hello ${bill.CustomerName?.trim() || 'Valued Customer'}, here are your invoice details from Cobb Apparels:\n\n*Invoice No:* ${bill.BillNumber.trim()}\n*Date:* ${formatBillDateTime(bill.BillTime, bill.BillDate)}\n*Total Amount:* ₹${bill.Amount}\n*Payment Mode:* ${bill.PaymentMode}\n\n*Items Purchased:*\n${itemsText || 'Details on invoice'}\n\nThank you for shopping with Cobb!`;
    const cleanPhone = bill.Phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen transition-colors ${darkMode ? 'bg-[#000000] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Header Section */}
      <div className={`pb-5 mb-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${darkMode ? 'border-[#2e3342]' : 'border-slate-200'}`}>
        <div className="flex items-center">
          <div className={`p-3 rounded-2xl mr-3.5 shadow-sm border ${darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Transaction History & Bills
              </h2>
              {dateFilter === 'today' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live Feed
                </span>
              )}
            </div>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Browse today's live checkouts, inspect yesterday's transactions, and view itemized bill details.
            </p>
          </div>
        </div>

        {/* Right Header Status / Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchBills(dateFilter, customDate)}
            disabled={isLoading}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-sm ${
              darkMode 
                ? 'bg-[#12141a] hover:bg-[#1a1d26] border-[#2e3342] text-slate-200 hover:text-white' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Refresh transaction data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
          
          <span className={`text-xs font-semibold px-3 py-2 rounded-xl border ${
            darkMode ? 'bg-[#12141a] border-[#2e3342] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            {filteredBills.length} {filteredBills.length === 1 ? 'Invoice' : 'Invoices'} Listed
          </span>
        </div>
      </div>

      {/* Date & Filter Control Bar */}
      <div className={`p-4 rounded-2xl border mb-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
        darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200'
      }`}>
        
        {/* Date Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Today Button */}
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              dateFilter === 'today'
                ? (darkMode ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-blue-600 text-white border-blue-600 shadow-sm')
                : (darkMode ? 'bg-[#161922] hover:bg-[#1f2330] text-slate-300 border-[#2e3342]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200')
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>⚡ Today</span>
          </button>

          {/* Yesterday Button (Direct Solution to User's Request!) */}
          <button
            onClick={() => setDateFilter('yesterday')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              dateFilter === 'yesterday'
                ? (darkMode ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-indigo-600 text-white border-indigo-600 shadow-sm')
                : (darkMode ? 'bg-[#161922] hover:bg-[#1f2330] text-slate-300 border-[#2e3342]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200')
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>⏪ Yesterday ({new Date(yesterdayStr).toLocaleDateString([], { day: '2-digit', month: 'short' })})</span>
          </button>

          {/* Last 7 Days Button */}
          <button
            onClick={() => setDateFilter('7days')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              dateFilter === '7days'
                ? (darkMode ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-purple-600 text-white border-purple-600 shadow-sm')
                : (darkMode ? 'bg-[#161922] hover:bg-[#1f2330] text-slate-300 border-[#2e3342]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200')
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Last 7 Days</span>
          </button>

          {/* Custom Date Picker */}
          <div className="flex items-center gap-1.5 pl-1">
            <span className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>or Pick Date:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateFilter('custom');
              }}
              max={todayStr}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition outline-none cursor-pointer ${
                dateFilter === 'custom'
                  ? (darkMode ? 'bg-blue-950/60 text-blue-300 border-blue-500 ring-1 ring-blue-500' : 'bg-blue-50 text-blue-700 border-blue-400 ring-1 ring-blue-400')
                  : (darkMode ? 'bg-[#161922] text-slate-300 border-[#2e3342]' : 'bg-slate-100 text-slate-700 border-slate-200')
              }`}
            />
          </div>
        </div>

        {/* Search & Payment Mode Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="Search bill no, phone, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8.5 pr-8 py-2 text-xs font-medium rounded-xl border outline-none transition ${
                darkMode 
                  ? 'bg-[#161922] border-[#2e3342] text-white placeholder-slate-500 focus:border-blue-500' 
                  : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Payment Mode Selector */}
          <div className="flex items-center">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition outline-none cursor-pointer ${
                darkMode ? 'bg-[#161922] border-[#2e3342] text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <option value="all">All Modes</option>
              <option value="Cash">💵 Cash Only</option>
              <option value="UPI / Online">⚡ UPI / Online</option>
              <option value="Debit / Credit Card">💳 Card Only</option>
              <option value="Split">🔀 Split Payment</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Metrics Summary Bar for the selected view */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {/* Total Sales */}
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {dateFilter === 'today' ? "Today's Sales" : dateFilter === 'yesterday' ? "Yesterday's Sales" : "Period Sales"}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {formatCurrency(summaryKpis.totalRev)}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Across {summaryKpis.count} total {summaryKpis.count === 1 ? 'bill' : 'bills'}
          </div>
        </div>

        {/* Total Invoices & Items */}
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Invoices & Units
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {summaryKpis.count} <span className="text-sm font-semibold text-slate-400">({summaryKpis.totalQty} units)</span>
          </div>
          <div className={`text-[11px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Avg. {(summaryKpis.count > 0 ? (summaryKpis.totalQty / summaryKpis.count).toFixed(1) : 0)} items per basket
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Average Bill (AOV)
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
            {formatCurrency(summaryKpis.aov)}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Per customer transaction
          </div>
        </div>

        {/* Payment Split */}
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Payment Split
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-bold pt-1">
            <span className="text-emerald-500">💵 {formatCurrency(summaryKpis.cashRev)}</span>
            <span className="text-purple-500">⚡ {formatCurrency(summaryKpis.upiRev)}</span>
            <span className="text-blue-500">💳 {formatCurrency(summaryKpis.cardRev)}</span>
          </div>
          <div className={`text-[10px] mt-1.5 font-medium flex justify-between ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Cash</span>
            <span>UPI / Online</span>
            <span>Cards</span>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-xs font-bold uppercase tracking-wider ${
                darkMode ? 'bg-[#141720] border-[#2e3342] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="px-6 py-4 whitespace-nowrap">Date & Time</th>
                <th className="px-6 py-4 whitespace-nowrap">Invoice No.</th>
                <th className="px-6 py-4 whitespace-nowrap">Customer Details</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Payment Mode</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Items</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Invoice Net</th>
                <th className="px-4 py-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-[#1e222e]' : 'divide-slate-100'}`}>
              {filteredBills.map((bill, idx) => {
                const isExpanded = expandedBillId === bill.BillId;
                const items = billItemsCache[bill.BillId] || bill.Items || [];
                const itemCount = items.length > 0 ? items.reduce((s, i) => s + (Number(i.Quantity) || 1), 0) : (bill.TotalQty || 1);

                return (
                  <React.Fragment key={bill.BillId || idx}>
                    <tr
                      onClick={() => toggleBillExpansion(bill.BillId)}
                      className={`transition-colors cursor-pointer ${
                        isExpanded
                          ? (darkMode ? 'bg-blue-950/20' : 'bg-blue-50/40')
                          : (darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/70')
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                          <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {formatBillDateTime(bill.BillTime, bill.BillDate)}
                          </span>
                        </div>
                      </td>

                      {/* Invoice No */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {bill.BillNumber?.trim()}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(bill.BillNumber?.trim(), bill.BillId, 'bill');
                            }}
                            className={`p-1 rounded hover:bg-slate-200/50 transition cursor-pointer ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                            title="Copy invoice number"
                          >
                            {copiedBillId === bill.BillId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                            {bill.CustomerName?.trim() || bill.FirstName?.trim() || 'Guest Customer'}
                          </span>
                          {bill.Phone && (
                            <span className="text-xs text-slate-400 font-mono mt-0.5 inline-flex items-center gap-1">
                              {bill.Phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Payment Mode */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${
                          bill.PaymentMode === 'Cash'
                            ? (darkMode ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                            : bill.PaymentMode === 'UPI / Online'
                            ? (darkMode ? 'bg-purple-950/40 text-purple-300 border-purple-800/60' : 'bg-purple-50 text-purple-700 border-purple-200')
                            : bill.PaymentMode === 'Debit / Credit Card'
                            ? (darkMode ? 'bg-blue-950/40 text-blue-300 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200')
                            : (darkMode ? 'bg-amber-950/40 text-amber-300 border-amber-800/60' : 'bg-amber-50 text-amber-700 border-amber-200')
                        }`}>
                          {bill.PaymentMode === 'Cash' ? '💵 Cash' :
                            bill.PaymentMode === 'UPI / Online' ? '⚡ UPI / QR' :
                            bill.PaymentMode === 'Debit / Credit Card' ? '💳 Card' :
                            '🔀 Split Payment'}
                        </span>
                      </td>

                      {/* Items Count Badge */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          darkMode ? 'bg-[#181b24] border-[#2e3342] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>

                      {/* Net Amount */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className={`text-base font-black ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {formatCurrency(bill.Amount)}
                        </span>
                      </td>

                      {/* Chevron Arrow */}
                      <td className="px-4 py-4 text-center">
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} />
                      </td>
                    </tr>

                    {/* EXPANDED BILL DETAILS DRAWER */}
                    {isExpanded && (
                      <tr className={`border-b ${darkMode ? 'bg-[#12151e] border-[#2e3342]' : 'bg-slate-50/80 border-slate-200'}`}>
                        <td colSpan="7" className="p-0">
                          <div className="px-6 py-5 animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                            
                            {/* Drawer Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-blue-500" />
                                <h4 className={`text-sm font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                  Itemized Purchased Products
                                </h4>
                                <span className={`text-xs px-2 py-0.5 rounded-md font-mono ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                                  Bill #{bill.BillNumber?.trim()}
                                </span>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2">
                                {/* AI Stylist */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentItems = billItemsCache[bill.BillId] || bill.Items || [];
                                    if (currentItems.length === 0) return;
                                    setSmartCoordinate({ loading: true, data: null, itemText: '' });
                                    setShowCoordinateModal(true);
                                    const itemNames = currentItems.map(i => i.ArticleName);
                                    axios.post(`${API_BASE}/api/ai/smart-coordinate`, {
                                      items: itemNames,
                                      customerName: bill.CustomerName
                                    }).then(res => {
                                      setSmartCoordinate({ loading: false, data: res.data.message, itemText: itemNames.join(', ') });
                                    }).catch(err => {
                                      setSmartCoordinate({ loading: false, data: "Error generating recommendation.", itemText: '' });
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                                    darkMode 
                                      ? 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30' 
                                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                  }`}
                                >
                                  <Wand2 className="w-3.5 h-3.5" />
                                  <span>AI Stylist</span>
                                </button>

                                {/* WhatsApp Details */}
                                {bill.Phone && (
                                  <button
                                    onClick={() => openWhatsAppBill(bill)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                                      darkMode
                                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                    }`}
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>WhatsApp Bill</span>
                                  </button>
                                )}

                                {/* Alteration Slip */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentItems = billItemsCache[bill.BillId] || bill.Items || [];
                                    const mainItem = currentItems.length > 0 ? currentItems[0] : null;
                                    setAlterationInitialData({
                                      CustomerName: bill.CustomerName,
                                      Phone: bill.Phone,
                                      Category: mainItem?.Category || 'Trouser',
                                      Quantity: '1'
                                    });
                                    setShowAlterationModal(true);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                                    darkMode
                                      ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  <Scissors className="w-3.5 h-3.5" />
                                  <span>Alteration Slip</span>
                                </button>

                                {/* Copy Summary */}
                                <button
                                  onClick={() => {
                                    const currItems = billItemsCache[bill.BillId] || bill.Items || [];
                                    const text = `Invoice: ${bill.BillNumber?.trim()} | Customer: ${bill.CustomerName?.trim()} | Amount: ₹${bill.Amount} | Mode: ${bill.PaymentMode} | Items: ${currItems.map(i => `${i.ArticleName} (${i.Quantity})`).join(', ')}`;
                                    handleCopy(text, bill.BillId, 'summary');
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                                    darkMode ? 'bg-[#181b24] hover:bg-[#202532] text-slate-300 border-[#2e3342]' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {copiedSummaryId === bill.BillId ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy Bill</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Items List Content */}
                            {loadingBillItems && !billItemsCache[bill.BillId] ? (
                              <div className="py-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                                <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                                <span>Loading item specifications...</span>
                              </div>
                            ) : items.length > 0 ? (
                              <div className={`rounded-xl border overflow-hidden ${
                                darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200'
                              }`}>
                                <table className="min-w-full text-left text-xs">
                                  <thead className={darkMode ? 'bg-[#161922] text-slate-400' : 'bg-slate-50 text-slate-500 font-bold'}>
                                    <tr>
                                      <th className="px-4 py-2.5 font-bold">Article Details</th>
                                      <th className="px-4 py-2.5 font-bold">Category</th>
                                      <th className="px-4 py-2.5 font-bold">Color</th>
                                      <th className="px-4 py-2.5 font-bold">Size</th>
                                      <th className="px-4 py-2.5 font-bold text-right">Qty</th>
                                      <th className="px-4 py-2.5 font-bold text-right">Net Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className={`divide-y ${darkMode ? 'divide-[#1e222e]' : 'divide-slate-100'}`}>
                                    {items.map((item, i) => (
                                      <tr key={i} className={darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}>
                                        <td className="px-4 py-3">
                                          <div className="flex flex-col">
                                            <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                              {item.ArticleName}
                                            </span>
                                            <span className="text-[11px] text-slate-400 font-mono">
                                              {item.ArticleNo}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400">
                                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                                            darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                                          }`}>
                                            {item.Category || 'Apparel'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                            darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                                          }`}>
                                            {item.Color || 'Standard'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                            darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                                          }`}>
                                            {item.Size || 'Std'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-slate-200">
                                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                            darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'
                                          }`}>
                                            {item.Quantity}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-emerald-500 text-sm">
                                          {formatCurrency(item.NetPrice)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>

                                {/* Footer Split Info */}
                                <div className={`px-4 py-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
                                  darkMode ? 'bg-[#141720] border-[#2e3342] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold">Payment Breakdown:</span>
                                    {bill.CashAmount > 0 && <span>Cash: <strong className="text-emerald-500">{formatCurrency(bill.CashAmount)}</strong></span>}
                                    {bill.UpiAmount > 0 && <span>UPI: <strong className="text-purple-500">{formatCurrency(bill.UpiAmount)}</strong></span>}
                                    {bill.CardAmount > 0 && <span>Card: <strong className="text-blue-500">{formatCurrency(bill.CardAmount)}</strong></span>}
                                  </div>
                                  <div className="font-bold">
                                    Total: <span className="text-emerald-500 text-sm font-black">{formatCurrency(bill.Amount)}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className={`py-6 text-center text-xs italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                No specific article lines returned for this cash memo.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* EMPTY STATE */}
              {filteredBills.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <Receipt className={`w-12 h-12 mb-3 mx-auto ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                    <h3 className={`text-base font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      No Transactions Found
                    </h3>
                    <p className={`text-xs mt-1 max-w-sm mx-auto ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {searchQuery
                        ? `No transactions match your search "${searchQuery}". Try a different invoice number or customer name.`
                        : `No invoices processed for ${dateFilter === 'today' ? 'today' : dateFilter === 'yesterday' ? 'yesterday' : 'the selected date'}.`}
                    </p>
                    {dateFilter !== 'today' && (
                      <button
                        onClick={() => setDateFilter('today')}
                        className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-sm"
                      >
                        Return to Today's Transactions
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlterationSlipModal 
        isOpen={showAlterationModal}
        onClose={() => setShowAlterationModal(false)}
        initialData={alterationInitialData}
        darkMode={darkMode}
      />
    </div>
  );
};

export default LiveBillsTab;
