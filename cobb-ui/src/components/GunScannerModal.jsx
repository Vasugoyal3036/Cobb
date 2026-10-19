import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Barcode, 
  Search, 
  X, 
  Zap, 
  Sparkles, 
  Copy, 
  Check, 
  ShoppingCart, 
  AlertCircle, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  Flame, 
  TrendingUp, 
  Clock, 
  Layers, 
  Scissors, 
  Lock, 
  Share2, 
  Camera, 
  CheckCircle2,
  RefreshCw,
  Tag,
  Package,
  Boxes,
  HelpCircle
} from 'lucide-react';
import axios from 'axios';
import { playBarcodeBeep, playScanErrorBeep, getSoundSettings, saveSoundSettings } from '../utils/sound';

export const getColorDot = (colorName) => {
  const c = String(colorName || '').toLowerCase();
  if (c.includes('black')) return '#0f172a';
  if (c.includes('white')) return '#f8fafc';
  if (c.includes('navy') || c.includes('blue')) return '#2563eb';
  if (c.includes('red') || c.includes('maroon') || c.includes('burgundy') || c.includes('wine')) return '#e11d48';
  if (c.includes('green') || c.includes('olive') || c.includes('pista') || c.includes('mint')) return '#16a34a';
  if (c.includes('yellow') || c.includes('mustard')) return '#ca8a04';
  if (c.includes('grey') || c.includes('gray')) return '#64748b';
  if (c.includes('brown') || c.includes('beige') || c.includes('khaki') || c.includes('tan') || c.includes('camel')) return '#d97706';
  if (c.includes('pink') || c.includes('peach') || c.includes('rose')) return '#ec4899';
  if (c.includes('purple') || c.includes('violet') || c.includes('lavender')) return '#9333ea';
  if (c.includes('orange') || c.includes('rust')) return '#ea580c';
  return '#3b82f6';
};

const SAMPLE_ARTICLES = ['FSRE', 'TSBW', 'CFAJ', 'JSBL', 'CAS2021', 'TSLBT'];

const GunScannerModal = ({
  isOpen,
  onClose,
  API_BASE = '',
  inventory = [],
  liveBills = [],
  activeStore = 'DEMO_STORE_001',
  formatCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`,
  darkMode = true,
  setActiveTab
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedColor, setSelectedColor] = useState('ALL');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [recentScans, setRecentScans] = useState(() => {
    try {
      const saved = sessionStorage.getItem('cobb_gun_recent_scans');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(() => getSoundSettings().soundEnabled);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isGunLaserFired, setIsGunLaserFired] = useState(false);

  const inputRef = useRef(null);
  const scannerBufferRef = useRef({ buffer: '', lastKeyTime: 0 });
  const videoRef = useRef(null);

  // Toggle sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    saveSoundSettings({ soundEnabled: next });
  };

  // Keep recent scans persisted in session
  useEffect(() => {
    try {
      sessionStorage.setItem('cobb_gun_recent_scans', JSON.stringify(recentScans.slice(0, 10)));
    } catch {}
  }, [recentScans]);

  // Focus input automatically on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    } else {
      setShowCamera(false);
    }
  }, [isOpen]);

  // Set default color when scan result changes
  useEffect(() => {
    if (scanResult) {
      setSelectedColor(scanResult.color || 'ALL');
      const matched = scanResult.variants?.find(v => v.barcode === scanResult.scannedBarcode) || scanResult.variants?.[0] || null;
      setSelectedVariant(matched);
    } else {
      setSelectedVariant(null);
    }
  }, [scanResult]);

  // Main Search / Barcode Scan Logic
  const handlePerformScan = useCallback(async (queryOverride = null) => {
    const rawQ = (typeof queryOverride === 'string' && queryOverride.trim() ? queryOverride : (inputRef.current?.value || query || '')).trim();
    if (!rawQ) return;

    setIsLoading(true);
    setErrorMessage(null);
    setIsGunLaserFired(true);
    setTimeout(() => setIsGunLaserFired(false), 400);

    let resultData = null;
    const qLower = rawQ.toLowerCase();

    // 1. First attempt: Quick-Scan API (handles local SQL backend & Phone Link via SaaS Interceptor)
    try {
      const endpoint = API_BASE 
        ? `${API_BASE}/api/inventory/quick-scan?q=${encodeURIComponent(rawQ)}` 
        : `/api/inventory/quick-scan?q=${encodeURIComponent(rawQ)}`;
      const res = await axios.get(endpoint, { timeout: 5000 });
      if (res?.data && res.data.success) {
        resultData = res.data;
      }
    } catch (err) {
      // Fall through to client-side catalog matching
    }

    // 2. Client-side Search in Inventory Catalog (2,000 real store items)
    if (!resultData && Array.isArray(inventory) && inventory.length > 0) {
      // Try exact barcode / SKU / ArticleNo first
      let matched = inventory.filter(item => {
        const sku = String(item.SKU || item.barcode || item.product_Code || '').trim().toLowerCase();
        const art = String(item.ArticleNo || item.articleNo || '').trim().toLowerCase();
        return sku === qLower || art === qLower;
      });

      // If no exact match, try Article prefix or ItemName match
      if (matched.length === 0) {
        matched = inventory.filter(item => {
          const art = String(item.ArticleNo || item.articleNo || '').trim().toLowerCase();
          const name = String(item.ItemName || item.itemName || '').trim().toLowerCase();
          const sku = String(item.SKU || item.barcode || '').trim().toLowerCase();
          return (art && art.startsWith(qLower)) || (name && name.includes(qLower)) || (sku && sku.includes(qLower));
        });
      }

      if (matched.length > 0) {
        const targetArticle = matched[0].ArticleNo || matched[0].articleNo;
        const allVariants = inventory.filter(item => (item.ArticleNo || item.articleNo) === targetArticle);
        const variantsList = allVariants.length > 0 ? allVariants : matched;
        const first = variantsList[0];
        const itemName = first.ItemName || first.itemName || first.ProductType || targetArticle;
        const isBlazer = String(itemName).toUpperCase().includes('BLAZER') || String(first.ProductType || '').toUpperCase().includes('BLAZER') || String(targetArticle).toUpperCase().startsWith('BLZ');
        const sectionName = isBlazer ? 'BLAZERS & JACKETS' : (first.ProductType || first.sectionName || 'Apparel');
        const subSectionName = first.subSectionName || (isBlazer ? 'EXECUTIVE BLAZER' : '');
        const totalStock = variantsList.reduce((sum, it) => sum + Math.max(0, Number(it.CurrentStock || it.stock || 0)), 0);

        // Group by Color
        const colorMap = {};
        variantsList.forEach(item => {
          const clr = (item.Color || item.color || 'Standard').trim();
          if (!colorMap[clr]) colorMap[clr] = { color: clr, totalStock: 0, sizes: [] };
          const stockNum = Math.max(0, Number(item.CurrentStock || item.stock || 0));
          colorMap[clr].totalStock += stockNum;
          colorMap[clr].sizes.push({
            size: (item.Size || item.size || 'Standard').trim(),
            stock: stockNum,
            barcode: item.SKU || item.barcode || ''
          });
        });

        // Group sizes
        const sizeMap = {};
        variantsList.forEach(item => {
          const sz = (item.Size || item.size || 'Standard').trim();
          if (!sizeMap[sz]) sizeMap[sz] = { size: sz, stock: 0, barcode: item.SKU || item.barcode || '' };
          sizeMap[sz].stock += Math.max(0, Number(item.CurrentStock || item.stock || 0));
        });

        // Determine MRP
        let resolvedMrp = Number(first.mrp || first.MRP || 0);
        if (!resolvedMrp && Array.isArray(liveBills)) {
          for (const b of liveBills) {
            const bi = (b.Items || []).find(it => it.ArticleNo === targetArticle || it.Barcode === rawQ);
            if (bi && (bi.MRP || bi.NetPrice)) {
              resolvedMrp = Number(bi.MRP || bi.NetPrice);
              break;
            }
          }
        }
        if (!resolvedMrp) {
          resolvedMrp = isBlazer ? 4999 : 1499;
        }

        const scannedVariant = variantsList.find(it => {
          const s = String(it.SKU || it.barcode || '').trim().toLowerCase();
          return s === qLower;
        }) || variantsList[0];

        resultData = {
          success: true,
          articleNo: targetArticle,
          itemName: itemName,
          sectionName: sectionName,
          subSectionName: subSectionName,
          color: scannedVariant?.Color || scannedVariant?.color || Object.keys(colorMap)[0] || 'Standard',
          mrp: resolvedMrp,
          totalStock: totalStock,
          sizes: Object.values(sizeMap),
          colors: Object.values(colorMap),
          scannedBarcode: rawQ,
          variants: variantsList.map(v => ({
            barcode: v.SKU || v.barcode || '',
            articleNo: targetArticle,
            itemName: itemName,
            color: v.Color || v.color || 'Standard',
            size: v.Size || v.size || 'Standard',
            mrp: Number(v.mrp || v.MRP || resolvedMrp),
            stock: Math.max(0, Number(v.CurrentStock || v.stock || 0))
          }))
        };
      }
    }

    // 3. Client-side Search in Live Bills (find items from counter sales)
    if (!resultData && Array.isArray(liveBills) && liveBills.length > 0) {
      let matchedBillItem = null;
      for (const bill of liveBills) {
        if (Array.isArray(bill.Items)) {
          for (const item of bill.Items) {
            const bcode = String(item.Barcode || '').trim().toLowerCase();
            const artNo = String(item.ArticleNo || '').trim().toLowerCase();
            const artName = String(item.ArticleName || '').trim().toLowerCase();
            if (bcode === qLower || artNo === qLower || artNo.startsWith(qLower) || artName.includes(qLower)) {
              matchedBillItem = item;
              break;
            }
          }
        }
        if (matchedBillItem) break;
      }

      if (matchedBillItem) {
        const targetArticle = matchedBillItem.ArticleNo || rawQ;
        const itemName = matchedBillItem.ArticleName || targetArticle;
        const isBlazer = String(itemName).toUpperCase().includes('BLAZER') || String(matchedBillItem.Category || '').toUpperCase().includes('BLAZER') || String(targetArticle).toUpperCase().startsWith('BLZ');
        const sectionName = isBlazer ? 'BLAZERS & JACKETS' : (matchedBillItem.Category || 'Apparel');
        const subSectionName = matchedBillItem.SubCategory || (isBlazer ? 'EXECUTIVE BLAZER' : '');
        const mrp = Number(matchedBillItem.MRP || matchedBillItem.NetPrice || (isBlazer ? 4999 : 1499));
        const color = matchedBillItem.Color || 'Standard';
        const size = matchedBillItem.Size || 'Standard';

        resultData = {
          success: true,
          articleNo: targetArticle,
          itemName: itemName,
          sectionName: sectionName,
          subSectionName: subSectionName,
          color: color,
          mrp: mrp,
          totalStock: 5,
          scannedBarcode: matchedBillItem.Barcode || rawQ,
          colors: [
            {
              color: color,
              totalStock: 5,
              sizes: [{ size: size, stock: 5, barcode: matchedBillItem.Barcode || rawQ }]
            }
          ],
          sizes: [
            { size: size, stock: 5, barcode: matchedBillItem.Barcode || rawQ }
          ],
          variants: [
            {
              barcode: matchedBillItem.Barcode || rawQ,
              articleNo: targetArticle,
              itemName: itemName,
              color: color,
              size: size,
              mrp: mrp,
              stock: 5
            }
          ]
        };
      }
    }

    // 4. Sample Chips Demo Data ONLY for recognized sample chips
    // NEVER apply mock fallback for arbitrary unlisted barcodes!
    const upperQ = rawQ.toUpperCase();
    if (!resultData && SAMPLE_ARTICLES.includes(upperQ)) {
      const sampleArt = upperQ;
      let mockName = 'Casual Fit Apparel';
      let mockSec = 'APPAREL';
      let mockSub = '';
      let mockMrp = 1499;

      if (sampleArt.startsWith('BLZ') || sampleArt === 'CFAJ') {
        mockName = 'Executive Slim Fit Italian Blazer';
        mockSec = 'BLAZERS & JACKETS';
        mockSub = 'SUITS & BLAZERS';
        mockMrp = 4999;
      } else if (sampleArt === 'FSRE' || sampleArt.startsWith('SHR')) {
        mockName = 'Pure Linen Semi-Formal Shirt';
        mockSec = 'SHIRTS';
        mockSub = 'CASUAL FULL SL';
        mockMrp = 1899;
      } else if (sampleArt === 'TSBW') {
        mockName = 'Formal Slim Fit Cotton Shirt';
        mockSec = 'SHIRTS';
        mockSub = 'FORMAL FULL SL';
        mockMrp = 1899;
      } else if (sampleArt === 'JSBL') {
        mockName = 'Dark Blue Washed Comfort Denim';
        mockSec = 'JEANS';
        mockSub = 'SLIM FIT DENIM';
        mockMrp = 2799;
      } else if (sampleArt === 'CAS2021') {
        mockName = 'Fine Compact Cotton Chino Trouser';
        mockSec = 'TROUSERS';
        mockSub = 'FLAT FRONT CHINO';
        mockMrp = 2199;
      }

      resultData = {
        success: true,
        articleNo: sampleArt,
        itemName: mockName,
        sectionName: mockSec,
        subSectionName: mockSub,
        color: 'NAVY BLUE',
        mrp: mockMrp,
        totalStock: 34,
        soldToday: 2,
        soldLast7Days: 9,
        soldLast30Days: 28,
        sizes: [
          { size: '38', stock: 4, barcode: `${sampleArt}-38` },
          { size: '39', stock: 8, barcode: `${sampleArt}-39` },
          { size: '40', stock: 12, barcode: `${sampleArt}-40` },
          { size: '42', stock: 7, barcode: `${sampleArt}-42` },
          { size: '44', stock: 3, barcode: `${sampleArt}-44` }
        ],
        colors: [
          {
            color: 'NAVY BLUE',
            totalStock: 18,
            sizes: [
              { size: '38', stock: 2, barcode: `${sampleArt}-NV-38` },
              { size: '39', stock: 4, barcode: `${sampleArt}-NV-39` },
              { size: '40', stock: 6, barcode: `${sampleArt}-NV-40` },
              { size: '42', stock: 4, barcode: `${sampleArt}-NV-42` },
              { size: '44', stock: 2, barcode: `${sampleArt}-NV-44` }
            ]
          },
          {
            color: 'BLACK',
            totalStock: 16,
            sizes: [
              { size: '38', stock: 2, barcode: `${sampleArt}-BK-38` },
              { size: '39', stock: 4, barcode: `${sampleArt}-BK-39` },
              { size: '40', stock: 6, barcode: `${sampleArt}-BK-40` },
              { size: '42', stock: 3, barcode: `${sampleArt}-BK-42` },
              { size: '44', stock: 1, barcode: `${sampleArt}-BK-44` }
            ]
          }
        ],
        scannedBarcode: rawQ,
        variants: [
          { barcode: `${sampleArt}-NV-40`, articleNo: sampleArt, itemName: mockName, color: 'NAVY BLUE', size: '40', mrp: mockMrp, stock: 6 }
        ]
      };
    }

    if (resultData) {
      playBarcodeBeep();
      setScanResult(resultData);
      setErrorMessage(null);

      // Add to recent scans list without duplicates
      setRecentScans(prev => {
        const filtered = prev.filter(item => item.articleNo !== resultData.articleNo);
        return [{
          articleNo: resultData.articleNo,
          itemName: resultData.itemName,
          mrp: resultData.mrp,
          totalStock: resultData.totalStock,
          color: resultData.color,
          scannedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }, ...filtered].slice(0, 8);
      });
    } else {
      playScanErrorBeep();
      setScanResult(null);
      setErrorMessage(`No article or SKU matches "${rawQ}". Verify barcode or try article prefix.`);
    }

    setIsLoading(false);
    // Keep focus on input for next scan
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 60);
  }, [query, API_BASE, inventory]);

  // Global Hardware Scanner Listener while modal is open (HID Wedge Burst Detection)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Close on Escape or F3 toggle
      if (e.key === 'Escape' || e.key === 'F3') {
        e.preventDefault();
        onClose();
        return;
      }

      // Enter key triggers scan if focused on input or buffer has content
      if (e.key === 'Enter') {
        const buf = scannerBufferRef.current.buffer.trim();
        if (buf.length >= 3) {
          e.preventDefault();
          setQuery(buf);
          handlePerformScan(buf);
          scannerBufferRef.current.buffer = '';
        }
        return;
      }

      // Hardware Barcode Scanner burst detection (< 55ms between keys)
      const now = Date.now();
      const diff = now - scannerBufferRef.current.lastKeyTime;
      scannerBufferRef.current.lastKeyTime = now;

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (diff > 120) {
          scannerBufferRef.current.buffer = e.key;
        } else {
          scannerBufferRef.current.buffer += e.key;
        }

        // Auto-detect rapid burst from physical handheld scanner
        if (scannerBufferRef.current.buffer.length >= 4 && diff < 55) {
          if (document.activeElement !== inputRef.current) {
            inputRef.current?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePerformScan]);

  // Copy helper
  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Add Scanned Variant to Speed Billing Cart
  const handleAddToSpeedBilling = (variant = null) => {
    const v = variant || selectedVariant || scanResult?.variants?.[0];
    if (!v && !scanResult) return;

    const itemToAdd = {
      barcode: v?.barcode || scanResult.scannedBarcode || scanResult.articleNo,
      name: scanResult.itemName || v?.itemName || scanResult.articleNo,
      size: v?.size || 'Standard',
      category: scanResult.sectionName || 'Apparel',
      mrp: Number(v?.mrp || scanResult.mrp || 1499),
      stock: v?.stock ?? scanResult.totalStock ?? 10
    };

    // Dispatch event to Speed Billing POS
    window.dispatchEvent(new CustomEvent('cobb_speed_add_item', { detail: { item: itemToAdd } }));
    
    // Jump to Speed Billing tab if provided
    if (typeof setActiveTab === 'function') {
      setActiveTab('speed_billing');
    }

    onClose();
  };

  // Generate WhatsApp formatted quote for customer
  const handleShareQuote = () => {
    if (!scanResult) return;
    const mrp = Number(scanResult.mrp || 0);
    const b3Eff = Math.round((mrp * 3 * 0.3) / 3);
    const flat60 = Math.round(mrp * 0.4);
    const flat40 = Math.round(mrp * 0.6);

    const text = `*COBB ITALY - ARTICLE QUOTE*\n` +
      `🏷️ *Article:* ${scanResult.articleNo}\n` +
      `👔 *Item:* ${scanResult.itemName}\n` +
      `💰 *MRP:* ₹${mrp.toLocaleString('en-IN')}\n\n` +
      `*Active Floor Offers:*\n` +
      `• Buy 3 @ 70% Off: *₹${b3Eff.toLocaleString('en-IN')} / piece* (Pay ₹${Math.round(mrp * 3 * 0.3).toLocaleString('en-IN')} for 3)\n` +
      `• Flat 60% Off: *₹${flat60.toLocaleString('en-IN')}*\n` +
      `• Flat 40% Off: *₹${flat40.toLocaleString('en-IN')}*\n\n` +
      `📦 In Stock at Cobb Store!`;

    navigator.clipboard.writeText(text);
    setCopiedField('whatsapp');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Customer 2-hour hold trigger
  const handleHoldArticle = () => {
    if (!scanResult) return;
    const holdDetail = {
      articleNo: scanResult.articleNo,
      itemName: scanResult.itemName,
      size: selectedVariant?.size || 'Standard',
      color: selectedColor !== 'ALL' ? selectedColor : scanResult.color,
      mrp: scanResult.mrp
    };
    window.dispatchEvent(new CustomEvent('cobb_create_hold', { detail: holdDetail }));
    setCopiedField('hold');
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isOpen) return null;

  // Active color groups
  const colorsList = scanResult?.colors && scanResult.colors.length > 0 
    ? scanResult.colors 
    : scanResult 
      ? [{ color: scanResult.color || 'Standard', totalStock: scanResult.totalStock || 0, sizes: scanResult.sizes || [] }] 
      : [];

  const displayedColors = selectedColor === 'ALL' 
    ? colorsList 
    : colorsList.filter(c => c.color === selectedColor);

  const numMrp = Number(scanResult?.mrp || 0);
  const flat40 = Math.round(numMrp * 0.6);
  const flat60 = Math.round(numMrp * 0.4);
  const b3Total = Math.round((numMrp * 3) * 0.3);
  const b3PerPc = Math.round(b3Total / 3);

  // Velocity status
  const sold7 = Number(scanResult?.soldLast7Days || 0);
  const isHighVelocity = sold7 >= 5 || Number(scanResult?.soldToday || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 relative ${
          darkMode ? 'bg-[#0d1322] border-slate-800 text-slate-100 shadow-blue-950/40' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Laser Sweep Effect on Scan Burst */}
        {isGunLaserFired && (
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse z-30 shadow-[0_0_15px_rgba(239,68,68,1)]" />
        )}

        {/* 1. TOP POPUP HEADER */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          darkMode ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Barcode className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <span>Handheld Gun Scanner</span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono text-xs font-black">
                    F3
                  </span>
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  HID Laser Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Instant barcode lookup, color &amp; size matrix, store stock &amp; customer offer calculator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                soundEnabled 
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' 
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}
              title={soundEnabled ? 'Honeywell laser beep enabled (Click to mute)' : 'Sound muted (Click to unmute)'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Close Scanner Window (Esc or F3)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. SCANNER INPUT & QUICK ACTIONS BAR */}
        <div className={`p-4 sm:p-5 border-b shrink-0 ${
          darkMode ? 'bg-[#0a0f1d] border-slate-800/60' : 'bg-slate-50/70 border-slate-100'
        }`}>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center gap-2 pointer-events-none text-blue-500">
              <Barcode className="w-5 h-5 animate-pulse" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePerformScan(e.target.value || query || inputRef.current?.value);
                }
              }}
              placeholder="Pull trigger to scan barcode, or type Article No / SKU..."
              className={`w-full py-3 pl-12 pr-28 rounded-2xl font-mono text-sm sm:text-base font-bold tracking-wide border outline-none transition-all ${
                darkMode
                  ? 'bg-[#12192c] border-blue-500/30 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20'
                  : 'bg-white border-blue-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
              }`}
            />
            <div className="absolute right-2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setErrorMessage(null);
                    inputRef.current?.focus();
                  }}
                  className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handlePerformScan(query || inputRef.current?.value)}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Scan</span>
              </button>
            </div>
          </div>

          {/* Quick Demo Test Barcode Chips */}
          <div className="flex items-center justify-between flex-wrap gap-2 mt-2.5 px-0.5 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Try Sample:</span>
              {SAMPLE_ARTICLES.map((art) => (
                <button
                  key={art}
                  type="button"
                  onClick={() => {
                    setQuery(art);
                    handlePerformScan(art);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 font-mono text-[11px] font-bold cursor-pointer transition"
                >
                  {art}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-3">
              <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono font-bold">Enter</kbd> to lookup</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">Esc</kbd> to exit</span>
            </div>
          </div>
        </div>

        {/* 3. MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-bold text-sm">Scan Result Error</p>
                <p className="text-xs text-rose-200/80 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {scanResult ? (
            <div className="space-y-5">
              {/* SECTION A: HERO ARTICLE PROFILE CARD */}
              <div className={`p-4 sm:p-5 rounded-2xl border shadow-lg relative overflow-hidden ${
                darkMode ? 'bg-gradient-to-br from-[#12192d] via-[#0f1527] to-[#0a0f1d] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {/* Background ambient badge */}
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-4 opacity-5 pointer-events-none">
                  <Barcode className="w-56 h-56" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    {/* Category & Section */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        {scanResult.sectionName || 'APPAREL'}
                      </span>
                      {scanResult.subSectionName && (
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          &rsaquo; {scanResult.subSectionName}
                        </span>
                      )}
                      {isHighVelocity && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-400 fill-current" />
                          Floor Fast Mover
                        </span>
                      )}
                    </div>

                    {/* Article Code & Item Name */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                        {scanResult.articleNo}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleCopy(scanResult.articleNo, 'article')}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        title="Copy Article No"
                      >
                        {copiedField === 'article' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-sm font-semibold text-slate-400 mt-1">
                      {scanResult.itemName}
                    </p>

                    {scanResult.scannedBarcode && (
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        Scanned Tag: <span className="text-slate-300 font-bold">{scanResult.scannedBarcode}</span>
                      </p>
                    )}
                  </div>

                  {/* MRP & Stock Summary Box */}
                  <div className="flex items-center gap-3 md:gap-4 shrink-0">
                    <div className="p-3 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-right min-w-[130px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard MRP</span>
                      <span className="text-2xl font-black font-mono text-amber-400">
                        {formatCurrency(scanResult.mrp)}
                      </span>
                    </div>

                    <div className={`p-3 sm:p-4 rounded-xl border text-right min-w-[130px] ${
                      scanResult.totalStock > 5
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : scanResult.totalStock > 0
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">Store Stock</span>
                      <span className="text-2xl font-black font-mono">
                        {scanResult.totalStock} <span className="text-xs font-sans font-bold">pcs</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sales Velocity Stats Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-4 text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                      <span>Sold Today: <strong className="font-mono text-white">{scanResult.soldToday || 0}</strong></span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>7 Days: <strong className="font-mono text-white">{scanResult.soldLast7Days || 0}</strong></span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                      <span>30 Days: <strong className="font-mono text-white">{scanResult.soldLast30Days || 0}</strong></span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleShareQuote}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedField === 'whatsapp' ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'whatsapp' ? 'Quote Copied!' : 'Copy Customer Quote'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleHoldArticle}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedField === 'hold' ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'hold' ? 'Held for 2 Hours' : 'Hold Article'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION B: MULTI-COLOUR & MULTI-SIZE MATRIX GRID */}
              <div className={`p-4 sm:p-5 rounded-2xl border ${
                darkMode ? 'bg-[#0f1629] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                      Color &amp; Size Inventory Matrix
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {colorsList.length} Colourway{colorsList.length > 1 ? 's' : ''} in store
                  </span>
                </div>

                {/* Colour selection tabs */}
                {colorsList.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar mb-3">
                    <button
                      type="button"
                      onClick={() => setSelectedColor('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
                        selectedColor === 'ALL'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      All Colors ({scanResult.totalStock})
                    </button>

                    {colorsList.map((cGroup, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedColor(cGroup.color)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer border ${
                          selectedColor === cGroup.color
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-md'
                            : 'bg-slate-800/50 text-slate-400 border-slate-700/60 hover:text-white hover:border-slate-600'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/20 dark:border-white/20 shrink-0 shadow-xs"
                          style={{ backgroundColor: getColorDot(cGroup.color) }}
                        />
                        <span>{cGroup.color}</span>
                        <span className="font-mono text-[11px] opacity-75">({cGroup.totalStock})</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Size breakdown per color */}
                <div className="space-y-3">
                  {displayedColors.map((cGroup, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-black/20 dark:border-white/20 shrink-0 shadow-xs"
                            style={{ backgroundColor: getColorDot(cGroup.color) }}
                          />
                          <span className="font-black uppercase tracking-wide text-slate-200">
                            {cGroup.color}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {cGroup.totalStock} in stock
                        </span>
                      </div>

                      {/* Sizes grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {cGroup.sizes.map((s, sIdx) => {
                          const isMatched = scanResult.scannedBarcode && (s.barcode === scanResult.scannedBarcode);
                          const isSelected = selectedVariant?.barcode === s.barcode || (selectedVariant?.size === s.size && selectedVariant?.color === cGroup.color);

                          return (
                            <div
                              key={sIdx}
                              onClick={() => {
                                setSelectedVariant({
                                  barcode: s.barcode,
                                  articleNo: scanResult.articleNo,
                                  itemName: scanResult.itemName,
                                  color: cGroup.color,
                                  size: s.size,
                                  mrp: scanResult.mrp,
                                  stock: s.stock
                                });
                              }}
                              className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none ${
                                isSelected
                                  ? 'ring-2 ring-blue-500 bg-blue-600/20 border-blue-500 shadow-md'
                                  : isMatched
                                    ? 'ring-2 ring-emerald-500 bg-emerald-500/15 border-emerald-500'
                                    : s.stock > 0
                                      ? 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/70 text-slate-200'
                                      : 'bg-slate-900/30 border-slate-800 text-slate-600 opacity-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs">{s.size}</span>
                                {isMatched && (
                                  <span className="text-[9px] font-black uppercase text-emerald-400 px-1 rounded bg-emerald-500/20">
                                    Scanned
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-[10px] text-slate-400">Stock:</span>
                                <span className={`font-mono text-xs font-black ${
                                  s.stock > 4 
                                    ? 'text-emerald-400' 
                                    : s.stock > 0 
                                      ? 'text-amber-400' 
                                      : 'text-rose-500'
                                }`}>
                                  {s.stock} pcs
                                </span>
                              </div>

                              {s.barcode && (
                                <span className="font-mono text-[9px] text-slate-500 truncate mt-1" title={s.barcode}>
                                  {s.barcode}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION C: COUNTER PROMO & DISCOUNT CALCULATOR */}
              <div className={`p-4 sm:p-5 rounded-2xl border ${
                darkMode ? 'bg-[#0f1629] border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                      Live Cobb Retail Promotion Calculator
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">
                    Instant customer billing price
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Promo 1: Buy 3 @ 70% Off */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                        <span>Buy 3 @ 70% Off</span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-[10px]">B3_70</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">3 Pcs @ MRP ₹{(numMrp * 3).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-purple-500/20 flex items-baseline justify-between">
                      <span className="text-xs text-slate-300">Effective / pc:</span>
                      <span className="text-lg font-black font-mono text-purple-300">
                        ₹{b3PerPc.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                      Customer Pays ₹{b3Total.toLocaleString('en-IN')} (Saves ₹{((numMrp * 3) - b3Total).toLocaleString('en-IN')})
                    </p>
                  </div>

                  {/* Promo 2: Flat 60% Off */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-500/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-blue-300">
                        <span>Flat 60% Off</span>
                        <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-[10px]">FLAT60</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Single Piece Discount</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-blue-500/20 flex items-baseline justify-between">
                      <span className="text-xs text-slate-300">Final Price:</span>
                      <span className="text-lg font-black font-mono text-blue-300">
                        ₹{flat60.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                      Customer Saves ₹{(numMrp - flat60).toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Promo 3: Flat 40% Off */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                        <span>Flat 40% Off</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-[10px]">FLAT40</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Single Piece Regular</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-amber-500/20 flex items-baseline justify-between">
                      <span className="text-xs text-slate-300">Final Price:</span>
                      <span className="text-lg font-black font-mono text-amber-300">
                        ₹{flat40.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                      Customer Saves ₹{(numMrp - flat40).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : !errorMessage && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 animate-pulse">
                <Barcode className="w-8 h-8" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-200">Point Scanner Gun &amp; Pull Trigger</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Hardware barcode gun automatically reads tags into this screen. You can also type an Article No (e.g. FSRE, TSBW) or SKU above.
                </p>
              </div>
            </div>
          )}

          {/* SECTION D: RECENT SCANS SESSION TRAY */}
          {recentScans.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Recent Scans This Session ({recentScans.length})
                </span>
                <button
                  type="button"
                  onClick={() => setRecentScans([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                >
                  Clear History
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {recentScans.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(r.articleNo);
                      handlePerformScan(r.articleNo);
                    }}
                    className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-left shrink-0 min-w-[140px] transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-blue-400">{r.articleNo}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{r.scannedAt}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 truncate max-w-[130px] font-medium mt-0.5">{r.itemName}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                      <span>₹{Number(r.mrp || 0).toLocaleString('en-IN')}</span>
                      <span className="text-emerald-400 font-bold">{r.totalStock} in stock</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. MODAL FOOTER ACTIONS */}
        <div className={`p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
          darkMode ? 'border-slate-800/80 bg-slate-900/90' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Gun Scanner Ready • Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-amber-400 font-bold">F3</kbd> to toggle</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {scanResult && (
              <button
                type="button"
                onClick={() => handleAddToSpeedBilling()}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Add to Speed POS Cart</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Close [Esc]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GunScannerModal;
