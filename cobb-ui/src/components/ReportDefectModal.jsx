import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Printer,
  X,
  Tag,
  ShieldAlert,
  Trash2,
  Image as ImageIcon,
  RefreshCw,
  Scissors,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';
import axios from 'axios';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  DEFECT_TYPES,
  generateBarcodeSvg,
  triggerDamageSlipPrint
} from '../utils/thermalTagPrinter';

export default function ReportDefectModal({
  isOpen,
  onClose,
  initialBarcode = '',
  initialArticle = null,
  activeStore = 'DEMO_STORE_001',
  userRole = 'staff',
  API_BASE: propApiBase = '',
  reportedBy: propReportedBy = '',
  initialPrintSlip,
  onQuarantineSuccess,
  onOpenScanner,
  onScanNext
}) {
  const API_BASE = propApiBase || (
    typeof window !== 'undefined' && (window.location.protocol === 'app:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000')
  );

  const [barcode, setBarcode] = useState('');
  const [articleNo, setArticleNo] = useState('');
  const [articleName, setArticleName] = useState('');
  const [category, setCategory] = useState('APPAREL');
  const [size, setSize] = useState('M');
  const [color, setColor] = useState('Standard');
  const [mrp, setMrp] = useState(0);
  const [defectType, setDefectType] = useState('ZIPPER');
  const [defectDesc, setDefectDesc] = useState('');
  const [severity, setSeverity] = useState('major'); // 'minor' | 'major'
  const [actionPlan, setActionPlan] = useState('rtv_vendor'); // 'local_repair' | 'rtv_vendor'
  const [reportedBy, setReportedBy] = useState(propReportedBy || 'Floor Staff');
  const [source, setSource] = useState('Floor Mobile Scan');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [printSlipOnSubmit, setPrintSlipOnSubmit] = useState(
    initialPrintSlip !== undefined ? initialPrintSlip : true
  );
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [quarantinedItem, setQuarantinedItem] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const photoInputRef = useRef(null);
  const timerRef = useRef(null);

  const targetStoreId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01')
    ? 'DEMO_STORE_001'
    : activeStore;

  // Initialize data on modal open
  useEffect(() => {
    if (!isOpen) {
      setQuarantinedItem(null);
      setErrorMsg('');
      setSuccessMsg('');
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setQuarantinedItem(null);
    setShowOptionalDetails(false);

    if (propReportedBy) {
      setReportedBy(propReportedBy);
    }

    const code = (initialBarcode || initialArticle?.scannedBarcode || initialArticle?.barcode || '').trim();
    setBarcode(code);

    const hasCompleteDetails = Boolean(
      initialArticle &&
      initialArticle.articleNo &&
      initialArticle.articleNo !== code &&
      Number(initialArticle.mrp) > 0
    );

    if (hasCompleteDetails) {
      setArticleNo(initialArticle.articleNo);
      setArticleName(initialArticle.itemName || initialArticle.articleName || 'Cobb Apparel');
      setCategory(initialArticle.sectionName || initialArticle.category || 'APPAREL');
      setSize(initialArticle.size || initialArticle.matchedSize || 'M');
      setColor(initialArticle.color || initialArticle.matchedColor || 'Standard');
      setMrp(Number(initialArticle.mrp));
    } else {
      if (initialArticle) {
        setArticleNo(initialArticle.articleNo || code || 'COBB-ART');
        if (initialArticle.itemName || initialArticle.articleName) {
          setArticleName(initialArticle.itemName || initialArticle.articleName);
        }
        if (initialArticle.sectionName || initialArticle.category) {
          setCategory(initialArticle.sectionName || initialArticle.category);
        }
        if (initialArticle.size || initialArticle.matchedSize) {
          setSize(initialArticle.size || initialArticle.matchedSize);
        }
        if (initialArticle.color || initialArticle.matchedColor) {
          setColor(initialArticle.color || initialArticle.matchedColor);
        }
        if (Number(initialArticle.mrp) > 0) {
          setMrp(Number(initialArticle.mrp));
        }
      }
      if (code) {
        fetchItemDetails(code);
      }
    }
  }, [isOpen, initialBarcode, initialArticle]);

  // Auto-countdown after successful quarantine
  useEffect(() => {
    if (!quarantinedItem) return;
    setCountdown(3);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quarantinedItem]);

  // Lookup barcode details from API or Cloud Firestore
  const fetchItemDetails = async (code) => {
    if (!code) return;
    const cleanCode = String(code).trim();
    if (!cleanCode) return;
    setLookupLoading(true);

    try {
      let foundData = null;

      // 1. Primary: /api/staff/stock-check?q=...
      try {
        const staffRes = await axios.get(`${API_BASE}/api/staff/stock-check?q=${encodeURIComponent(cleanCode)}`, { timeout: 4500 });
        if (staffRes.data?.success) {
          foundData = staffRes.data;
        }
      } catch (err1) {
        // Fall through
      }

      // 2. Secondary: /api/inventory/quick-scan?q=...
      if (!foundData) {
        try {
          const quickRes = await axios.get(`${API_BASE}/api/inventory/quick-scan?q=${encodeURIComponent(cleanCode)}`, { timeout: 4500 });
          if (quickRes.data?.success) {
            foundData = quickRes.data;
          }
        } catch (err2) {
          // Fall through
        }
      }

      if (foundData) {
        const matchedVariant = Array.isArray(foundData.variants)
          ? (foundData.variants.find(v => String(v.barcode || '').trim().toLowerCase() === cleanCode.toLowerCase()) || foundData.variants[0])
          : null;

        const resolvedArtNo = foundData.articleNo || matchedVariant?.articleNo || cleanCode;
        const resolvedName = foundData.itemName || matchedVariant?.itemName || 'Cobb Apparel';
        const resolvedCategory = foundData.sectionName || foundData.subSectionName || matchedVariant?.sectionName || 'APPAREL';
        const resolvedSize = foundData.matchedSize || matchedVariant?.size || (foundData.sizes?.[0]?.size) || 'Standard';
        const resolvedColor = foundData.matchedColor || matchedVariant?.color || (foundData.colors?.[0]?.color) || 'Standard';
        const resolvedMrp = Number(foundData.mrp || matchedVariant?.mrp || 0);

        setArticleNo(resolvedArtNo);
        setArticleName(resolvedName);
        setCategory(resolvedCategory);
        if (resolvedSize) setSize(resolvedSize);
        if (resolvedColor) setColor(resolvedColor);
        if (resolvedMrp > 0) {
          setMrp(resolvedMrp);
        }
        return;
      }

      // 3. Direct Firestore Fallback for Phone Link
      if (db) {
        try {
          const invRef = doc(db, 'stores', targetStoreId, 'data', 'inventory');
          const invSnap = await getDoc(invRef);
          let items = [];
          if (invSnap.exists()) {
            const data = invSnap.data();
            items = Array.isArray(data) ? data : (data.items || []);
          }

          if (items.length === 0) {
            const masterSnap = await getDoc(doc(db, 'stores', targetStoreId, 'data', 'inventory_master'));
            if (masterSnap.exists()) {
              const mData = masterSnap.data();
              items = Array.isArray(mData) ? mData : (mData.items || []);
            }
          }

          const qLower = cleanCode.toLowerCase();
          const match = items.find(it => {
            const sku = String(it.SKU || it.barcode || '').trim().toLowerCase();
            const art = String(it.ArticleNo || it.articleNo || '').trim().toLowerCase();
            return sku === qLower || art === qLower;
          }) || items.find(it => {
            const sku = String(it.SKU || it.barcode || '').trim().toLowerCase();
            const art = String(it.ArticleNo || it.articleNo || '').trim().toLowerCase();
            return (sku && sku.includes(qLower)) || (art && art.startsWith(qLower));
          });

          if (match) {
            setArticleNo(match.ArticleNo || match.articleNo || cleanCode);
            setArticleName(match.ItemName || match.itemName || match.ProductType || 'Cobb Apparel');
            setCategory(match.ProductType || match.sectionName || 'APPAREL');
            setSize(match.Size || match.size || 'M');
            setColor(match.Color || match.color || 'Standard');
            const foundMrp = Number(match.MRP || match.mrp || 0);
            if (foundMrp > 0) {
              setMrp(foundMrp);
            }
            return;
          }

          // Check live bills
          const liveSnap = await getDoc(doc(db, 'stores', targetStoreId, 'data', 'sales_live'));
          if (liveSnap.exists()) {
            const lData = liveSnap.data();
            const bills = Array.isArray(lData) ? lData : (lData.items || []);
            let liveItem = null;
            for (const b of bills) {
              if (Array.isArray(b.Items)) {
                liveItem = b.Items.find(bi => {
                  const bc = String(bi.Barcode || '').trim().toLowerCase();
                  const an = String(bi.ArticleNo || '').trim().toLowerCase();
                  return bc === qLower || an === qLower;
                });
                if (liveItem) break;
              }
            }
            if (liveItem) {
              setArticleNo(liveItem.ArticleNo || cleanCode);
              setArticleName(liveItem.ArticleName || 'Cobb Apparel');
              setCategory(liveItem.Category || 'APPAREL');
              setSize(liveItem.Size || 'M');
              setColor(liveItem.Color || 'Standard');
              const foundMrp = Number(liveItem.MRP || liveItem.NetPrice || 0);
              if (foundMrp > 0) {
                setMrp(foundMrp);
              }
              return;
            }
          }

          // Check pending_tags
          const ptagSnap = await getDoc(doc(db, 'stores', targetStoreId, 'data', 'pending_tags'));
          if (ptagSnap.exists()) {
            const pData = ptagSnap.data();
            const tags = Array.isArray(pData) ? pData : (pData.tags || pData.items || []);
            const pt = tags.find(t => String(t.barcode || '').trim().toLowerCase() === qLower);
            if (pt) {
              setArticleNo(pt.articleNo || cleanCode);
              setArticleName(pt.articleName || 'Cobb Apparel');
              setCategory(pt.section || 'APPAREL');
              setSize(pt.size || 'M');
              setColor(pt.color || 'Standard');
              const foundMrp = Number(pt.mrp || pt.billedMRP || 0);
              if (foundMrp > 0) {
                setMrp(foundMrp);
              }
              return;
            }
          }
        } catch (fsErr) {
          console.warn('Direct Firestore inventory lookup note:', fsErr.message);
        }
      }
    } catch (e) {
      console.warn('Garment lookup note:', e.message);
    } finally {
      setLookupLoading(false);
    }
  };

  if (!isOpen) return null;

  // Handle Photo Capture / Upload
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size is too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit and Quarantine Garment (2-Tap Flow)
  const handleSubmitQuarantine = async (e) => {
    if (e) e.preventDefault();

    if (!barcode && !articleNo) {
      setErrorMsg('Please scan or enter a Barcode / Article No');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const payload = {
      barcode: barcode.trim(),
      articleNo: (articleNo || barcode).trim(),
      articleName: articleName.trim() || 'Cobb Apparel',
      category: category.trim() || 'APPAREL',
      size: size.trim() || 'FREE',
      color: color.trim() || 'STANDARD',
      mrp: Number(mrp) || 0,
      defectType,
      defectDesc: defectDesc.trim() || (DEFECT_TYPES.find(d => d.id === defectType)?.label || defectType),
      severity,
      actionPlan: severity === 'minor' ? 'local_repair' : 'rtv_vendor',
      photo: photoPreview || null,
      reportedBy,
      source
    };

    try {
      let createdDamage = null;

      // 1. Try local Express API
      try {
        const res = await axios.post(`${API_BASE}/api/damages/report`, payload, {
          headers: { 'x-user-role': userRole || 'staff' }
        });
        if (res.data?.success) {
          createdDamage = res.data.damage;
          // Background sync to Firestore for Phone Link
          if (db) {
            try {
              const docRef = doc(db, 'stores', targetStoreId, 'data', 'damage_records');
              getDoc(docRef).then(snap => {
                const curList = snap.exists() ? (snap.data().damages || []) : [];
                const updated = [createdDamage, ...curList.filter(d => d.id !== createdDamage.id)];
                setDoc(docRef, {
                  damages: updated.slice(-500),
                  quarantinedCount: updated.filter(d => d.status === 'quarantine').length,
                  lastUpdated: new Date().toISOString()
                }, { merge: true }).catch(() => {});
              }).catch(() => {});
            } catch (e) {}
          }
        }
      } catch (apiErr) {
        if (apiErr.response?.status === 409) {
          setErrorMsg(apiErr.response.data?.error || 'This item is already quarantined in Damage Bin!');
          setLoading(false);
          return;
        }

        // 2. Fallback to Cloud Firestore for Phone Link offline
        if (db) {
          const docRef = doc(db, 'stores', targetStoreId, 'data', 'damage_records');
          const snap = await getDoc(docRef);
          const curList = snap.exists() ? (snap.data().damages || []) : [];

          const cleanBc = (payload.barcode || '').trim().toUpperCase();
          if (cleanBc && curList.some(d => d.status === 'quarantine' && (d.barcode || '').trim().toUpperCase() === cleanBc)) {
            setErrorMsg(`Item with barcode ${cleanBc} is ALREADY quarantined in Damage Bin!`);
            setLoading(false);
            return;
          }

          const now = new Date();
          createdDamage = {
            id: 'dmg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            ...payload,
            status: 'quarantine',
            reportedAt: now.toISOString(),
            date: now.toISOString().split('T')[0]
          };

          const updated = [createdDamage, ...curList];
          await setDoc(docRef, {
            damages: updated.slice(-500),
            quarantinedCount: updated.filter(d => d.status === 'quarantine').length,
            lastUpdated: now.toISOString()
          }, { merge: true });
        } else {
          throw apiErr;
        }
      }

      const finalRecord = createdDamage || {
        ...payload,
        status: 'quarantine',
        reportedAt: new Date().toISOString()
      };

      setSuccessMsg(`Garment #${payload.articleNo} (${payload.size}) QUARANTINED!`);
      setQuarantinedItem(finalRecord);

      // Print slip on desktop POS if requested
      if (printSlipOnSubmit && finalRecord) {
        try {
          triggerDamageSlipPrint(finalRecord, { paperSize: '58mm' });
        } catch (printErr) {
          console.warn('Could not auto-print damage slip:', printErr);
        }
      }

      if (onQuarantineSuccess) {
        onQuarantineSuccess(finalRecord);
      }
    } catch (err) {
      console.error('Quarantine error:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to quarantine damaged item');
    } finally {
      setLoading(false);
    }
  };

  const selectedDefectInfo = DEFECT_TYPES.find(d => d.id === defectType) || DEFECT_TYPES[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-rose-950/40 via-red-900/30 to-amber-950/20 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-md shadow-rose-600/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span>Report Defective / Damaged Garment</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-rose-500 text-white uppercase tracking-wider">
                  Quarantine
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Instantly locks piece from POS billing & removes from floor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Success Screen vs Clean Form */}
        {quarantinedItem ? (
          /* --- High-Speed Success Card with 'Scan Next' Batching --- */
          <div className="p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 uppercase tracking-wider">
                🔒 Quarantined in Damage Bin
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1.5">
                Garment Successfully Locked!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Item <strong className="text-slate-800 dark:text-slate-200">#{quarantinedItem.articleNo}</strong> (Size: {quarantinedItem.size}) is blocked from POS billing.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Defect Reason:</span>
                <span className="text-rose-600 dark:text-rose-400">{quarantinedItem.defectDesc || quarantinedItem.defectType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reported By:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{quarantinedItem.reportedBy || reportedBy}</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onScanNext) {
                    onScanNext();
                  } else if (onOpenScanner) {
                    onOpenScanner();
                  }
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Next Piece</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 active:scale-95 transition-all"
              >
                Done ({countdown}s)
              </button>
            </div>
          </div>
        ) : (
          /* --- Streamlined 2-Tap Quarantine Form --- */
          <form onSubmit={handleSubmitQuarantine} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
            {/* Status Banners */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Scanned Barcode Input & Garment Summary */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/50 via-slate-50 to-amber-50/30 dark:from-rose-950/20 dark:via-slate-800/60 dark:to-slate-800/40 border border-rose-200/60 dark:border-rose-900/40 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Scan or enter barcode"
                    value={barcode}
                    onChange={(e) => {
                      setBarcode(e.target.value);
                      if (e.target.value.length >= 8) {
                        fetchItemDetails(e.target.value);
                      }
                    }}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs font-bold text-slate-900 dark:text-white"
                    required
                  />
                  <Tag className="w-3.5 h-3.5 text-rose-500 absolute left-2.5 top-2.5" />
                </div>
                {onOpenScanner && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenScanner();
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>
                )}
              </div>

              {/* Garment Details Preview Card */}
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {articleNo || barcode || 'COBB APPAREL'}
                    </span>
                    {size ? (
                      <span className="px-2 py-0.5 rounded-lg font-black text-[11px] bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        Size {size}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {lookupLoading ? 'Loading Size...' : 'Size Standard'}
                      </span>
                    )}
                    {color && (
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                        {color}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {lookupLoading ? 'Verifying garment in store catalog...' : `${articleName || 'Cobb Apparel'} • ${category || 'APPAREL'}`}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MRP (₹)</div>
                  {lookupLoading ? (
                    <div className="flex items-center gap-1 text-xs text-rose-500 font-bold justify-end">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Fetching...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">₹</span>
                      <input
                        type="number"
                        value={mrp || ''}
                        onChange={(e) => setMrp(Number(e.target.value))}
                        placeholder="0"
                        className="w-20 px-1 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black font-mono text-rose-600 dark:text-rose-400 text-right focus:outline-none focus:ring-1 focus:ring-rose-500"
                        title="Edit MRP if required"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Defect Reason Selection (Tap 1) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Select Defect Reason (Tap 1)</span>
                </label>
                <span className="text-[11px] font-black text-rose-600 dark:text-rose-400">
                  {selectedDefectInfo?.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DEFECT_TYPES.map((dt) => {
                  const isSelected = defectType === dt.id;
                  return (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => {
                        setDefectType(dt.id);
                        if (!defectDesc || DEFECT_TYPES.some(d => d.label === defectDesc)) {
                          setDefectDesc(dt.label);
                        }
                      }}
                      className={`p-3 rounded-2xl text-left transition-all flex items-center gap-2.5 active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400 scale-[1.02]'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-rose-400'
                      }`}
                    >
                      <span className="text-xl shrink-0">{dt.icon}</span>
                      <div className="truncate">
                        <div className="text-xs font-black truncate">{dt.label}</div>
                        <div className={`text-[10px] font-medium truncate ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                          {dt.hindi}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Action Plan & Routing: Store Tailor vs Vendor RTV */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-amber-500" />
                <span>Action Plan & Routing</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSeverity('minor');
                    setActionPlan('local_repair');
                  }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    severity === 'minor'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Store Tailor Repair</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSeverity('major');
                    setActionPlan('rtv_vendor');
                  }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    severity === 'major'
                      ? 'bg-rose-600 text-white font-black shadow-sm ring-1 ring-rose-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Vendor RTV Return</span>
                </button>
              </div>
            </div>

            {/* 4. Collapsible Drawer: Add Note / Photo (Optional) */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => setShowOptionalDetails(!showOptionalDetails)}
                className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>{showOptionalDetails ? 'Hide Additional Details' : 'Add Note / Photo Proof (Optional)'}</span>
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-normal">
                  {photoPreview ? '📷 Photo Attached • ' : ''}
                  {showOptionalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {showOptionalDetails && (
                <div className="p-3 bg-white dark:bg-slate-900 space-y-2.5 border-t border-slate-200 dark:border-slate-800 animate-in fade-in text-xs">
                  {/* Defect Description */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Specific Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Left runner broken, 2-inch tear near side seam"
                      value={defectDesc}
                      onChange={(e) => setDefectDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    />
                  </div>

                  {/* Photo Proof */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Garment Photo Proof</label>
                    {photoPreview ? (
                      <div className="relative inline-block rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
                        <img src={photoPreview} alt="Defect proof" className="w-32 h-24 object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotoPreview(null)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-rose-400 text-slate-600 dark:text-slate-400 font-bold text-[11px] flex items-center gap-1.5 transition-all"
                      >
                        <Camera className="w-3.5 h-3.5 text-rose-500" />
                        <span>Take Photo with Camera</span>
                      </button>
                    )}
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Sticky 2nd Tap: Big Red Quarantine Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading || (!barcode && !articleNo)}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Quarantining Garment...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Quarantine & Save Garment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
