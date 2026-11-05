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
  FileText
} from 'lucide-react';
import axios from 'axios';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  DEFECT_TYPES,
  generateBarcodeSvg,
  triggerDamageSlipPrint
} from '../utils/thermalTagPrinter';

const API_BASE = 'http://localhost:5000';

export default function ReportDefectModal({
  isOpen,
  onClose,
  initialBarcode = '',
  initialArticle = null,
  activeStore = 'DEMO_STORE_001',
  userRole = 'staff',
  onQuarantineSuccess,
  onOpenScanner
}) {
  const [barcode, setBarcode] = useState('');
  const [articleNo, setArticleNo] = useState('');
  const [articleName, setArticleName] = useState('');
  const [category, setCategory] = useState('APPAREL');
  const [size, setSize] = useState('M');
  const [color, setColor] = useState('Standard');
  const [mrp, setMrp] = useState(1999);
  const [defectType, setDefectType] = useState('ZIPPER');
  const [defectDesc, setDefectDesc] = useState('');
  const [severity, setSeverity] = useState('major'); // 'minor' | 'major'
  const [actionPlan, setActionPlan] = useState('rtv_vendor'); // 'local_repair' | 'rtv_vendor'
  const [reportedBy, setReportedBy] = useState('Floor Staff');
  const [source, setSource] = useState('Floor Mobile Scan');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [printSlipOnSubmit, setPrintSlipOnSubmit] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const photoInputRef = useRef(null);

  const targetStoreId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01')
    ? 'DEMO_STORE_001'
    : activeStore;

  // Initialize data on modal open
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setSuccessMsg('');

    const code = (initialBarcode || initialArticle?.scannedBarcode || initialArticle?.barcode || '').trim();
    setBarcode(code);

    if (initialArticle) {
      setArticleNo(initialArticle.articleNo || code || 'COBB-ART');
      setArticleName(initialArticle.itemName || initialArticle.articleName || 'Cobb Apparel');
      setCategory(initialArticle.sectionName || initialArticle.category || 'MENSWEAR');
      setSize(initialArticle.size || 'M');
      setColor(initialArticle.color || 'Standard');
      setMrp(Number(initialArticle.mrp || 1999));
    } else if (code) {
      // Auto-lookup barcode if article was not provided
      fetchItemDetails(code);
    }
  }, [isOpen, initialBarcode, initialArticle]);

  // Lookup barcode details from API or Firestore
  const fetchItemDetails = async (code) => {
    if (!code) return;
    setLookupLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/inventory/quick-scan?q=${encodeURIComponent(code)}`);
      if (res.data?.success && Array.isArray(res.data.variants) && res.data.variants.length > 0) {
        const item = res.data.variants.find(v => v.barcode === code) || res.data.variants[0];
        setArticleNo(item.articleNo || code);
        setArticleName(item.itemName || 'Cobb Apparel');
        setCategory(item.sectionName || 'MENSWEAR');
        setSize(item.size || 'M');
        setColor(item.color || 'Standard');
        setMrp(Number(item.mrp || 1999));
      }
    } catch (e) {
      console.warn('Quick scan lookup failed, fallback to basic fields', e.message);
    } finally {
      setLookupLoading(false);
    }
  };

  if (!isOpen) return null;

  // Barcode SVG for preview
  const barcodeSvgHtml = generateBarcodeSvg(barcode, {
    width: 1.6,
    height: 34
  });

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

  // Submit and Quarantine Garment
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
      defectDesc: defectDesc.trim(),
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

      setSuccessMsg(`Item #${payload.articleNo} (${payload.size}) QUARANTINED in Damage Bin!`);

      // Optionally print thermal quarantine slip
      if (printSlipOnSubmit && createdDamage) {
        try {
          triggerDamageSlipPrint(createdDamage, { paperSize: '58mm' });
        } catch (printErr) {
          console.warn('Could not auto-print damage slip:', printErr);
        }
      }

      if (onQuarantineSuccess) {
        onQuarantineSuccess(createdDamage || payload);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Quarantine error:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to quarantine damaged item');
    } finally {
      setLoading(false);
    }
  };

  const selectedDefectInfo = DEFECT_TYPES.find(d => d.id === defectType) || DEFECT_TYPES[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden max-h-[94vh]">
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
                Removes item from sales floor & blocks accidental POS billing
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

        {/* Modal Body */}
        <form onSubmit={handleSubmitQuarantine} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Status Banners */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Barcode & Live Camera Trigger */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-rose-500" />
                <span>1. Scanned Barcode / Article</span>
              </label>
              {onOpenScanner && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenScanner();
                  }}
                  className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold flex items-center gap-1 transition-all"
                >
                  <Camera className="w-3 h-3" />
                  <span>Scan with Camera</span>
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scan or enter barcode (e.g. 0082...)"
                value={barcode}
                onChange={(e) => {
                  setBarcode(e.target.value);
                  if (e.target.value.length >= 8) {
                    fetchItemDetails(e.target.value);
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs font-bold text-slate-900 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => fetchItemDetails(barcode)}
                disabled={lookupLoading || !barcode}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-50"
              >
                {lookupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Lookup'}
              </button>
            </div>

            {/* Scannable Barcode SVG Preview */}
            {barcode && (
              <div className="pt-1 flex items-center justify-between">
                <div
                  className="bg-white p-1 rounded-md border border-slate-200 overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: barcodeSvgHtml }}
                />
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Article Code</div>
                  <div className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                    {articleNo || '—'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Garment Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500">Category / Item</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. SHIRT, DENIM"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold uppercase"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500">Size</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. 40 or 32"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold uppercase"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500">Color</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. NAVY, BLACK"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500">MRP (₹)</label>
              <input
                type="number"
                value={mrp}
                onChange={(e) => setMrp(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black text-rose-600 dark:text-rose-400"
              />
            </div>
          </div>

          {/* 3. Defect Category 1-Tap Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>2. Select Defect Reason</span>
              </label>
              <span className="text-[10px] text-rose-500 font-bold">{selectedDefectInfo.label}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {DEFECT_TYPES.map((dt) => {
                const isSelected = defectType === dt.id;
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => {
                      setDefectType(dt.id);
                      if (!defectDesc) {
                        setDefectDesc(dt.label);
                      }
                    }}
                    className={`p-2 rounded-xl text-left transition-all flex items-start gap-2 ${
                      isSelected
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 scale-101 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-rose-400'
                    }`}
                  >
                    <span className="text-base">{dt.icon}</span>
                    <div className="leading-tight">
                      <div className="text-[11px] font-bold">{dt.label}</div>
                      <div className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                        {dt.hindi}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Defect Description & Quick Tags */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1 block">
              Specific Defect Details / Note
            </label>
            <input
              type="text"
              placeholder="e.g. Left runner broken, 2-inch tear near side seam, grease spot"
              value={defectDesc}
              onChange={(e) => setDefectDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
            />
            <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
              {['Broken Runner', 'Open Stitch', 'Dye Stain', 'Button Missing', 'Box Cut', 'Loose Buckle'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setDefectDesc(tag)}
                  className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-700 transition-all font-medium"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Severity & Action Plan */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                Action Plan & Routing
              </div>
              <div className="text-[10px] text-slate-400">How should this piece be handled?</div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSeverity('minor');
                  setActionPlan('local_repair');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                  severity === 'minor'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                  severity === 'major'
                    ? 'bg-rose-600 text-white font-black shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Vendor Return (Cobb HO)</span>
              </button>
            </div>
          </div>

          {/* 6. Photo of Defect (Optional Phone Snap) */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-500" />
                <span>Attach Photo of Defect (Optional)</span>
              </label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all"
              >
                <Camera className="w-3 h-3" />
                <span>Take Photo</span>
              </button>
            </div>

            {photoPreview ? (
              <div className="relative inline-block mt-1">
                <img
                  src={photoPreview}
                  alt="Defect"
                  className="w-24 h-24 object-cover rounded-xl border-2 border-rose-500 shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white shadow hover:bg-rose-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400">
                Tap "Take Photo" to snap the torn stitch, zipper, or stain with phone camera
              </p>
            )}
          </div>

          {/* 7. Auto-Print Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="printSlipCheckbox"
              checked={printSlipOnSubmit}
              onChange={(e) => setPrintSlipOnSubmit(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
            />
            <label htmlFor="printSlipCheckbox" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Printer className="w-3.5 h-3.5 text-rose-500" />
              <span>Print 58mm Thermal "QUARANTINE" label to staple on garment</span>
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmitQuarantine}
            disabled={loading || lookupLoading}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition-all disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{loading ? 'Quarantining...' : 'Quarantine & Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

