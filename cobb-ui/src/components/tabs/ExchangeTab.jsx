import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
  RotateCcw,
  Search,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shirt,
  Tag,
  ArrowRightLeft,
  Copy,
  Check,
  Send,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';

export default function ExchangeTab(props) {
  const {
    API_BASE = 'http://localhost:5000',
    returnsData,
    setReturnsData,
    formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`
  } = props;

  // View modes: 'desk' (Cashier Lookup & Calculator), 'register' (Past Exchanges Log), 'insights' (Category & Size Analysis)
  const [activeView, setActiveView] = useState('desk');

  // Search & Lookup State
  const [lookupQuery, setLookupQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResults, setLookupResults] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [lookupError, setLookupError] = useState('');

  // Exchange Calculator State
  const [selectedItemToExchange, setSelectedItemToExchange] = useState(null);
  const [replacementItemName, setReplacementItemName] = useState('');
  const [replacementPrice, setReplacementPrice] = useState('');
  const [exchangeReason, setExchangeReason] = useState('Size Mismatch');
  const [copiedSlip, setCopiedSlip] = useState(false);

  // Register filter state
  const [registerSearch, setRegisterSearch] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('month'); // 'today' | 'month'

  // Handle Bill Lookup
  const handleBillLookup = async (e) => {
    if (e) e.preventDefault();
    const query = lookupQuery.trim();
    if (!query || query.length < 3) {
      setLookupError('Enter at least 3 characters (Bill Number or 10-digit Phone)');
      return;
    }
    setLookupError('');
    setIsSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/api/sales/bill-lookup/${encodeURIComponent(query)}`);
      if (res.data?.bills && res.data.bills.length > 0) {
        setLookupResults(res.data.bills);
        setSelectedBill(res.data.bills[0]);
        if (res.data.bills[0]?.items?.length > 0) {
          setSelectedItemToExchange(res.data.bills[0].items[0]);
        }
      } else {
        setLookupResults([]);
        setSelectedBill(null);
        setLookupError('No matching bills found in POS records.');
      }
    } catch (err) {
      console.error('Bill lookup failed:', err);
      setLookupError(err.response?.data?.error || 'Failed to search bills. Please verify the backend connection.');
    } finally {
      setIsSearching(false);
    }
  };

  // Refresh Exchanges Data
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const res = await axios.get(`${API_BASE}/api/sales/returns?refresh=true`);
      if (res.data && res.data.today) {
        setReturnsData(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh exchanges:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculation for delta
  const originalCredit = selectedItemToExchange ? Number(selectedItemToExchange.NetPrice || 0) : 0;
  const newPriceNum = parseFloat(replacementPrice) || 0;
  const priceDifference = newPriceNum - originalCredit;

  // WhatsApp Slip Text
  const exchangeSlipText = useMemo(() => {
    if (!selectedBill || !selectedItemToExchange) return '';
    const custName = selectedBill.CustomerName?.trim() || 'Valued Customer';
    const dateStr = selectedBill.BillTime ? new Date(selectedBill.BillTime).toLocaleDateString('en-IN') : 'Recent';
    return (
      `*COBB APPARELS — EXCHANGE SLIP*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Customer: ${custName}\n` +
      `📱 Phone: ${selectedBill.Phone || 'N/A'}\n` +
      `🧾 Original Bill: ${selectedBill.BillNumber} (${dateStr})\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `↩️ *EXCHANGED ITEM (RETURNED):*\n` +
      `• ${selectedItemToExchange.ArticleName} (Size: ${selectedItemToExchange.Size || 'Standard'})\n` +
      `• Original Value Credited: ₹${Math.abs(selectedItemToExchange.NetPrice)}\n` +
      `• Reason: ${exchangeReason}\n\n` +
      `✨ *NEW REPLACEMENT ITEM:*\n` +
      `• ${replacementItemName || 'New Exchange Article'}\n` +
      `• Replacement Value: ₹${newPriceNum > 0 ? newPriceNum : 'Equal'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `${priceDifference > 0 ? `💰 *DIFFERENCE COLLECTED:* ₹${priceDifference.toLocaleString('en-IN')}` : priceDifference < 0 ? `🎟️ *STORE CREDIT ISSUED:* ₹${Math.abs(priceDifference).toLocaleString('en-IN')} (No Cash Refund)` : `✅ *EVEN EXCHANGE:* ₹0 Difference`}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Thank you for shopping at Cobb Apparels! Exchanged items cannot be re-exchanged._`
    );
  }, [selectedBill, selectedItemToExchange, replacementItemName, newPriceNum, priceDifference, exchangeReason]);

  const handleCopySlip = () => {
    if (!exchangeSlipText) return;
    navigator.clipboard.writeText(exchangeSlipText);
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!selectedBill?.Phone) return;
    const cleanPhone = selectedBill.Phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(exchangeSlipText)}`;
    window.open(url, '_blank');
  };

  // Filter recent exchanges
  const recentExchanges = useMemo(() => {
    const list = returnsData?.recentExchanges || returnsData?.recentReturns || [];
    if (!registerSearch.trim()) return list;
    const q = registerSearch.trim().toLowerCase();
    return list.filter(item =>
      (item.BillNumber && item.BillNumber.toLowerCase().includes(q)) ||
      (item.CustomerName && item.CustomerName.toLowerCase().includes(q)) ||
      (item.Phone && item.Phone.includes(q)) ||
      (item.ArticleDetails && item.ArticleDetails.toLowerCase().includes(q)) ||
      (item.Category && item.Category.toLowerCase().includes(q))
    );
  }, [returnsData, registerSearch]);

  const todayCount = returnsData?.today?.ExchangeCount || returnsData?.today?.ReturnCount || 0;
  const todayValue = returnsData?.today?.ExchangeValue || returnsData?.today?.RefundAmount || 0;
  const monthlyCount = returnsData?.monthly?.ExchangeCount || returnsData?.monthly?.ReturnCount || 0;
  const monthlyValue = returnsData?.monthly?.ExchangeValue || returnsData?.monthly?.RefundAmount || 0;
  const exchangeRate = returnsData?.exchangeRatePct || returnsData?.returnRatePct || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER & POLICY CALLOUT */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Product Exchanges & Replacements
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Real-time exchange register, cashier verification desk, and item replacement calculator.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Store Policy: 14-Day Exchange Only • No Cash Refunds</span>
            </div>
            <button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-all"
              title="Refresh Exchange Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* TOP METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today's Exchanges</span>
              <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Today
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{todayCount}</span>
              <span className="text-xs font-semibold text-slate-500">items</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Exchange Credit Value:</span>
              <span className="font-bold text-slate-800">{formatCurrency(todayValue)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Monthly Exchanges</span>
              <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                This Month
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{monthlyCount}</span>
              <span className="text-xs font-semibold text-slate-500">items</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Total Exchanged Value:</span>
              <span className="font-bold text-slate-800">{formatCurrency(monthlyValue)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Exchange Rate %</span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${exchangeRate <= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : exchangeRate <= 8 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                {exchangeRate <= 4 ? 'Normal Fit Rate' : exchangeRate <= 8 ? 'Moderate' : 'High Shift'}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-3xl font-black ${exchangeRate <= 4 ? 'text-emerald-600' : exchangeRate <= 8 ? 'text-amber-600' : 'text-rose-600'}`}>
                {exchangeRate}%
              </span>
              <span className="text-xs font-semibold text-slate-500">of {returnsData?.totalMonthlyBills || 0} bills</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Policy Compliance:</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Exchange Only
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-5 shadow-sm shadow-amber-500/20">
            <div className="flex items-center justify-between text-amber-100">
              <span className="text-[11px] font-bold uppercase tracking-wider">Avg Exchange Item</span>
              <Sparkles className="w-4 h-4 text-amber-200" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black">
                {monthlyCount > 0 ? formatCurrency(Math.round(monthlyValue / monthlyCount)) : '₹0'}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-amber-100 leading-snug border-t border-amber-400/30 pt-2">
              Primary driver: Customer garment size & fitting adjustment.
            </p>
          </div>
        </div>

        {/* NAVIGATION SUB-TABS */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveView('desk')}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeView === 'desk'
                ? 'border-amber-500 text-amber-600 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Cashier Exchange Desk & Verification
          </button>
          <button
            onClick={() => setActiveView('register')}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeView === 'register'
                ? 'border-amber-500 text-amber-600 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Recent Exchanges Register ({recentExchanges.length})
          </button>
          <button
            onClick={() => setActiveView('insights')}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeView === 'insights'
                ? 'border-amber-500 text-amber-600 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shirt className="w-4 h-4" />
            Top Exchanged Categories & Sizing Insights
          </button>
        </div>

        {/* ==================================================================== */}
        {/* VIEW 1: CASHIER EXCHANGE DESK & CALCULATOR */}
        {/* ==================================================================== */}
        {activeView === 'desk' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: BILL SEARCH & ORIGINAL BILL DETAILS (7 COLS) */}
            <div className="lg:col-span-7 space-y-6">

              {/* SEARCH BOX */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <Search className="w-5 h-5 text-amber-500" />
                  Look Up Original Customer Bill
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Enter the original Invoice Number (e.g., <span className="font-mono text-slate-700">CM-2024-001</span>) or 10-digit customer mobile number.
                </p>

                <form onSubmit={handleBillLookup} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={lookupQuery}
                      onChange={(e) => setLookupQuery(e.target.value)}
                      placeholder="Type Bill No or Mobile Number..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Verify Bill</span>
                  </button>
                </form>

                {lookupError && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{lookupError}</span>
                  </div>
                )}
              </div>

              {/* BILL DETAILS & ELIGIBILITY */}
              {selectedBill ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-base">{selectedBill.BillNumber}</span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          selectedBill.DaysAgo <= 14
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {selectedBill.DaysAgo <= 14 ? '✅ Eligible (Within 14 Days)' : '⚠️ Expired (>14 Days)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Billed on: <span className="font-semibold text-slate-700">{new Date(selectedBill.BillTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> ({selectedBill.DaysAgo} days ago)
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</span>
                      <p className="text-sm font-black text-slate-800">{selectedBill.CustomerName?.trim() || 'Guest Shopper'}</p>
                      <p className="text-xs font-mono text-slate-500">{selectedBill.Phone || 'No Phone'}</p>
                    </div>
                  </div>

                  {/* SELECT ITEM TO EXCHANGE */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        1. Select Item Being Returned for Exchange
                      </label>
                      <span className="text-xs text-slate-400">{selectedBill.items?.length || 0} items on this bill</span>
                    </div>

                    {selectedBill.items && selectedBill.items.length > 0 ? (
                      <div className="space-y-2">
                        {selectedBill.items.map((item, idx) => {
                          const isSelected = selectedItemToExchange === item;
                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedItemToExchange(item)}
                              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-amber-50/70 border-amber-400 shadow-sm ring-1 ring-amber-400'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                                  isSelected ? 'bg-amber-500 text-white border-amber-600' : 'border-slate-300 text-slate-400'
                                }`}>
                                  {isSelected ? '✓' : idx + 1}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">{item.ArticleName}</h4>
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px]">{item.ArticleNo || 'SKU'}</span>
                                    <span>•</span>
                                    <span>Size: <strong className="text-slate-700">{item.Size || 'Standard'}</strong></span>
                                    <span>•</span>
                                    <span>Color: <strong className="text-slate-700">{item.Color || 'Standard'}</strong></span>
                                    <span>•</span>
                                    <span>Qty: {Math.abs(item.Quantity)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-xs text-slate-400 block">Credit Value</span>
                                <span className="text-base font-black text-amber-600">{formatCurrency(Math.abs(item.NetPrice))}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                        No line items found for this bill.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-3">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">No Bill Selected</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Search for the original cash memo using the search bar above to verify the 14-day exchange eligibility and calculate replacement values.
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: REPLACEMENT CALCULATOR & WHATSAPP SLIP (5 COLS) */}
            <div className="lg:col-span-5 space-y-6">

              {/* EXCHANGE VALUE CALCULATOR */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                    2. Replacement & Delta Calculator
                  </h3>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Step 2 of 2</span>
                </div>

                {/* Reason for Exchange */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Primary Reason for Exchange
                  </label>
                  <select
                    value={exchangeReason}
                    onChange={(e) => setExchangeReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Size Mismatch (Too Small)">Size Mismatch (Too Small - Needs Bigger Size)</option>
                    <option value="Size Mismatch (Too Big)">Size Mismatch (Too Big - Needs Smaller Size)</option>
                    <option value="Fitting / Cut Preference">Fitting / Cut Preference (Slim vs Regular)</option>
                    <option value="Color / Pattern Preference">Color / Pattern Preference</option>
                    <option value="Minor Stitch / Fabric Imperfection">Minor Stitch / Fabric Imperfection</option>
                    <option value="Gift Exchange">Gift Exchange by Recipient</option>
                    <option value="Upgraded to Higher Article">Upgraded to Higher Article (Suit / Blazer)</option>
                  </select>
                </div>

                {/* Replacement item details */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      New Replacement Article / Description
                    </label>
                    <input
                      type="text"
                      value={replacementItemName}
                      onChange={(e) => setReplacementItemName(e.target.value)}
                      placeholder="e.g. Cobb Slim-Fit Shirt (Size 42)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      New Replacement Item Price (₹)
                    </label>
                    <input
                      type="number"
                      value={replacementPrice}
                      onChange={(e) => setReplacementPrice(e.target.value)}
                      placeholder={selectedItemToExchange ? `${Math.abs(selectedItemToExchange.NetPrice)}` : '0.00'}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* CALCULATION SUMMARY CARD */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Original Item Credit Value:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatCurrency(Math.abs(originalCredit))}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>New Replacement Item Price:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {newPriceNum > 0 ? formatCurrency(newPriceNum) : 'Same Value'}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2.5 flex justify-between items-baseline">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      {priceDifference > 0 ? 'Amount to Collect (Upsell):' : priceDifference < 0 ? 'Credit Balance to Issue:' : 'Balance to Collect:'}
                    </span>
                    <span className={`text-xl font-black font-mono ${
                      priceDifference > 0
                        ? 'text-emerald-600'
                        : priceDifference < 0
                        ? 'text-amber-600'
                        : 'text-slate-800'
                    }`}>
                      {priceDifference > 0
                        ? `+${formatCurrency(priceDifference)}`
                        : priceDifference < 0
                        ? `${formatCurrency(Math.abs(priceDifference))} Credit`
                        : '₹0 (Even)'}
                    </span>
                  </div>
                </div>

                {priceDifference < 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>No Cash Refund Policy:</strong> Customer should select an additional item to utilize remaining balance or be issued a store exchange credit voucher.</span>
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={handleCopySlip}
                    disabled={!selectedBill || !selectedItemToExchange}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                  >
                    {copiedSlip ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSlip ? 'Exchange Slip Copied!' : 'Copy Digital Exchange Slip'}</span>
                  </button>

                  <button
                    onClick={handleOpenWhatsApp}
                    disabled={!selectedBill || !selectedItemToExchange || !selectedBill.Phone}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Slip via WhatsApp to {selectedBill?.Phone || 'Customer'}</span>
                  </button>
                </div>
              </div>

              {/* SLIP PREVIEW */}
              {selectedBill && selectedItemToExchange && (
                <div className="bg-slate-900 text-emerald-300 rounded-2xl p-5 font-mono text-[11px] leading-relaxed shadow-lg border border-slate-800 overflow-x-auto">
                  <p className="text-slate-400 font-bold uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                    Digital Slip Preview
                  </p>
                  <pre className="whitespace-pre-wrap font-mono text-slate-200">{exchangeSlipText}</pre>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: RECENT EXCHANGES REGISTER */}
        {/* ==================================================================== */}
        {activeView === 'register' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-500" />
                  Store Exchanges Register
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing transactions where items were returned for size/style exchange in Cobb POS.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by Bill, Customer, Article..."
                  value={registerSearch}
                  onChange={(e) => setRegisterSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Name</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Exchanged Article Name</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Credit Value</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentExchanges.length > 0 ? (
                    recentExchanges.map((ret, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-sm font-bold text-slate-800">
                          {ret.BillNumber || 'POS-MEMO'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 text-amber-700 font-black flex items-center justify-center text-xs shrink-0">
                              {(ret.CustomerName?.trim() || 'G')[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                              {ret.CustomerName?.trim() || 'Guest Shopper'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {ret.Phone ? (
                            <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-700 font-semibold">{ret.Phone}</span>
                          ) : (
                            <span className="text-slate-400 italic">No Phone</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-bold text-slate-800 block">
                            {ret.ArticleDetails || 'Exchanged Item'}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                            {ret.Size && <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">Size: {ret.Size}</span>}
                            {ret.Color && <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-700">Color: {ret.Color}</span>}
                            <span className="text-slate-400">({ret.ItemCount || 1} pc)</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                            {ret.Category || 'Apparel'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm font-black text-amber-600">
                            {formatCurrency(ret.ExchangeValue || ret.RefundAmount)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400 text-right whitespace-nowrap">
                          {ret.ExchangeDate || ret.ReturnDate
                            ? new Date(ret.ExchangeDate || ret.ReturnDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: '2-digit'
                              })
                            : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-5 py-12 text-center text-sm text-slate-400">
                        <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No exchange records match your search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 3: CATEGORY & SIZING INTELLIGENCE */}
        {/* ==================================================================== */}
        {activeView === 'insights' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* TOP EXCHANGED CATEGORIES */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-amber-500" />
                  Top Exchanged Categories
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Frequency of exchanges across store apparel sections</p>
              </div>

              <div className="space-y-4">
                {(returnsData?.topExchangedCategories || returnsData?.topReturnedCategories || []).length > 0 ? (
                  (returnsData?.topExchangedCategories || returnsData?.topReturnedCategories).map((cat, idx) => {
                    const topList = returnsData?.topExchangedCategories || returnsData?.topReturnedCategories;
                    const maxUnits = topList[0]?.ExchangedUnits || topList[0]?.ReturnedUnits || 1;
                    const currentUnits = cat.ExchangedUnits || cat.ReturnedUnits || 0;
                    const barWidth = Math.max((currentUnits / maxUnits) * 100, 10);
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 transition-all">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-bold text-slate-800">{cat.Category}</span>
                          <span className="text-xs font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                            {currentUnits} units exchanged
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-[11px] text-slate-400">
                          <span>{cat.ExchangeBills || cat.ReturnBills || 0} customer bills</span>
                          <span className="font-semibold text-slate-600">
                            {formatCurrency(cat.ExchangeValue || cat.RefundValue)} Credit
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No category exchange data recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* SIZING & FIT RECOMMENDATIONS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Shirt className="w-5 h-5 text-amber-500" />
                  Sizing & Fit Discrepancy Analysis
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actionable floor staff guidance based on Cobb apparel fit trends
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Slim-Fit Shirts: Suggest 1 Size Up</span>
                  </div>
                  <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                    Over 65% of shirt exchanges are from Size 40 to 42. Floor staff should proactively encourage trial room fittings or advise customers on tapered cuts.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                    <span>Trousers Length & Waist Alterations</span>
                  </div>
                  <p className="text-xs text-indigo-800/80 mt-1 leading-relaxed">
                    Offering complimentary hem and waist alterations at initial checkout reduces post-purchase trouser exchanges by up to 40%.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Exchange Upsell Opportunity</span>
                  </div>
                  <p className="text-xs text-emerald-800/80 mt-1 leading-relaxed">
                    When a customer brings an item for exchange, staff should introduce them to our coordinated bundles (e.g. matching belt or jacket) to turn the exchange into an upsell.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
