import React, { useState, useEffect, Suspense, lazy } from 'react';
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
  TrendingUp,
  RotateCcw,
  Receipt,
  User,
  ShieldCheck,
  Banknote,
  Camera,
  Image as ImageIcon,
  DollarSign,
  Landmark,
  Building2,
  ChevronDown,
  ChevronUp,
  Info,
  Percent,
  Zap,
  ArrowRight,
  Smartphone,
  Scale,
  BookOpen
} from 'lucide-react';
import axios from 'axios';
import { db } from '../../utils/firebase';
import { collection, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';

const AlterationSlipModal = lazy(() => import('../AlterationSlipModal'));
const DenominationModal = lazy(() => import('../DenominationModal'));
import { calculateDynamicBreakeven } from '../../utils/dynamicBreakevenEngine';
import DynamicBreakevenLedger from './DynamicBreakevenLedger';
import CustomerKhataLedger from './CustomerKhataLedger';

export default function PocketKhataTab(props) {
  const {
    API_BASE = 'http://localhost:5000',
    darkMode,
    overviewStats,
    pnlData,
    formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
    activeStore = 'ALL'
  } = props;

  const { showToast } = useToast?.() || { showToast: (msg) => alert(msg) };

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAlterationModal, setShowAlterationModal] = useState(false);
  const [showDenominationModal, setShowDenominationModal] = useState(false);
  const [showOperatingProfitView, setShowOperatingProfitView] = useState(false);
  const [activeSubView, setActiveSubView] = useState('khata'); // 'khata' | 'breakeven'
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
  const [receiptImage, setReceiptImage] = useState(null);

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

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
      // 1. Try local Express API first
      const res = await axios.get(`${API_BASE}/api/expenses/today?storeId=${activeStore}`, { timeout: 3500 });
      if (res.data?.success && res.data.summary) {
        setSummary(res.data.summary);
        return;
      }
    } catch (err) {
      console.warn('[PocketKhata] Local Express API fetch failed, checking Firestore cloud:', err.message);
    }

    // 2. Cloud Firestore fallback for Phone Link
    try {
      const storeDocId = activeStore && activeStore !== 'ALL' ? activeStore : 'DEMO_STORE_001';
      if (db) {
        const snap = await getDoc(doc(db, 'stores', storeDocId, 'data', 'expenses_today'));
        if (snap.exists()) {
          const d = snap.data();
          if (d?.summary) {
            setSummary(d.summary);
          } else if (d?.totalSpent !== undefined) {
            setSummary(d);
          }
        }
      }
    } catch (cloudErr) {
      console.warn('[PocketKhata] Firestore read error:', cloudErr.message);
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener for remote expense updates across devices & phone link
  useEffect(() => {
    fetchExpenses();

    const storeDocId = activeStore && activeStore !== 'ALL' ? activeStore : 'DEMO_STORE_001';
    let unsub = null;
    try {
      if (db) {
        unsub = onSnapshot(doc(db, 'stores', storeDocId, 'data', 'expenses_today'), (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            if (d?.summary) {
              setSummary(d.summary);
              setLoading(false);
            } else if (d?.totalSpent !== undefined) {
              setSummary(d);
              setLoading(false);
            }
          }
        }, (err) => console.warn('[PocketKhata] onSnapshot error:', err.message));
      }
    } catch (e) {
      console.warn('[PocketKhata] Firestore listener error:', e.message);
    }

    return () => {
      if (unsub) unsub();
    };
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
      const storeDocId = activeStore && activeStore !== 'ALL' ? activeStore : 'DEMO_STORE_001';
      
      const expenseData = {
        category: selectedCategory,
        amount: num,
        description: descriptionInput || currentCat?.defaultDesc || 'Counter petty cash',
        loggedBy: loggedByName,
        storeId: storeDocId
      };

      let localSaved = false;
      // 1. Post to Express for POS tallying if available
      try {
        const res = await axios.post(`${API_BASE}/api/expenses/add`, expenseData, { timeout: 3500 });
        if (res.data?.success) {
          setSummary(res.data.summary);
          localSaved = true;
        }
      } catch (apiErr) {
        console.warn('[PocketKhata] Local Express add failed or offline:', apiErr.message);
      }

      // 2. Save full voucher (including image) to Cloud Firestore for Owner Approval
      const voucherId = `ev_${Date.now()}`;
      if (db) {
        await setDoc(doc(db, `stores/${storeDocId}/data/expense_vouchers/${voucherId}`), {
          ...expenseData,
          id: voucherId,
          timestamp: serverTimestamp(),
          receiptImage: receiptImage || null,
          status: 'pending_approval' // owner approval required
        });
      }

      // 3. If local was offline (e.g. on Phone Link), update local state & sync to Firestore
      if (!localSaved) {
        const newExpenseItem = {
          id: voucherId,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0],
          category: selectedCategory,
          categoryLabel: currentCat?.label || selectedCategory,
          categoryIcon: '📝',
          amount: num,
          description: expenseData.description,
          loggedBy: loggedByName,
          storeId: storeDocId
        };
        const updatedItems = [newExpenseItem, ...(summary.items || [])];
        const newTotalSpent = Math.round(((summary.totalSpent || 0) + num) * 100) / 100;
        const newSummary = {
          date: new Date().toISOString().split('T')[0],
          totalSpent: newTotalSpent,
          totalCount: updatedItems.length,
          items: updatedItems,
          categories: summary.categories || []
        };
        setSummary(newSummary);

        if (db) {
          try {
            await setDoc(doc(db, `stores/${storeDocId}/data/expenses_today`), {
              summary: newSummary,
              totalSpent: newTotalSpent,
              totalCount: updatedItems.length,
              lastUpdated: serverTimestamp()
            }, { merge: true });
          } catch (syncErr) {
            console.warn('[PocketKhata] Cloud summary sync error:', syncErr.message);
          }
        }
      }

      setAmountInput('');
      setDescriptionInput('');
      setReceiptImage(null);
      showToast?.(`Logged ₹${num} for ${currentCat?.label || selectedCategory}`, 'success');
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

  // --- CORE FINANCIAL CALCULATIONS ---
  // Total Store Revenue Today (All payment tenders: Cash + UPI + Card)
  const todaySales = Number(overviewStats?.today?.TotalSales || 0);
  const todayBills = Number(overviewStats?.today?.BillCount || 0);
  const grossCashSales = Number(overviewStats?.today?.CashAmount || 0);
  const upiSales = Number(overviewStats?.today?.UPIAmount || 0);
  const cardSales = Number(overviewStats?.today?.CardAmount || 0);
  const digitalSales = upiSales + cardSales;

  // Daily Expenses Logged Today
  const totalPettyCash = Number(summary?.totalSpent || 0);
  const expensesCount = Number(summary?.totalCount || summary?.items?.length || 0);

  // 1. "HOW MUCH DID WE EARN TODAY AFTER EXPENSE" (Realized Net Inflow / Take-Home)
  const netEarnedToday = todaySales - totalPettyCash;
  const isNetPositive = netEarnedToday >= 0;
  const retentionRate = todaySales > 0 ? ((netEarnedToday / todaySales) * 100).toFixed(1) : (totalPettyCash > 0 ? '0.0' : '100.0');

  // 2. Physical Till Cash Balance
  const netExpectedDrawer = Math.max(0, grossCashSales - totalPettyCash);
  const isCashDeficit = grossCashSales - totalPettyCash < 0;
  const cashDeficitAmount = isCashDeficit ? Math.abs(grossCashSales - totalPettyCash) : 0;

  // 3. Store Net Operating Profit (P&L view accounting for amortized store rent, staff & power)
  const grossMarginRate = 0.27; // Cobb standard 27% gross margin
  const dailyGrossMargin = Math.round(todaySales * grossMarginRate);
  const fixedDailyOpEx = Number(
    pnlData?.operatingExpenses?.dailyExpense ||
    pnlData?.operatingExpenses?.dailyAmortizedExpense ||
    (pnlData?.operatingExpenses?.totalExpenses ? Math.round(pnlData.operatingExpenses.totalExpenses / 30) : 3366)
  );
  const netStoreOperatingProfit = dailyGrossMargin - totalPettyCash - fixedDailyOpEx;
  const isOperatingProfitable = netStoreOperatingProfit >= 0;

  const dynamicBEPData = React.useMemo(() => {
    return calculateDynamicBreakeven({
      dailySales: props.dailySales || [],
      expenses: summary.items || [],
      storeConfig: props.storeConfig,
      pnlData,
      overviewStats
    });
  }, [props.dailySales, summary.items, props.storeConfig, pnlData, overviewStats]);

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Daily Expenses &amp; Net Earned
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-black rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> Pocket Khata Ledger
            </span>
          </div>
          <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Live store expense journal: tracks daily counter outflows and calculates dynamic rolling break-even with compounded previous losses.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setActiveSubView('customer_khata')}
            className={`p-2 px-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              activeSubView === 'customer_khata'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                : darkMode 
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25' 
                  : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-xs'
            }`}
            title="Customer Udhar Passbook & Credit Book"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Customer Udhar</span>
          </button>
          <button
            onClick={() => setShowDenominationModal(true)}
            className={`p-2 px-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              darkMode 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 shadow-sm' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-xs'
            }`}
            title="Count Physical Cash Notes & Reconcile Drawer"
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Count Notes &amp; Close</span>
          </button>
          <button
            onClick={() => setShowAlterationModal(true)}
            className={`p-2 px-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              darkMode 
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25' 
                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-xs'
            }`}
            title="Create Alteration Slip"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Alteration Slip</span>
          </button>
          <button
            onClick={fetchExpenses}
            className={`p-2 px-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              darkMode 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title="Refresh Ledger"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* View Switcher: Expense Journal vs Customer Udhar vs Dynamic Breakeven */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-slate-800 w-full sm:w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubView('khata')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubView === 'khata'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Daily Expense &amp; Take-Home</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('customer_khata')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubView === 'customer_khata'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Customer Udhar &amp; Credit Ledger</span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Passbook
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('breakeven')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubView === 'breakeven'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Dynamic Rolling Breakeven</span>
          {dynamicBEPData?.today?.carriedLossFromPreviousDays > 0 ? (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-rose-500/30 text-rose-300 border border-rose-500/40">
              +{formatCurrency(dynamicBEPData.today.carriedLossFromPreviousDays)} loss
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Target: {formatCurrency(dynamicBEPData?.today?.adjustedBEPToday || 13467)}
            </span>
          )}
        </button>
      </div>

      {activeSubView === 'customer_khata' ? (
        <CustomerKhataLedger
          API_BASE={API_BASE}
          activeStore={activeStore}
          darkMode={darkMode}
          formatCurrency={formatCurrency}
        />
      ) : activeSubView === 'breakeven' ? (
        <DynamicBreakevenLedger
          dailySales={props.dailySales || []}
          expenses={summary.items || []}
          storeConfig={props.storeConfig}
          pnlData={pnlData}
          overviewStats={overviewStats}
          darkMode={darkMode}
          formatCurrency={formatCurrency}
          activeStore={activeStore}
          API_BASE={API_BASE}
        />
      ) : (
        <>
          {/* Dynamic Breakeven Callout Banner */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            darkMode ? 'bg-amber-500/10 border-amber-500/20 text-slate-200' : 'bg-amber-50 border-amber-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/30">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Dynamic Breakeven Target Today</span>
                  <span className="text-sm font-black font-mono text-amber-300">
                    {dynamicBEPData?.today?.adjustedBEPToday === 0 
                      ? '₹0 (100% Pre-Paid 🎉)' 
                      : formatCurrency(dynamicBEPData?.today?.adjustedBEPToday || 13467)}
                  </span>
                  {dynamicBEPData?.today?.isDeficit && (
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                      Recouping {formatCurrency(dynamicBEPData.today.carriedDeficit)} prev loss
                    </span>
                  )}
                  {dynamicBEPData?.today?.isSurplus && (
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      +{formatCurrency(dynamicBEPData.today.surplusProfit)} profit cushion (discounted)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {dynamicBEPData?.today?.isDeficit
                    ? `Base daily cost is ₹13,467. Previous days' unrecovered deficit of ${formatCurrency(dynamicBEPData.today.carriedDeficit)} has been compounded into today's target.`
                    : dynamicBEPData?.today?.isSurplus
                      ? `Previous days' surplus profit of ${formatCurrency(dynamicBEPData.today.surplusProfit)} has pre-funded today's expenses, lowering breakeven target from ₹13,467 to ${formatCurrency(dynamicBEPData.today.adjustedBEPToday)}.`
                      : 'All previous deficits fully recovered. Operating at standard daily breakeven target of ₹13,467.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubView('breakeven')}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
            >
              <span>View Compounding Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ========================================================================= */}
          {/* 🌟 HERO EQUATION BANNER: "HOW MUCH DID WE EARN TODAY AFTER EXPENSES" 🌟 */}
          {/* ========================================================================= */}
          <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
            darkMode 
              ? 'bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 border-emerald-500/40 shadow-emerald-950/25' 
              : 'bg-gradient-to-br from-emerald-50/90 via-white to-slate-50 border-emerald-200 shadow-emerald-100/50'
          }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" /> Today's Net Take-Home
              </span>
              <span className={`text-xs font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {summary.date || new Date().toISOString().split('T')[0]}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <h3 className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                isNetPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
              }`}>
                {formatCurrency(netEarnedToday)}
              </h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                isNetPositive 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}>
                {isNetPositive ? `+${retentionRate}% Retained` : 'Deficit'}
              </span>
            </div>
            <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Total Revenue earned today across all payment tenders after deducting daily counter expenses.
            </p>
          </div>

          {/* Golden Equation Visualizer */}
          <div className={`flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-4 p-4 rounded-2xl border ${
            darkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-white/95 border-slate-200 shadow-sm'
          }`}>
            <div className="text-center sm:text-left min-w-[90px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Sales</p>
              <p className={`text-base sm:text-xl font-black font-mono mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {formatCurrency(todaySales)}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold">{todayBills} bills</p>
            </div>

            <span className="text-slate-400 font-black text-xl select-none">−</span>

            <div className="text-center sm:text-left min-w-[90px]">
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Expenses</p>
              <p className="text-base sm:text-xl font-black font-mono mt-0.5 text-rose-500">
                {formatCurrency(totalPettyCash)}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold">{expensesCount} logged</p>
            </div>

            <span className="text-slate-400 font-black text-xl select-none">=</span>

            <div className="text-center sm:text-left min-w-[110px] p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Net Earned
              </p>
              <p className="text-base sm:text-xl font-black font-mono mt-0.5 text-emerald-500 dark:text-emerald-400">
                {formatCurrency(netEarnedToday)}
              </p>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{retentionRate}% kept</p>
            </div>
          </div>
        </div>

        {/* Tender Destination Breakdown (Digital in Bank vs Cash in Drawer) */}
        <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50/90 border-slate-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  Direct in Bank (100% Digital)
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400">Untampered</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  UPI ({formatCurrency(upiSales)}) + Card ({formatCurrency(cardSales)}) settled straight to account
                </p>
              </div>
            </div>
            <span className="font-black font-mono text-indigo-600 dark:text-indigo-400 text-sm">
              {formatCurrency(digitalSales)}
            </span>
          </div>

          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50/90 border-slate-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  Physical Cash in Till Drawer
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400">Night Till Target</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Gross cash ({formatCurrency(grossCashSales)}) minus daily cash expenses ({formatCurrency(totalPettyCash)})
                </p>
              </div>
            </div>
            <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
              {formatCurrency(netExpectedDrawer)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4-CARD HERO KPI GRID */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today's Total Sales (Gross Inflow) */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today's Total Sales</p>
              <h3 className={`text-2xl font-black mt-1 font-mono ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {formatCurrency(todaySales)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center justify-between">
            <span>Across {todayBills} bills today</span>
            <span className="font-mono text-[11px] text-blue-400">UPI {formatCurrency(upiSales)}</span>
          </p>
        </div>

        {/* 2. Today's Daily Expenses */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50/60 border-amber-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Daily Expenses Spent</p>
              <h3 className="text-2xl font-black mt-1 font-mono text-rose-500">
                - {formatCurrency(totalPettyCash)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-amber-600/80 mt-3 flex items-center gap-1 font-semibold">
            {expensesCount} expense item(s) logged today
          </p>
        </div>

        {/* 3. Net Earned Today (Hero Feature) */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode 
            ? 'bg-emerald-950/30 border-emerald-500/40 ring-1 ring-emerald-500/20' 
            : 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/20'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Net Earned Today
              </p>
              <h3 className="text-2xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(netEarnedToday)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400/90 mt-3 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Earned after all expenses
          </p>
        </div>

        {/* 4. Physical Cash In Drawer */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Expected in Drawer</p>
              <h3 className={`text-2xl font-black mt-1 font-mono ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {formatCurrency(netExpectedDrawer)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center justify-between">
            <span>Cash register till target</span>
            <span className="font-mono text-[11px] text-purple-400">Gross {formatCurrency(grossCashSales)}</span>
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OPTIONAL STORE OPERATING PROFIT (P&L OVERHEAD ACCORDION) */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setShowOperatingProfitView(!showOperatingProfitView)}
          className={`w-full p-4 flex items-center justify-between text-left cursor-pointer transition-colors ${
            darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                Store Operating Profit (P&amp;L Overheads Analysis)
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  Rent, Staff &amp; Power
                </span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Accounting view: Retail margin (~27%) minus amortized store overheads (₹{formatCurrency(fixedDailyOpEx)}/day) &amp; daily expenses.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-black font-mono px-2.5 py-1 rounded-lg border ${
              isOperatingProfitable 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}>
              Est. Net Profit: {formatCurrency(netStoreOperatingProfit)}
            </span>
            {showOperatingProfitView ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {showOperatingProfitView && (
          <div className={`p-4 pt-1 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs ${
            darkMode ? 'bg-slate-950/40' : 'bg-slate-50/50'
          }`}>
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">1. Gross Margin (27%)</span>
              <p className="text-base font-black font-mono text-emerald-500 mt-1">+{formatCurrency(dailyGrossMargin)}</p>
              <p className="text-[10px] text-slate-500">On ₹{formatCurrency(todaySales)} sales</p>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">2. Daily Petty Cash</span>
              <p className="text-base font-black font-mono text-rose-400 mt-1">-{formatCurrency(totalPettyCash)}</p>
              <p className="text-[10px] text-slate-500">Logged at counter</p>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">3. Store Daily OpEx</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new Event('cobb_open_store_expenses'));
                  }}
                  className="text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline cursor-pointer flex items-center gap-0.5"
                  title="Modify Daily Expense & Staff Salaries"
                >
                  <span>Edit OpEx</span>
                </button>
              </div>
              <p className="text-base font-black font-mono text-amber-400 mt-1">-{formatCurrency(fixedDailyOpEx)}</p>
              <p className="text-[10px] text-slate-500">Rent, electricity, dynamic staff</p>
            </div>
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <span className="text-[10px] font-bold text-emerald-500 uppercase">= Net Store Profit</span>
              <p className={`text-base font-black font-mono mt-1 ${isOperatingProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatCurrency(netStoreOperatingProfit)}
              </p>
              <p className="text-[10px] text-slate-500">{isOperatingProfitable ? 'Above break-even' : 'Below daily break-even'}</p>
            </div>
          </div>
        )}
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

            {/* Receipt / Voucher Upload */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>5. Receipt Photo (For Owner Approval)</span>
                {receiptImage && (
                  <button type="button" onClick={() => setReceiptImage(null)} className="text-red-400 hover:text-red-300">
                    Clear
                  </button>
                )}
              </label>
              
              {!receiptImage ? (
                <label className={`w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  darkMode ? 'border-slate-700 bg-slate-900/50 hover:bg-slate-800' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}>
                  <Camera className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">Tap to capture receipt</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleImageCapture}
                    className="hidden" 
                  />
                </label>
              ) : (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-700">
                  <img src={receiptImage} alt="Receipt preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                    <span className="text-white text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-400" /> Attached
                    </span>
                  </div>
                </div>
              )}
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
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Total Daily Counter Expenses:</span>
                <span className="font-black text-rose-500 font-mono text-sm">
                  - {formatCurrency(summary.totalSpent)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 font-bold">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Net Earned Today (Sales - Expenses):
                </span>
                <span className="font-mono text-sm font-black text-emerald-500">
                  {formatCurrency(netEarnedToday)}
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
      </>
      )}

      {showAlterationModal && (
        <Suspense fallback={null}>
          <AlterationSlipModal
            isOpen={showAlterationModal}
            onClose={() => setShowAlterationModal(false)}
            darkMode={darkMode}
          />
        </Suspense>
      )}

      {showDenominationModal && (
        <Suspense fallback={null}>
          <DenominationModal
            isOpen={showDenominationModal}
            onClose={() => setShowDenominationModal(false)}
            API_BASE={API_BASE}
          />
        </Suspense>
      )}
    </div>
  );
}
