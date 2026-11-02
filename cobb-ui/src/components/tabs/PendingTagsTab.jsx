import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Tag,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Copy,
  Check,
  Percent,
  DollarSign,
  Package,
  Layers,
  X,
  Printer,
  Sparkles,
  Zap,
  ShoppingBag,
  Clock,
  User,
  Phone,
  ArrowRight,
  Receipt,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  List,
  LayoutGrid
} from 'lucide-react';
import { db } from '../../utils/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

const API_BASE = window.location.protocol === 'app:' || window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : window.location.origin;

// Common retail discount presets for B1G2 single-piece sales
const DISCOUNT_PRESETS = [
  { label: 'Flat 50%', value: 50 },
  { label: '60% Off', value: 60 },
  { label: '65% Off', value: 65 },
  { label: 'B1G2 Rate (66.7%)', value: 66.67 },
  { label: '70% Off', value: 70 }
];

export default function PendingTagsTab({ darkMode, activeStore = 'DEMO_STORE_001', setActiveTab, onOpenSpeedBilling }) {
  const [tags, setTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [summary, setSummary] = useState({
    activeCount: 0,
    billedCount: 0,
    activeMrpValue: 0,
    activeRealizedValue: 0,
    avgDiscountPct: '0.0',
    billedTodayCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'billed' | 'all'
  const [sortBy, setSortBy] = useState('newest'); // 'low_to_high' | 'high_to_low' | 'sold_asc' | 'sold_desc' | 'discount_desc' | 'discount_asc' | 'newest' | 'oldest'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [selectedMrpFilter, setSelectedMrpFilter] = useState(null); // null means All MRPs
  const [tripletBreakdownModal, setTripletBreakdownModal] = useState(null); // B1G2 Triplet discount review modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState(null);

  // Form State for Adding Pending Tag
  const [form, setForm] = useState({
    barcode: '',
    articleNo: '',
    articleName: '',
    size: '',
    color: '',
    section: 'Men Apparel',
    mrp: '',
    discountPercent: 60,
    soldPrice: '',
    customerName: '',
    customerPhone: '',
    salesperson: 'Cashier',
    notes: ''
  });
  const [scanQuery, setScanQuery] = useState('');
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const [barcodeMatchError, setBarcodeMatchError] = useState('');

  const targetStoreId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01')
    ? 'DEMO_STORE_001'
    : activeStore;

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- 1-Click Fast Transfer to Zero-Mouse Speed Billing POS ---
  const handleBillInSpeedBilling = (itemsToBill, promo = 'b1g2') => {
    if (!itemsToBill || itemsToBill.length === 0) return;

    const cartItems = itemsToBill.map(t => ({
      barcode: t.barcode,
      name: t.articleName || t.articleNo || 'Garment',
      size: t.size || 'M',
      category: t.section || 'Apparel',
      mrp: Number(t.mrp) || 1999,
      qty: 1,
      discountPct: 0,
      discountFlat: 0,
      gstPct: 5,
      stock: 1,
      staff: t.salesperson || 'Cashier',
      pendingTagId: t.id
    }));

    const payload = {
      items: cartItems,
      promo,
      customerName: itemsToBill[0]?.customerName || 'Walk-in Guest',
      customerPhone: itemsToBill[0]?.customerPhone || ''
    };

    // 1. Dispatch custom event for active SpeedBillingModal listeners
    window.dispatchEvent(new CustomEvent('cobb_load_speed_billing', { detail: payload }));

    // 2. Call parent callback if passed
    if (typeof onOpenSpeedBilling === 'function') {
      onOpenSpeedBilling(payload);
    } else if (typeof setActiveTab === 'function') {
      setActiveTab('speed_billing');
    }

    showToastMsg(`⚡ Loaded ${cartItems.length} garment(s) into Speed Billing with ${promo.toUpperCase()} offer!`, 'success');
  };

  // --- Open Triplet Breakdown & Discount Preview ---
  const openTripletBreakdown = (items, section = 'General') => {
    if (!items || items.length === 0) return;

    // Sort descending by MRP (highest MRP is the paid piece in B1G2)
    const sorted = [...items].sort((a, b) => (Number(b.mrp) || 0) - (Number(a.mrp) || 0));
    const highestMrp = Number(sorted[0].mrp) || 0;
    const totalMrp = sorted.reduce((s, it) => s + (Number(it.mrp) || 0), 0);
    const totalCollected = sorted.reduce((s, it) => s + (Number(it.soldPrice) || 0), 0);
    const totalDiscount = Math.max(0, totalMrp - highestMrp);
    const overallDiscountPct = totalMrp > 0 ? ((totalDiscount / totalMrp) * 100).toFixed(1) : '0.0';

    // Itemized discount breakdown for each of the 3 articles
    const breakdownItems = sorted.map((item, idx) => {
      const mrp = Number(item.mrp) || 0;
      const isPaid = idx === 0;
      const b1g2DiscFlat = isPaid ? 0 : mrp;
      const b1g2DiscPct = isPaid ? 0 : 100;
      const b1g2Net = isPaid ? mrp : 0;
      
      // Proportional discount across triplet (for GST invoices)
      const propDiscFlat = totalMrp > 0 ? Math.round(mrp * (totalDiscount / totalMrp)) : 0;
      const propNet = mrp - propDiscFlat;

      return {
        ...item,
        isPaid,
        b1g2DiscFlat,
        b1g2DiscPct,
        b1g2Net,
        propDiscFlat,
        propNet,
        tagDiscount: Number(item.discountPercent) || 0,
        tagSoldPrice: Number(item.soldPrice) || 0
      };
    });

    setTripletBreakdownModal({
      section,
      items: breakdownItems,
      totalMrp,
      highestMrp,
      totalDiscount,
      overallDiscountPct,
      totalCollected,
      variance: totalCollected - highestMrp
    });
  };

  const handleMarkTripletBilled = async (items) => {
    if (!items || items.length === 0) return;
    const billNo = window.prompt('Enter Bill No (or leave blank for B1G2-COMBO):', 'B1G2-COMBO');
    if (billNo === null) return;
    try {
      for (const it of items) {
        await handleMarkBilled(it.id, billNo);
      }
      setTripletBreakdownModal(null);
      showToastMsg('All 3 tags in triplet marked as billed in ' + billNo + '!', 'success');
    } catch (err) {
      showToastMsg('Failed to mark triplet billed: ' + err.message, 'error');
    }
  };

  const toggleSelectTag = (id) => {
    setSelectedTagIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedTagIds([]);
  };

  // --- 1. Fetch from Local Backend API ---
  const fetchTags = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await axios.get(`${API_BASE}/api/pending-tags`);
      if (res.data?.success) {
        setTags(res.data.tags || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (e) {
      console.warn('[PendingTagsTab] Local API fetch warning:', e.message);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  // Poll backend every 25s (with document.hidden guard)
  useEffect(() => {
    fetchTags();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchTags();
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchTags]);

  // --- 2. Real-Time Cloud Firestore Sync (Guarantees Phone Link Support) ---
  useEffect(() => {
    let unsubscribe = null;
    if (db) {
      try {
        const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
        unsubscribe = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.tags)) {
              setTags(data.tags);
              const active = data.tags.filter(t => t.status === 'active');
              const billed = data.tags.filter(t => t.status === 'billed');
              const activeMrp = active.reduce((s, t) => s + (Number(t.mrp) || 0), 0);
              const activeReal = active.reduce((s, t) => s + (Number(t.soldPrice) || 0), 0);
              const avgDisc = active.length > 0
                ? (active.reduce((s, t) => s + (Number(t.discountPercent) || 0), 0) / active.length).toFixed(1)
                : '0.0';
              setSummary(prev => ({
                ...prev,
                activeCount: active.length,
                billedCount: billed.length,
                activeMrpValue: activeMrp,
                activeRealizedValue: activeReal,
                avgDiscountPct: avgDisc
              }));
              setLoading(false);
            }
          }
        }, (err) => {
          console.warn('[PendingTagsTab] Firestore listener warning:', err.message);
        });
      } catch (e) { }
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [targetStoreId]);

  // --- Barcode / Article Fast Lookup ---
  const handleQuickLookup = async (code) => {
    const q = (code || scanQuery).trim();
    if (!q) return;
    setIsSearchingBarcode(true);
    setBarcodeMatchError('');
    try {
      const res = await axios.get(`${API_BASE}/api/inventory/quick-scan?q=${encodeURIComponent(q)}`);
      if (res.data?.success && res.data.variants && res.data.variants.length > 0) {
        const exact = res.data.variants.find(v => v.barcode === q) || res.data.variants[0];
        const mrpVal = Number(exact.mrp || 0);
        const discVal = Number(form.discountPercent || 60);
        const calcPrice = mrpVal > 0 ? Math.round(mrpVal * (1 - (discVal / 100))) : '';

        setForm(prev => ({
          ...prev,
          barcode: exact.barcode || q,
          articleNo: exact.articleNo || '',
          articleName: exact.itemName || 'Apparel Item',
          size: exact.size || 'Free',
          color: exact.color || 'Standard',
          section: exact.sectionName || exact.subSectionName || 'Apparel',
          mrp: mrpVal,
          soldPrice: calcPrice
        }));
        showToastMsg(`Found: ${exact.itemName} (MRP ₹${mrpVal})`, 'success');
      } else {
        setBarcodeMatchError(`No product found matching "${q}". You can enter details manually.`);
      }
    } catch (err) {
      setBarcodeMatchError('Quick scan lookup timed out. Enter details manually.');
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  // When discount percentage or MRP changes, recalculate sold price
  const updateDiscount = (pct) => {
    const numPct = parseFloat(pct) || 0;
    const numMrp = parseFloat(form.mrp) || 0;
    const calcPrice = numMrp > 0 ? Math.round(numMrp * (1 - (numPct / 100))) : '';
    setForm(prev => ({
      ...prev,
      discountPercent: numPct,
      soldPrice: calcPrice
    }));
  };

  // When sold price is manually typed, recalculate discount %
  const updateSoldPrice = (price) => {
    const numPrice = parseFloat(price) || 0;
    const numMrp = parseFloat(form.mrp) || 0;
    let disc = 0;
    if (numMrp > 0 && numPrice <= numMrp) {
      disc = Number((((numMrp - numPrice) / numMrp) * 100).toFixed(1));
    }
    setForm(prev => ({
      ...prev,
      soldPrice: price,
      discountPercent: disc
    }));
  };

  // --- Submit New Pending Tag ---
  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!form.barcode && !form.articleNo) {
      showToastMsg('Barcode or Article No is required!', 'error');
      return;
    }
    try {
      const payload = {
        ...form,
        mrp: parseFloat(form.mrp) || 0,
        discountPercent: parseFloat(form.discountPercent) || 0,
        soldPrice: parseFloat(form.soldPrice) || 0
      };

      // 1. Try local API
      try {
        const res = await axios.post(`${API_BASE}/api/pending-tags/add`, payload);
        if (res.data?.success) {
          showToastMsg(res.data.message || 'Pending Tag Created!', 'success');
          fetchTags();
        }
      } catch (apiErr) {
        // Fallback directly to Cloud Firestore (for Phone Link)
        if (db) {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
          const snap = await getDoc(docRef);
          const curTags = snap.exists() ? (snap.data().tags || []) : [];
          const now = new Date();
          const newEntry = {
            id: 'ptag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            ...payload,
            status: 'active',
            createdAt: now.toISOString(),
            date: now.toISOString().split('T')[0]
          };
          const updated = [newEntry, ...curTags];
          await setDoc(docRef, { tags: updated, lastUpdated: now.toISOString() }, { merge: true });
          setTags(updated);
          showToastMsg('Pending Tag saved to Cloud Firestore!', 'success');
        }
      }

      setShowAddModal(false);
      setScanQuery('');
      setForm({
        barcode: '',
        articleNo: '',
        articleName: '',
        size: '',
        color: '',
        section: 'Men Apparel',
        mrp: '',
        discountPercent: 60,
        soldPrice: '',
        customerName: '',
        customerPhone: '',
        salesperson: 'Cashier',
        notes: ''
      });
    } catch (err) {
      showToastMsg('Failed to save pending tag: ' + err.message, 'error');
    }
  };

  // --- Mark Tag as Billed (Manual Settlement) ---
  const handleMarkBilled = async (tagId, billNoPrompt) => {
    const billNo = billNoPrompt || window.prompt('Enter Bill No (or leave blank for manual combo):', 'B1G2-COMBO');
    if (billNo === null) return;

    try {
      try {
        await axios.post(`${API_BASE}/api/pending-tags/${tagId}/mark-billed`, { billNo });
        fetchTags();
      } catch (apiErr) {
        if (db) {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const list = snap.data().tags || [];
            const updated = list.map(t => t.id === tagId ? {
              ...t,
              status: 'billed',
              billedInBillNo: billNo,
              billedAt: new Date().toISOString()
            } : t);
            await setDoc(docRef, { tags: updated, lastUpdated: new Date().toISOString() }, { merge: true });
            setTags(updated);
          }
        }
      }
      showToastMsg(`Tag resolved and marked as billed in ${billNo}!`, 'success');
    } catch (err) {
      showToastMsg('Failed to update tag: ' + err.message, 'error');
    }
  };

  // --- Delete Tag ---
  const handleDeleteTag = async (tagId) => {
    if (!window.confirm('Are you sure you want to remove this pending tag?')) return;
    try {
      try {
        await axios.delete(`${API_BASE}/api/pending-tags/${tagId}`);
        fetchTags();
      } catch (apiErr) {
        if (db) {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const list = snap.data().tags || [];
            const updated = list.filter(t => t.id !== tagId);
            await setDoc(docRef, { tags: updated, lastUpdated: new Date().toISOString() }, { merge: true });
            setTags(updated);
          }
        }
      }
      showToastMsg('Tag removed.', 'success');
    } catch (err) {
      showToastMsg('Failed to remove tag: ' + err.message, 'error');
    }
  };

  // --- Copy Barcode to Clipboard ---
  const handleCopyBarcode = (barcode, id) => {
    if (!barcode) return;
    navigator.clipboard.writeText(barcode);
    setCopiedId(id);
    showToastMsg(`Barcode ${barcode} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // --- Print 58mm/80mm Tag Slip ---
  const handlePrintSlip = (tag) => {
    const printWindow = window.open('', '_blank', 'width=380,height=520');
    if (!printWindow) {
      alert('Please allow popups to print tag slips.');
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pending Tag Slip - ${tag.barcode}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body { font-family: monospace; font-size: 11px; margin: 6px; padding: 0; color: #000; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 6px; }
          .title { font-size: 13px; font-weight: bold; }
          .barcode { font-size: 14px; font-weight: bold; letter-spacing: 2px; text-align: center; margin: 6px 0; border: 1px solid #000; padding: 4px; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .bold { font-weight: bold; }
          .footer { border-top: 1px dashed #000; margin-top: 8px; padding-top: 4px; text-align: center; font-size: 9px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">COBB APPARELS (PUNDRI)</div>
          <div>PENDING TAG / B1G2 HOLD</div>
          <div>${new Date(tag.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
        </div>
        <div class="barcode">${tag.barcode}</div>
        <div class="row"><span class="bold">Article:</span><span>${tag.articleName || tag.articleNo}</span></div>
        <div class="row"><span>Size/Color:</span><span>${tag.size} / ${tag.color}</span></div>
        <div class="row"><span class="bold">Original MRP:</span><span class="bold">₹${Number(tag.mrp || 0).toLocaleString('en-IN')}</span></div>
        <div class="row"><span>Discount Sold:</span><span class="bold">-${tag.discountPercent}%</span></div>
        <div class="row"><span class="bold">Realized / Paid:</span><span class="bold">₹${Number(tag.soldPrice || 0).toLocaleString('en-IN')}</span></div>
        ${tag.customerPhone ? `<div class="row"><span>Cust:</span><span>${tag.customerPhone}</span></div>` : ''}
        ${tag.salesperson ? `<div class="row"><span>Staff:</span><span>${tag.salesperson}</span></div>` : ''}
        <div class="footer">
          <div>Keep tag safely at counter.</div>
          <div>Auto-clears when billed in B1G2 combo.</div>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  // --- Filtering & Sorting ---
  const filteredTags = useMemo(() => {
    let result = tags.filter(tag => {
      if (statusFilter === 'active' && tag.status !== 'active') return false;
      if (statusFilter === 'billed' && tag.status !== 'billed') return false;

      if (selectedMrpFilter !== null && (Number(tag.mrp) || 0) !== Number(selectedMrpFilter)) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (tag.barcode && tag.barcode.toLowerCase().includes(q)) ||
        (tag.articleNo && tag.articleNo.toLowerCase().includes(q)) ||
        (tag.articleName && tag.articleName.toLowerCase().includes(q)) ||
        (tag.customerPhone && tag.customerPhone.includes(q)) ||
        (tag.salesperson && tag.salesperson.toLowerCase().includes(q)) ||
        (tag.billedInBillNo && tag.billedInBillNo.toLowerCase().includes(q))
      );
    });

    result = [...result].sort((a, b) => {
      const mrpA = Number(a.mrp) || 0;
      const mrpB = Number(b.mrp) || 0;
      const soldA = Number(a.soldPrice) || 0;
      const soldB = Number(b.soldPrice) || 0;
      const discA = Number(a.discountPercent) || 0;
      const discB = Number(b.discountPercent) || 0;
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();

      switch (sortBy) {
        case 'low_to_high':
        case 'price_asc':
          return mrpA - mrpB;
        case 'high_to_low':
        case 'price_desc':
          return mrpB - mrpA;
        case 'sold_asc':
          return soldA - soldB;
        case 'sold_desc':
          return soldB - soldA;
        case 'discount_desc':
          return discB - discA;
        case 'discount_asc':
          return discA - discB;
        case 'oldest':
          return dateA - dateB;
        case 'newest':
        default:
          return dateB - dateA;
      }
    });

    return result;
  }, [tags, statusFilter, searchQuery, sortBy, selectedMrpFilter]);

  // --- Quick MRP Group Summary (e.g. ₹1,899 (4 pcs), ₹2,499 (3 pcs - Combo Ready!)) ---
  const mrpGroups = useMemo(() => {
    const relevantTags = tags.filter(t => {
      if (statusFilter === 'active') return t.status === 'active';
      if (statusFilter === 'billed') return t.status === 'billed';
      return true;
    });

    const groups = {};
    relevantTags.forEach(t => {
      const mrp = Number(t.mrp) || 0;
      if (!groups[mrp]) {
        groups[mrp] = { mrp, count: 0, items: [] };
      }
      groups[mrp].count += 1;
      groups[mrp].items.push(t);
    });

    return Object.values(groups).sort((a, b) => a.mrp - b.mrp);
  }, [tags, statusFilter]);

  // --- Smart B1G2 Combo Suggester (Find sets of 3 pending tags in similar category) ---
  const comboSuggestions = useMemo(() => {
    const active = tags.filter(t => t.status === 'active');
    const grouped = {};
    active.forEach(t => {
      const key = t.section || 'General';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });
    const triplets = [];
    Object.entries(grouped).forEach(([section, list]) => {
      const sortedList = [...list].sort((a, b) => (Number(b.mrp) || 0) - (Number(a.mrp) || 0));
      if (sortedList.length >= 3) {
        for (let i = 0; i + 2 < sortedList.length; i += 3) {
          triplets.push({
            section,
            items: [sortedList[i], sortedList[i + 1], sortedList[i + 2]],
            totalMrp: (Number(sortedList[i].mrp) || 0) + (Number(sortedList[i + 1].mrp) || 0) + (Number(sortedList[i + 2].mrp) || 0),
            totalCollected: (Number(sortedList[i].soldPrice) || 0) + (Number(sortedList[i + 1].soldPrice) || 0) + (Number(sortedList[i + 2].soldPrice) || 0)
          });
        }
      }
    });
    return triplets;
  }, [tags]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold transition-all ${
          toast.type === 'error'
            ? 'bg-rose-500 text-white'
            : 'bg-emerald-500 text-white'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Banner & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950/40 border border-slate-700/60 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Tag className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Pending Tag Desk</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              B1G2 Single-Piece Manager
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Track single pieces sold at custom discount percentages under the Buy 1 Get 2 Free scheme. Auto-clears when billed into POS!
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTags(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/60 text-xs font-semibold text-slate-200 transition-all active:scale-95 disabled:opacity-50"
            title="Auto-checks against live POS billing database"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
            <span>{refreshing ? 'Checking POS...' : 'Sync with POS'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Pending Tag</span>
          </button>
        </div>
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
            <span>Active Pending</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {summary.activeCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Tags at counter waiting for combo</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Total Pending MRP</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            ₹{Number(summary.activeMrpValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Retail value of physical tags</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Cash Realized</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{Number(summary.activeRealizedValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Money collected from single pcs</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Avg Discount %</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {summary.avgDiscountPct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Single piece discount rate</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 md:col-span-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Billed Today</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {summary.billedTodayCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Auto-detected in POS bills</div>
        </div>
      </div>

      {/* Smart B1G2 Combo Suggester Card (When 3 pieces in category are ready) */}
      {comboSuggestions.length > 0 && statusFilter !== 'billed' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
              <span>Ready for B1G2 Billing! ({comboSuggestions.length} Combos can be generated)</span>
            </div>
            <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 font-medium">
              1-Click loads all 3 into Speed POS & applies B1G2 Free
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {comboSuggestions.map((combo, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300/70 dark:border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{combo.section} Triplet:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      B1G2 Ready
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] uppercase font-black text-amber-700 dark:text-amber-400">MRPs:</span>
                    {combo.items.map((it, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-900 dark:text-amber-200 font-black text-xs">
                        ₹{Number(it.mrp || 0).toLocaleString('en-IN')}
                      </span>
                    ))}
                    <span className="text-slate-400 font-bold text-xs">=</span>
                    <span className="font-black text-slate-900 dark:text-white text-xs">
                      ₹{combo.totalMrp.toLocaleString('en-IN')} Total MRP
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                    <span>3 Tags</span>
                    <span>•</span>
                    <span className="text-rose-500 font-bold">
                      Discount: -₹{(combo.totalMrp - Math.max(...combo.items.map(x => Number(x.mrp) || 0))).toLocaleString('en-IN')} ({Math.round(((combo.totalMrp - Math.max(...combo.items.map(x => Number(x.mrp) || 0))) / combo.totalMrp) * 100)}% Off)
                    </span>
                    <span>•</span>
                    <span>Single-piece cash: <strong className="text-emerald-600 dark:text-emerald-400">₹{combo.totalCollected.toLocaleString('en-IN')}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-slate-400">
                    {combo.items.map(it => it.barcode).join(' • ')}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const codes = combo.items.map(x => x.barcode).join(' | ');
                      navigator.clipboard.writeText(codes);
                      showToastMsg(`Copied 3 Barcodes: ${codes}`, 'success');
                    }}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
                    title="Copy 3 barcodes"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openTripletBreakdown(combo.items, `${combo.section} Triplet`)}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95"
                    title="Transfer these 3 garments directly into Speed Billing POS under B1G2 promo"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Bill Triplet</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter, Sort and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('active')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'active'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Active Pending ({summary.activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('billed')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'billed'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Auto-Billed / Resolved ({summary.billedCount})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Tags ({tags.length})
          </button>
        </div>

        {/* Sort Controls & Search Bar */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Quick 1-Click Low to High / High to Low Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setSortBy('low_to_high')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                sortBy === 'low_to_high'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Sort articles by Price: Low to High"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Low to High</span>
            </button>
            <button
              onClick={() => setSortBy('high_to_low')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                sortBy === 'high_to_low'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Sort articles by Price: High to Low"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>High to Low</span>
            </button>
          </div>

          {/* Advanced Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-2.5 pr-8 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer"
              title="Choose sorting criteria"
            >
              <option value="newest">🕒 Newest First</option>
              <option value="oldest">🕒 Oldest First</option>
              <option value="low_to_high">⬆️ MRP: Low to High</option>
              <option value="high_to_low">⬇️ MRP: High to Low</option>
              <option value="sold_asc">⬆️ Sold Price: Low to High</option>
              <option value="sold_desc">⬇️ Sold Price: High to Low</option>
              <option value="discount_desc">⬇️ Discount %: High to Low</option>
              <option value="discount_asc">⬆️ Discount %: Low to High</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* View Mode Toggle: List vs Grid */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Compact List View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">List</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Cards</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56 min-w-[160px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search barcode, article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Quick MRP Group Filter Chips (e.g. ₹1,899 [4 pcs], ₹2,499 [3 pcs - Combo Ready!]) */}
      {mrpGroups.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold shrink-0 mr-1">
            <Tag className="w-3.5 h-3.5 text-amber-500" />
            <span>MRP Groups:</span>
          </div>

          {/* All MRPs button */}
          <button
            onClick={() => setSelectedMrpFilter(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedMrpFilter === null
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>All MRPs</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              selectedMrpFilter === null
                ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {mrpGroups.reduce((s, g) => s + g.count, 0)}
            </span>
          </button>

          {/* Individual MRP Group Chips */}
          {mrpGroups.map((group) => {
            const isReadyForCombo = group.count >= 3;
            const isSelected = selectedMrpFilter === group.mrp;
            const comboCount = Math.floor(group.count / 3);

            return (
              <div key={group.mrp} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setSelectedMrpFilter(isSelected ? null : group.mrp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/50'
                      : isReadyForCombo
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-400/50 dark:border-amber-500/40'
                      : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                  title={isReadyForCombo ? `${comboCount} B1G2 Combo(s) can be made with this exact MRP!` : `Filter by ₹${group.mrp.toLocaleString('en-IN')}`}
                >
                  <span className="font-mono font-black text-sm">
                    ₹{group.mrp.toLocaleString('en-IN')}
                  </span>
                  
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? 'bg-slate-950 text-amber-300'
                      : isReadyForCombo
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-black'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {group.count} {group.count === 1 ? 'pc' : 'pcs'}
                  </span>

                  {isReadyForCombo && (
                    <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                      <Sparkles className="w-3 h-3 animate-spin text-amber-500" />
                      <span>{comboCount} Combo{comboCount > 1 ? 's' : ''} Ready!</span>
                    </span>
                  )}
                </button>

                {/* 1-Click Bill 3 button for Ready MRP groups */}
                {isReadyForCombo && statusFilter !== 'billed' && (
                  <button
                    onClick={() => {
                      const firstThree = group.items.slice(0, 3);
                      openTripletBreakdown(firstThree, `₹${group.mrp.toLocaleString('en-IN')} MRP Group`);
                    }}
                    className="px-2 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-[11px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                    title={`1-Click: Bill 3 pieces of ₹${group.mrp.toLocaleString('en-IN')} under B1G2 in Speed Billing`}
                  >
                    <Zap className="w-3 h-3 fill-current" />
                    <span>Bill 3</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main Tags List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
          Loading pending tags...
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Tag className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {statusFilter === 'active' ? 'No Active Pending Tags at Counter' : 'No matching tags found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {statusFilter === 'active'
              ? 'When a single piece is sold from a Buy 1 Get 2 Free offer, add its physical tag here to track it until billed.'
              : 'Try adjusting your search query or filter.'}
          </p>
          {statusFilter === 'active' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-md"
            >
              Add First Pending Tag
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      onClick={() => {
                        const activeIds = filteredTags.filter(t => t.status === 'active').map(t => t.id);
                        if (selectedTagIds.length === activeIds.length && activeIds.length > 0) {
                          clearSelection();
                        } else {
                          setSelectedTagIds(activeIds);
                        }
                      }}
                      className="text-slate-400 hover:text-amber-500 transition-colors"
                      title="Select all active tags"
                    >
                      {selectedTagIds.length > 0 && selectedTagIds.length === filteredTags.filter(t => t.status === 'active').length ? (
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-amber-600 dark:text-amber-400 font-black cursor-pointer select-none" onClick={() => setSortBy(sortBy === 'low_to_high' ? 'high_to_low' : 'low_to_high')} title="Click to sort by MRP">
                    <div className="flex items-center gap-1.5">
                      <span>TAG MRP</span>
                      {sortBy === 'low_to_high' ? (
                        <span className="text-[10px] text-rose-500 font-bold flex items-center">↑ Low</span>
                      ) : sortBy === 'high_to_low' ? (
                        <span className="text-[10px] text-rose-500 font-bold flex items-center">↓ High</span>
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4">Article & Category</th>
                  <th className="py-3 px-3 text-center">Size</th>
                  <th className="py-3 px-4 font-mono">Barcode</th>
                  <th className="py-3 px-4">Sold Deal</th>
                  <th className="py-3 px-3">Salesperson</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredTags.map((tag) => {
                  const isBilled = tag.status === 'billed';
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <tr
                      key={tag.id}
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                        isSelected
                          ? 'bg-amber-500/10 dark:bg-amber-500/15'
                          : isBilled
                          ? 'bg-slate-50/40 dark:bg-slate-900/40 opacity-70'
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        {!isBilled ? (
                          <button
                            onClick={() => toggleSelectTag(tag.id)}
                            className="text-slate-400 hover:text-amber-500 transition-colors"
                            title={isSelected ? "Deselect" : "Select tag to bill"}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-500" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                        )}
                      </td>

                      {/* HERO MRP COLUMN - LARGE & FOCUSED */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                            ₹{Number(tag.mrp || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>

                      {/* Article Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                          {tag.articleName || tag.articleNo || 'Apparel'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{tag.section}</span>
                          {tag.articleNo && tag.articleName && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-slate-400">{tag.articleNo}</span>
                            </>
                          )}
                          {tag.color && (
                            <>
                              <span>•</span>
                              <span>{tag.color}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Size Badge */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 font-black text-xs border border-purple-500/20 whitespace-nowrap">
                          {tag.size || 'Free'}
                        </span>
                      </td>

                      {/* Barcode Strip */}
                      <td className="py-3 px-4 font-mono">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                          <span className="font-bold tracking-wider text-slate-800 dark:text-slate-200">
                            {tag.barcode}
                          </span>
                          <button
                            onClick={() => handleCopyBarcode(tag.barcode, tag.id)}
                            className="p-0.5 hover:text-amber-500 text-slate-400 transition-colors"
                            title="Copy Barcode"
                          >
                            {copiedId === tag.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Deal / Sold Price */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white shadow-xs">
                            -{tag.discountPercent}%
                          </span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                            ₹{Number(tag.soldPrice || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>

                      {/* Salesperson & Date */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          {tag.salesperson || 'Cashier'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(tag.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isBilled ? (
                          <div className="flex flex-col">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Billed</span>
                            </span>
                            {tag.billedInBillNo && (
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                #{tag.billedInBillNo}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handlePrintSlip(tag)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Print thermal slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {!isBilled && (
                            <>
                              <button
                                onClick={() => handleBillInSpeedBilling([tag], 'b1g2')}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 hover:bg-amber-400 shadow-sm active:scale-95 transition-all"
                                title="Bill this item in Speed Billing POS"
                              >
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                <span>Bill</span>
                              </button>

                              <button
                                onClick={() => handleMarkBilled(tag.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold"
                                title="Mark as billed manually"
                              >
                                Mark Billed
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete / Void tag"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTags.map((tag) => {
            const isBilled = tag.status === 'billed';
            return (
              <div
                key={tag.id}
                className={`p-4 rounded-2xl border transition-all relative ${
                  isBilled
                    ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-md hover:shadow-lg hover:border-rose-300 dark:hover:border-rose-500/40'
                }`}
              >
                {/* Header: Article Name & Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2.5 flex-1">
                    {!isBilled && (
                      <button
                        onClick={() => toggleSelectTag(tag.id)}
                        className="mt-0.5 text-slate-400 hover:text-amber-500 transition-colors shrink-0"
                        title={selectedTagIds.includes(tag.id) ? "Deselect" : "Select tag to bill"}
                      >
                        {selectedTagIds.includes(tag.id) ? (
                          <CheckSquare className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                        {tag.articleName || tag.articleNo || 'Apparel'}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                          {tag.section}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30">
                          Size: {tag.size}
                        </span>
                        {tag.color && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {tag.color}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isBilled ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Billed</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      <span>Pending</span>
                    </span>
                  )}
                </div>

                {/* HERO FOCUS: LARGE HIGH-CONTRAST MRP CONTAINER */}
                <div className="my-2.5 p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-100/50 dark:from-amber-500/15 dark:via-slate-800 dark:to-slate-800/80 border-2 border-amber-400/60 dark:border-amber-500/40 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                          TAG MRP
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Original Price</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1 font-mono">
                        ₹{Number(tag.mrp || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-center">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-500 text-white shadow-sm shadow-rose-500/30">
                        -{tag.discountPercent}% OFF
                      </span>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                        Sold At: <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{Number(tag.soldPrice || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barcode Strip with 1-Click Copy */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 font-mono my-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-black tracking-widest text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{tag.barcode}</span>
                  </div>
                  <button
                    onClick={() => handleCopyBarcode(tag.barcode, tag.id)}
                    className="px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                    title="Copy barcode to paste into Speed Billing"
                  >
                    {copiedId === tag.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Bill Resolution details if billed */}
                {isBilled && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 my-2 flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5" />
                      {tag.billedInBillNo}
                    </span>
                    <span className="text-[10px] text-emerald-600/80">
                      {tag.autoResolved ? 'Auto-detected in POS' : 'Manually Settled'}
                    </span>
                  </div>
                )}

                {/* Meta details */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{tag.salesperson || 'Cashier'}</span>
                  </div>
                  <span>
                    {new Date(tag.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* Card Actions Bar */}
                <div className="flex items-center justify-between gap-1.5 mt-3 pt-2">
                  <button
                    onClick={() => handlePrintSlip(tag)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition-all"
                    title="Print 58mm thermal tag slip for physical stapling"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Slip</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {!isBilled && (
                      <>
                        <button
                          onClick={() => handleBillInSpeedBilling([tag], 'b1g2')}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 transition-all"
                          title="Load this garment into Speed Billing POS"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Speed Bill</span>
                        </button>

                        <button
                          onClick={() => handleMarkBilled(tag.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all"
                          title="Mark as billed if manually combined in POS"
                        >
                          Mark Billed
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 transition-all"
                      title="Void / Delete tag"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Action Dock for Multi-Tag Speed Billing */}
      {selectedTagIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
              {selectedTagIds.length}
            </span>
            <span className="text-xs font-semibold">
              Tags Selected ({selectedTagIds.length % 3 === 0 ? `${selectedTagIds.length / 3} B1G2 Combo(s)` : `${selectedTagIds.length} garments`})
            </span>
          </div>

          <div className="h-5 w-px bg-slate-700" />

          <button
            onClick={() => {
              const selectedItems = tags.filter(t => selectedTagIds.includes(t.id));
              if (selectedItems.length === 3) {
                openTripletBreakdown(selectedItems, 'Selected 3-Piece Triplet');
              } else {
                handleBillInSpeedBilling(selectedItems, 'b1g2');
              }
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/30 transition-all active:scale-95"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Bill Selected ({selectedTagIds.length}) in Speed Billing</span>
          </button>

          <button
            onClick={clearSelection}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors text-xs"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* --- ADD PENDING TAG MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-500/10 to-amber-500/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500 text-white shadow-md">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Add Pending Tag</h3>
                  <p className="text-[11px] text-slate-500">Record a single-piece sold under the B1G2 promo</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddTag} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Quick Barcode Scanner / Article Finder */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Scan Barcode or Search Article</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Scan barcode (e.g. 0079734971)..."
                    value={scanQuery}
                    onChange={(e) => setScanQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickLookup(scanQuery);
                      }
                    }}
                    autoFocus
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickLookup(scanQuery)}
                    disabled={isSearchingBarcode || !scanQuery.trim()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold disabled:opacity-50 transition-all"
                  >
                    {isSearchingBarcode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Find'}
                  </button>
                </div>
                {barcodeMatchError && (
                  <p className="text-[11px] text-amber-500 mt-1">{barcodeMatchError}</p>
                )}
              </div>

              {/* Product Details Form Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Barcode *</label>
                  <input
                    type="text"
                    required
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    placeholder="Barcode / SKU"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Article No</label>
                  <input
                    type="text"
                    value={form.articleNo}
                    onChange={(e) => setForm({ ...form, articleNo: e.target.value })}
                    placeholder="e.g. CFS-0192"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Article Name</label>
                <input
                  type="text"
                  value={form.articleName}
                  onChange={(e) => setForm({ ...form, articleName: e.target.value })}
                  placeholder="e.g. Formal Cotton Shirt Slim Fit"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Size</label>
                  <input
                    type="text"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    placeholder="38, 40, L, etc."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Color</label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="Blue, Black..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Original MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    value={form.mrp}
                    onChange={(e) => {
                      const newMrp = e.target.value;
                      setForm(prev => {
                        const numMrp = parseFloat(newMrp) || 0;
                        const numDisc = parseFloat(prev.discountPercent) || 0;
                        return {
                          ...prev,
                          mrp: newMrp,
                          soldPrice: numMrp > 0 ? Math.round(numMrp * (1 - (numDisc / 100))) : ''
                        };
                      });
                    }}
                    placeholder="2999"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>
              </div>

              {/* Discount Percentage Option (Key User Requirement!) */}
              <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" />
                    <span>Select Discount Percentage Given</span>
                  </label>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                    {form.discountPercent}% OFF
                  </span>
                </div>

                {/* Quick Preset Buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                  {DISCOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => updateDiscount(preset.value)}
                      className={`py-1.5 px-1 text-center rounded-lg text-[11px] font-bold transition-all ${
                        Number(form.discountPercent) === preset.value
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Percentage or Sold Price Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Custom Discount %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.discountPercent}
                      onChange={(e) => updateDiscount(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Sold At Price (₹)
                    </label>
                    <input
                      type="number"
                      value={form.soldPrice}
                      onChange={(e) => updateSoldPrice(e.target.value)}
                      placeholder="e.g. 1200"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-black text-sm"
                    />
                  </div>
                </div>

                {/* Live Realization Preview */}
                {form.mrp && form.soldPrice && (
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-rose-200/60 dark:border-rose-900/40 text-slate-600 dark:text-slate-300">
                    <span>MRP: <strong className="text-slate-900 dark:text-white font-black text-sm">₹{form.mrp}</strong></span>
                    <span>Paid: <strong className="text-emerald-600 dark:text-emerald-400 font-black">₹{form.soldPrice}</strong></span>
                    <span>Saved: <strong className="text-rose-600 dark:text-rose-400 font-bold">₹{Math.max(0, form.mrp - form.soldPrice)}</strong></span>
                  </div>
                )}
              </div>

              {/* Staff and Customer Details (Optional) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Salesperson</label>
                  <input
                    type="text"
                    value={form.salesperson}
                    onChange={(e) => setForm({ ...form, salesperson: e.target.value })}
                    placeholder="Staff name"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Customer Phone</label>
                  <input
                    type="tel"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                >
                  Save Pending Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- B1G2 TRIPLET BILLING & DISCOUNT BREAKDOWN MODAL --- */}
      {tripletBreakdownModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/30">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      B1G2 Triplet Discount Breakdown
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950">
                      3 Articles
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {tripletBreakdownModal.section} • Full itemized discount breakdown before billing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTripletBreakdownModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close Breakdown"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Financial Bento Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Gross MRP */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Gross 3-Pc MRP
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    ₹{tripletBreakdownModal.totalMrp.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Sum of all 3 tags</div>
                </div>

                {/* Total B1G2 Discount */}
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 dark:bg-rose-950/20">
                  <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Total Discount</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white">
                      {tripletBreakdownModal.overallDiscountPct}% OFF
                    </span>
                  </div>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                    -₹{tripletBreakdownModal.totalDiscount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">2 lowest pieces free</div>
                </div>

                {/* Net Bill Payable */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 shadow-sm">
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">
                    Bill Payable (POS)
                  </div>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                    ₹{tripletBreakdownModal.highestMrp.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 font-medium">
                    Highest MRP piece
                  </div>
                </div>

                {/* Counter Realization / Variance */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-950/20">
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    Cash Realized
                  </div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{tripletBreakdownModal.totalCollected.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] font-bold mt-0.5">
                    {tripletBreakdownModal.variance > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +₹{tripletBreakdownModal.variance.toLocaleString('en-IN')} Surplus
                      </span>
                    ) : tripletBreakdownModal.variance < 0 ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        -₹{Math.abs(tripletBreakdownModal.variance).toLocaleString('en-IN')} Shortage
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">Exact 100% Match</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Itemized Discount Breakdown Table */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    <span>Itemized Garment Breakdown ({tripletBreakdownModal.items.length} Articles)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Sorted by MRP: Highest to Lowest
                  </span>
                </div>

                <div className="space-y-2.5">
                  {tripletBreakdownModal.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        item.isPaid
                          ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 shadow-sm'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Article Info */}
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            item.isPaid
                              ? 'bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {item.barcode}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                item.isPaid
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {item.isPaid ? 'Paid Piece (Full MRP)' : '100% Free Piece'}
                              </span>
                              {item.section && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {item.section}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Size: <strong className="text-slate-700 dark:text-slate-200">{item.size || 'M'}</strong></span>
                              {item.color && (
                                <>
                                  <span>•</span>
                                  <span>Color: <strong className="text-slate-700 dark:text-slate-200">{item.color}</strong></span>
                                </>
                              )}
                              {item.customerName && (
                                <>
                                  <span>•</span>
                                  <span>Sold to: <strong className="text-slate-700 dark:text-slate-200">{item.customerName}</strong></span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Financial Columns */}
                        <div className="flex items-center gap-4 shrink-0 sm:text-right">
                          {/* Tag MRP */}
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Tag MRP</div>
                            <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                              ₹{(Number(item.mrp) || 0).toLocaleString('en-IN')}
                            </div>
                          </div>

                          {/* B1G2 Discount */}
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">B1G2 Discount</div>
                            <div className={`font-mono text-xs font-black ${
                              item.isPaid
                                ? 'text-slate-500 dark:text-slate-400'
                                : 'text-rose-500 dark:text-rose-400'
                            }`}>
                              {item.isPaid
                                ? '₹0 (0% Off)'
                                : `-₹${(Number(item.mrp) || 0).toLocaleString('en-IN')} (100% Free)`}
                            </div>
                          </div>

                          {/* Net Billed */}
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Net Billed</div>
                            <div className="font-mono text-sm font-black text-slate-900 dark:text-white">
                              {item.isPaid ? `₹${item.b1g2Net.toLocaleString('en-IN')}` : '₹0.00'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sub-bar: Proportional GST split + Counter Single Sale realized */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Proportional GST Split: <strong>{tripletBreakdownModal.overallDiscountPct}% Off</strong> (-₹{item.propDiscFlat.toLocaleString('en-IN')}) = Net: <strong className="text-slate-700 dark:text-slate-200">₹{item.propNet.toLocaleString('en-IN')}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          <span>
                            Single sale collected: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">₹{item.tagSoldPrice.toLocaleString('en-IN')}</strong> ({item.tagDiscount}% tag discount)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informative Rule Explainer */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">How Buy 1 Get 2 Free billing works:</div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    The highest MRP garment (<strong>₹{tripletBreakdownModal.highestMrp.toLocaleString('en-IN')}</strong>) is billed as the payable item, while the other 2 garments are 100% discounted (free).
                    When billing into Busy POS or Speed Billing, the system maps this triplet as 1 complete B1G2 voucher so physical stock, sales invoices, and GST return remain perfectly balanced.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const barcodes = tripletBreakdownModal.items.map(i => i.barcode).join('\n');
                  navigator.clipboard.writeText(barcodes);
                  showToastMsg('Copied 3 barcodes to clipboard!', 'success');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all active:scale-95 w-full sm:w-auto justify-center"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy 3 Barcodes</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setTripletBreakdownModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkTripletBilled(tripletBreakdownModal.items)}
                  className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all active:scale-95"
                  title="Mark all 3 tags as billed directly in Busy POS"
                >
                  Mark Billed Directly
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const items = tripletBreakdownModal.items;
                    setTripletBreakdownModal(null);
                    handleBillInSpeedBilling(items, 'b1g2');
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 transition-all active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Open in Speed Billing</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
