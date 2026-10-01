import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Zap,
  Search,
  ShoppingCart,
  Trash2,
  Tag,
  User,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  PauseCircle,
  PlayCircle,
  Plus,
  Minus,
  CheckCircle2,
  X,
  Keyboard,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Phone,
  Clock,
  Layers,
  ChevronDown,
  Volume2
} from 'lucide-react';
import axios from 'axios';
import { playCheckoutChime, speakCheckoutVoice } from '../utils/sound';
import { triggerThermalPrint, DEFAULT_STORE_INFO, formatLine, formatDivider, centerText } from '../utils/thermalReceipt';

// Common Cobb Apparel Demo Catalog for instant offline/speed scan
const QUICK_CATALOG = [
  { barcode: '8907234001', name: 'Cobb Formal White Shirt', size: '40', category: 'Formal Shirts', mrp: 1899, gstPct: 5 },
  { barcode: '8907234002', name: 'Cobb Navy Chinos Slim Fit', size: '32', category: 'Chinos', mrp: 2299, gstPct: 12 },
  { barcode: '8907234003', name: 'Cobb Polo T-Shirt Olive', size: 'L', category: 'Casual T-Shirts', mrp: 1199, gstPct: 5 },
  { barcode: '8907234004', name: 'Cobb Dark Blue Washed Denim', size: '34', category: 'Jeans', mrp: 2799, gstPct: 12 },
  { barcode: '8907234005', name: 'Cobb Italian Black Blazer', size: '42', category: 'Blazers', mrp: 5499, gstPct: 12 },
  { barcode: '8907234006', name: 'Cobb Pure Leather Belt Brown', size: 'Free', category: 'Accessories', mrp: 899, gstPct: 12 },
  { barcode: '8907234007', name: 'Cobb Cotton Socks 3-Pack', size: 'Free', category: 'Accessories', mrp: 499, gstPct: 5 }
];

const DEFAULT_STAFF = [
  { id: '1', name: 'Rahul Sharma', code: 'S01', role: 'Floor Senior' },
  { id: '2', name: 'Amit Kumar', code: 'S02', role: 'Trial Specialist' },
  { id: '3', name: 'Pooja Verma', code: 'S03', role: 'Counter Cashier' },
  { id: '4', name: 'Vikram Singh', code: 'S04', role: 'Casual Section' }
];

export default function SpeedBillingModal({
  isOpen = true,
  onClose,
  API_BASE = 'http://localhost:5000',
  activeStore = 'Pundri',
  userRole = 'cashier'
}) {
  // Cart & Line Items
  const [cart, setCart] = useState([
    {
      id: 'item-1',
      barcode: '8907234001',
      name: 'Cobb Formal White Shirt',
      size: '40',
      category: 'Formal Shirts',
      mrp: 1899,
      qty: 1,
      discountPct: 0,
      discountFlat: 0,
      gstPct: 5,
      staff: 'Rahul Sharma'
    }
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Barcode / Item Search
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const barcodeInputRef = useRef(null);

  // Customer Details
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Guest');
  const [billNumber, setBillNumber] = useState(() => `COBB-${Math.floor(100000 + Math.random() * 900000)}`);

  // Sub-modal states for F2, F3, F4, F6, F7, F9, F12
  const [activeModal, setActiveModal] = useState(null); // 'qty' | 'discount' | 'staff' | 'cash' | 'upi' | 'parked' | 'success'

  // F2 Qty State
  const [editQtyValue, setEditQtyValue] = useState('1');
  const qtyInputRef = useRef(null);

  // F3 Discount State
  const [discMode, setDiscMode] = useState('percent'); // 'percent' | 'flat'
  const [discValue, setDiscValue] = useState(10);
  const [discScope, setDiscScope] = useState('selected'); // 'selected' | 'all'

  // F4 Staff State
  const [staffList, setStaffList] = useState(DEFAULT_STAFF);

  // F6 Cash Tender State
  const [tenderCash, setTenderCash] = useState('');
  const cashInputRef = useRef(null);

  // F7 Dynamic UPI QR State
  const [upiQrUrl, setUpiQrUrl] = useState('');
  const [upiStatus, setUpiStatus] = useState('waiting'); // 'waiting' | 'verified'

  // F9 Parked / Held Bills State
  const [parkedBills, setParkedBills] = useState(() => {
    try {
      const raw = localStorage.getItem('cobb_parked_bills');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Success / Receipt State
  const [settledBill, setSettledBill] = useState(null);

  // Save parked bills locally
  useEffect(() => {
    try {
      localStorage.setItem('cobb_parked_bills', JSON.stringify(parkedBills));
    } catch {}
  }, [parkedBills]);

  // Calculations
  const calculations = useMemo(() => {
    let grossTotal = 0;
    let totalDiscount = 0;
    let taxableTotal = 0;
    let totalGst = 0;
    let finalPayable = 0;

    cart.forEach(item => {
      const lineGross = item.mrp * item.qty;
      grossTotal += lineGross;

      let itemDiscount = 0;
      if (item.discountPct > 0) {
        itemDiscount = Math.round((lineGross * item.discountPct) / 100);
      } else if (item.discountFlat > 0) {
        itemDiscount = Math.min(lineGross, item.discountFlat);
      }
      totalDiscount += itemDiscount;

      const netLine = lineGross - itemDiscount;
      const gstRate = item.gstPct || 5;
      // Taxable = Net / (1 + GST/100)
      const taxable = netLine / (1 + gstRate / 100);
      const gst = netLine - taxable;

      taxableTotal += taxable;
      totalGst += gst;
      finalPayable += netLine;
    });

    return {
      grossTotal: Math.round(grossTotal),
      totalDiscount: Math.round(totalDiscount),
      taxableTotal: Math.round(taxableTotal),
      cgst: Math.round(totalGst / 2),
      sgst: Math.round(totalGst / 2),
      totalGst: Math.round(totalGst),
      finalPayable: Math.round(finalPayable),
      itemCount: cart.reduce((sum, it) => sum + it.qty, 0)
    };
  }, [cart]);

  // Keep search input focused on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Fetch live staff from API if available
  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await axios.get(`${API_BASE}/api/staff`);
        if (res.data?.success && Array.isArray(res.data.staff) && res.data.staff.length > 0) {
          setStaffList(res.data.staff.map((s, idx) => ({
            id: s.id || String(idx + 1),
            name: s.name,
            code: s.code || `S0${idx + 1}`,
            role: s.role || 'Sales Associate'
          })));
        }
      } catch {}
    }
    loadStaff();
  }, [API_BASE]);

  // Generate UPI QR whenever F7 is pressed or finalPayable changes
  const generateUpiQr = useCallback(async (amount) => {
    const vpa = 'cobbapparel@icici';
    const storeName = 'Cobb Italy POS';
    const cleanAmount = Number(amount || calculations.finalPayable || 0);
    const upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(storeName)}&am=${cleanAmount}&cu=INR&tn=Bill-${billNumber}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(upiUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#020617', light: '#ffffff' }
      });
      setUpiQrUrl(qrDataUrl);
    } catch (e) {
      console.error('Failed to generate UPI QR:', e);
    }
  }, [billNumber, calculations.finalPayable]);

  // Add Item by Barcode or Code
  const handleAddItemByQuery = useCallback((query) => {
    const q = (query || searchInput).trim().toLowerCase();
    if (!q) return;

    // Search catalog or match barcode
    let matched = QUICK_CATALOG.find(
      it => it.barcode.toLowerCase() === q || it.name.toLowerCase().includes(q)
    );

    if (!matched) {
      // Dynamic fallback item creation for arbitrary scanned barcodes
      matched = {
        barcode: q.toUpperCase(),
        name: `Cobb Article #${q.toUpperCase()}`,
        size: 'L',
        category: 'Apparel',
        mrp: 1499,
        gstPct: 5
      };
    }

    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.barcode === matched.barcode);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: updated[existingIdx].qty + 1
        };
        setSelectedIndex(existingIdx);
        return updated;
      } else {
        const newItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          barcode: matched.barcode,
          name: matched.name,
          size: matched.size || 'M',
          category: matched.category || 'Casual',
          mrp: matched.mrp || 1499,
          qty: 1,
          discountPct: 0,
          discountFlat: 0,
          gstPct: matched.gstPct || 5,
          staff: staffList[0]?.name || 'Rahul Sharma'
        };
        setSelectedIndex(prev.length);
        return [...prev, newItem];
      }
    });

    setSearchInput('');
    setSearchResults([]);
    barcodeInputRef.current?.focus();
  }, [searchInput, staffList]);

  // Fast Key Event Handler (F1 - F12)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // F1: Focus Barcode / Search
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveModal(null);
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
        return;
      }

      // F2: Edit Quantity
      if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length === 0) return;
        setEditQtyValue(String(cart[selectedIndex]?.qty || 1));
        setActiveModal('qty');
        setTimeout(() => {
          qtyInputRef.current?.focus();
          qtyInputRef.current?.select();
        }, 80);
        return;
      }

      // F3: Apply Discount
      if (e.key === 'F3') {
        e.preventDefault();
        if (cart.length === 0) return;
        setActiveModal('discount');
        return;
      }

      // F4: Salesperson / Staff Tag
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length === 0) return;
        setActiveModal('staff');
        return;
      }

      // F6: Instant Cash Settle
      if (e.key === 'F6') {
        e.preventDefault();
        if (cart.length === 0) return;
        setTenderCash(String(calculations.finalPayable));
        setActiveModal('cash');
        setTimeout(() => {
          cashInputRef.current?.focus();
          cashInputRef.current?.select();
        }, 80);
        return;
      }

      // F7: Instant UPI Settle
      if (e.key === 'F7') {
        e.preventDefault();
        if (cart.length === 0) return;
        generateUpiQr(calculations.finalPayable);
        setActiveModal('upi');
        return;
      }

      // F9: Park / Hold Bill
      if (e.key === 'F9') {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+F9 opens recall list
          setActiveModal('parked');
        } else {
          // F9 parks the bill
          handleParkBill();
        }
        return;
      }

      // F12: Instant Thermal Print & Open Cash Drawer
      if (e.key === 'F12') {
        e.preventDefault();
        handleInstantPrintAndDrawer();
        return;
      }

      // Escape: Close active sub-modal or return focus to search
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeModal) {
          setActiveModal(null);
          setTimeout(() => barcodeInputRef.current?.focus(), 80);
        } else if (onClose) {
          onClose();
        }
        return;
      }

      // Arrow Up / Down in cart navigation (when no submodal is active)
      if (!activeModal && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        if (document.activeElement === barcodeInputRef.current && searchResults.length === 0) {
          e.preventDefault();
          if (e.key === 'ArrowUp') {
            setSelectedIndex(prev => Math.max(0, prev - 1));
          } else {
            setSelectedIndex(prev => Math.min(cart.length - 1, prev + 1));
          }
        }
      }

      // Delete / Backspace removes selected line item if not in text input
      if (!activeModal && (e.key === 'Delete')) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          handleRemoveItem(selectedIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeModal, cart, selectedIndex, calculations.finalPayable, generateUpiQr, onClose]);

  // Remove Line Item
  const handleRemoveItem = (index) => {
    setCart(prev => {
      const updated = prev.filter((_, i) => i !== index);
      setSelectedIndex(Math.max(0, index - 1));
      return updated;
    });
  };

  // Submit Quantity Change
  const handleSaveQty = () => {
    const qtyNum = Math.max(1, parseInt(editQtyValue, 10) || 1);
    setCart(prev => {
      const updated = [...prev];
      if (updated[selectedIndex]) {
        updated[selectedIndex] = { ...updated[selectedIndex], qty: qtyNum };
      }
      return updated;
    });
    setActiveModal(null);
    setTimeout(() => barcodeInputRef.current?.focus(), 80);
  };

  // Submit Discount Change
  const handleApplyDiscount = () => {
    const val = Number(discValue) || 0;
    setCart(prev => {
      return prev.map((item, idx) => {
        if (discScope === 'selected' && idx !== selectedIndex) return item;
        if (discMode === 'percent') {
          return { ...item, discountPct: val, discountFlat: 0 };
        } else {
          return { ...item, discountFlat: val, discountPct: 0 };
        }
      });
    });
    setActiveModal(null);
    setTimeout(() => barcodeInputRef.current?.focus(), 80);
  };

  // Attach Staff Tag
  const handleAttachStaff = (staffName) => {
    setCart(prev => {
      const updated = [...prev];
      if (updated[selectedIndex]) {
        updated[selectedIndex] = { ...updated[selectedIndex], staff: staffName };
      }
      return updated;
    });
    setActiveModal(null);
    setTimeout(() => barcodeInputRef.current?.focus(), 80);
  };

  // Settle Bill (Cash or UPI)
  const handleFinalSettle = (mode = 'Cash', tenderAmount = calculations.finalPayable) => {
    const billRecord = {
      billNo: billNumber,
      timestamp: new Date().toISOString(),
      customerPhone: customerPhone || '9876543210',
      customerName: customerName || 'Walk-in Guest',
      store: activeStore,
      items: [...cart],
      grossTotal: calculations.grossTotal,
      discount: calculations.totalDiscount,
      totalGst: calculations.totalGst,
      cgst: calculations.cgst,
      sgst: calculations.sgst,
      finalPayable: calculations.finalPayable,
      paymentMode: mode,
      tenderCash: Number(tenderAmount || calculations.finalPayable),
      changeDue: Math.max(0, Number(tenderAmount) - calculations.finalPayable)
    };

    setSettledBill(billRecord);
    setActiveModal('success');

    // Trigger Audio Soundbox & Voice Confirmation
    playCheckoutChime();
    speakCheckoutVoice({
      amount: calculations.finalPayable,
      paymentMode: mode
    });

    // Invalidate backend sales cache so the new bill appears in LiveBillsTab
    axios.post(`${API_BASE}/api/cache/invalidate-sales`).catch(() => {});
  };

  // Park / Hold Active Bill
  const handleParkBill = async () => {
    if (cart.length === 0) return;

    const newPark = {
      id: `park_${Date.now()}`,
      billNumber,
      customerName: customerName || 'Walk-in',
      customerPhone: customerPhone || '',
      cart: [...cart],
      totalAmount: calculations.finalPayable,
      itemCount: calculations.itemCount,
      parkedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Save to local parked queue
    setParkedBills(prev => [newPark, ...prev]);

    // Also mirror to Cobb Hold Desk API
    try {
      await axios.post(`${API_BASE}/api/holds/add`, {
        customerName: newPark.customerName,
        customerPhone: newPark.customerPhone,
        articleNo: cart[0]?.barcode || 'CART',
        articleName: `${cart[0]?.name || 'Apparel'} (+${cart.length - 1} items)`,
        size: cart[0]?.size || 'Mix',
        category: 'Held Cart',
        windowHours: 2
      });
    } catch {}

    // Reset active cart for next waiting customer
    setCart([]);
    setBillNumber(`COBB-${Math.floor(100000 + Math.random() * 900000)}`);
    setCustomerPhone('');
    setCustomerName('Walk-in Guest');
    setActiveModal(null);

    // Audio cue
    playCheckoutChime();
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  // Recall Parked Bill
  const handleRecallBill = (parkedItem) => {
    setCart(parkedItem.cart);
    setBillNumber(parkedItem.billNumber || `COBB-${Math.floor(100000 + Math.random() * 900000)}`);
    setCustomerName(parkedItem.customerName);
    setCustomerPhone(parkedItem.customerPhone);
    setSelectedIndex(0);

    // Remove from parked queue
    setParkedBills(prev => prev.filter(p => p.id !== parkedItem.id));
    setActiveModal(null);
    setTimeout(() => barcodeInputRef.current?.focus(), 80);
  };

  // Instant Thermal Print & Drawer Kick
  const handleInstantPrintAndDrawer = () => {
    // 1. Kick cash drawer via Electron native IPC if in desktop app
    if (typeof window !== 'undefined' && window.electronAPI?.kickCashDrawer) {
      window.electronAPI.kickCashDrawer();
    }
    console.log('[POS Speed Billing] Pulse Drawer Kick: ESC p 0 25 250');
    // 2. Trigger thermal print
    triggerThermalPrint('speed-billing-receipt');
  };

  // Reset for Next Bill
  const handleStartNextBill = () => {
    setCart([]);
    setBillNumber(`COBB-${Math.floor(100000 + Math.random() * 900000)}`);
    setCustomerPhone('');
    setCustomerName('Walk-in Guest');
    setSettledBill(null);
    setActiveModal(null);
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-white select-none">
      {/* 1. TOP SPEED BILLING HEADER */}
      <header className="h-16 px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-wide bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
                  COBB SPEED POS
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  ZERO-MOUSE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Store: <span className="text-slate-200 font-semibold">{activeStore}</span> | Bill: <span className="text-amber-400 font-semibold">{billNumber}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Parked Bills Counter & Shortcuts Guide */}
        <div className="flex items-center space-x-3">
          {parkedBills.length > 0 && (
            <button
              onClick={() => setActiveModal('parked')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/30 transition animate-pulse"
            >
              <PauseCircle className="w-4 h-4" />
              <span>{parkedBills.length} Held Bills (Shift+F9)</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <Keyboard className="w-4 h-4 text-amber-400" />
            <span>F1-F12 Fast Keys Enabled</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Exit Speed Billing (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN SPLIT CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: SCANNER & CART ITEMS (65%) */}
        <div className="w-full lg:w-[65%] flex flex-col border-r border-slate-800 bg-slate-950/60 p-4 overflow-hidden">
          {/* F1: FAST BARCODE SCANNER INPUT */}
          <div className="mb-4">
            <div className="relative flex items-center">
              <div className="absolute left-4 flex items-center gap-2 pointer-events-none text-amber-400">
                <Search className="w-5 h-5" />
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono font-bold">F1</span>
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItemByQuery();
                  }
                }}
                placeholder="Scan Barcode / SKU / Article Name & Press Enter..."
                className="w-full pl-20 pr-32 py-3.5 bg-slate-900 border-2 border-slate-700 focus:border-amber-400 rounded-2xl text-base font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition shadow-inner"
              />
              <div className="absolute right-3 flex items-center gap-2">
                <button
                  onClick={() => handleAddItemByQuery()}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition shadow-md"
                >
                  <Plus className="w-4 h-4" /> Add Line
                </button>
              </div>
            </div>

            {/* Quick Demo Scan Tags */}
            <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">Quick Scan:</span>
              {QUICK_CATALOG.slice(0, 4).map(item => (
                <button
                  key={item.barcode}
                  onClick={() => handleAddItemByQuery(item.barcode)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-slate-300 text-[11px] font-mono whitespace-nowrap transition"
                >
                  +{item.name.split(' ').slice(1, 3).join(' ')} (₹{item.mrp})
                </button>
              ))}
            </div>
          </div>

          {/* CART ITEMS TABLE */}
          <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-900/40 shadow-inner flex flex-col">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Barcode / Item Description</th>
                  <th className="py-2.5 px-2 w-14 text-center">Size</th>
                  <th className="py-2.5 px-3 w-16 text-right">MRP</th>
                  <th className="py-2.5 px-2 w-20 text-center">Qty (F2)</th>
                  <th className="py-2.5 px-3 w-20 text-right">Disc (F3)</th>
                  <th className="py-2.5 px-3 w-24 text-right">Net</th>
                  <th className="py-2.5 px-3 w-28 text-center">Staff (F4)</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans text-xs">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center text-slate-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-400">POS Cart is Empty</p>
                      <p className="text-xs text-slate-600 mt-1">Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">F1</kbd> to scan items or pick from Quick Scan</p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    const lineGross = item.mrp * item.qty;
                    const lineDisc = item.discountPct > 0 
                      ? Math.round((lineGross * item.discountPct) / 100)
                      : (item.discountFlat || 0);
                    const lineNet = lineGross - lineDisc;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedIndex(idx)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-l-4 border-l-amber-500 text-white font-medium'
                            : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="text-[11px] font-mono text-slate-500">{item.barcode} • {item.category}</div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[11px]">
                            {item.size}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          ₹{item.mrp.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-300'}`}>
                            {item.qty}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-400">
                          {lineDisc > 0 ? `-₹${lineDisc}` : '—'}
                          {item.discountPct > 0 && <span className="block text-[10px] text-slate-500">{item.discountPct}%</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                          ₹{lineNet.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold whitespace-nowrap">
                            {item.staff || 'Counter'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(idx);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Remove (Del)"
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

          {/* Cart Status Line */}
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 px-1">
            <span>{cart.length} items in cart ({calculations.itemCount} units)</span>
            <span>Use <kbd className="px-1 bg-slate-800 rounded text-slate-400">↑</kbd> <kbd className="px-1 bg-slate-800 rounded text-slate-400">↓</kbd> to select row • <kbd className="px-1 bg-slate-800 rounded text-slate-400">Del</kbd> to remove</span>
          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY & FAST SETTLE DOCK (35%) */}
        <div className="w-full lg:w-[35%] flex flex-col bg-slate-900/60 p-4 justify-between overflow-y-auto">
          <div>
            {/* Customer Details Box */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-400" /> Customer Mobile
                </span>
                <span className="text-[10px] text-amber-400 font-mono">Loyalty Auto-Detect</span>
              </div>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Bill Summary Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs shadow-inner">
              <div className="flex justify-between text-slate-400">
                <span>Gross Amount:</span>
                <span className="font-mono text-slate-200">₹{calculations.grossTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Discounts:</span>
                <span className="font-mono text-rose-400">-₹{calculations.totalDiscount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Taxable Value:</span>
                <span className="font-mono text-slate-300">₹{calculations.taxableTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST (CGST + SGST):</span>
                <span className="font-mono text-slate-300">₹{calculations.totalGst.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Net Payable</span>
                  <span className="text-[11px] text-emerald-400 font-semibold">Taxes Included</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                    ₹{calculations.finalPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FAST SETTLEMENT BUTTONS */}
          <div className="space-y-2.5 pt-4">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  if (cart.length === 0) return;
                  setTenderCash(String(calculations.finalPayable));
                  setActiveModal('cash');
                }}
                disabled={cart.length === 0}
                className="py-3.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95"
              >
                <Banknote className="w-5 h-5 fill-current" />
                <div className="text-left">
                  <span className="block text-[10px] font-mono leading-none opacity-80">[F6] FAST</span>
                  <span className="text-sm">Cash Settle</span>
                </div>
              </button>

              <button
                onClick={() => {
                  if (cart.length === 0) return;
                  generateUpiQr(calculations.finalPayable);
                  setActiveModal('upi');
                }}
                disabled={cart.length === 0}
                className="py-3.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition active:scale-95"
              >
                <QrCode className="w-5 h-5" />
                <div className="text-left">
                  <span className="block text-[10px] font-mono leading-none text-indigo-200">[F7] FAST</span>
                  <span className="text-sm">UPI QR Pay</span>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleParkBill}
                disabled={cart.length === 0}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
              >
                <PauseCircle className="w-4 h-4 text-amber-400" />
                <span>[F9] Park Bill</span>
              </button>

              <button
                onClick={handleInstantPrintAndDrawer}
                disabled={cart.length === 0}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>[F12] Thermal Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ZERO-MOUSE BOTTOM FUNCTION KEY STRIP (F1 - F12) */}
      <footer className="h-14 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between overflow-x-auto shrink-0 shadow-2xl">
        <div className="flex items-center space-x-2 text-xs font-mono whitespace-nowrap">
          <button
            onClick={() => {
              setActiveModal(null);
              barcodeInputRef.current?.focus();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 hover:border-amber-500 transition"
          >
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px]">F1</span>
            <span>Search Barcode</span>
          </button>

          <button
            onClick={() => {
              if (cart.length === 0) return;
              setEditQtyValue(String(cart[selectedIndex]?.qty || 1));
              setActiveModal('qty');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 hover:border-amber-500 transition"
          >
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px]">F2</span>
            <span>Edit Qty</span>
          </button>

          <button
            onClick={() => {
              if (cart.length === 0) return;
              setActiveModal('discount');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 hover:border-amber-500 transition"
          >
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px]">F3</span>
            <span>Discount</span>
          </button>

          <button
            onClick={() => {
              if (cart.length === 0) return;
              setActiveModal('staff');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 hover:border-amber-500 transition"
          >
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px]">F4</span>
            <span>Staff Tag</span>
          </button>

          <button
            onClick={() => {
              if (cart.length === 0) return;
              setTenderCash(String(calculations.finalPayable));
              setActiveModal('cash');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 flex items-center gap-1.5 border border-emerald-600/50 transition font-bold"
          >
            <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-black text-[10px]">F6</span>
            <span>Cash Settle</span>
          </button>

          <button
            onClick={() => {
              if (cart.length === 0) return;
              generateUpiQr(calculations.finalPayable);
              setActiveModal('upi');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 flex items-center gap-1.5 border border-indigo-600/50 transition font-bold"
          >
            <span className="px-1.5 py-0.5 rounded bg-indigo-400 text-slate-950 font-black text-[10px]">F7</span>
            <span>UPI QR Settle</span>
          </button>

          <button
            onClick={handleParkBill}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 hover:border-amber-500 transition"
          >
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px]">F9</span>
            <span>Park Bill</span>
          </button>

          <button
            onClick={handleInstantPrintAndDrawer}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 hover:border-blue-500 transition"
          >
            <span className="px-1.5 py-0.5 rounded bg-blue-400 text-slate-950 font-black text-[10px]">F12</span>
            <span>Print Slip</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
          <span className="hidden sm:inline">Esc: Close</span>
        </div>
      </footer>

      {/* ============================================================== */}
      {/* SUB-MODAL 1: F2 EDIT QUANTITY                                  */}
      {/* ============================================================== */}
      {activeModal === 'qty' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-xs font-bold">F2</span>
              Change Quantity
            </h3>
            <p className="text-xs text-slate-400 mb-4 truncate">
              {cart[selectedIndex]?.name || 'Item'}
            </p>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setEditQtyValue(prev => String(Math.max(1, (parseInt(prev, 10) || 1) - 1)))}
                className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xl flex items-center justify-center transition"
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                ref={qtyInputRef}
                type="number"
                min="1"
                max="999"
                value={editQtyValue}
                onChange={(e) => setEditQtyValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveQty();
                  }
                }}
                className="flex-1 py-3 bg-slate-950 border-2 border-amber-500 rounded-2xl text-center text-2xl font-black font-mono text-white focus:outline-none"
              />
              <button
                onClick={() => setEditQtyValue(prev => String((parseInt(prev, 10) || 1) + 1))}
                className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xl flex items-center justify-center transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel (Esc)
              </button>
              <button
                onClick={handleSaveQty}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                Apply (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL 2: F3 DISCOUNT                                       */}
      {/* ============================================================== */}
      {activeModal === 'discount' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-xs font-bold">F3</span>
              Apply Retail Discount
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Apply promotional discount to item or entire cart
            </p>

            {/* Scope Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setDiscScope('selected')}
                className={`py-1.5 rounded-lg transition ${discScope === 'selected' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
              >
                Selected Item ({cart[selectedIndex]?.name.slice(0, 15)}...)
              </button>
              <button
                onClick={() => setDiscScope('all')}
                className={`py-1.5 rounded-lg transition ${discScope === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
              >
                Entire Cart (All Items)
              </button>
            </div>

            {/* Mode: Percent vs Flat */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setDiscMode('percent')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${discMode === 'percent' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                Percentage (%)
              </button>
              <button
                onClick={() => setDiscMode('flat')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${discMode === 'flat' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              >
                Flat Rupees (₹)
              </button>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {discMode === 'percent' ? (
                [10, 20, 30, 50].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setDiscValue(pct)}
                    className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold border border-slate-700"
                  >
                    {pct}% Off
                  </button>
                ))
              ) : (
                [100, 200, 500, 1000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setDiscValue(amt)}
                    className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold border border-slate-700"
                  >
                    ₹{amt} Off
                  </button>
                ))
              )}
            </div>

            {/* Input */}
            <input
              type="number"
              value={discValue}
              onChange={(e) => setDiscValue(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyDiscount();
                }
              }}
              className="w-full py-3 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-center text-xl font-mono text-white mb-6 focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel (Esc)
              </button>
              <button
                onClick={handleApplyDiscount}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                Apply Discount (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL 3: F4 SALESPERSON / STAFF TAG                         */}
      {/* ============================================================== */}
      {activeModal === 'staff' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-xs font-bold">F4</span>
              Attach Staff / Salesperson
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select salesperson for sales incentive & commission tracking
            </p>

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {staffList.map((st, i) => (
                <button
                  key={st.id || i}
                  onClick={() => handleAttachStaff(st.name)}
                  className="w-full p-3 rounded-2xl bg-slate-950 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/50 flex items-center justify-between text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 text-blue-400 font-mono font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-blue-300">{st.name}</div>
                      <div className="text-[11px] text-slate-500">{st.role} • Code: {st.code}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              Cancel (Esc)
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL 4: F6 CASH SETTLE & CHANGE CALCULATOR                */}
      {/* ============================================================== */}
      {activeModal === 'cash' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono text-xs font-bold">F6</span>
                Cash Settlement & Tender Change
              </h3>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                BILL: {billNumber}
              </span>
            </div>

            {/* Net Amount Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center mb-4">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold block">Bill Total Payable</span>
                <span className="text-xs text-slate-500">{calculations.itemCount} items</span>
              </div>
              <span className="text-3xl font-black font-mono text-white">
                ₹{calculations.finalPayable.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Cash Given Input */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Cash Tendered / Received (₹):
              </label>
              <input
                ref={cashInputRef}
                type="number"
                value={tenderCash}
                onChange={(e) => setTenderCash(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFinalSettle('Cash', tenderCash);
                  }
                }}
                className="w-full py-4 px-4 bg-slate-950 border-2 border-emerald-500 rounded-2xl text-center text-3xl font-black font-mono text-emerald-400 focus:outline-none"
              />
            </div>

            {/* Change Due Display */}
            {(() => {
              const tendered = Number(tenderCash) || 0;
              const changeDue = tendered - calculations.finalPayable;
              return (
                <div className={`p-4 rounded-2xl mb-6 flex justify-between items-center ${
                  changeDue >= 0 ? 'bg-emerald-950/40 border border-emerald-500/30' : 'bg-rose-950/40 border border-rose-500/30'
                }`}>
                  <div>
                    <span className="text-xs font-bold block uppercase tracking-wider text-slate-300">
                      {changeDue >= 0 ? 'Change To Return' : 'Shortage / Due'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {changeDue >= 0 ? 'Hand over to customer' : 'Remaining cash balance'}
                    </span>
                  </div>
                  <span className={`text-3xl font-black font-mono ${changeDue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{Math.abs(changeDue).toLocaleString('en-IN')}
                  </span>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="py-3.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel (Esc)
              </button>
              <button
                onClick={() => handleFinalSettle('Cash', tenderCash)}
                className="py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
              >
                <CheckCircle2 className="w-5 h-5" /> Settle & Chime (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL 5: F7 DYNAMIC UPI QR                                 */}
      {/* ============================================================== */}
      {activeModal === 'upi' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-6 shadow-2xl text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-500 text-white font-mono text-xs font-bold">F7</span>
                Dynamic UPI QR Payment
              </h3>
              <span className="text-xs text-indigo-400 font-mono font-bold">Auto-Amount</span>
            </div>

            {/* Display QR */}
            <div className="bg-white p-4 rounded-3xl inline-block mx-auto mb-4 shadow-xl border-4 border-indigo-500/20">
              {upiQrUrl ? (
                <img src={upiQrUrl} alt="UPI QR" className="w-48 h-48 mx-auto" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 font-mono text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="mb-4">
              <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Scan & Pay Exact Bill Amount</span>
              <span className="text-3xl font-black font-mono text-emerald-400">
                ₹{calculations.finalPayable.toLocaleString('en-IN')}
              </span>
              <p className="text-[11px] text-slate-500 font-mono mt-1">VPA: cobbapparel@icici • Bill #{billNumber}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel (Esc)
              </button>
              <button
                onClick={() => handleFinalSettle('UPI', calculations.finalPayable)}
                className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30"
              >
                <CheckCircle2 className="w-4 h-4" /> Received & Chime (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL 6: RECALL PARKED BILLS (Shift+F9)                    */}
      {/* ============================================================== */}
      {activeModal === 'parked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-amber-400" />
              Parked / Held Customer Carts
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Recall any held bill to continue checkout where you left off
            </p>

            <div className="space-y-2 mb-6 max-h-72 overflow-y-auto">
              {parkedBills.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No parked carts right now. Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">F9</kbd> during billing to park an active cart.
                </div>
              ) : (
                parkedBills.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-amber-500/50 transition"
                  >
                    <div>
                      <div className="font-bold text-white text-sm">{p.customerName} ({p.customerPhone || 'No Phone'})</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {p.itemCount} items • Held at {p.parkedAt} • Bill #{p.billNumber}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black font-mono text-emerald-400 text-sm">
                        ₹{p.totalAmount.toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => handleRecallBill(p)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition shadow-md"
                      >
                        <PlayCircle className="w-4 h-4" /> Recall
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              Close (Esc)
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL 7: SUCCESS SETTLEMENT BANNER                          */}
      {/* ============================================================== */}
      {activeModal === 'success' && settledBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-md bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-black text-white mb-1">Bill Settled Successfully!</h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Bill #{settledBill.billNo} • Paid via {settledBill.paymentMode}
            </p>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-6 text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Total Amount:</span>
                <span className="font-bold text-white">₹{settledBill.finalPayable.toLocaleString('en-IN')}</span>
              </div>
              {settledBill.paymentMode === 'Cash' && (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Cash Tendered:</span>
                    <span>₹{settledBill.tenderCash.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Change Returned:</span>
                    <span>₹{settledBill.changeDue.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleInstantPrintAndDrawer}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
              >
                <Printer className="w-4 h-4 text-blue-400" /> Print Thermal (F12)
              </button>
              <button
                onClick={handleStartNextBill}
                className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 transition"
              >
                <ArrowRight className="w-4 h-4" /> Next Bill (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINT CONTAINER FOR ESC/POS THERMAL SLIP */}
      <div id="speed-billing-receipt" className="hidden print:block text-black bg-white font-mono text-[12px] p-4 max-w-[80mm] leading-tight">
        <div className="text-center font-bold text-sm">{DEFAULT_STORE_INFO.name}</div>
        <div className="text-center text-[10px]">{DEFAULT_STORE_INFO.address}</div>
        <div className="text-center text-[10px]">Phone: {DEFAULT_STORE_INFO.phone} | GSTIN: {DEFAULT_STORE_INFO.gstin}</div>
        <div className="my-1 border-b border-dashed border-black"></div>
        <div className="flex justify-between text-[11px]">
          <span>Bill No: {settledBill?.billNo || billNumber}</span>
          <span>{new Date().toLocaleDateString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Cust: {customerPhone || 'Walk-in'}</span>
          <span>Mode: {settledBill?.paymentMode || 'Cash'}</span>
        </div>
        <div className="my-1 border-b border-dashed border-black"></div>
        <div className="text-[10px] font-bold flex justify-between">
          <span className="w-1/2">Item</span>
          <span className="w-1/6 text-center">Qty</span>
          <span className="w-1/3 text-right">Amount</span>
        </div>
        <div className="my-1 border-b border-dashed border-black"></div>
        {(settledBill?.items || cart).map((it, idx) => (
          <div key={idx} className="flex justify-between text-[10px] my-0.5">
            <span className="w-1/2 truncate">{it.name}</span>
            <span className="w-1/6 text-center">{it.qty}</span>
            <span className="w-1/3 text-right">₹{(it.mrp * it.qty - (it.discountFlat || 0)).toLocaleString('en-IN')}</span>
          </div>
        ))}
        <div className="my-1 border-b border-dashed border-black"></div>
        <div className="flex justify-between text-[11px] font-bold">
          <span>NET PAYABLE:</span>
          <span>₹{(settledBill?.finalPayable || calculations.finalPayable).toLocaleString('en-IN')}</span>
        </div>
        <div className="my-1 border-b border-dashed border-black"></div>
        <div className="text-center text-[9px] mt-2">Thank You for Shopping at Cobb!</div>
      </div>
    </div>
  );
}
