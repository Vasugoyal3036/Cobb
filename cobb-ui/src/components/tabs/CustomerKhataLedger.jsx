import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  BookOpen,
  User,
  Phone,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Share2,
  Printer,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Receipt,
  Trash2,
  X,
  CreditCard,
  Building2,
  ChevronRight,
  Filter,
  Sparkles,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import QRCode from 'qrcode';
import { db } from '../../utils/firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { triggerThermalPrint, DEFAULT_STORE_INFO } from '../../utils/thermalReceipt';

export default function CustomerKhataLedger({
  API_BASE = 'http://localhost:5000',
  activeStore = 'DEMO_STORE_001',
  darkMode = true,
  formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  storeInfo = DEFAULT_STORE_INFO
}) {
  let showToast = (msg) => console.log(msg);
  try {
    const toastCtx = useToast();
    if (toastCtx?.showToast) showToast = toastCtx.showToast;
    else if (toastCtx?.addToast) showToast = toastCtx.addToast;
  } catch (e) {
    // Fallback if rendered outside ToastProvider
  }

  // Data states
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    totalCreditGiven: 0,
    totalCollected: 0,
    collectedThisMonth: 0,
    totalAccounts: 0,
    activeDuesCount: 0,
    settledCount: 0,
    overdueCount: 0,
    topDueCustomers: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'SETTLED' | 'OVERDUE'

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Transaction form state
  const [txnType, setTxnType] = useState('GAVE'); // 'GAVE' (Udhar) | 'GOT' (Jama)
  const [txnAmount, setTxnAmount] = useState('');
  const [txnBillNumber, setTxnBillNumber] = useState('');
  const [txnItemsSummary, setTxnItemsSummary] = useState('');
  const [txnPaymentMode, setTxnPaymentMode] = useState('Cash');
  const [txnDueDate, setTxnDueDate] = useState('');
  const [txnNotes, setTxnNotes] = useState('');
  const [submittingTxn, setSubmittingTxn] = useState(false);

  // New customer form state
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCity, setNewCustCity] = useState('Pundri');
  const [newCustLimit, setNewCustLimit] = useState(25000);
  const [newCustNotes, setNewCustNotes] = useState('');
  const [submittingCust, setSubmittingCust] = useState(false);

  // Fetch Khata list & summary from Node API or Firestore fallback
  const fetchKhata = useCallback(async () => {
    setLoading(true);
    let loadedFromApi = false;
    const storeDocId = activeStore && activeStore !== 'ALL' ? activeStore : 'DEMO_STORE_001';

    try {
      const res = await axios.get(`${API_BASE}/api/khata/customers?storeId=${storeDocId}`, { timeout: 3500 });
      if (res.data?.success) {
        setCustomers(res.data.customers || []);
        if (res.data.summary) setSummary(res.data.summary);
        loadedFromApi = true;
      }
    } catch (err) {
      console.warn('[CustomerKhata] Local API failed, trying Cloud Firestore:', err.message);
    }

    if (!loadedFromApi && db) {
      try {
        const snap = await getDoc(doc(db, 'stores', storeDocId, 'data', 'khata_customers'));
        if (snap.exists()) {
          const d = snap.data();
          const items = Array.isArray(d.items) ? d.items : (Array.isArray(d.customers) ? d.customers : []);
          setCustomers(items);
        }
        const sumSnap = await getDoc(doc(db, 'stores', storeDocId, 'data', 'khata_summary'));
        if (sumSnap.exists()) {
          setSummary(sumSnap.data());
        }
      } catch (cloudErr) {
        console.warn('[CustomerKhata] Firestore fallback error:', cloudErr.message);
      }
    }
    setLoading(false);
  }, [API_BASE, activeStore]);

  // Real-time Firestore sync
  useEffect(() => {
    fetchKhata();

    const storeDocId = activeStore && activeStore !== 'ALL' ? activeStore : 'DEMO_STORE_001';
    let unsubCust = null;
    let unsubSum = null;

    if (db) {
      try {
        unsubCust = onSnapshot(doc(db, 'stores', storeDocId, 'data', 'khata_customers'), (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const items = Array.isArray(d.items) ? d.items : (Array.isArray(d.customers) ? d.customers : []);
            setCustomers(items);
            setLoading(false);
          }
        }, (err) => console.warn('[CustomerKhata] onSnapshot customers error:', err.message));

        unsubSum = onSnapshot(doc(db, 'stores', storeDocId, 'data', 'khata_summary'), (snap) => {
          if (snap.exists()) {
            setSummary(snap.data());
          }
        }, (err) => console.warn('[CustomerKhata] onSnapshot summary error:', err.message));
      } catch (e) {
        console.warn('[CustomerKhata] Listener init error:', e.message);
      }
    }

    return () => {
      if (unsubCust) unsubCust();
      if (unsubSum) unsubSum();
    };
  }, [fetchKhata, activeStore]);

  // Load single customer detail (transactions passbook)
  const loadCustomerDetail = useCallback(async (customerId) => {
    if (!customerId) return;
    try {
      const res = await axios.get(`${API_BASE}/api/khata/customer/${customerId}`, { timeout: 3500 });
      if (res.data?.success && res.data.customer) {
        setSelectedCustomerData(res.data.customer);
        return;
      }
    } catch (err) {
      console.warn('[CustomerKhata] Fetch customer details from local API failed:', err.message);
    }

    // Fallback: search in local customers array
    const found = customers.find(c => c.id === customerId);
    if (found) {
      setSelectedCustomerData({
        ...found,
        transactions: found.transactions || []
      });
    }
  }, [API_BASE, customers]);

  // Auto-select first customer if none selected
  useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
      loadCustomerDetail(customers[0].id);
    } else if (selectedCustomerId) {
      loadCustomerDetail(selectedCustomerId);
    }
  }, [customers, selectedCustomerId, loadCustomerDetail]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    let list = [...customers];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'PENDING') {
      list = list.filter(c => Number(c.balance || 0) > 0);
    } else if (statusFilter === 'SETTLED') {
      list = list.filter(c => Number(c.balance || 0) <= 0);
    } else if (statusFilter === 'OVERDUE') {
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      list = list.filter(c => {
        const bal = Number(c.balance || 0);
        const lastTx = c.lastTransactionDate ? new Date(c.lastTransactionDate).getTime() : 0;
        return bal > 0 && (now - lastTx > thirtyDays);
      });
    }
    return list;
  }, [customers, searchQuery, statusFilter]);

  // Active customer object
  const activeCustomer = useMemo(() => {
    return selectedCustomerData || customers.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerData, customers, selectedCustomerId]);

  // UPI VPA configuration for store
  const storeUpiVpa = storeInfo?.upiVpa || '9138122820@upi';
  const storePayeeName = encodeURIComponent(storeInfo?.name || 'Cobb Apparels');

  // Generate UPI Payment URI
  const generateUpiUrl = (amount, note = 'Khata Payment') => {
    const amt = Number(amount || 0).toFixed(2);
    const tn = encodeURIComponent(note);
    return `upi://pay?pa=${storeUpiVpa}&pn=${storePayeeName}&am=${amt}&tn=${tn}&cu=INR`;
  };

  // Open Dynamic UPI QR Modal
  const handleOpenQrModal = async (amount) => {
    const amt = amount || activeCustomer?.balance || 0;
    if (amt <= 0) {
      showToast('No pending balance to collect', 'info');
      return;
    }
    const upiUri = generateUpiUrl(amt, `Khata Dues ${activeCustomer?.name || ''}`);
    try {
      const dataUrl = await QRCode.toDataURL(upiUri, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      setQrCodeDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (err) {
      showToast('Failed to generate UPI QR code', 'error');
    }
  };

  // Generate WhatsApp Reminder Message and open WhatsApp Web/Mobile
  const handleSendWhatsAppReminder = (cust) => {
    const target = cust || activeCustomer;
    if (!target) return;
    const phone = (target.phone || '').replace(/\D/g, '').slice(-10);
    if (!phone || phone.length < 10) {
      showToast('Customer does not have a valid mobile number', 'error');
      return;
    }

    const bal = formatCurrency(target.balance || 0);
    const upiLink = generateUpiUrl(target.balance, `Khata Clear ${target.name}`);

    const message = 
`Namaste ${target.name} Ji 🙏,

This is a gentle payment reminder from COBB APPARELS, Pundri.

📋 *Your Account Balance Summary:*
• Outstanding Dues: *${bal}*
• Last Transaction: ${target.lastTransactionDate ? new Date(target.lastTransactionDate).toLocaleDateString('en-IN') : 'Recent'}
${target.notes ? `• Reference: ${target.notes}\n` : ''}
💳 *Instant Pay via UPI (Click below to pay via GPay / PhonePe / Paytm):*
${upiLink}

UPI ID: ${storeUpiVpa}

Thank you for being a valued Cobb patron!
📍 Cobb Apparels, Fatehpur Road, Pundri
📞 Phone: ${storeInfo?.phone || '+91 91381 22820'}`;

    const waUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    showToast(`WhatsApp reminder opened for ${target.name}`, 'success');
  };

  // Copy UPI Link to clipboard
  const handleCopyUpiLink = (amount) => {
    const upiUri = generateUpiUrl(amount || activeCustomer?.balance, `Khata ${activeCustomer?.name}`);
    navigator.clipboard.writeText(upiUri);
    setCopiedLink(true);
    showToast('UPI payment link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Submit new customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }
    const cleanPhone = newCustPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      showToast('Valid 10-digit mobile number required', 'error');
      return;
    }

    try {
      setSubmittingCust(true);
      const storeDocId = activeStore && activeStore !== 'ALL' ? activeStore : 'DEMO_STORE_001';
      const custPayload = {
        name: newCustName.trim(),
        phone: cleanPhone,
        city: newCustCity.trim() || 'Pundri',
        creditLimit: Number(newCustLimit) || 20000,
        notes: newCustNotes.trim(),
        trustRating: 'TRUSTED',
        storeId: storeDocId
      };

      let localSaved = false;
      try {
        const res = await axios.post(`${API_BASE}/api/khata/customer`, custPayload, { timeout: 3500 });
        if (res.data?.success) {
          localSaved = true;
          setSelectedCustomerId(res.data.customer.id);
        }
      } catch (apiErr) {
        console.warn('[CustomerKhata] Local API customer save failed:', apiErr.message);
      }

      // Sync to Firestore
      if (db) {
        const custId = `khata_${cleanPhone}`;
        const newRecord = {
          ...custPayload,
          id: custId,
          balance: 0,
          totalGave: 0,
          totalGot: 0,
          status: 'SETTLED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastUpdated: serverTimestamp()
        };

        const updatedCustomers = [newRecord, ...customers.filter(c => c.id !== custId)];
        await setDoc(doc(db, 'stores', storeDocId, 'data', 'khata_customers'), {
          items: updatedCustomers,
          lastUpdated: serverTimestamp()
        }, { merge: true });

        if (!localSaved) {
          setCustomers(updatedCustomers);
          setSelectedCustomerId(custId);
        }
      }

      showToast(`Added ${newCustName} to Khata Book!`, 'success');
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustNotes('');
      fetchKhata();
    } catch (err) {
      showToast(`Error adding customer: ${err.message}`, 'error');
    } finally {
      setSubmittingCust(false);
    }
  };

  // Submit transaction (Gave Udhar vs Got Payment)
  const handleRecordTransaction = async (e) => {
    e.preventDefault();
    const num = parseFloat(txnAmount);
    if (!num || num <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    if (!activeCustomer) {
      showToast('Select a customer first', 'error');
      return;
    }

    try {
      setSubmittingTxn(true);
      const storeDocId = activeStore && activeStore !== 'ALL' ? activeStore : 'DEMO_STORE_001';
      const txnPayload = {
        customerId: activeCustomer.id,
        type: txnType,
        amount: num,
        billNumber: txnBillNumber.trim(),
        itemsSummary: txnItemsSummary.trim(),
        paymentMode: txnType === 'GOT' ? txnPaymentMode : null,
        dueDate: txnDueDate || null,
        notes: txnNotes.trim(),
        loggedBy: 'Cashier (Counter)',
        storeId: storeDocId
      };

      let localSuccess = false;
      try {
        const res = await axios.post(`${API_BASE}/api/khata/transaction`, txnPayload, { timeout: 3500 });
        if (res.data?.success) {
          localSuccess = true;
          setSelectedCustomerData(res.data.customer);
          if (res.data.summary) setSummary(res.data.summary);
        }
      } catch (apiErr) {
        console.warn('[CustomerKhata] Local transaction post failed:', apiErr.message);
      }

      // Sync Firestore fallback
      if (db) {
        const prevBal = Number(activeCustomer.balance || 0);
        const newBal = txnType === 'GAVE' ? prevBal + num : prevBal - num;
        const nowIso = new Date().toISOString();

        const updatedCustomer = {
          ...activeCustomer,
          balance: Math.round(newBal * 100) / 100,
          totalGave: txnType === 'GAVE' ? (Number(activeCustomer.totalGave) || 0) + num : activeCustomer.totalGave,
          totalGot: txnType === 'GOT' ? (Number(activeCustomer.totalGot) || 0) + num : activeCustomer.totalGot,
          status: newBal > 0 ? 'ACTIVE' : 'SETTLED',
          lastTransactionDate: nowIso,
          updatedAt: nowIso
        };

        const updatedList = customers.map(c => c.id === activeCustomer.id ? updatedCustomer : c);
        await setDoc(doc(db, 'stores', storeDocId, 'data', 'khata_customers'), {
          items: updatedList,
          lastUpdated: serverTimestamp()
        }, { merge: true });

        if (!localSuccess) {
          setCustomers(updatedList);
          setSelectedCustomerData(updatedCustomer);
        }
      }

      showToast(
        txnType === 'GAVE'
          ? `Recorded ₹${num} Udhar for ${activeCustomer.name}`
          : `Recorded ₹${num} Payment (Jama) from ${activeCustomer.name}`,
        'success'
      );

      setShowTransactionModal(false);
      setTxnAmount('');
      setTxnBillNumber('');
      setTxnItemsSummary('');
      setTxnNotes('');
      fetchKhata();
      if (activeCustomer.id) loadCustomerDetail(activeCustomer.id);
    } catch (err) {
      showToast(`Failed to record: ${err.message}`, 'error');
    } finally {
      setSubmittingTxn(false);
    }
  };

  // Void a transaction
  const handleVoidTxn = async (txnId) => {
    if (!window.confirm('Are you sure you want to void this transaction? This will reverse the balance.')) return;
    try {
      const storeDocId = activeStore && activeStore !== 'ALL' ? activeStore : 'DEMO_STORE_001';
      const res = await axios.delete(`${API_BASE}/api/khata/transaction/${txnId}?storeId=${storeDocId}`);
      if (res.data?.success) {
        showToast('Transaction voided successfully', 'info');
        fetchKhata();
        if (activeCustomer?.id) loadCustomerDetail(activeCustomer.id);
      }
    } catch (err) {
      showToast(`Failed to void: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Metric Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Outstanding Udhar */}
        <div className={`p-5 rounded-2xl border transition-all ${
          darkMode 
            ? 'bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-900/90 border-rose-500/20 shadow-lg shadow-rose-950/20' 
            : 'bg-white border-rose-100 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Total Store Udhar
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
              {summary.activeDuesCount} Pending
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-500 dark:text-rose-400">
            {formatCurrency(summary.totalOutstanding)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total credit dues across {summary.totalAccounts} customer accounts
          </p>
        </div>

        {/* Card 2: Collected This Month */}
        <div className={`p-5 rounded-2xl border transition-all ${
          darkMode 
            ? 'bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900/90 border-emerald-500/20 shadow-lg shadow-emerald-950/20' 
            : 'bg-white border-emerald-100 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Collected This Month
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Jama Inflow
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-500 dark:text-emerald-400">
            {formatCurrency(summary.collectedThisMonth || summary.totalCollected)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cash &amp; UPI repayments received at counter
          </p>
        </div>

        {/* Card 3: Overdue Accounts Alert */}
        <div className={`p-5 rounded-2xl border transition-all ${
          darkMode 
            ? 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900/90 border-amber-500/20 shadow-lg shadow-amber-950/20' 
            : 'bg-white border-amber-100 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Overdue / 30D+
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Follow-up
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
            {summary.overdueCount} Accounts
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Accounts with no repayment in past 30 days
          </p>
        </div>

        {/* Card 4: Quick Actions Bar */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Counter Actions
            </div>
            <div className="text-xs text-slate-500">
              Create customer passbook or record in-store credit
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Customer</span>
            </button>
            <button
              onClick={fetchKhata}
              title="Refresh Khata Data"
              className={`p-2 rounded-xl border transition cursor-pointer ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Customer List (Left) + Selected Customer Passbook (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customer Directory (5 Cols) */}
        <div className={`lg:col-span-5 rounded-2xl border flex flex-col overflow-hidden ${
          darkMode ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Header & Search */}
          <div className={`p-4 border-b space-y-3 ${darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className={`font-black text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Khata Customer Directory
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {filteredCustomers.length} profiles
              </span>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, phone or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border transition outline-none ${
                  darkMode 
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500/50' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                }`}
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {[
                { key: 'ALL', label: 'All Accounts' },
                { key: 'PENDING', label: 'Dues Only' },
                { key: 'SETTLED', label: 'Settled (₹0)' },
                { key: 'OVERDUE', label: 'Overdue 30D+' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                    statusFilter === f.key
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : darkMode
                        ? 'bg-slate-800 text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Cards List */}
          <div className="max-h-[640px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12 px-4">
                <User className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-400">No customers found</p>
                <p className="text-[11px] text-slate-500 mt-1">Try adjusting your search or add a new customer</p>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition cursor-pointer"
                >
                  + Add First Khata Customer
                </button>
              </div>
            ) : (
              filteredCustomers.map(cust => {
                const bal = Number(cust.balance || 0);
                const isSelected = cust.id === selectedCustomerId;
                const isOverdue = bal > 0 && cust.lastTransactionDate && (Date.now() - new Date(cust.lastTransactionDate).getTime() > 30 * 24 * 60 * 60 * 1000);

                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomerId(cust.id);
                      loadCustomerDetail(cust.id);
                    }}
                    className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? darkMode
                          ? 'bg-amber-500/15 border border-amber-500/30 shadow-md'
                          : 'bg-amber-50 border border-amber-200 shadow-xs'
                        : darkMode
                          ? 'hover:bg-slate-800/60 border border-transparent'
                          : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar initials */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        bal > 0
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {cust.name ? cust.name.slice(0, 2).toUpperCase() : 'CU'}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {cust.name}
                          </h4>
                          {isOverdue && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              30D+
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{cust.phone}</span>
                          <span>•</span>
                          <span>{cust.city || 'Pundri'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-black font-mono ${
                        bal > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'
                      }`}>
                        {bal > 0 ? formatCurrency(bal) : 'SETTLED'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        {bal > 0 ? 'Due Pending' : 'No Balance'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Customer Passbook & Detail View (7 Cols) */}
        <div className={`lg:col-span-7 rounded-2xl border flex flex-col overflow-hidden ${
          darkMode ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {activeCustomer ? (
            <>
              {/* Customer Banner Header */}
              <div className={`p-5 border-b ${darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-base shadow-sm">
                      {activeCustomer.name ? activeCustomer.name.slice(0, 2).toUpperCase() : 'CU'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {activeCustomer.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          {activeCustomer.trustRating || 'TRUSTED PATRON'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {activeCustomer.phone}
                        </span>
                        <span>•</span>
                        <span>{activeCustomer.city || 'Pundri'}</span>
                        {activeCustomer.creditLimit && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">Limit: {formatCurrency(activeCustomer.creditLimit)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer Net Outstanding Balance Tag */}
                  <div className="text-left sm:text-right p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Current Outstanding
                    </div>
                    <div className={`text-xl font-black font-mono ${
                      Number(activeCustomer.balance || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {formatCurrency(activeCustomer.balance || 0)}
                    </div>
                  </div>
                </div>

                {/* Credit Limit Usage Bar */}
                {activeCustomer.creditLimit > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/60">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Credit Used: {formatCurrency(activeCustomer.balance || 0)}</span>
                      <span>Limit: {formatCurrency(activeCustomer.creditLimit)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          (activeCustomer.balance / activeCustomer.creditLimit) > 0.85
                            ? 'bg-rose-500'
                            : (activeCustomer.balance / activeCustomer.creditLimit) > 0.5
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round(((activeCustomer.balance || 0) / activeCustomer.creditLimit) * 100))}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons: Gave Udhar, Received Payment, WhatsApp, UPI QR */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-2">
                  <button
                    onClick={() => {
                      setTxnType('GAVE');
                      setTxnAmount('');
                      setShowTransactionModal(true);
                    }}
                    className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Gave Udhar</span>
                  </button>

                  <button
                    onClick={() => {
                      setTxnType('GOT');
                      setTxnAmount(activeCustomer.balance > 0 ? String(activeCustomer.balance) : '');
                      setShowTransactionModal(true);
                    }}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Got Jama</span>
                  </button>

                  <button
                    onClick={() => handleSendWhatsAppReminder(activeCustomer)}
                    className="py-2 px-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-green-600/20 transition cursor-pointer"
                    title="Send WhatsApp payment reminder with UPI payment link"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleOpenQrModal(activeCustomer.balance)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      darkMode 
                        ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                        : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                    }`}
                    title="Generate scannable UPI QR code on screen"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan UPI QR</span>
                  </button>
                </div>
              </div>

              {/* Transactions Ledger Passbook Table */}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-slate-400" />
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Account Ledger History (Passbook)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowStatementModal(true)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Printer className="w-3 h-3" /> Print Slip
                    </button>
                  </div>
                </div>

                {/* Ledger Entries */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className={`border-b text-[10px] uppercase tracking-wider ${
                        darkMode ? 'border-slate-800 text-slate-400 bg-slate-950/20' : 'border-slate-200 text-slate-500 bg-slate-50'
                      }`}>
                        <th className="py-2.5 px-3">Date / Time</th>
                        <th className="py-2.5 px-3">Particulars / Goods</th>
                        <th className="py-2.5 px-3 text-right text-rose-400">Debit (Udhar)</th>
                        <th className="py-2.5 px-3 text-right text-emerald-400">Credit (Jama)</th>
                        <th className="py-2.5 px-3 text-right">Balance</th>
                        <th className="py-2.5 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {(!activeCustomer.transactions || activeCustomer.transactions.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                            No ledger transactions recorded yet for this customer.
                          </td>
                        </tr>
                      ) : (
                        activeCustomer.transactions.map((txn, idx) => {
                          const isGave = txn.type === 'GAVE';
                          return (
                            <tr key={txn.id || idx} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition`}>
                              {/* Date & Time */}
                              <td className="py-3 px-3 whitespace-nowrap text-slate-400 text-[11px]">
                                <div className="font-bold text-slate-300">{txn.date || new Date(txn.timestamp).toLocaleDateString('en-IN')}</div>
                                <div className="text-[10px] text-slate-500">{txn.time || ''}</div>
                              </td>

                              {/* Particulars / Items */}
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-200">
                                  {isGave ? (txn.billNumber ? `Bill #${txn.billNumber}` : 'Garments Udhar') : `Payment Received (${txn.paymentMode || 'Cash'})`}
                                </div>
                                {(txn.itemsSummary || txn.notes) && (
                                  <div className="text-[11px] text-slate-400 line-clamp-1">
                                    {txn.itemsSummary || txn.notes}
                                  </div>
                                )}
                                {txn.dueDate && isGave && (
                                  <div className="text-[10px] text-amber-400 font-medium">
                                    Promised Date: {txn.dueDate}
                                  </div>
                                )}
                              </td>

                              {/* Debit (Gave Udhar) */}
                              <td className="py-3 px-3 text-right font-mono font-bold text-rose-500">
                                {isGave ? formatCurrency(txn.amount) : '-'}
                              </td>

                              {/* Credit (Got Jama) */}
                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-500">
                                {!isGave ? formatCurrency(txn.amount) : '-'}
                              </td>

                              {/* Running Balance */}
                              <td className="py-3 px-3 text-right font-mono font-black text-slate-200">
                                {formatCurrency(txn.balanceAfter || 0)}
                              </td>

                              {/* Action (Void) */}
                              <td className="py-3 px-2 text-center">
                                <button
                                  onClick={() => handleVoidTxn(txn.id)}
                                  title="Void Transaction"
                                  className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-500">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold text-slate-400">Select a customer from the left list</p>
              <p className="text-xs text-slate-500 mt-1">View their full transaction passbook, record dues, or send payment reminders.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: RECORD TRANSACTION (Gave Udhar vs Received Payment) */}
      {showTransactionModal && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-6 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setShowTransactionModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                txnType === 'GAVE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {txnType === 'GAVE' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-black">
                  {txnType === 'GAVE' ? 'Gave Goods on Credit (Udhar)' : 'Received Payment (Jama)'}
                </h3>
                <p className="text-xs text-slate-400">Customer: {activeCustomer.name} ({activeCustomer.phone})</p>
              </div>
            </div>

            {/* Type Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-800/80 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTxnType('GAVE')}
                className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  txnType === 'GAVE' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Gave Udhar</span>
              </button>
              <button
                type="button"
                onClick={() => setTxnType('GOT')}
                className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  txnType === 'GOT' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Got Jama</span>
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-4">
              {/* Amount input */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  autoFocus
                  required
                  placeholder="0.00"
                  value={txnAmount}
                  onChange={(e) => setTxnAmount(e.target.value)}
                  className="w-full text-xl font-mono font-black px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-amber-500"
                />
                {/* Quick amount chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[500, 1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTxnAmount(String(amt))}
                      className="px-2 py-1 rounded-md text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    >
                      +₹{amt}
                    </button>
                  ))}
                  {activeCustomer.balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setTxnAmount(String(activeCustomer.balance))}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition cursor-pointer"
                    >
                      Full Due (₹{activeCustomer.balance})
                    </button>
                  )}
                </div>
              </div>

              {txnType === 'GAVE' ? (
                <>
                  {/* Bill Number & Promised Due Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">POS Bill No. (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. CM-2026-089"
                        value={txnBillNumber}
                        onChange={(e) => setTxnBillNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Promised Date</label>
                      <input
                        type="date"
                        value={txnDueDate}
                        onChange={(e) => setTxnDueDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Garments Summary */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Garments / Items Description</label>
                    <input
                      type="text"
                      placeholder="e.g. 2 Cobb Formal Shirts + 1 Trouser"
                      value={txnItemsSummary}
                      onChange={(e) => setTxnItemsSummary(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              ) : (
                /* Payment Mode (Cash, UPI, Card) */
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Payment Tender Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Cash', 'UPI', 'Card'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTxnPaymentMode(m)}
                        className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          txnPaymentMode === m
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction Note */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Note / Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Wedding purchase / cleared after Diwali"
                  value={txnNotes}
                  onChange={(e) => setTxnNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingTxn}
                className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg transition cursor-pointer flex items-center justify-center gap-2 ${
                  txnType === 'GAVE'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                {submittingTxn ? 'Recording...' : `Record ${txnType === 'GAVE' ? 'Gave Udhar' : 'Received Payment'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW KHATA CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-6 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setShowAddCustomerModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Add New Khata Customer</h3>
                <p className="text-xs text-slate-400">Open a credit passbook account</p>
              </div>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Mobile Number (10 digits) *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9812345678"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">City / Town</label>
                  <input
                    type="text"
                    placeholder="Pundri"
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    placeholder="25000"
                    value={newCustLimit}
                    onChange={(e) => setNewCustLimit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Customer Notes / Relation</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Regular patron from Grain Market, clears balance monthly"
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingCust}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition cursor-pointer"
              >
                {submittingCust ? 'Creating...' : 'Open Customer Khata Book'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INSTANT UPI QR CODE MODAL FOR IN-STORE SETTLEMENT */}
      {showQrModal && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-sm rounded-3xl border shadow-2xl p-6 text-center ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black">{storeInfo?.name || 'COBB APPARELS'}</h3>
            <p className="text-xs text-slate-400">Scan to pay Khata balance for {activeCustomer.name}</p>

            <div className="my-3 text-2xl font-black font-mono text-emerald-400">
              {formatCurrency(activeCustomer.balance || 0)}
            </div>

            {/* Rendered QR Image */}
            <div className="p-3 bg-white rounded-2xl shadow-inner inline-block my-2 border border-slate-200">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="UPI QR Code" className="w-56 h-56 mx-auto rounded-lg" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-500">Generating...</div>
              )}
            </div>

            <p className="text-[11px] font-mono text-slate-400 mt-1">UPI ID: {storeUpiVpa}</p>
            <p className="text-[10px] text-slate-500">Supports GPay, PhonePe, Paytm, BHIM</p>

            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => handleCopyUpiLink(activeCustomer.balance)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy UPI Link'}</span>
              </button>

              <button
                onClick={() => {
                  setShowQrModal(false);
                  setTxnType('GOT');
                  setTxnAmount(String(activeCustomer.balance));
                  setTxnPaymentMode('UPI');
                  setShowTransactionModal(true);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Paid (Jama)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINTABLE THERMAL KHATA STATEMENT SLIP */}
      {showStatementModal && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-6 max-h-[90vh] flex flex-col ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Thermal Khata Passbook Slip</h3>
              </div>
              <button
                onClick={() => setShowStatementModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Area */}
            <div className="flex-1 overflow-y-auto p-4 my-2 flex justify-center bg-slate-950/60 rounded-xl">
              <div
                id="khata-statement-printable"
                style={{ width: '280px' }}
                className="bg-white text-black p-4 font-mono text-[11px] shadow-lg border border-slate-300 rounded-sm"
              >
                <div className="text-center font-black text-xs">{storeInfo?.name || 'COBB APPARELS'}</div>
                <div className="text-center text-[9px] text-slate-700">{storeInfo?.address || 'Fatehpur Road, Pundri, Haryana'}</div>
                <div className="text-center text-[9px] text-slate-700">Tel: {storeInfo?.phone || '+91 91381 22820'}</div>
                <div className="border-t border-dashed border-black my-2" />

                <div className="text-center font-bold text-xs uppercase">CUSTOMER KHATA STATEMENT</div>
                <div className="border-t border-dashed border-black my-2" />

                <div className="text-[10px] space-y-0.5">
                  <div className="flex justify-between"><span>Customer:</span><span className="font-bold">{activeCustomer.name}</span></div>
                  <div className="flex justify-between"><span>Phone:</span><span>{activeCustomer.phone}</span></div>
                  <div className="flex justify-between"><span>City:</span><span>{activeCustomer.city || 'Pundri'}</span></div>
                  <div className="flex justify-between"><span>Date:</span><span>{new Date().toLocaleDateString('en-IN')}</span></div>
                </div>

                <div className="border-t border-dashed border-black my-2" />

                <table className="w-full text-[9px] mb-2">
                  <thead>
                    <tr className="border-b border-dashed border-black">
                      <th className="text-left py-0.5">Date</th>
                      <th className="text-left py-0.5">Particulars</th>
                      <th className="text-right py-0.5">Udhar</th>
                      <th className="text-right py-0.5">Jama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeCustomer.transactions || []).slice(0, 10).map((t, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-0.5">{t.date ? t.date.slice(5) : ''}</td>
                        <td className="py-0.5 truncate max-w-[80px]">{t.itemsSummary || t.billNumber || (t.type === 'GAVE' ? 'Goods' : 'Payment')}</td>
                        <td className="py-0.5 text-right font-bold">{t.type === 'GAVE' ? `₹${t.amount}` : '-'}</td>
                        <td className="py-0.5 text-right font-bold">{t.type === 'GOT' ? `₹${t.amount}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t-2 border-black my-2" />

                <div className="flex justify-between font-black text-xs py-1">
                  <span>OUTSTANDING BALANCE:</span>
                  <span>{formatCurrency(activeCustomer.balance || 0)}</span>
                </div>

                <div className="border-t border-dashed border-black my-2" />

                <div className="text-center text-[9px] text-slate-600 mt-2">
                  <div>Thank you for being our esteemed patron!</div>
                  <div className="font-bold text-black mt-1">*** COBB APPARELS ***</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowStatementModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => triggerThermalPrint('khata-statement-printable')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
