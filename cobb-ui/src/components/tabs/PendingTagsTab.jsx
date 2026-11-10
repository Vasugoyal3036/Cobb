import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Tag,
  Barcode,
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
  LayoutGrid,
  ShieldAlert,
  Truck,
  Scissors,
  Lock,
  ExternalLink,
  Eye,
  FileCheck,
  Briefcase,
  RotateCcw
} from 'lucide-react';
import ThermalTagModal from '../ThermalTagModal';
import ReportDefectModal from '../ReportDefectModal';
import { db } from '../../utils/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { triggerDamageSlipPrint, triggerCustomerHoldBagPrint, renderCustomerHoldBagSlipHtml, DEFECT_TYPES } from '../../utils/thermalTagPrinter';

const API_BASE = window.location.protocol === 'app:' || window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : window.location.origin;

// Common retail discount presets for B1G2 single-piece sales
// --- Barcode Normalization & Duplication Prevention Helpers ---
export function normalizeBarcode(val) {
  if (!val) return '';
  return String(val).trim().toUpperCase();
}

export function cleanBarcodeDigits(val) {
  const norm = normalizeBarcode(val).replace(/[\s\-_]/g, '');
  if (/^0+$/.test(norm)) return '0';
  return norm.replace(/^0+/, '');
}

export function isBarcodeDuplicate(b1, b2) {
  const s1 = normalizeBarcode(b1);
  const s2 = normalizeBarcode(b2);
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;

  const c1 = cleanBarcodeDigits(b1);
  const c2 = cleanBarcodeDigits(b2);
  if (c1 && c2 && c1 === c2) return true;

  return false;
}

export const TARGET_WHATSAPP_PHONE = '8708788707';

export function generatePendingTagsWhatsAppMessage(items = [], storeName = 'Cobb Apparels') {
  if (!items || items.length === 0) return '';

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const totalMrp = items.reduce((sum, t) => sum + (Number(t.mrp) || 0), 0);
  const totalSold = items.reduce((sum, t) => sum + (Number(t.soldPrice) || 0), 0);

  let message = `🏷️ *COBB PENDING TAGS BRIEF*\n`;
  message += `📅 *Date:* ${dateStr}, ${timeStr}\n`;
  message += `📦 *Total Articles:* ${items.length} pcs\n`;
  message += `💰 *Total MRP:* ₹${totalMrp.toLocaleString('en-IN')}`;
  if (totalSold > 0) {
    message += ` | *Cash Realized:* ₹${totalSold.toLocaleString('en-IN')}`;
  }
  message += `\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  items.forEach((item, index) => {
    const num = index + 1;
    const barcode = item.barcode || 'N/A';
    const artNo = item.articleNo || 'Standard';
    const artName = item.articleName || item.itemName || 'Garment';
    const size = item.size || 'Free';
    const color = item.color || 'Standard';
    const mrp = Number(item.mrp || 0).toLocaleString('en-IN');
    const sold = Number(item.soldPrice || 0).toLocaleString('en-IN');
    const disc = item.discountPercent ? `${item.discountPercent}% OFF` : '';

    message += `${num}. *Barcode:* \`${barcode}\`\n`;
    message += `   • *Article:* ${artNo} (${artName})\n`;
    message += `   • *Size/Color:* ${size} | ${color}\n`;
    message += `   • *MRP:* ₹${mrp}`;
    if (Number(item.soldPrice) > 0) {
      message += ` | *Sold Price:* ₹${sold}`;
    }
    if (disc) {
      message += ` (${disc})`;
    }
    message += `\n`;

    if (item.holdForCustomer) {
      const cust = item.holdCustomerName || item.customerName || 'Customer';
      const bag = item.holdBagNo ? ` [${item.holdBagNo}]` : '';
      message += `   • *Customer Hold:* ${cust}${bag}\n`;
    } else if (item.customerName) {
      message += `   • *Customer:* ${item.customerName}\n`;
    }

    if (item.salesperson && item.salesperson !== 'Cashier') {
      message += `   • *Staff:* ${item.salesperson}\n`;
    }

    message += `\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📲 *Target:* +91 ${TARGET_WHATSAPP_PHONE}\n`;
  message += `🏪 *Store:* ${storeName}\n`;

  return message;
}

const DISCOUNT_PRESETS = [
  { label: 'Flat 50%', value: 50 },
  { label: '60% Off', value: 60 },
  { label: '65% Off', value: 65 },
  { label: 'B1G2 Rate (66.7%)', value: 66.67 },
  { label: '70% Off', value: 70 }
];

async function assertApiSuccess(res) {
  if (!res || typeof res.data !== 'object' || !res.data?.success) {
    throw new Error('Local backend unavailable or returned non-JSON response');
  }
  return res;
}

async function lookupBarcodeInCloudFallback(q, activeStore) {
  if (!db || !q) return null;
  try {
    const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
    const [invSnap, masterSnap] = await Promise.allSettled([
      getDoc(doc(db, 'stores', storeId, 'data', 'inventory')),
      getDoc(doc(db, 'stores', storeId, 'data', 'inventory_master'))
    ]);
    let allItems = [];
    if (invSnap.status === 'fulfilled' && invSnap.value.exists()) {
      const d = invSnap.value.data();
      allItems = allItems.concat(Array.isArray(d) ? d : (d.items || []));
    }
    if (masterSnap.status === 'fulfilled' && masterSnap.value.exists()) {
      const d = masterSnap.value.data();
      allItems = allItems.concat(Array.isArray(d) ? d : (d.items || []));
    }
    const qLower = q.trim().toLowerCase();
    const match = allItems.find(it => {
      const sku = String(it.SKU || it.barcode || '').trim();
      const art = String(it.ArticleNo || it.articleNo || '').trim().toLowerCase();
      return isBarcodeDuplicate(sku, q) || art === qLower;
    });
    if (!match) return null;
    return {
      barcode: match.SKU || match.barcode || q,
      articleNo: match.ArticleNo || match.articleNo || '',
      itemName: match.ItemName || match.itemName || 'Apparel Item',
      size: match.Size || match.size || 'Free',
      color: match.Color || match.color || 'Standard',
      sectionName: match.ProductType || match.sectionName || match.subSectionName || 'Apparel',
      mrp: Number(match.MRP || match.mrp || 0)
    };
  } catch (e) {
    return null;
  }
}

export default function PendingTagsTab({ darkMode, activeStore = 'DEMO_STORE_001', setActiveTab, onOpenSpeedBilling, initialSubDesk = 'tags' }) {
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
  const [tripletBreakdownModal, setTripletBreakdownModal] = useState(null);
  const [thermalTagModalData, setThermalTagModalData] = useState(null); // B1G2 Triplet discount review modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [whatsAppModal, setWhatsAppModal] = useState(null); // { message, count, phone }
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
  const [verifiedDbItem, setVerifiedDbItem] = useState(null);
  const [stagedBagItem, setStagedBagItem] = useState(null);
  const [barcodeMatchError, setBarcodeMatchError] = useState('');
  const [posBilledInfo, setPosBilledInfo] = useState(null);

  // Real-time detection of duplicate or already-billed tag in Add Modal
  const duplicateTag = useMemo(() => {
    const candidate = (form.barcode || scanQuery || form.articleNo || '').trim();
    if (!candidate) return null;
    return tags.find(t => isBarcodeDuplicate(t.barcode, candidate));
  }, [form.barcode, scanQuery, form.articleNo, tags]);
  const duplicateActiveTag = duplicateTag;

  // --- Dedicated Customer Hold Bags State ---
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showNewBagModal, setShowNewBagModal] = useState(false);
  const [customerBagModalData, setCustomerBagModalData] = useState(null); // Thermal slip review modal
  const [activeCustomerHoldFilter, setActiveCustomerHoldFilter] = useState(null); // null or batchId
  const [holdForm, setHoldForm] = useState({
    customerName: '',
    customerPhone: '',
    bagNo: '',
    notes: ''
  });

  // Dedicated Bulk Scanning State for "+ Customer Hold Bag"
  const [newBagForm, setNewBagForm] = useState({
    customerName: '',
    customerPhone: '',
    bagNo: '',
    notes: ''
  });
  const [newBagScannedItems, setNewBagScannedItems] = useState([]);
  const [newBagScanQuery, setNewBagScanQuery] = useState('');
  const [newBagScanLoading, setNewBagScanLoading] = useState(false);
  const [newBagScanError, setNewBagScanError] = useState('');

  // --- Grouped Customer Hold Bags Calculation ---
  const customerHolds = useMemo(() => {
    const active = tags.filter(t => t.status === 'active' && t.holdForCustomer === true);
    const map = {};
    active.forEach(t => {
      const key = t.holdBatchId || ('cust_' + (t.holdCustomerPhone || t.holdCustomerName || 'unnamed'));
      if (!map[key]) {
        map[key] = {
          batchId: key,
          customerName: t.holdCustomerName || t.customerName || 'Valued Customer',
          customerPhone: t.holdCustomerPhone || t.customerPhone || '',
          bagNo: t.holdBagNo || '',
          notes: t.holdNotes || t.notes || '',
          createdAt: t.holdCreatedAt || t.createdAt,
          tags: []
        };
      }
      map[key].tags.push(t);
    });
    return Object.values(map).map(b => ({
      ...b,
      count: b.tags.length,
      totalMrp: b.tags.reduce((s, x) => s + (Number(x.mrp) || 0), 0),
      totalCollected: b.tags.reduce((s, x) => s + (Number(x.soldPrice) || 0), 0)
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tags]);

  const customerHoldTagsCount = useMemo(() => {
    return tags.filter(t => t.status === 'active' && t.holdForCustomer === true).length;
  }, [tags]);

  // --- Admin Damage & Defect Desk State ---
  const [subDesk, setSubDesk] = useState(initialSubDesk || 'tags'); // 'tags' | 'damages'
  useEffect(() => {
    if (initialSubDesk) setSubDesk(initialSubDesk);
  }, [initialSubDesk]);
  const [damages, setDamages] = useState([]);
  const [damagesSummary, setDamagesSummary] = useState({
    totalCount: 0,
    quarantinedCount: 0,
    quarantinedMrp: 0,
    dispatchedCount: 0,
    settledCount: 0,
    repairedCount: 0
  });
  const [damagesFilter, setDamagesFilter] = useState('quarantine'); // 'quarantine' | 'all' | 'repaired' | 'dispatched_rtv' | 'settled'
  const [damagesSeverityFilter, setDamagesSeverityFilter] = useState('all'); // 'all' | 'minor' | 'major'
  const [damagesSearch, setDamagesSearch] = useState('');
  const [selectedDamageIds, setSelectedDamageIds] = useState([]);
  const [rtvBatchModal, setRtvBatchModal] = useState({ isOpen: false, itemIds: [], transportName: '', destination: 'Cobb Head Office / Factory' });
  const [repairNotesModal, setRepairNotesModal] = useState({ isOpen: false, damage: null, notes: '' });
  const [settleModal, setSettleModal] = useState({ isOpen: false, damage: null, creditNoteNo: '', settledAmount: '', notes: '' });
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);

  // Authenticated Role (Admin, Owner, Manager have mutation rights)
  let currentRole = 'owner';
  let currentUser = null;
  try {
    const auth = useAuth();
    if (auth) {
      currentRole = auth.role || auth.user?.role || 'owner';
      currentUser = auth.user;
    }
  } catch (e) {}


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

  // --- Create Customer Hold from Selected Tags ---
  const handleCreateCustomerHold = async (e) => {
    if (e) e.preventDefault();
    if (!holdForm.customerName.trim()) {
      showToastMsg('Customer Name is required to hold tags', 'error');
      return;
    }
    if (selectedTagIds.length === 0) {
      showToastMsg('Please select at least one tag to hold', 'error');
      return;
    }

    const batchId = 'hold_batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const bagNo = holdForm.bagNo.trim() || `BAG-${customerHolds.length + 1}`;
    const now = new Date().toISOString();

    try {
      try {
        const res = await axios.post(`${API_BASE}/api/pending-tags/create-customer-hold`, {
          tagIds: selectedTagIds,
          customerName: holdForm.customerName.trim(),
          customerPhone: holdForm.customerPhone.trim(),
          bagNo,
          notes: holdForm.notes.trim()
        });
        await assertApiSuccess(res);
        fetchTags();
      } catch (apiErr) {
        if (db) {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const list = snap.data().tags || [];
            const updated = list.map(t => selectedTagIds.includes(t.id) ? {
              ...t,
              holdForCustomer: true,
              holdBatchId: batchId,
              holdCustomerName: holdForm.customerName.trim(),
              holdCustomerPhone: holdForm.customerPhone.replace(/[^0-9]/g, '').slice(-10),
              holdBagNo: bagNo,
              holdNotes: holdForm.notes.trim(),
              holdCreatedAt: now,
              updatedAt: now
            } : t);
            await setDoc(docRef, { tags: updated, activeCount: updated.filter(x => x.status === 'active').length, lastUpdated: now }, { merge: true });
            setTags(updated);
          }
        } else {
          throw apiErr;
        }
      }

      showToastMsg(`Held ${selectedTagIds.length} tag(s) for "${holdForm.customerName}" in ${bagNo}!`, 'success');
      setShowHoldModal(false);
      clearSelection();
      setHoldForm({ customerName: '', customerPhone: '', bagNo: '', notes: '' });
      setStatusFilter('holds');
    } catch (err) {
      showToastMsg('Failed to hold tags: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  // --- Release Customer Hold back to General Rack ---
  const handleReleaseCustomerHold = async (batchId, customerName) => {
    if (!window.confirm(`Release hold for ${customerName || 'this customer'}? All garments will return to the general pending rack.`)) return;

    try {
      try {
        const res = await axios.post(`${API_BASE}/api/pending-tags/release-customer-hold`, { holdBatchId: batchId });
        await assertApiSuccess(res);
        fetchTags();
      } catch (apiErr) {
        if (db) {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const list = snap.data().tags || [];
            const now = new Date().toISOString();
            const updated = list.map(t => t.holdBatchId === batchId ? {
              ...t,
              holdForCustomer: false,
              holdBatchId: null,
              holdCustomerName: null,
              holdCustomerPhone: null,
              holdBagNo: null,
              holdNotes: null,
              holdCreatedAt: null,
              updatedAt: now
            } : t);
            await setDoc(docRef, { tags: updated, activeCount: updated.filter(x => x.status === 'active').length, lastUpdated: now }, { merge: true });
            setTags(updated);
          }
        } else {
          throw apiErr;
        }
      }

      showToastMsg('Customer hold released. Garments returned to general rack.', 'success');
      if (activeCustomerHoldFilter === batchId) setActiveCustomerHoldFilter(null);
    } catch (err) {
      showToastMsg('Failed to release hold: ' + err.message, 'error');
    }
  };

  // --- Bill All Tags in Customer Hold ---
  const handleBillCustomerHold = async (batch, mode = 'speed_billing') => {
    if (!batch || !batch.tags || batch.tags.length === 0) return;

    if (mode === 'speed_billing') {
      handleBillInSpeedBilling(batch.tags, 'b1g2', {
        name: batch.customerName,
        phone: batch.customerPhone
      });
      return;
    }

    const billNo = window.prompt(`Enter Bill No for ${batch.customerName}'s hold:`, 'HOLD-' + (batch.bagNo || 'COMBO'));
    if (billNo === null) return;

    try {
      try {
        const res = await axios.post(`${API_BASE}/api/pending-tags/bill-customer-hold`, {
          holdBatchId: batch.batchId,
          billNo
        });
        await assertApiSuccess(res);
        fetchTags();
      } catch (apiErr) {
        if (db) {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const list = snap.data().tags || [];
            const now = new Date().toISOString();
            const updated = list.map(t => (t.holdBatchId === batch.batchId && t.status === 'active') ? {
              ...t,
              status: 'billed',
              billedInBillNo: billNo,
              billedAt: now,
              autoResolved: false,
              resolvedAt: now,
              updatedAt: now
            } : t);
            await setDoc(docRef, { tags: updated, activeCount: updated.filter(x => x.status === 'active').length, lastUpdated: now }, { merge: true });
            setTags(updated);
          }
        } else {
          throw apiErr;
        }
      }

      showToastMsg(`Marked ${batch.tags.length} tag(s) as billed in ${billNo}!`, 'success');
    } catch (err) {
      showToastMsg('Failed to bill hold: ' + err.message, 'error');
    }
  };

  // --- Step 1: Rapid Scanner & DB Detail Retrieval for Customer Hold Bag ---
  const handleFetchItemForNewBag = async (e) => {
    if (e) e.preventDefault();
    const candidate = newBagScanQuery.trim();
    if (!candidate) return;

    if (newBagScannedItems.some(it => isBarcodeDuplicate(it.barcode, candidate))) {
      setNewBagScanError(`This barcode (${candidate}) has already been added to this bag!`);
      return;
    }

    const existing = tags.find(t => isBarcodeDuplicate(t.barcode, candidate));
    if (existing) {
      if (existing.status === 'billed') {
        setNewBagScanError(`Already Billed: Barcode "${candidate}" was already billed in POS (${existing.billedInBillNo ? 'Bill #' + existing.billedInBillNo : 'Billed'} • ${existing.articleName})! Cannot hold an already billed garment.`);
        return;
      }
      setNewBagScanError(`Active Duplicate: Barcode "${candidate}" is already active on the rack (Tag #${existing.id}, ${existing.articleName})!`);
      return;
    }

    setNewBagScanLoading(true);
    setNewBagScanError('');
    setStagedBagItem(null);

    try {
      let matchedData = null;
      try {
        const res = await axios.get(`${API_BASE}/api/inventory/quick-scan?q=${encodeURIComponent(candidate)}&mode=single`, { timeout: 12000 });
        if (res.data?.isBilled || res.data?.variants?.[0]?.isBilled) {
          const bInfo = res.data?.billedInfo || res.data?.variants?.[0]?.billedInfo;
          setNewBagScanError(`Already Billed in POS: Barcode "${candidate}" was billed in Bill #${bInfo?.billNo || 'POS-BILL'}! Cannot add an already billed garment.`);
          return;
        }
        if (res.data?.success && res.data.variants && res.data.variants.length > 0) {
          matchedData = res.data.variants.find(v => isBarcodeDuplicate(v.barcode, candidate)) || res.data.variants[0];
        } else if (res.data?.success && res.data.data) {
          matchedData = res.data.data;
        }
      } catch (err) {
        matchedData = await lookupBarcodeInCloudFallback(candidate, activeStore);
      }
      if (!matchedData) {
        matchedData = await lookupBarcodeInCloudFallback(candidate, activeStore);
      }

      const mrpVal = Number(matchedData?.mrp || 2999);
      const discVal = 60;
      const soldVal = Math.round(mrpVal * (1 - discVal / 100));

      const staged = {
        id: 'new_item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        barcode: matchedData?.barcode || candidate,
        articleNo: matchedData?.articleNo || candidate,
        articleName: matchedData?.itemName || 'Cobb Apparel Item',
        size: matchedData?.size || 'Free',
        color: matchedData?.color || 'Standard',
        section: matchedData?.sectionName || matchedData?.subSectionName || 'Men Apparel',
        mrp: mrpVal,
        discountPercent: discVal,
        soldPrice: soldVal,
        salesperson: 'Floor Staff',
        fromDb: !!matchedData
      };

      setStagedBagItem(staged);
      if (matchedData) {
        showToastMsg(`Found details for ${staged.articleName} (MRP ₹${mrpVal}). Review and add to bag.`, 'success');
      } else {
        setNewBagScanError(`Notice: Item not found in catalog for "${candidate}". Details estimated below. Click "+ Add to Customer Bag" to proceed.`);
      }
    } catch (err) {
      setNewBagScanError('Error searching database: ' + err.message);
    } finally {
      setNewBagScanLoading(false);
    }
  };

  // --- Step 2: Add Staged Item into Customer Hold Bag after Details are Retrieved ---
  const handleAddStagedItemToBag = () => {
    if (!stagedBagItem) return;
    setNewBagScannedItems(prev => [stagedBagItem, ...prev]);
    showToastMsg(`Added ${stagedBagItem.articleName} (${stagedBagItem.size}) to customer bag!`, 'success');
    setStagedBagItem(null);
    setNewBagScanQuery('');
    setNewBagScanError('');
  };

  // Legacy fallback alias for form submission
  const handleScanItemIntoNewBag = handleFetchItemForNewBag;

  const handleRemoveItemFromNewBag = (id) => {
    setNewBagScannedItems(prev => prev.filter(it => it.id !== id));
  };

  // --- Save All Scanned Items as Customer Hold Bag ---
  const handleSaveNewCustomerBag = async () => {
    if (!newBagForm.customerName.trim()) {
      setNewBagScanError('Customer Name is required!');
      return;
    }
    if (newBagScannedItems.length === 0) {
      setNewBagScanError('Please scan at least one garment into the bag!');
      return;
    }

    const batchId = 'hold_batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const bagNo = newBagForm.bagNo.trim() || `BAG-${customerHolds.length + 1}`;
    const now = new Date().toISOString();

    try {
      for (const item of newBagScannedItems) {
        const payload = {
          barcode: item.barcode,
          articleNo: item.articleNo,
          articleName: item.articleName,
          size: item.size,
          color: item.color,
          section: item.section,
          mrp: item.mrp,
          discountPercent: item.discountPercent,
          soldPrice: item.soldPrice,
          customerName: newBagForm.customerName.trim(),
          customerPhone: newBagForm.customerPhone.trim(),
          salesperson: 'Floor Staff',
          notes: newBagForm.notes.trim(),
          holdForCustomer: true,
          holdBatchId: batchId,
          holdCustomerName: newBagForm.customerName.trim(),
          holdCustomerPhone: newBagForm.customerPhone.trim(),
          holdBagNo: bagNo,
          holdNotes: newBagForm.notes.trim(),
          holdCreatedAt: now
        };

        try {
          const res = await axios.post(`${API_BASE}/api/pending-tags/add`, payload);
          await assertApiSuccess(res);
        } catch (apiErr) {
          if (apiErr.response?.status === 409 || apiErr.response?.data?.duplicate || apiErr.response?.data?.billed) {
            throw apiErr;
          }
          if (db) {
            const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
            const snap = await getDoc(docRef);
            const curTags = snap.exists() ? (snap.data().tags || []) : [];
            const newEntry = {
              id: 'ptag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
              ...payload,
              status: 'active',
              createdAt: now,
              updatedAt: now,
              date: now.split('T')[0]
            };
            const updated = [...curTags, newEntry];
            await setDoc(docRef, {
              tags: updated,
              activeCount: updated.filter(t => t.status === 'active').length,
              lastUpdated: now
            }, { merge: true });
          } else {
            throw apiErr;
          }
        }
      }

      fetchTags();
      showToastMsg(`Created Bag ${bagNo} for ${newBagForm.customerName} with ${newBagScannedItems.length} garments!`, 'success');
      setShowNewBagModal(false);
      setNewBagScannedItems([]);
      setNewBagForm({ customerName: '', customerPhone: '', bagNo: '', notes: '' });
      setStatusFilter('holds');
    } catch (err) {
      setNewBagScanError('Failed to save bag: ' + err.message);
    }
  };

  // --- 1. Fetch from Local Backend API (with Cloud Firestore Fallback & Transparent Sync Report) ---
  const fetchTags = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await axios.get(`${API_BASE}/api/pending-tags`);
      if (res.data?.success) {
        setTags(res.data.tags || []);
        if (res.data.summary) setSummary(res.data.summary);

        if (isManual && res.data.syncReport) {
          const sr = res.data.syncReport;
          const parts = [];
          if (sr.mergedFromCloudCount > 0) parts.push(`recovered ${sr.mergedFromCloudCount} from cloud`);
          if (sr.restoredCount > 0) parts.push(`restored ${sr.restoredCount} cancelled POS bill(s)`);
          if (sr.resolvedCount > 0) {
            const details = sr.resolvedTags.slice(0, 3).map(r => `${r.barcode}→${r.billNo}`).join(', ');
            parts.push(`${sr.resolvedCount} billed in POS (${details})`);
          }
          if (parts.length > 0) {
            showToastMsg(`POS Sync: ${parts.join(' • ')}. Active count: ${sr.activeCountAfter}.`, 'success');
          } else {
            showToastMsg(`POS Sync Verified: Checked ${sr.checkedActiveCount} active tag(s) — 0 billed, all ${sr.activeCountAfter} safe!`, 'success');
          }
        } else if (isManual) {
          showToastMsg('Synced with POS database successfully!', 'success');
        }
        return;
      }
      throw new Error('Non-JSON backend response');
    } catch (e) {
      console.warn('[PendingTagsTab] Local API fetch warning:', e.message);
      if (db) {
        try {
          const snap = await getDoc(doc(db, 'stores', targetStoreId, 'data', 'pending_tags'));
          if (snap.exists() && Array.isArray(snap.data().tags)) {
            const cloudList = snap.data().tags;
            setTags(cloudList);
            const active = cloudList.filter(t => t.status === 'active');
            const billed = cloudList.filter(t => t.status === 'billed');
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
            if (isManual) {
              showToastMsg(`Cloud Sync: Loaded ${active.length} active tag(s) from Firestore.`, 'success');
            }
          }
        } catch (cloudErr) { }
      }
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [targetStoreId]);

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

  // --- 3. Fetch Damage Records (Admin Quarantine Desk) ---
  const fetchDamages = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/damages`);
      if (res.data?.success) {
        setDamages(res.data.damages || []);
        if (res.data.summary) setDamagesSummary(res.data.summary);
      }
    } catch (e) {
      console.warn('[PendingTagsTab] Damages API note:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchDamages();
  }, [fetchDamages]);

  // Cloud Firestore listener for real-time damage sync (Phone Link)
  useEffect(() => {
    let unsub = null;
    if (db) {
      try {
        const docRef = doc(db, 'stores', targetStoreId, 'data', 'damage_records');
        unsub = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.damages)) {
              setDamages(data.damages);
              const all = data.damages;
              const quarantined = all.filter(d => d.status === 'quarantine');
              const quarantinedMrp = quarantined.reduce((sum, d) => sum + (Number(d.mrp) || 0), 0);
              setDamagesSummary({
                totalCount: all.length,
                quarantinedCount: quarantined.length,
                quarantinedMrp,
                dispatchedCount: all.filter(d => d.status === 'dispatched_rtv').length,
                settledCount: all.filter(d => d.status === 'settled').length,
                repairedCount: all.filter(d => d.status === 'repaired').length
              });
            }
          }
        }, (err) => {
          console.warn('[PendingTagsTab] Damage Cloud sync note:', err.message);
        });
      } catch (err) {}
    }
    return () => { if (unsub) unsub(); };
  }, [targetStoreId]);

  // Admin exclusive damage actions (requires owner/admin role)
  const handleRepairRestock = async (id, notes = '') => {
    if (!id) return;
    try {
      const res = await axios.post(`${API_BASE}/api/damages/repair-restock`, {
        id,
        repairNotes: notes || 'Repaired in-house by tailor and cleared for sales rack',
        repairedBy: currentUser?.name || 'Store Admin'
      }, {
        headers: { 'x-user-role': currentRole }
      });
      if (res.data?.success) {
        showToastMsg('Garment tailor-repaired & restored to sales rack inventory!', 'success');
        setRepairNotesModal({ isOpen: false, damage: null, notes: '' });
        fetchDamages();
      }
    } catch (err) {
      if (db) {
        try {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'damage_records');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const list = snap.data()?.damages || [];
            const idx = list.findIndex(d => d.id === id);
            if (idx !== -1) {
              list[idx].status = 'repaired';
              list[idx].repairedAt = new Date().toISOString();
              list[idx].repairNotes = notes || 'Repaired in-house by tailor';
              list[idx].repairedBy = currentUser?.name || 'Store Admin';
              await setDoc(docRef, {
                damages: list,
                quarantinedCount: list.filter(d => d.status === 'quarantine').length,
                lastUpdated: new Date().toISOString()
              }, { merge: true });
              showToastMsg('Garment tailor-repaired & restored to sales rack!', 'success');
              setRepairNotesModal({ isOpen: false, damage: null, notes: '' });
              return;
            }
          }
        } catch (fbErr) {}
      }
      showToastMsg('Restock failed: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleCreateRtvBatch = async (itemIds, transportName, destination) => {
    if (!itemIds || itemIds.length === 0) return;
    try {
      const res = await axios.post(`${API_BASE}/api/damages/create-rtv-batch`, {
        itemIds,
        transportName: transportName || 'Self / Courier',
        destination: destination || 'Cobb Head Office / Factory'
      }, {
        headers: { 'x-user-role': currentRole }
      });
      if (res.data?.success) {
        showToastMsg(`RTV Batch ${res.data.rtvBatchNo} created for ${res.data.updatedCount} items!`, 'success');
        setSelectedDamageIds([]);
        setRtvBatchModal({ isOpen: false, itemIds: [], transportName: '', destination: 'Cobb Head Office / Factory' });
        fetchDamages();
      }
    } catch (err) {
      if (db) {
        try {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'damage_records');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const list = snap.data()?.damages || [];
            const rtvBatchNo = 'RTV-' + Date.now().toString().slice(-6);
            const nowIso = new Date().toISOString();
            let count = 0;
            list.forEach(d => {
              if (itemIds.includes(d.id) && d.status === 'quarantine') {
                d.status = 'dispatched_rtv';
                d.rtvBatchNo = rtvBatchNo;
                d.dispatchedAt = nowIso;
                d.transportName = transportName || 'Self / Courier';
                d.destination = destination || 'Cobb Head Office / Factory';
                count++;
              }
            });
            await setDoc(docRef, {
              damages: list,
              quarantinedCount: list.filter(d => d.status === 'quarantine').length,
              lastUpdated: nowIso
            }, { merge: true });
            showToastMsg(`RTV Batch ${rtvBatchNo} created for ${count} items!`, 'success');
            setSelectedDamageIds([]);
            setRtvBatchModal({ isOpen: false, itemIds: [], transportName: '', destination: 'Cobb Head Office / Factory' });
            return;
          }
        } catch (fbErr) {}
      }
      showToastMsg('RTV Dispatch failed: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleSettleCreditNote = async (id, creditNoteNo, settledAmount, notes) => {
    if (!id) return;
    try {
      const res = await axios.post(`${API_BASE}/api/damages/settle`, {
        id,
        creditNoteNo,
        settledAmount,
        notes
      }, {
        headers: { 'x-user-role': currentRole }
      });
      if (res.data?.success) {
        showToastMsg(`Claim settled via Credit Note #${creditNoteNo}!`, 'success');
        setSettleModal({ isOpen: false, damage: null, creditNoteNo: '', settledAmount: '', notes: '' });
        fetchDamages();
      }
    } catch (err) {
      showToastMsg('Settlement failed: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleDeleteDamage = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this defect record? Only Store Admin has authority to discard records.')) return;
    try {
      const res = await axios.delete(`${API_BASE}/api/damages/${id}`, {
        headers: { 'x-user-role': currentRole }
      });
      if (res.data?.success) {
        showToastMsg('Defect record removed by Store Admin', 'success');
        fetchDamages();
      }
    } catch (err) {
      if (db) {
        try {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'damage_records');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const list = (snap.data()?.damages || []).filter(d => d.id !== id);
            await setDoc(docRef, {
              damages: list,
              quarantinedCount: list.filter(d => d.status === 'quarantine').length,
              lastUpdated: new Date().toISOString()
            }, { merge: true });
            showToastMsg('Defect record removed by Store Admin', 'success');
            return;
          }
        } catch (fbErr) {}
      }
      showToastMsg('Delete failed: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const toggleSelectDamage = (id) => {
    setSelectedDamageIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredDamages = useMemo(() => {
    return damages.filter(d => {
      if (damagesFilter !== 'all' && d.status !== damagesFilter) return false;
      if (damagesSeverityFilter !== 'all' && d.severity !== damagesSeverityFilter) return false;
      if (damagesSearch) {
        const q = damagesSearch.toLowerCase().trim();
        const b = (d.barcode || '').toLowerCase();
        const art = (d.articleNo || '').toLowerCase();
        const desc = (d.defectDesc || '').toLowerCase();
        const by = (d.reportedBy || '').toLowerCase();
        const typ = (d.defectType || '').toLowerCase();
        if (!b.includes(q) && !art.includes(q) && !desc.includes(q) && !by.includes(q) && !typ.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [damages, damagesFilter, damagesSeverityFilter, damagesSearch]);

    // --- Barcode / Article Fast Lookup ---
  const handleQuickLookup = async (code) => {
    const q = (code || form.barcode || scanQuery).trim();
    if (!q) return;
    setIsSearchingBarcode(true);
    setBarcodeMatchError('');
    setVerifiedDbItem(null);

    // 1. Check if this tag has ALREADY been added to the Pending Tags tab (active or billed)!
    const existing = tags.find(t => isBarcodeDuplicate(t.barcode, q));

    if (existing) {
      if (existing.status === 'billed') {
        const billNotice = existing.billedInBillNo ? `Bill #${existing.billedInBillNo}` : 'POS Billing';
        setPosBilledInfo({
          billNo: existing.billedInBillNo || 'POS-BILL',
          billTime: existing.billedAt || existing.resolvedAt || null,
          articleName: existing.articleName
        });
        setBarcodeMatchError(`🚫 This barcode has ALREADY BEEN BILLED in POS (${billNotice} • Tag #${existing.id} • ${existing.articleName || 'Item'}). Already billed items cannot be added as pending tags!`);
        showToastMsg(`Cannot add: Barcode was already billed in ${billNotice}!`, 'error');
        setIsSearchingBarcode(false);
        return;
      }
      if (existing.status === 'active') {
        setForm(prev => ({
          ...prev,
          barcode: existing.barcode || q,
          articleNo: existing.articleNo || '',
          articleName: existing.articleName || 'Apparel Item',
          size: existing.size || 'Free',
          color: existing.color || 'Standard',
          section: existing.section || 'Men Apparel',
          mrp: existing.mrp || 0,
          discountPercent: existing.discountPercent || 60,
          soldPrice: existing.soldPrice || 0,
          salesperson: existing.salesperson || 'Cashier'
        }));
        setVerifiedDbItem({
          barcode: existing.barcode || q,
          articleNo: existing.articleNo || '',
          itemName: existing.articleName || 'Apparel Item',
          size: existing.size || 'Free',
          color: existing.color || 'Standard',
          sectionName: existing.section || 'Men Apparel',
          mrp: existing.mrp || 0
        });
        setBarcodeMatchError(`This tag has already been added in the tab (Tag #${existing.id} • ${existing.articleName || 'Item'} • MRP ₹${existing.mrp} • Size ${existing.size})`);
        showToastMsg(`This tag has already been added in the tab! (Tag #${existing.id})`, 'error');
        setIsSearchingBarcode(false);
        return;
      }
    }

    const applyMatchedItem = (exact, sourceLabel = 'database') => {
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
      setVerifiedDbItem(exact);
      showToastMsg(`Retrieved details (${sourceLabel}): ${exact.itemName} (MRP ₹${mrpVal})`, 'success');
    };

    try {
      const res = await axios.get(`${API_BASE}/api/inventory/quick-scan?q=${encodeURIComponent(q)}&mode=single`, { timeout: 12000 });
      if (res.data?.success && res.data.variants && res.data.variants.length > 0) {
        const exact = res.data.variants.find(v => isBarcodeDuplicate(v.barcode, q)) || res.data.variants[0];

        // Check if quick-scan returned isBilled: true from POS database
        if (res.data.isBilled || exact.isBilled) {
          const bInfo = res.data.billedInfo || exact.billedInfo;
          setPosBilledInfo(bInfo);
          const billNo = bInfo?.billNo || 'POS-BILL';
          setBarcodeMatchError(`🚫 This barcode was ALREADY BILLED in POS (Bill #${billNo})! Already billed items cannot be added as pending tags.`);
          showToastMsg(`Cannot add: Item was already billed in POS (Bill #${billNo})!`, 'error');
          setIsSearchingBarcode(false);
          return;
        }
        applyMatchedItem(exact, 'POS Database');
      } else {
        const cloudFallback = await lookupBarcodeInCloudFallback(q, activeStore);
        if (cloudFallback) {
          applyMatchedItem(cloudFallback, 'Cloud Catalog');
        } else {
          // Fallback check against tags in case it was added under another status
          const existingInTags = tags.find(t => isBarcodeDuplicate(t.barcode, q));
          if (existingInTags) {
            setBarcodeMatchError(`This tag has already been added in the tab (Tag #${existingInTags.id} • ${existingInTags.articleName || 'Item'} • Status: ${existingInTags.status})`);
          } else {
            setBarcodeMatchError(`No product found matching "${q}". You can enter details manually.`);
          }
        }
      }
    } catch (err) {
      const cloudFallback = await lookupBarcodeInCloudFallback(q, activeStore);
      if (cloudFallback) {
        applyMatchedItem(cloudFallback, 'Cloud Catalog');
      } else {
        const existingInTags = tags.find(t => isBarcodeDuplicate(t.barcode, q));
        if (existingInTags) {
          setBarcodeMatchError(`This tag has already been added in the tab (Tag #${existingInTags.id} • ${existingInTags.articleName || 'Item'} • Status: ${existingInTags.status})`);
        } else {
          setBarcodeMatchError('Quick scan lookup timed out. Enter details manually.');
        }
      }
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

    const candidate = (form.barcode || form.articleNo || '').trim();

    // Check if live POS lookup found this barcode to be already billed
    if (posBilledInfo) {
      showToastMsg(`Already Billed: Barcode was billed in POS (Bill #${posBilledInfo.billNo || 'POS'})! Cannot add as pending tag.`, 'error');
      return;
    }

    // Check existing tags in pending tags desk (both active and billed)
    const existingTag = tags.find(t => isBarcodeDuplicate(t.barcode, candidate));
    if (existingTag) {
      if (existingTag.status === 'billed') {
        const billInfo = existingTag.billedInBillNo ? `Bill #${existingTag.billedInBillNo}` : 'POS';
        showToastMsg(`Already Billed: Barcode was already billed in POS (${billInfo} • Tag #${existingTag.id})! Cannot add as pending tag.`, 'error');
        return;
      }
      showToastMsg(`Duplicate Barcode: Tag #${existingTag.id} (${existingTag.barcode}) is already on the pending rack!`, 'error');
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
        await assertApiSuccess(res);
        showToastMsg(res.data.message || 'Pending Tag Created!', 'success');
        fetchTags();
      } catch (apiErr) {
        // If backend specifically returned 409 or duplicate/billed error, display error and DO NOT write to Firestore
        if (apiErr.response?.status === 409 || apiErr.response?.data?.duplicate || apiErr.response?.data?.billed) {
          const errMsg = apiErr.response?.data?.error || 'A pending tag with this barcode cannot be added!';
          showToastMsg(errMsg, 'error');
          return;
        }

        // Fallback directly to Cloud Firestore (for Phone Link offline / network error)
        if (db) {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
          const snap = await getDoc(docRef);
          const curTags = snap.exists() ? (snap.data().tags || []) : [];

          // Verify no active or billed duplicate in Firestore
          const cloudExisting = curTags.find(t => isBarcodeDuplicate(t.barcode, candidate));
          if (cloudExisting) {
            if (cloudExisting.status === 'billed') {
              const billInfo = cloudExisting.billedInBillNo ? `Bill #${cloudExisting.billedInBillNo}` : 'POS';
              showToastMsg(`Already Billed: Tag #${cloudExisting.id} was already billed in Cloud (${billInfo})!`, 'error');
              return;
            }
            showToastMsg(`Duplicate Barcode: Tag #${cloudExisting.id} (${cloudExisting.barcode}) is already active in Cloud!`, 'error');
            return;
          }

          const now = new Date();
          const newEntry = {
            id: 'ptag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            ...payload,
            status: 'active',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            date: now.toISOString().split('T')[0]
          };
          const updated = [newEntry, ...curTags];
          await setDoc(docRef, {
            tags: updated,
            activeCount: updated.filter(t => t.status === 'active').length,
            lastUpdated: now.toISOString()
          }, { merge: true });
          setTags(updated);
          showToastMsg('Pending Tag saved to Cloud Firestore!', 'success');
        } else {
          throw apiErr;
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
      showToastMsg('Failed to save pending tag: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  // --- Mark Tag as Billed (Manual Settlement) ---
  const handleMarkBilled = async (tagId, billNoPrompt) => {
    const billNo = billNoPrompt || window.prompt('Enter Bill No (or leave blank for manual combo):', 'B1G2-COMBO');
    if (billNo === null) return;

    try {
      try {
        const res = await axios.post(`${API_BASE}/api/pending-tags/${tagId}/mark-billed`, { billNo });
        await assertApiSuccess(res);
        fetchTags();
      } catch (apiErr) {
        if (db) {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const list = snap.data().tags || [];
            const nowIso = new Date().toISOString();
            const updated = list.map(t => t.id === tagId ? {
              ...t,
              status: 'billed',
              billedInBillNo: billNo,
              billedAt: nowIso,
              resolvedAt: nowIso,
              updatedAt: nowIso
            } : t);
            await setDoc(docRef, {
              tags: updated,
              activeCount: updated.filter(t => t.status === 'active').length,
              lastUpdated: nowIso
            }, { merge: true });
            setTags(updated);
          }
        }
      }
      showToastMsg(`Tag resolved and marked as billed in ${billNo}!`, 'success');
    } catch (err) {
      showToastMsg('Failed to update tag: ' + err.message, 'error');
    }
  };

  // --- Restore Billed Tag Back to Active Pending (1-Click Failproof Recovery) ---
  const handleRestoreActive = async (tag) => {
    if (!tag?.id) return;
    if (!window.confirm(`Restore "${tag.articleName || tag.barcode}" (${tag.barcode}) back to Active Pending?`)) return;

    try {
      try {
        const res = await axios.post(`${API_BASE}/api/pending-tags/${tag.id}/restore-active`, {
          reason: 'Restored via Pending Tags Desk'
        });
        await assertApiSuccess(res);
        fetchTags();
      } catch (apiErr) {
        if (db) {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const list = snap.data().tags || [];
            const nowIso = new Date().toISOString();
            const updated = list.map(t => t.id === tag.id ? {
              ...t,
              status: 'active',
              restoredFromBillNo: t.billedInBillNo || null,
              billedInBillNo: null,
              billedAt: null,
              billedNet: null,
              autoResolved: false,
              resolvedAt: null,
              manualRestoreAt: nowIso,
              updatedAt: nowIso
            } : t);
            await setDoc(docRef, {
              tags: updated,
              activeCount: updated.filter(x => x.status === 'active').length,
              lastUpdated: nowIso
            }, { merge: true });
            setTags(updated);
          }
        }
      }
      showToastMsg(`Restored ${tag.barcode} (${tag.articleName || 'Garment'}) back to Active Pending!`, 'success');
    } catch (err) {
      showToastMsg('Failed to restore tag: ' + err.message, 'error');
    }
  };

  // --- Delete Tag ---
  const handleDeleteTag = async (tagId) => {
    if (!window.confirm('Are you sure you want to remove this pending tag?')) return;
    try {
      try {
        const res = await axios.delete(`${API_BASE}/api/pending-tags/${tagId}`);
        await assertApiSuccess(res);
        fetchTags();
      } catch (apiErr) {
        if (db) {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'pending_tags');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const list = snap.data().tags || [];
            const nowIso = new Date().toISOString();
            const updated = list.filter(t => t.id !== tagId);
            await setDoc(docRef, {
              tags: updated,
              activeCount: updated.filter(t => t.status === 'active').length,
              lastUpdated: nowIso
            }, { merge: true });
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

    // --- Print 58mm/80mm Thermal Garment Tag ---
  const handlePrintSlip = (tag) => {
    setThermalTagModalData(tag);
  };

  // --- Copy WhatsApp Summary Brief to 8708788707 ---
  const handleCopyAllWhatsApp = async (customItems = null) => {
    const itemsToCopy = customItems || (filteredTags.length > 0 ? filteredTags : tags.filter(t => t.status === 'active'));

    if (!itemsToCopy || itemsToCopy.length === 0) {
      showToastMsg('No pending tags available to copy!', 'error');
      return;
    }

    const message = generatePendingTagsWhatsAppMessage(itemsToCopy, activeStore || 'Cobb Store');
    const targetPhone = TARGET_WHATSAPP_PHONE;

    // 1. Copy to clipboard
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
        copied = true;
      }
    } catch (err) {
      console.warn('Clipboard write failed, using fallback', err);
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = message;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (e) {}
    }

    // 2. Open WhatsApp link or chat
    const encoded = encodeURIComponent(message);
    const waUrl = encoded.length < 3000
      ? `https://wa.me/91${targetPhone}?text=${encoded}`
      : `https://wa.me/91${targetPhone}`;

    try {
      if (typeof window !== 'undefined' && window.open) {
        window.open(waUrl, '_blank');
      }
    } catch (e) {
      console.warn('Popup blocked, WhatsApp modal available', e);
    }

    // 3. Set preview modal & toast
    showToastMsg(`Copied WhatsApp brief for ${itemsToCopy.length} article(s)! (Target: ${targetPhone})`, 'success');
    setWhatsAppModal({
      message,
      count: itemsToCopy.length,
      phone: targetPhone
    });
  };

  // --- Filtering & Sorting ---
  const filteredTags = useMemo(() => {
    let result = tags.filter(tag => {
      if (statusFilter === 'active') {
        if (tag.status !== 'active') return false;
        if (activeCustomerHoldFilter && tag.holdBatchId !== activeCustomerHoldFilter) return false;
      }
      if (statusFilter === 'holds') {
        if (tag.status !== 'active' || !tag.holdForCustomer) return false;
        if (activeCustomerHoldFilter && tag.holdBatchId !== activeCustomerHoldFilter) return false;
      }
      if (statusFilter === 'billed') {
        if (tag.status !== 'billed') return false;
        if (activeCustomerHoldFilter && tag.holdBatchId !== activeCustomerHoldFilter) return false;
      }

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
        (tag.holdCustomerName && tag.holdCustomerName.toLowerCase().includes(q)) ||
        (tag.holdCustomerPhone && tag.holdCustomerPhone.includes(q)) ||
        (tag.holdBagNo && tag.holdBagNo.toLowerCase().includes(q)) ||
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
    // Exclude customer hold tags so they NEVER mix in generic store combos!
    const active = tags.filter(t => t.status === 'active' && !t.holdForCustomer);
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
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <div className={`p-2 rounded-lg border ${
              subDesk === 'damages'
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}>
              {subDesk === 'damages' ? <ShieldAlert className="w-6 h-6 text-red-400" /> : <Tag className="w-6 h-6" />}
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              {subDesk === 'damages' ? 'Damage & Quarantine Desk' : 'Pending Tag Desk'}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              subDesk === 'damages'
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {subDesk === 'damages' ? 'Store Admin Exclusive Control' : 'B1G2 Single-Piece Manager'}
            </span>

            {/* Sub-Desk Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/80 border border-slate-700/80 ml-2">
              <button
                type="button"
                onClick={() => setSubDesk('tags')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  subDesk === 'tags'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-500/25'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>🏷️ B1G2 Pending Tags</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                  {summary.activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSubDesk('damages')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  subDesk === 'damages'
                    ? 'bg-red-600 text-white shadow-md shadow-red-500/25'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>⚠️ Damage & Quarantine Desk</span>
                {damagesSummary.quarantinedCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-white text-red-700 animate-pulse">
                    {damagesSummary.quarantinedCount}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                    0
                  </span>
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-300">
            {subDesk === 'damages'
              ? 'Quarantined defective apparel vault. Only Store Admin has authority to tailor-restock, RTV-dispatch to Cobb HO, or discard records.'
              : 'Track single pieces sold at custom discount percentages under the Buy 1 Get 2 Free scheme. Auto-clears when billed into POS!'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {subDesk === 'tags' ? (
            <>
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
                type="button"
                onClick={() => handleCopyAllWhatsApp()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
                title="Create and copy WhatsApp message to 8708788707 with barcode briefs of all pending tags"
              >
                <Copy className="w-4 h-4" />
                <span>Copy All (WhatsApp)</span>
              </button>

              <button
                onClick={() => setThermalTagModalData({ isQuickCategoryMrp: true })}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
                title="Print replacement price tag for any garment by Category and MRP"
              >
                <Printer className="w-4 h-4" />
                <span>Print Any Tag (Cat + MRP)</span>
              </button>

              <button
                onClick={() => setShowDefectModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-500/25 transition-all active:scale-95"
                title="Quarantine a damaged or defective garment"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Report Damage</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewBagForm({
                    customerName: '',
                    customerPhone: '',
                    bagNo: `BAG-${customerHolds.length + 1}`,
                    notes: ''
                  });
                  setNewBagScannedItems([]);
                  setNewBagScanQuery('');
                  setNewBagScanError('');
                  setShowNewBagModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all active:scale-95"
                title="Create a dedicated hold bag and scan multiple tags directly for a specific customer"
              >
                <Briefcase className="w-4 h-4" />
                <span>+ Hold for Customer</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Pending Tag</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => fetchDamages()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/60 text-xs font-semibold text-slate-200 transition-all active:scale-95"
                title="Sync damage records from server"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sync Damages</span>
              </button>

              <button
                onClick={() => setShowDefectModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-500/25 transition-all active:scale-95"
                title="Quarantine a damaged or defective garment"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>+ Quarantine Garment</span>
              </button>
            </>
          )}
        </div>
      </div>

      {subDesk === 'tags' && (
        <div className="space-y-6">

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
            type="button"
            onClick={() => { setStatusFilter('active'); setActiveCustomerHoldFilter(null); }}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'active'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Active Pending ({summary.activeCount})
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter('holds'); setActiveCustomerHoldFilter(null); }}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'holds'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Customer Hold Bags ({customerHolds.length} Bags / {customerHoldTagsCount} Pcs)</span>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter('billed'); setActiveCustomerHoldFilter(null); }}
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

          {/* Quick Copy All WhatsApp Button */}
          <button
            type="button"
            onClick={() => handleCopyAllWhatsApp()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all active:scale-95 shrink-0 shadow-sm cursor-pointer"
            title="Copy WhatsApp summary of current articles with barcodes to 8708788707"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy All</span>
          </button>
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

      {/* Customer Hold Bags Vault View */}
      {statusFilter === 'holds' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-purple-200">
                  Customer Hold Vault — Dedicated Garment Bags ({customerHolds.length} Bags Active)
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Garments in this vault are held together for specific customers. They are 100% isolated from general rack pieces and excluded from random store combos!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewBagForm({
                  customerName: '',
                  customerPhone: '',
                  bagNo: `BAG-${customerHolds.length + 1}`,
                  notes: ''
                });
                setNewBagScannedItems([]);
                setNewBagScanQuery('');
                setNewBagScanError('');
                setShowNewBagModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Customer Hold Bag</span>
            </button>
          </div>

          {customerHolds.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-purple-500/30 rounded-2xl bg-purple-500/5">
              <Briefcase className="w-12 h-12 text-purple-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Customer Hold Bags Active
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                When a customer picks a large quantity of garments, hold their tags together so they do not mix with other store tags.
              </p>
              <button
                type="button"
                onClick={() => {
                  setNewBagForm({
                    customerName: '',
                    customerPhone: '',
                    bagNo: 'BAG-1',
                    notes: ''
                  });
                  setNewBagScannedItems([]);
                  setNewBagScanQuery('');
                  setNewBagScanError('');
                  setShowNewBagModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md"
              >
                + Create First Customer Hold Bag
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customerHolds.map((bag) => (
                <div
                  key={bag.batchId}
                  className="p-5 rounded-2xl border border-purple-500/30 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-purple-600 text-white shadow-xs">
                            {bag.bagNo ? `BAG #${bag.bagNo}` : 'HOLD BAG'}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            {new Date(bag.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-purple-500" />
                          <span>{bag.customerName}</span>
                        </h4>
                        {bag.customerPhone && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{bag.customerPhone}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-purple-600 dark:text-purple-400">
                          {bag.count} <span className="text-xs font-semibold text-slate-400">pcs</span>
                        </div>
                        <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                          ₹{bag.totalMrp.toLocaleString('en-IN')} MRP
                        </div>
                      </div>
                    </div>

                    {/* Notes if any */}
                    {bag.notes && (
                      <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-900 dark:text-purple-200 font-medium">
                        📝 {bag.notes}
                      </div>
                    )}

                    {/* Items List in Bag */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {bag.tags.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {item.articleName || item.articleNo}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>{item.barcode}</span>
                              <span>•</span>
                              <span>Size {item.size || 'Free'}</span>
                              {item.color && (
                                <>
                                  <span>•</span>
                                  <span>{item.color}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-black text-slate-900 dark:text-white">
                              ₹{Number(item.mrp || 0).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              ₹{Number(item.soldPrice || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBillCustomerHold(bag, 'speed_billing')}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                      title="Send all garments of this customer directly to Speed Billing POS under B1G2"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Bill This Bag</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomerBagModalData(bag)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                      title="Print 58mm/80mm Thermal Slip for this Garment Bag"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyAllWhatsApp(bag.tags)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-500 text-slate-700 dark:text-slate-200 transition-colors"
                      title="Copy WhatsApp brief for this customer bag (8708788707)"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReleaseCustomerHold(bag.batchId, bag.customerName)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 hover:text-rose-500 text-slate-400 transition-colors text-xs font-semibold"
                      title="Release tags back to general pending rack"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Tags List */}
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
                        <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 flex items-center gap-2">
                          <span>{tag.articleName || tag.articleNo || 'Apparel'}</span>
                          {tag.holdForCustomer && (
                            <span
                              onClick={() => {
                                setStatusFilter('holds');
                                setActiveCustomerHoldFilter(tag.holdBatchId);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 cursor-pointer hover:bg-purple-500/30 transition-colors shrink-0"
                              title={`Held for ${tag.holdCustomerName || tag.customerName} in ${tag.holdBagNo || 'Bag'}. Click to view bag.`}
                            >
                              <Briefcase className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              <span>{tag.holdBagNo ? `Bag #${tag.holdBagNo}` : 'Held'}: {tag.holdCustomerName || tag.customerName}</span>
                            </span>
                          )}
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

                          {isBilled ? (
                            <button
                              onClick={() => handleRestoreActive(tag)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Restore this tag back to Active Pending"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                          ) : (
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
                    {isBilled ? (
                      <button
                        onClick={() => handleRestoreActive(tag)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Restore this tag back to Active Pending"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Active</span>
                      </button>
                    ) : (
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
            type="button"
            onClick={() => {
              setHoldForm({
                customerName: '',
                customerPhone: '',
                bagNo: `BAG-${customerHolds.length + 1}`,
                notes: ''
              });
              setShowHoldModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/25 transition-all active:scale-95"
            title="Hold these tags together in a dedicated bag for a specific customer"
          >
            <Briefcase className="w-4 h-4" />
            <span>Hold for Customer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const selectedItems = tags.filter(t => selectedTagIds.includes(t.id));
              handleCopyAllWhatsApp(selectedItems);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
            title="Copy WhatsApp summary of selected tags to 8708788707"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Selected ({selectedTagIds.length})</span>
          </button>

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
      </div>
      )}

      {/* ========================================================================= */}
      {/* ⚠️ ADMIN DAMAGE & QUARANTINE DESK VIEW */}
      {/* ========================================================================= */}
      {subDesk === 'damages' && (
        <div className="space-y-6">
          {/* Top Admin Notice */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/40 border border-red-500/40 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-red-300 uppercase tracking-wide mr-2">
                  🔒 Role-Based Defect Vault:
                </span>
                <span className="text-slate-300">
                  Floor staff are restricted to reporting defects via mobile camera scan. Only Store Admin, Owner, or Manager can un-quarantine, tailor-repair, dispatch RTV batches, or delete defect records.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-bold text-amber-300 shrink-0">
              Active Desk Role: {currentRole?.toUpperCase()}
            </span>
          </div>

          {/* Bento Metric Cards for Damages */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Quarantined in Store Bin */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-red-300 dark:border-red-900/60 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400 font-bold mb-1">
                <span>Quarantined in Bin</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </div>
              <div className="text-2xl font-black text-red-600 dark:text-red-400">
                {damagesSummary.quarantinedCount}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                ₹{Number(damagesSummary.quarantinedMrp || 0).toLocaleString('en-IN')} MRP Value
              </div>
            </div>

            {/* Minor Defect (Store Tailor) */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-amber-600 dark:text-amber-400 font-bold mb-1">Store Tailor Fix</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {damages.filter(d => d.status === 'quarantine' && (d.severity === 'minor' || d.actionPlan === 'local_repair')).length}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Minor zipper/stitch defects</div>
            </div>

            {/* Major Defect (Cobb HO RTV) */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-purple-600 dark:text-purple-400 font-bold mb-1">Pending RTV Return</div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {damages.filter(d => d.status === 'quarantine' && (d.severity === 'major' || d.actionPlan === 'rtv_vendor')).length}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Awaiting factory dispatch</div>
            </div>

            {/* Dispatched to Cobb HO */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-1">Dispatched to HO</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {damagesSummary.dispatchedCount}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">In transit / at factory</div>
            </div>

            {/* Settled Claims */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-1">Settled Claims</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {damagesSummary.settledCount}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Credit note issued by HO</div>
            </div>
          </div>

          {/* Search, Filter, and Bulk Dispatch Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search defective article, barcode, defect reason, or reporter..."
                value={damagesSearch}
                onChange={(e) => setDamagesSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
              {damagesSearch && (
                <button
                  type="button"
                  onClick={() => setDamagesSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'quarantine', label: 'Quarantined', count: damagesSummary.quarantinedCount, color: 'text-red-500' },
                { id: 'all', label: 'All Records', count: damagesSummary.totalCount, color: 'text-slate-400' },
                { id: 'repaired', label: 'Repaired', count: damagesSummary.repairedCount, color: 'text-emerald-500' },
                { id: 'dispatched_rtv', label: 'Dispatched RTV', count: damagesSummary.dispatchedCount, color: 'text-indigo-500' },
                { id: 'settled', label: 'Settled', count: damagesSummary.settledCount, color: 'text-cyan-500' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDamagesFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    damagesFilter === f.id
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700/80 ${f.color}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Bulk Action: Dispatch to Cobb HO */}
            {selectedDamageIds.length > 0 && (
              <button
                type="button"
                onClick={() => setRtvBatchModal({
                  isOpen: true,
                  itemIds: selectedDamageIds,
                  transportName: 'DTDC / Transport',
                  destination: 'Cobb Head Office / Factory'
                })}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all active:scale-95 shrink-0"
              >
                <Truck className="w-4 h-4" />
                <span>Dispatch RTV Batch ({selectedDamageIds.length})</span>
              </button>
            )}
          </div>

          {/* Quarantined Records List / Cards */}
          {filteredDamages.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Damaged Garments in this View
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                {damagesFilter === 'quarantine'
                  ? 'Great news! There are currently no defective pieces quarantined in the store damage bin.'
                  : 'Try selecting a different status filter or clear your search query.'}
              </p>
              <button
                type="button"
                onClick={() => setShowDefectModal(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow transition-all"
              >
                + Quarantine a Defective Garment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDamages.map(d => {
                const isSelected = selectedDamageIds.includes(d.id);
                const isQuarantine = d.status === 'quarantine';
                const isRepaired = d.status === 'repaired';
                const isDispatched = d.status === 'dispatched_rtv';
                const isSettled = d.status === 'settled';

                return (
                  <div
                    key={d.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                        : isQuarantine
                        ? 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-950/60 shadow-sm hover:border-red-400'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm opacity-90'
                    }`}
                  >
                    {/* Card Top: Details & Photo */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox for RTV batch */}
                        {isQuarantine && (
                          <button
                            type="button"
                            onClick={() => toggleSelectDamage(d.id)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors mt-0.5"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 fill-current" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        )}

                        {/* Article Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-slate-900 dark:text-white truncate">
                              #{d.articleNo}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {d.size}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {d.color}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {d.articleName}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-1">
                            <span>{d.barcode}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(d.barcode);
                                showToastMsg('Barcode copied!', 'success');
                              }}
                              className="hover:text-white"
                              title="Copy Barcode"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Photo Thumbnail */}
                        {d.photo ? (
                          <button
                            type="button"
                            onClick={() => setPhotoPreviewUrl(d.photo)}
                            className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group shrink-0"
                            title="Click to zoom defect photo"
                          >
                            <img src={d.photo} alt="Defect" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye className="w-4 h-4" />
                            </div>
                          </button>
                        ) : (
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              ₹{Number(d.mrp || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="block text-[10px] text-slate-400">MRP</span>
                          </div>
                        )}
                      </div>

                      {/* Defect Reasons & Description */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                            {DEFECT_TYPES[d.defectType]?.label || d.defectType?.replace('_', ' ')}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            d.severity === 'minor'
                              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}>
                            {d.severity === 'minor' ? '🪡 Minor (Tailor)' : '🚚 Major (RTV)'}
                          </span>
                        </div>
                        {d.defectDesc && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                            "{d.defectDesc}"
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span>Reported by: <strong className="text-slate-600 dark:text-slate-300">{d.reportedBy || 'Staff'}</strong></span>
                          <span>{d.date || (d.reportedAt ? new Date(d.reportedAt).toLocaleDateString() : '')}</span>
                        </div>
                      </div>

                      {/* Status Badges & Resolution Meta */}
                      {isQuarantine && (
                        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span>Quarantined in Damage Bin</span>
                          </span>
                          <span className="text-[10px] text-red-400/80">POS Billing Blocked</span>
                        </div>
                      )}

                      {isRepaired && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Restocked by Tailor</span>
                          </div>
                          {d.repairNotes && <p className="text-[11px] text-emerald-300/80">"{d.repairNotes}"</p>}
                        </div>
                      )}

                      {isDispatched && (
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-400 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" />
                              <span>{d.rtvBatchNo}</span>
                            </span>
                            <span className="text-[10px]">{d.transportName || 'Courier'}</span>
                          </div>
                          <p className="text-[10px] text-indigo-300/80">Dispatched to Cobb HO</p>
                        </div>
                      )}

                      {isSettled && (
                        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span>CN: #{d.creditNoteNo}</span>
                            <span>₹{Number(d.settledAmount || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <p className="text-[10px] text-cyan-300/80">Settled via Credit Note</p>
                        </div>
                      )}
                    </div>

                    {/* Card Bottom: Admin Exclusive Action Dock */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => triggerDamageSlipPrint(d, { paperSize: '58mm' })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                          title="Print 2-inch ESC/POS thermal slip to tape on polybag"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Slip</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDamage(d.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/15 transition-all"
                          title="[ADMIN ONLY] Permanently delete defect record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isQuarantine && (
                          <>
                            <button
                              type="button"
                              onClick={() => setRepairNotesModal({ isOpen: true, damage: d, notes: '' })}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
                              title="[ADMIN ONLY] Approve tailor repair and restore garment to sales rack"
                            >
                              <Scissors className="w-3 h-3" />
                              <span>Restock</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRtvBatchModal({
                                isOpen: true,
                                itemIds: [d.id],
                                transportName: 'DTDC Courier',
                                destination: 'Cobb Head Office / Factory'
                              })}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
                              title="[ADMIN ONLY] Dispatch garment to Cobb HO via RTV"
                            >
                              <Truck className="w-3 h-3" />
                              <span>RTV Return</span>
                            </button>
                          </>
                        )}

                        {isDispatched && (
                          <button
                            type="button"
                            onClick={() => setSettleModal({
                              isOpen: true,
                              damage: d,
                              creditNoteNo: 'CN-' + Math.floor(100000 + Math.random() * 900000),
                              settledAmount: String(d.mrp || 0),
                              notes: ''
                            })}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
                            title="[ADMIN ONLY] Record Credit Note received from HO"
                          >
                            <FileCheck className="w-3 h-3" />
                            <span>Settle CN</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

            {/* --- THERMAL GARMENT REPLACEMENT TAG MODAL --- */}
      {thermalTagModalData && (
        <ThermalTagModal
          isOpen={Boolean(thermalTagModalData)}
          onClose={() => setThermalTagModalData(null)}
          tagData={thermalTagModalData}
          onPrintSuccess={(pt) => {
            showToastMsg(`Replacement tag printed for #${pt.barcode}`, 'success');
          }}
        />
      )}

      {/* --- REPORT DEFECT & DAMAGE MODAL --- */}
      {showDefectModal && (
        <ReportDefectModal
          isOpen={showDefectModal}
          onClose={() => setShowDefectModal(false)}
          userRole={currentRole}
          onQuarantineSuccess={(d) => {
            showToastMsg(`Garment #${d.articleNo} (${d.size}) quarantined in Damage Bin!`, 'success');
            fetchDamages();
          }}
        />
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setScanQuery(val);
                      setForm(prev => ({ ...prev, barcode: val }));
                      setVerifiedDbItem(null);
                      const trimmed = val.trim();
                      if (trimmed) {
                        const match = tags.find(t => isBarcodeDuplicate(t.barcode, trimmed));
                        if (match) {
                          if (match.status === 'billed') {
                            setBarcodeMatchError(`🚫 This barcode has ALREADY BEEN BILLED in POS (${match.billedInBillNo ? 'Bill #' + match.billedInBillNo : 'Billed'} • Tag #${match.id}). Cannot be added!`);
                          } else {
                            setBarcodeMatchError(`This tag has already been added in the tab (Tag #${match.id} • ${match.articleName || 'Item'} • MRP ₹${match.mrp} • Size ${match.size})`);
                          }
                        } else if (barcodeMatchError && (barcodeMatchError.includes('already been added in the tab') || barcodeMatchError.includes('ALREADY BEEN BILLED'))) {
                          setBarcodeMatchError('');
                          setPosBilledInfo(null);
                        }
                      } else {
                        setBarcodeMatchError('');
                        setPosBilledInfo(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickLookup(scanQuery || form.barcode);
                      }
                    }}
                    autoFocus
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickLookup(scanQuery || form.barcode)}
                    disabled={isSearchingBarcode || !(scanQuery || form.barcode).trim()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    {isSearchingBarcode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Find</span>
                  </button>
                </div>
                {barcodeMatchError && (
                  <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    barcodeMatchError.includes('ALREADY BEEN BILLED') || barcodeMatchError.includes('ALREADY BILLED')
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold shadow-sm'
                      : barcodeMatchError.includes('already been added in the tab')
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold shadow-sm'
                      : 'text-amber-500'
                  }`}>
                    {(barcodeMatchError.includes('already been added in the tab') || barcodeMatchError.includes('ALREADY')) && (
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <span>{barcodeMatchError}</span>
                  </div>
                )}
              </div>

              {/* Product Details Form Row with Dedicated Get Item Details from Database Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Barcode className="w-3.5 h-3.5 text-rose-500" />
                    <span>Barcode Number *</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Auto-fetches garment on click</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={form.barcode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, barcode: val }));
                      setScanQuery(val);
                      setVerifiedDbItem(null);
                      setPosBilledInfo(null);
                      setBarcodeMatchError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickLookup(form.barcode || scanQuery);
                      }
                    }}
                    placeholder="Barcode / SKU"
                    className="flex-1 min-w-0 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickLookup(form.barcode || scanQuery)}
                    disabled={isSearchingBarcode || !(form.barcode || scanQuery).trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title="Fetch garment details from SQL Server / Cloud Database"
                  >
                    {isSearchingBarcode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Get Item Details from Database</span>
                  </button>
                </div>
              </div>

              {/* Article No & Article Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              {/* Verified Item Details from Database Banner */}
              {verifiedDbItem && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-100 space-y-1.5 animate-in fade-in shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Item Details Retrieved from Database</span>
                    </span>
                    <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      Verified in DB
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">Article & Name:</span>
                      <strong className="text-slate-900 dark:text-white">{verifiedDbItem.itemName || form.articleName}</strong> ({verifiedDbItem.articleNo || form.articleNo})
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">Size & Color:</span>
                      <strong className="text-slate-900 dark:text-white">{verifiedDbItem.size || form.size} • {verifiedDbItem.color || form.color}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">Section:</span>
                      <span>{verifiedDbItem.sectionName || form.section}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-semibold">Database MRP:</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-xs">₹{Number(verifiedDbItem.mrp || form.mrp).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time already-billed barcode banner */}
              {(posBilledInfo || duplicateTag?.status === 'billed') && (
                <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in shadow-sm">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div>
                    <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <span>🚫 Barcode Already Billed in POS</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-mono font-bold">
                        {posBilledInfo?.billNo ? `Bill #${posBilledInfo.billNo}` : (duplicateTag?.billedInBillNo ? `Bill #${duplicateTag.billedInBillNo}` : 'POS-BILLED')}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-rose-600 dark:text-rose-300">
                      This garment has already been billed and completed at the POS counter{posBilledInfo?.billTime ? ` on ${new Date(posBilledInfo.billTime).toLocaleDateString()}` : ''}. Billed articles cannot be re-added as pending tags or held.
                    </p>
                  </div>
                </div>
              )}

              {/* Real-time duplicate active barcode banner */}
              {duplicateTag && duplicateTag.status === 'active' && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in shadow-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div>
                    <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <span>⚠️ This tag has already been added in the tab</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-mono">
                        #{duplicateTag.id}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-rose-600 dark:text-rose-300">
                      Item <strong>{duplicateTag.articleName || duplicateTag.articleNo || 'Garment'}</strong> (MRP ₹{duplicateTag.mrp}, {duplicateTag.size}) is already registered as an active pending tag with barcode <span className="font-mono font-bold">{duplicateTag.barcode}</span>. Duplicate barcodes cannot be added until this tag is billed or voided.
                    </p>
                  </div>
                </div>
              )}

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
                    disabled={Boolean(duplicateTag || posBilledInfo)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                    title={
                      posBilledInfo || duplicateTag?.status === 'billed'
                        ? 'Already Billed in POS'
                        : duplicateTag
                        ? 'Cannot add duplicate barcode'
                        : 'Save Pending Tag'
                    }
                  >
                    {posBilledInfo || duplicateTag?.status === 'billed'
                      ? 'Already Billed in POS'
                      : duplicateTag
                      ? 'Duplicate Barcode'
                      : 'Save Pending Tag'}
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

      {/* --- ADMIN TAILOR REPAIR & RESTOCK MODAL --- */}
      {repairNotesModal.isOpen && repairNotesModal.damage && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Tailor Repair & Restock
                  </h3>
                  <p className="text-xs text-slate-500">Restore garment to active sales rack</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRepairNotesModal({ isOpen: false, damage: null, notes: '' })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                Article #{repairNotesModal.damage.articleNo} ({repairNotesModal.damage.size})
              </p>
              <p className="text-slate-500">Defect: {repairNotesModal.damage.defectType} — {repairNotesModal.damage.defectDesc}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tailor Work Notes
              </label>
              <textarea
                rows={3}
                value={repairNotesModal.notes}
                onChange={(e) => setRepairNotesModal(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. In-house tailor stitched seam, replaced missing button, and pressed..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRepairNotesModal({ isOpen: false, damage: null, notes: '' })}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRepairRestock(repairNotesModal.damage.id, repairNotesModal.notes)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Restock to Rack</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADMIN RTV BATCH DISPATCH MODAL --- */}
      {rtvBatchModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Dispatch RTV Return Batch
                  </h3>
                  <p className="text-xs text-slate-500">Return damaged pieces to Cobb HO / Factory</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRtvBatchModal({ isOpen: false, itemIds: [], transportName: '', destination: '' })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
              <p className="font-extrabold text-indigo-700 dark:text-indigo-300">
                📦 {rtvBatchModal.itemIds.length} Defective Garment(s) Selected
              </p>
              <p className="text-indigo-600/80 dark:text-indigo-400/80 text-[11px]">
                These pieces will be bundled into an official RTV parcel for Head Office credit claim.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Courier / Transport Name
                </label>
                <input
                  type="text"
                  value={rtvBatchModal.transportName}
                  onChange={(e) => setRtvBatchModal(prev => ({ ...prev, transportName: e.target.value }))}
                  placeholder="e.g. DTDC Air / Self Handover / Delhivery"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Destination Address / Warehouse
                </label>
                <input
                  type="text"
                  value={rtvBatchModal.destination}
                  onChange={(e) => setRtvBatchModal(prev => ({ ...prev, destination: e.target.value }))}
                  placeholder="Cobb Head Office / Factory, Gurugram"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRtvBatchModal({ isOpen: false, itemIds: [], transportName: '', destination: '' })}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreateRtvBatch(rtvBatchModal.itemIds, rtvBatchModal.transportName, rtvBatchModal.destination)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>Create RTV Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADMIN CREDIT NOTE SETTLEMENT MODAL --- */}
      {settleModal.isOpen && settleModal.damage && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Settle via Credit Note
                  </h3>
                  <p className="text-xs text-slate-500">Record reimbursement from Cobb HO</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettleModal({ isOpen: false, damage: null, creditNoteNo: '', settledAmount: '', notes: '' })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Credit Note Number
                </label>
                <input
                  type="text"
                  value={settleModal.creditNoteNo}
                  onChange={(e) => setSettleModal(prev => ({ ...prev, creditNoteNo: e.target.value }))}
                  placeholder="CN-98210"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Settled Amount (₹)
                </label>
                <input
                  type="number"
                  value={settleModal.settledAmount}
                  onChange={(e) => setSettleModal(prev => ({ ...prev, settledAmount: e.target.value }))}
                  placeholder="1999"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Settlement Remarks
                </label>
                <input
                  type="text"
                  value={settleModal.notes}
                  onChange={(e) => setSettleModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="100% factory defect credit passed by HO"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettleModal({ isOpen: false, damage: null, creditNoteNo: '', settledAmount: '', notes: '' })}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSettleCreditNote(
                  settleModal.damage.id,
                  settleModal.creditNoteNo,
                  settleModal.settledAmount,
                  settleModal.notes
                )}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Settlement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOMER HOLD MODAL (FOR SELECTED TAGS) --- */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Hold Tags for Customer
                  </h3>
                  <p className="text-[11px] text-purple-600 dark:text-purple-300 font-medium">
                    Reserve {selectedTagIds.length} garment(s) in a dedicated customer bag
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHoldModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerHold} className="p-5 space-y-4">
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs">
                <span className="font-bold text-purple-900 dark:text-purple-200">
                  {selectedTagIds.length} Garments Selected
                </span>
                <span className="font-black text-slate-900 dark:text-white">
                  ₹{tags.filter(t => selectedTagIds.includes(t.id)).reduce((s, x) => s + (Number(x.mrp) || 0), 0).toLocaleString('en-IN')} MRP
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sharma"
                  value={holdForm.customerName}
                  onChange={(e) => setHoldForm({ ...holdForm, customerName: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={holdForm.customerPhone}
                    onChange={(e) => setHoldForm({ ...holdForm, customerPhone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Bag / Token #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BAG-1"
                    value={holdForm.bagNo}
                    onChange={(e) => setHoldForm({ ...holdForm, bagNo: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hold Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Trial room batch / customer trying shoes"
                  value={holdForm.notes}
                  onChange={(e) => setHoldForm({ ...holdForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowHoldModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
                >
                  Confirm & Hold Tags
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NEW CUSTOMER HOLD BAG (DIRECT BULK SCAN) MODAL --- */}
      {showNewBagModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-600/15 via-indigo-600/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-md">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Create Customer Hold Bag (Direct Scan)
                  </h3>
                  <p className="text-xs text-purple-600 dark:text-purple-300 font-medium">
                    Scan customer garments in succession to isolate them into a dedicated bag
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewBagModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Customer Info Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amit Singla"
                    value={newBagForm.customerName}
                    onChange={(e) => setNewBagForm({ ...newBagForm, customerName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={newBagForm.customerPhone}
                    onChange={(e) => setNewBagForm({ ...newBagForm, customerPhone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Bag / Token #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BAG-1"
                    value={newBagForm.bagNo}
                    onChange={(e) => setNewBagForm({ ...newBagForm, bagNo: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Barcode Scanner Input with Two-Step DB Verification */}
              <form onSubmit={handleFetchItemForNewBag} className="space-y-2 pt-1">
                <label className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center justify-between">
                  <span>Enter Barcode Number to Add Garment:</span>
                  <span className="text-[10px] text-slate-400">Step 1: Enter Barcode &gt; Step 2: Get DB Details &gt; Step 3: Add to Bag</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Scan barcode or type article / SKU..."
                      value={newBagScanQuery}
                      onChange={(e) => {
                        setNewBagScanQuery(e.target.value);
                        if (stagedBagItem) setStagedBagItem(null);
                        if (newBagScanError) setNewBagScanError('');
                      }}
                      className="w-full pl-10 pr-3 py-2.5 text-xs font-mono font-bold rounded-xl border-2 border-purple-500/40 bg-purple-500/5 dark:bg-purple-950/20 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={newBagScanLoading || !newBagScanQuery.trim()}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-purple-500/20 shrink-0"
                    title="Get Garment Details from Database"
                  >
                    {newBagScanLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Get Item Details from Database</span>
                  </button>
                </div>
                {newBagScanError && (
                  <p className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{newBagScanError}</span>
                  </p>
                )}
              </form>

              {/* Staged Item Review Card */}
              {stagedBagItem && (
                <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-400 dark:border-purple-600 text-xs space-y-3 animate-in fade-in shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-black text-purple-900 dark:text-purple-200">
                        {stagedBagItem.fromDb ? 'Item Details Retrieved from Database' : 'Item Ready to Add'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200">
                      Barcode: {stagedBagItem.barcode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-800 dark:text-slate-200 text-xs bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Article</span>
                      <strong className="text-slate-900 dark:text-white">{stagedBagItem.articleName}</strong>
                      <div className="text-[10px] text-slate-500 font-mono">({stagedBagItem.articleNo})</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Size & Color</span>
                      <strong className="text-slate-900 dark:text-white">{stagedBagItem.size} • {stagedBagItem.color}</strong>
                      <div className="text-[10px] text-slate-500">{stagedBagItem.section}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Original MRP</span>
                      <strong className="text-slate-900 dark:text-white font-mono text-sm">₹{Number(stagedBagItem.mrp).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">B1G2 Hold Deal</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">₹{Number(stagedBagItem.soldPrice).toLocaleString('en-IN')} ({stagedBagItem.discountPercent}% OFF)</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAddStagedItemToBag}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add This Verified Item to Customer Bag</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStagedBagItem(null)}
                      className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Scanned Items Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Garments in this Bag ({newBagScannedItems.length})</span>
                  <span className="text-purple-600 dark:text-purple-400 font-extrabold font-mono text-sm">
                    Total MRP: ₹{newBagScannedItems.reduce((s, it) => s + (Number(it.mrp) || 0), 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {newBagScannedItems.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                    Scan the first garment to start filling this customer hold bag.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {newBagScannedItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-black text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {item.articleName} ({item.articleNo})
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Barcode: {item.barcode} • Size: {item.size} • Color: {item.color}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-black text-slate-900 dark:text-white">
                              ₹{Number(item.mrp || 0).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              ₹{Number(item.soldPrice || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromNewBag(item.id)}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Remove piece from bag"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {newBagScannedItems.length} piece(s) ready to hold
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewBagModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewCustomerBag}
                  disabled={newBagScannedItems.length === 0}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
                >
                  Save & Hold Bag ({newBagScannedItems.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOMER HOLD BAG THERMAL PRINT SLIP MODAL --- */}
      {customerBagModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Customer Hold Bag Slip (Thermal Preview)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCustomerBagModalData(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950">
              <div className="p-4 rounded-xl bg-white text-black font-mono text-xs border border-slate-300 shadow-sm space-y-2">
                <div className="text-center border-b border-black pb-2">
                  <div className="font-black text-sm">COBB STORE • PUNDRI</div>
                  <div className="text-[10px]">GOYAL - HOUSE OF FASHION</div>
                  <div className="font-black mt-1 text-xs uppercase">💼 CUSTOMER HOLD BAG SLIP</div>
                  <div className="text-sm font-black mt-1">
                    {customerBagModalData.bagNo ? `BAG #${customerBagModalData.bagNo}` : 'CUSTOMER HOLD'}
                  </div>
                </div>

                <div className="text-[11px] space-y-0.5 border-b border-dashed border-black pb-2">
                  <div><strong>Customer:</strong> {customerBagModalData.customerName}</div>
                  {customerBagModalData.customerPhone && (
                    <div><strong>Phone:</strong> {customerBagModalData.customerPhone}</div>
                  )}
                  <div><strong>Date:</strong> {new Date(customerBagModalData.createdAt).toLocaleString('en-IN')}</div>
                  {customerBagModalData.notes && (
                    <div><strong>Notes:</strong> {customerBagModalData.notes}</div>
                  )}
                </div>

                <div className="space-y-1 border-b border-black pb-2">
                  <div className="font-bold text-[10px] uppercase flex justify-between">
                    <span># Article</span>
                    <span>Size / MRP</span>
                  </div>
                  {customerBagModalData.tags.map((t, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>{idx + 1}. {t.articleNo || t.barcode}</span>
                      <span>{t.size} - ₹{Number(t.mrp || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] font-bold space-y-0.5 pt-1">
                  <div className="flex justify-between">
                    <span>Total Pieces:</span>
                    <span>{customerBagModalData.count} Garments</span>
                  </div>
                  <div className="flex justify-between text-sm font-black">
                    <span>Total MRP:</span>
                    <span>₹{customerBagModalData.totalMrp.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Estimated Combo Cash:</span>
                    <span>₹{customerBagModalData.totalCollected.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="text-center text-[9px] pt-2 border-t border-dashed border-black">
                  *** ATTACH TO PHYSICAL GARMENT BAG ***<br/>
                  EXCLUSIVELY RESERVED FOR CUSTOMER CHECKOUT
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setCustomerBagModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerCustomerHoldBagPrint(customerBagModalData);
                  showToastMsg('Printed customer hold slip!', 'success');
                }}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/25 active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip (58mm/80mm)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PHOTO ZOOM MODAL --- */}
      {photoPreviewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPhotoPreviewUrl(null)}
        >
          <div className="relative max-w-lg w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPhotoPreviewUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={photoPreviewUrl} alt="Defect High Res" className="w-full h-auto rounded-xl max-h-[80vh] object-contain" />
            <div className="p-3 text-center text-xs text-slate-300 font-medium">
              Defect photo captured on floor staff mobile camera
            </div>
          </div>
        </div>
      )}

      {/* --- WHATSAPP BRIEF PREVIEW MODAL --- */}
      {whatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>WhatsApp Pending Tags Brief</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {whatsAppModal.count} Articles
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Target: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">+91 87087 88707</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsAppModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                ✓ Message copied to clipboard! You can paste directly or click below to open WhatsApp chat with <strong>8708788707</strong>.
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    WhatsApp Message Preview:
                  </label>
                  <span className="text-[10px] text-slate-400">Includes Barcodes & Article Details</span>
                </div>
                <textarea
                  readOnly
                  value={whatsAppModal.message}
                  rows={12}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 resize-none focus:outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => setWhatsAppModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator?.clipboard?.writeText(whatsAppModal.message);
                    showToastMsg('Copied to clipboard!', 'success');
                  } catch (e) {
                    showToastMsg('Failed to copy', 'error');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Text</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const encoded = encodeURIComponent(whatsAppModal.message);
                  const phone = whatsAppModal.phone || '8708788707';
                  const waUrl = encoded.length < 3000
                    ? `https://wa.me/91${phone}?text=${encoded}`
                    : `https://wa.me/91${phone}`;
                  window.open(waUrl, '_blank');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open WhatsApp (8708788707)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
