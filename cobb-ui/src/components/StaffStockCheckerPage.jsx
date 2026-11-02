import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Camera,
  Barcode,
  Search,
  X,
  Check,
  Copy,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Zap,
  Sparkles,
  Package,
  Layers,
  LayoutGrid,
  List,
  Smartphone,
  ArrowLeft,
  ChevronRight,
  SlidersHorizontal,
  Share2,
  Tag,
  Info
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { playSound } from '../utils/sound';
import { getColorDot } from './GunScannerModal';

const RECENT_SCANS_KEY = 'cobb_staff_stock_recent_scans';

export default function StaffStockCheckerPage({
  onClose,
  API_BASE = '',
  activeStore = 'DEMO_STORE_001',
  darkMode = true
}) {
  // Search & Lookup State
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [stockData, setStockData] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'matrix'
  const [copiedBarcode, setCopiedBarcode] = useState(null);

  // Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'

  // Recent Scans from LocalStorage
  const [recentScans, setRecentScans] = useState(() => {
    try {
      const saved = localStorage.getItem(RECENT_SCANS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const html5QrCodeRef = useRef(null);
  const inputRef = useRef(null);
  const scannerContainerId = 'staff-camera-viewfinder';

  // Save to recent scans
  const saveToRecentScans = useCallback((item) => {
    if (!item?.articleNo) return;
    setRecentScans(prev => {
      const filtered = prev.filter(x => x.articleNo !== item.articleNo);
      const updated = [
        {
          articleNo: item.articleNo,
          itemName: item.itemName,
          mrp: item.mrp,
          totalStock: item.totalStock,
          scannedBarcode: item.scannedBarcode || item.matchedBarcode,
          timestamp: Date.now()
        },
        ...filtered
      ].slice(0, 8);
      try {
        localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed saving recent scan', e);
      }
      return updated;
    });
  }, []);

  // Main Stock Lookup Function
  const handleLookup = useCallback(async (searchQuery) => {
    const q = String(searchQuery || query || '').trim();
    if (!q) return;

    setLoading(true);
    setErrorMsg('');

    try {
      // Primary staff endpoint
      const endpoint = API_BASE
        ? `${API_BASE}/api/staff/stock-check?q=${encodeURIComponent(q)}`
        : `/api/staff/stock-check?q=${encodeURIComponent(q)}`;

      const res = await axios.get(endpoint, { timeout: 6000 });

      if (res.data && res.data.success) {
        setStockData(res.data);
        // Default to the matched garment's color, or first color
        const targetColor = res.data.matchedColor || res.data.colors?.[0]?.color || '';
        setSelectedColor(targetColor);
        saveToRecentScans(res.data);

        // Haptic feedback & soft beep
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([60, 40, 60]);
          }
          playSound('click');
        } catch {}
      } else {
        setErrorMsg(res.data?.message || `No Cobb article found matching "${q}"`);
        setStockData(null);
        try { playSound('error'); } catch {}
      }
    } catch (err) {
      console.error('[StaffStockCheck Error]', err);
      // Fallback: try quick-scan if staff endpoint failed
      try {
        const fallbackEndpoint = API_BASE
          ? `${API_BASE}/api/inventory/quick-scan?q=${encodeURIComponent(q)}`
          : `/api/inventory/quick-scan?q=${encodeURIComponent(q)}`;
        const fallbackRes = await axios.get(fallbackEndpoint, { timeout: 6000 });
        if (fallbackRes.data && fallbackRes.data.success) {
          setStockData(fallbackRes.data);
          setSelectedColor(fallbackRes.data.color || fallbackRes.data.colors?.[0]?.color || '');
          saveToRecentScans(fallbackRes.data);
          return;
        }
      } catch {}

      setErrorMsg(err.response?.data?.message || 'Network error looking up barcode. Check connection.');
      setStockData(null);
    } finally {
      setLoading(false);
    }
  }, [query, API_BASE, saveToRecentScans]);

  // Copy barcode to clipboard
  const handleCopyBarcode = (bcode) => {
    if (!bcode) return;
    try {
      navigator.clipboard.writeText(bcode);
      setCopiedBarcode(bcode);
      setTimeout(() => setCopiedBarcode(null), 2000);
    } catch {}
  };

  // Camera Barcode Scanning Management
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setIsCameraActive(true);

    // Give DOM a tick to render scannerContainerId div
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minEdge * 0.85),
              height: Math.floor(minEdge * 0.45) // Barcode format is wider than tall
            };
          },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
          ]
        };

        await html5QrCode.start(
          { facingMode: cameraFacing },
          config,
          async (decodedText) => {
            // Success scan
            const cleanBarcode = decodedText.trim();
            if (!cleanBarcode) return;

            // Stop camera immediately
            await stopCamera();

            // Audio & vibration
            try {
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([100]);
              }
              playSound('scan');
            } catch {}

            setQuery(cleanBarcode);
            handleLookup(cleanBarcode);
          },
          () => {
            // Frame scanning in progress
          }
        );

        // Check torch capability
        try {
          const stream = html5QrCode.getRunningTrackCameraCapabilities();
          if (stream && stream.torchFeature && stream.torchFeature().isSupported()) {
            setHasTorch(true);
          }
        } catch {}
      } catch (err) {
        console.error('Camera start failed:', err);
        setCameraError(err.message || 'Unable to access phone camera. Please grant camera permission.');
        setIsCameraActive(false);
      }
    }, 150);
  }, [cameraFacing, stopCamera, handleLookup]);

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Failed to toggle torch:', e);
    }
  };

  // Flip Camera Front/Back
  const toggleCameraFacing = async () => {
    await stopCamera();
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    setTimeout(() => {
      startCamera();
    }, 200);
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {}).then(() => {
          html5QrCodeRef.current?.clear();
        });
      }
    };
  }, []);

  // Compute selected color's sizes & cross-color availability
  const activeColorObj = useMemo(() => {
    if (!stockData?.colors || stockData.colors.length === 0) return null;
    return stockData.colors.find(c => c.color === selectedColor) || stockData.colors[0];
  }, [stockData, selectedColor]);

  // Unique list of all sizes in this article across all colors (for matrix view)
  const allArticleSizes = useMemo(() => {
    if (!stockData?.colors) return [];
    const sizeSet = new Set();
    stockData.colors.forEach(c => {
      (c.sizes || []).forEach(s => sizeSet.add(s.size));
    });
    return Array.from(sizeSet);
  }, [stockData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16 selection:bg-amber-500 selection:text-slate-950">
      {/* --- Sticky Top Header Bar --- */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 shadow-md shadow-amber-500/20">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-white">COBB STAFF</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
                Stock Checker
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Floor Quick Assist • Live SQL</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition-all active:scale-95"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>
      </header>

      {/* --- Main Mobile Content Container --- */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
        {/* --- Big Camera Scan Button & Search Form --- */}
        <div className="space-y-3">
          {/* 1-Tap Camera Scan Button */}
          <button
            onClick={startCamera}
            disabled={isCameraActive || loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:from-amber-600 hover:to-rose-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-rose-500/20 active:scale-98 transition-all disabled:opacity-50"
          >
            <Camera className="w-5 h-5 fill-current" />
            <span>Open Phone Camera Scanner</span>
          </button>

          {/* Barcode & Article No Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup(query);
            }}
            className="relative flex items-center"
          >
            <div className="absolute left-3.5 text-slate-400">
              <Barcode className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter barcode or article no (e.g. FSRE...)"
              className="w-full pl-10 pr-24 py-3 rounded-2xl bg-slate-900 border border-slate-700/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold placeholder:text-slate-500 text-white transition-all outline-none"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center gap-1 transition-all active:scale-95"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Find</span>
              </button>
            </div>
          </form>
        </div>

        {/* --- Error Banner --- */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Article / Barcode Not Found</div>
              <p className="text-[11px] opacity-90 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* --- Loading Indicator --- */}
        {loading && (
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <div className="text-xs font-bold text-slate-300">Searching Cobb Inventory...</div>
            <p className="text-[11px] text-slate-500">Retrieving all available colors and sizes</p>
          </div>
        )}

        {/* --- Scanned Article Details Card --- */}
        {stockData && !loading && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Article Top Bento Summary */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-850 border border-slate-700/80 shadow-2xl relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-black text-amber-400 tracking-wider">
                      {stockData.articleNo}
                    </span>
                    <button
                      onClick={() => handleCopyBarcode(stockData.articleNo)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Copy Article No"
                    >
                      {copiedBarcode === stockData.articleNo ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    {stockData.mrp > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-800 border border-slate-700 text-white">
                        ₹{Number(stockData.mrp).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-black text-white mt-1 leading-snug">
                    {stockData.itemName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {stockData.sectionName} {stockData.subSectionName ? `• ${stockData.subSectionName}` : ''}
                  </p>
                </div>

                {/* Stock Status Badge */}
                <div className="text-right shrink-0">
                  <div className={`px-3 py-1.5 rounded-2xl text-xs font-black inline-flex items-center gap-1.5 ${
                    stockData.totalStock > 0
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${stockData.totalStock > 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span>{stockData.totalStock} In Stock</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">
                    {stockData.colors?.length || 0} Color{(stockData.colors?.length || 0) === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              {/* B1G2 Promo / Realization Reminder */}
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Buy 1 Get 2 Free Applicable</span>
                </div>
                {stockData.scannedBarcode && (
                  <div className="text-slate-500 font-mono text-[10px]">
                    Scanned: {stockData.scannedBarcode}
                  </div>
                )}
              </div>
            </div>

            {/* View Mode Toggle: Color Tab vs Full Matrix */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select Garment Color
              </span>
              <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-xs">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>Color View</span>
                </button>
                <button
                  onClick={() => setViewMode('matrix')}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'matrix'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>All Matrix</span>
                </button>
              </div>
            </div>

            {/* --- Horizontal Color Selection Chips --- */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(stockData.colors || []).map((c) => {
                const isSelected = selectedColor === c.color;
                const dotColor = getColorDot(c.color);
                return (
                  <button
                    key={c.color}
                    onClick={() => {
                      setSelectedColor(c.color);
                      setViewMode('grid');
                      try { playSound('click'); } catch {}
                    }}
                    className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-slate-800 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span>{c.color}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      c.totalStock > 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {c.totalStock}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* --- View Mode 1: Color Specific Size Run Grid --- */}
            {viewMode === 'grid' && activeColorObj && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getColorDot(activeColorObj.color) }}
                    />
                    <span>{activeColorObj.color} Sizes</span>
                  </div>
                  <span>{activeColorObj.totalStock} available in this color</span>
                </div>

                {/* Size Chips Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(activeColorObj.sizes || []).map((sz) => {
                    const isOutOfStock = sz.stock <= 0;
                    const isLowStock = sz.stock === 1 || sz.stock === 2;
                    const isScannedPiece = stockData.scannedBarcode && (sz.barcode === stockData.scannedBarcode || sz.vendorEan === stockData.scannedBarcode);

                    return (
                      <div
                        key={sz.size}
                        className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                          isScannedPiece
                            ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                            : isOutOfStock
                            ? 'bg-slate-900/40 border-slate-800/80 opacity-60'
                            : isLowStock
                            ? 'bg-slate-900 border-amber-500/40'
                            : 'bg-slate-900 border-slate-700/70'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className={`text-lg font-black tracking-tight ${
                              isOutOfStock ? 'text-slate-500 line-through' : 'text-white'
                            }`}>
                              {sz.size}
                            </span>
                            {isScannedPiece && (
                              <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider mt-0.5">
                                Scanned Tag
                              </div>
                            )}
                          </div>

                          {/* Stock Status Badge */}
                          <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                            isOutOfStock
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isLowStock
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {isOutOfStock ? 'Out' : isLowStock ? `${sz.stock} Left!` : `${sz.stock} in stock`}
                          </div>
                        </div>

                        {/* Barcode & 1-Tap Copy */}
                        {sz.barcode && (
                          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span className="truncate pr-1 text-[10px]">{sz.barcode}</span>
                            <button
                              onClick={() => handleCopyBarcode(sz.barcode)}
                              className="p-1 rounded text-slate-400 hover:text-white"
                              title="Copy Barcode"
                            >
                              {copiedBarcode === sz.barcode ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* --- Cross-Color Helper: When a size is Out of Stock in this color --- */}
                {(() => {
                  const outSizes = (activeColorObj.sizes || []).filter(s => s.stock <= 0).map(s => s.size);
                  if (outSizes.length === 0) return null;

                  // Find other colors that have this size in stock
                  const crossAvail = [];
                  outSizes.forEach(sizeName => {
                    const otherColors = (stockData.colors || [])
                      .filter(c => c.color !== activeColorObj.color)
                      .map(c => {
                        const matchingSize = (c.sizes || []).find(s => s.size === sizeName && s.stock > 0);
                        return matchingSize ? { color: c.color, stock: matchingSize.stock } : null;
                      })
                      .filter(Boolean);

                    if (otherColors.length > 0) {
                      crossAvail.push({ size: sizeName, others: otherColors });
                    }
                  });

                  if (crossAvail.length === 0) return null;

                  return (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 mt-3">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>Customer Wants Another Size? In-Stock in other colors:</span>
                      </div>
                      <div className="space-y-1.5">
                        {crossAvail.map(({ size, others }) => (
                          <div key={size} className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                              Size {size}:
                            </span>
                            {others.map(o => (
                              <button
                                key={o.color}
                                onClick={() => setSelectedColor(o.color)}
                                className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1 transition-all"
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: getColorDot(o.color) }}
                                />
                                <span>{o.color} ({o.stock} pcs)</span>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* --- View Mode 2: All Colors & Sizes Matrix Table --- */}
            {viewMode === 'matrix' && (
              <div className="p-3.5 rounded-3xl bg-slate-900 border border-slate-800 overflow-x-auto space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    <span>Complete Style Matrix</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {allArticleSizes.length} Sizes • {stockData.colors?.length} Colors
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="py-2 px-2.5 font-bold text-slate-300">Color</th>
                        {allArticleSizes.map(sz => (
                          <th key={sz} className="py-2 px-2 text-center font-bold text-white">{sz}</th>
                        ))}
                        <th className="py-2 px-2 text-right font-bold text-slate-300">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(stockData.colors || []).map(c => (
                        <tr key={c.color} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-2.5 px-2.5 font-semibold text-white flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: getColorDot(c.color) }}
                            />
                            <span className="truncate max-w-[90px]">{c.color}</span>
                          </td>
                          {allArticleSizes.map(sz => {
                            const found = (c.sizes || []).find(s => s.size === sz);
                            const stock = found ? found.stock : 0;
                            return (
                              <td key={sz} className="py-2.5 px-2 text-center font-mono">
                                {stock > 0 ? (
                                  <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    {stock}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-2 text-right font-bold text-amber-400">
                            {c.totalStock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- Recent Searches / Floor Quick History --- */}
        {recentScans.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-bold uppercase tracking-wider text-slate-400">Recent Floor Checks</span>
              <button
                onClick={() => {
                  setRecentScans([]);
                  localStorage.removeItem(RECENT_SCANS_KEY);
                }}
                className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors"
              >
                Clear History
              </button>
            </div>

            <div className="space-y-1.5">
              {recentScans.map((item) => (
                <button
                  key={item.articleNo}
                  onClick={() => {
                    setQuery(item.articleNo);
                    handleLookup(item.articleNo);
                  }}
                  className="w-full p-2.5 rounded-2xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700 text-left flex items-center justify-between transition-all active:scale-98"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-slate-800 text-amber-400 shrink-0">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{item.articleNo}</span>
                        {item.mrp && <span className="text-slate-400 font-normal">₹{item.mrp}</span>}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{item.itemName}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-bold ${
                      item.totalStock > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {item.totalStock > 0 ? `${item.totalStock} in stock` : 'Out of stock'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- Fullscreen Camera Scanner Modal Overlay --- */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between animate-in fade-in duration-200">
          {/* Camera Viewfinder Header */}
          <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">Scan Cobb Barcode</span>
            </div>

            <div className="flex items-center gap-2">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    torchOn
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="Toggle Flashlight"
                >
                  <Zap className="w-4 h-4 fill-current" />
                </button>
              )}

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all"
                title="Switch Front/Back Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all"
                title="Close Scanner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Camera Viewport with Aiming Reticle */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
            <div id={scannerContainerId} className="w-full max-w-md h-full object-cover"></div>

            {/* Target Reticle Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="w-64 h-36 border-2 border-amber-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                {/* Red Laser Sweep Line Animation */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse" />
                <div className="absolute -bottom-7 left-0 right-0 text-center text-[11px] font-bold text-amber-300 bg-slate-900/80 px-2 py-1 rounded-full mx-auto w-fit">
                  Align price tag barcode inside box
                </div>
              </div>
            </div>

            {/* Camera Error Display */}
            {cameraError && (
              <div className="absolute inset-x-4 top-20 p-4 rounded-2xl bg-rose-500/90 text-white text-xs space-y-2 z-20">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Camera Access Error</span>
                </div>
                <p>{cameraError}</p>
                <button
                  onClick={stopCamera}
                  className="px-3 py-1.5 rounded-xl bg-white text-slate-950 font-bold"
                >
                  Close & Type Barcode
                </button>
              </div>
            )}
          </div>

          {/* Camera Bottom Controls */}
          <div className="p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-center">
            <button
              onClick={stopCamera}
              className="px-6 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95"
            >
              Cancel Camera Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
