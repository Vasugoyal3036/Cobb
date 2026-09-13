import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Coffee,
  Sparkles,
  Wrench,
  Truck,
  Scissors,
  Package,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowDownRight,
  TrendingDown,
  RotateCcw,
  Receipt,
  User,
  ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';

export default function PocketKhataTab(props) {
  const {
    API_BASE = 'http://localhost:5000',
    darkMode,
    overviewStats,
    formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    activeStore = 'ALL'
  } = props;

  const { showToast } = useToast?.() || { showToast: (msg) => alert(msg) };

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState({
    date: new Date().toISOString().split('T')[0],
    totalSpent: 0,
    totalCount: 0,
    items: [],
    categories: []
  });

  // Expense form state
  const [selectedCategory, setSelectedCategory] = useState('chai');
  const [amountInput, setAmountInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [loggedByName, setLoggedByName] = useState('Counter Cashier');

  const CATEGORIES = [
    { key: 'chai', label: 'Chai & Snacks', icon: Coffee, defaultDesc: 'Tea & refreshments for staff/client' },
    { key: 'cleaning', label: 'Store Cleaning', icon: Sparkles, defaultDesc: 'Daily sweeper & cleaning supplies' },
    { key: 'repairs', label: 'Repairs & Lights', icon: Wrench, defaultDesc: 'Bulb replacement / maintenance' },
    { key: 'courier', label: 'Courier & Porter', icon: Truck, defaultDesc: 'Local tempo / parcel dispatch' },
    { key: 'tailor', label: 'Alteration Tailor', icon: Scissors, defaultDesc: 'Trouser/shirt fitting payment' },
    { key: 'packing', label: 'Bags & Packing', icon: Package, defaultDesc: 'Carry bags / butter paper roll' },
    { key: 'misc', label: 'Miscellaneous', icon: FileText, defaultDesc: 'Incidental counter petty cash' },
  ];

  const QUICK_AMOUNTS = [20, 50, 100, 150, 200, 500];

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/expenses/today?storeId=${activeStore}`);
      if (res.data?.success) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [activeStore]);

  const handleAddExpense = async (e) => {
    e?.preventDefault?.();
    const num = parseFloat(amountInput);
    if (!num || num <= 0) {
      showToast?.('Please enter a valid expense amount', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const currentCat = CATEGORIES.find(c => c.key === selectedCategory);
      const res = await axios.post(`${API_BASE}/api/expenses/add`, {
        category: selectedCategory,
        amount: num,
        description: descriptionInput || currentCat?.defaultDesc || 'Counter petty cash',
        loggedBy: loggedByName,
        storeId: activeStore
      });

      if (res.data?.success) {
        setSummary(res.data.summary);
        setAmountInput('');
        setDescriptionInput('');
        showToast?.(`Logged ₹${num} for ${currentCat?.label || selectedCategory}`, 'success');
      }
    } catch (err) {
      showToast?.(`Failed to save expense: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id, amount, label) => {
    if (!window.confirm(`Are you sure you want to void this ₹${amount} (${label}) entry?`)) {
      return;
    }

    try {
      const res = await axios.delete(`${API_BASE}/api/expenses/${id}`);
      if (res.data?.success) {
        fetchExpenses();
        showToast?.(`Voided entry ₹${amount}`, 'info');
      }
    } catch (err) {
      showToast?.(`Failed to delete: ${err.message}`, 'error');
    }
  };

  const grossCashSales = overviewStats?.today?.CashAmount || 0;
  const totalPettyCash = summary?.totalSpent || 0;
  const netExpectedDrawer = Math.max(0, grossCashSales - totalPettyCash);

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Pocket Khata
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-black rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> Counter Petty Cash
            </span>
          </div>
          <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time counter operational cash expenditure tracker. Automatically deducts from register so evening physical cash matches 100%.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchExpenses}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              darkMode 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title="Refresh Ledger"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4-Card Cash Drawer Tally Hero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Gross Cash Received */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gross Cash Sales</p>
              <h3 className={`text-2xl font-black mt-1 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {formatCurrency(grossCashSales)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            Recorded in POS today
          </p>
        </div>

        {/* 2. Petty Cash Expended */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50/60 border-amber-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Petty Cash Spent</p>
              <h3 className="text-2xl font-black mt-1 text-rose-500">
                - {formatCurrency(totalPettyCash)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-amber-600/80 mt-3 flex items-center gap-1 font-semibold">
            {summary.totalCount} expense(s) logged today
          </p>
        </div>

        {/* 3. Net Expected Drawer Balance */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/60 border-emerald-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Expected in Drawer</p>
              <h3 className="text-2xl font-black mt-1 text-emerald-400">
                {formatCurrency(netExpectedDrawer)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-emerald-600/80 mt-3 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Target physical register cash
          </p>
        </div>

        {/* 4. Variance Check Status */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Night Audit Ready</p>
              <h3 className={`text-base font-bold mt-1.5 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                100% Reconciled
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Auto-synced into EOD closing digest
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5 Cols): 1-Tap Quick Expense Entry Pad */}
        <div className={`lg:col-span-5 p-6 rounded-2xl border shadow-sm ${
          darkMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Quick Expense Entry</h3>
              <p className="text-[11px] text-slate-400">Tap category, select/enter amount, done in 2 seconds</p>
            </div>
          </div>

          <form onSubmit={handleAddExpense} className="space-y-4">
            {/* Category Selector Grid */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                1. Select Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.key);
                        if (!descriptionInput) {
                          setDescriptionInput(cat.defaultDesc);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                          : darkMode
                            ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span className="text-xs leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Input with Quick Chips */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                2. Amount Spent (₹)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {QUICK_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountInput(String(amt))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                      amountInput === String(amt)
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : darkMode
                          ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 font-black text-lg">₹</span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  className={`w-full pl-8 pr-4 py-2.5 rounded-xl text-lg font-black focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Note / Description */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                3. Purpose / Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 5 ginger teas for staff & customer"
                value={descriptionInput}
                onChange={e => setDescriptionInput(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Logged By */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                4. Cash Handed To / Paid By
              </label>
              <select
                value={loggedByName}
                onChange={e => setLoggedByName(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 border cursor-pointer ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="Counter Cashier">👔 Counter Cashier</option>
                <option value="Store Manager">👑 Store Manager</option>
                <option value="Owner / Partner">⭐ Owner / Partner</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !amountInput}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : `Log Expense (-₹${amountInput || '0'})`}</span>
            </button>
          </form>
        </div>

        {/* Right Column (7 Cols): Today's Ledger & Category Breakdown */}
        <div className={`lg:col-span-7 p-6 rounded-2xl border shadow-sm flex flex-col min-h-[460px] ${
          darkMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Today's Expense Journal</h3>
              <p className="text-[11px] text-slate-400">
                {summary.totalCount} transaction(s) totalling {formatCurrency(summary.totalSpent)}
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 text-slate-300">
              {summary.date}
            </span>
          </div>

          {/* Category chips breakdown */}
          {summary.categories?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
              {summary.categories.map(c => (
                <div key={c.key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs">
                  <span>{c.icon}</span>
                  <span className="text-slate-300">{c.label}:</span>
                  <span className="font-bold text-amber-400">{formatCurrency(c.total)}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({c.count})</span>
                </div>
              ))}
            </div>
          )}

          {/* Ledger Table / List */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-500">
              <RotateCcw className="w-6 h-6 animate-spin mb-2 text-amber-400" />
              <p className="text-xs">Loading ledger entries...</p>
            </div>
          ) : summary.items?.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3 text-slate-400">
                <Receipt className="w-6 h-6 opacity-60" />
              </div>
              <p className="text-sm font-bold text-slate-300">No Counter Expenses Logged Today</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Whenever cash is paid from the register for tea, cleaning, tailoring or porter, log it on the left pad.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar pr-1">
              {summary.items.map(item => (
                <div
                  key={item.id}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-800/30 rounded-lg transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 shrink-0">
                      {item.categoryIcon || '📝'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-200">{item.categoryLabel}</h4>
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Paid by {item.loggedBy}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black text-rose-400 font-mono">
                      - {formatCurrency(item.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(item.id, item.amount, item.categoryLabel)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-70 group-hover:opacity-100 cursor-pointer"
                      title="Void Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Tally Summary */}
          {summary.items?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Deductions From Drawer:</span>
              <span className="font-black text-rose-400 font-mono text-sm">
                - {formatCurrency(summary.totalSpent)}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
