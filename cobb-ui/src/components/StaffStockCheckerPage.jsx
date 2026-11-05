import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  Plus,
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
  Info,
  ScanLine,
  Focus,
  Image as ImageIcon,
  ChevronDown,
  Download,
  Percent,
  Coffee,
  Printer,
  ShieldAlert
} from 'lucide-react';
import {
  fetchTodayTeaRecord,
  logSalesmanTea,
  setSalesmanTeaCount,
  subscribeToTeaExpenses,
  DEFAULT_SALESMEN
} from '../utils/teaExpenses';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { playSound } from '../utils/sound';
import { isBarcodeDuplicate } from './tabs/PendingTagsTab';
import ThermalTagModal from './ThermalTagModal';
import ReportDefectModal from './ReportDefectModal';
import { getColorDot } from './GunScannerModal';
import {
  isNativeBarcodeDetectorSupported,
  getNativeBarcodeDetector,
  recognizeNumbersFromVideo,
  terminateOcrWorker,
  parseTagNumbers,
  getOcrWorker
} from '../utils/tagScannerEngine';

const RECENT_SCANS_KEY = 'cobb_staff_stock_recent_scans';

// Helper to wait until a DOM element is mounted and visible
const waitForElement = (id, maxWaitMs = 1200) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const check = () => {
      const el = document.getElementById(id);
      if (el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.offsetParent !== null)) {
        return resolve(el);
      }
      if (Date.now() - startTime > maxWaitMs) {
        return resolve(document.getElementById(id));
      }
      requestAnimationFrame(check);
    };
    check();
  });
};

// Sort apparel sizes naturally (e.g. 28, 30, 32... or S, M, L, XL)
const sortSizesNaturally = (sizesList) => {
  if (!Array.isArray(sizesList)) return [];
  const alphaOrder = {
    'XXS': 1, 'XS': 2, 'S': 3, 'M': 4, 'L': 5, 'XL': 6, 'XXL': 7, '2XL': 7, '3XL': 8, '4XL': 9, '5XL': 10,
    'STANDARD': 98, 'STD': 98, 'FREE': 98
  };

  return [...sizesList].sort((a, b) => {
    if (a.sizeOrder && b.sizeOrder && a.sizeOrder !== b.sizeOrder) {
      return a.sizeOrder - b.sizeOrder;
    }
    const cleanA = String(a.size || '').replace(/[^0-9A-Z]/gi, '').trim().toUpperCase();
    const cleanB = String(b.size || '').replace(/[^0-9A-Z]/gi, '').trim().toUpperCase();

    const numA = parseInt(cleanA, 10);
    const numB = parseInt(cleanB, 10);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    const rankA = alphaOrder[cleanA] || 99;
    const rankB = alphaOrder[cleanB] || 99;
    if (rankA !== rankB) return rankA - rankB;

    return String(a.size).localeCompare(String(b.size));
  });
};

export default function StaffStockCheckerPage({
  onClose,
  API_BASE = '',
  activeStore = 'DEMO_STORE_001',
  darkMode = true
}) {
  // --- Salesman Tea Expense State ---
  const [activeMainTab, setActiveMainTab] = useState('stock'); // 'stock' | 'tea'
  const [teaRecord, setTeaRecord] = useState(null);
  const [activeSalesman, setActiveSalesman] = useState(() => {
    try {
      return localStorage.getItem('cobb_active_salesman') || 'Vikas';
    } catch (e) {
      return 'Vikas';
    }
  });
  const [teaLogging, setTeaLogging] = useState(false);
  const [teaSuccessMsg, setTeaSuccessMsg] = useState('');
  const [teaNote, setTeaNote] = useState('');

  useEffect(() => {
    fetchTodayTeaRecord(API_BASE, activeStore).then(rec => {
      if (rec) setTeaRecord(rec);
    });

    const unsub = subscribeToTeaExpenses(activeStore, (rec) => {
      if (rec) setTeaRecord(rec);
    });

    return () => {
      if (unsub) unsub();
    };
  }, [activeStore, API_BASE]);

  const handleSelectSalesman = (name) => {
    setActiveSalesman(name);
    try {
      localStorage.setItem('cobb_active_salesman', name);
    } catch (e) {}
  };

  const handleLogSalesmanTea = async (cupsToAdd, note = '') => {
    if (teaLogging) return;
    setTeaLogging(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 30, 60]);
      }
      playSound('click');

      const updated = await logSalesmanTea(API_BASE, activeStore, {
        salesman: activeSalesman,
        cups: cupsToAdd,
        ratePerCup: teaRecord?.ratePerCup || 10,
        note: note || teaNote
      });
      if (updated) setTeaRecord(updated);
      setTeaSuccessMsg(`Logged ${cupsToAdd > 0 ? `+${cupsToAdd}` : cupsToAdd} tea for ${activeSalesman}!`);
      setTeaNote('');
      setTimeout(() => setTeaSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error logging tea:', err);
    } finally {
      setTeaLogging(false);
    }
  };

  const todayTeaTotalCups = teaRecord?.totalCups || 0;
  const todayTeaTotalAmount = teaRecord?.totalAmount || 0;
  const currentSalesmanTea = teaRecord?.salesmen?.[activeSalesman] || { cups: 0, amount: 0 };
  const allSalesmenList = DEFAULT_SALESMEN;
  const todayTeaLogs = teaRecord?.logs || [];

  // Search & Lookup State
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [stockData, setStockData] = useState(null);
  const [selectedColorFilter, setSelectedColorFilter] = useState('ALL'); // 'ALL' or specific color
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('ALL'); // 'ALL' or specific size
  const [copiedBarcode, setCopiedBarcode] = useState(null);

  // Pending Tags Floor State
  const [showPendingListModal, setShowPendingListModal] = useState(false);
  const [selectedPendingSize, setSelectedPendingSize] = useState(null);
  const [showAddPendingModal, setShowAddPendingModal] = useState(false);
  const [thermalTagData, setThermalTagData] = useState(null);
  const [defectModalData, setDefectModalData] = useState(null);
  const [scannerMode, setScannerMode] = useState('lookup'); // 'lookup' | 'defect'
  const [quarantineInfo, setQuarantineInfo] = useState(null); // Quarantined damage record (staff read-only)
  const [isSubmittingPending, setIsSubmittingPending] = useState(false);

  const [pendingSuccessMsg, setPendingSuccessMsg] = useState('');
  const [addPendingForm, setAddPendingForm] = useState({
    color: '',
    size: '',
    barcode: '',
    notes: 'Tag torn on floor',
    discountPercent: 60
  });

  // Real-time detection of duplicate active tag in Add Modal
  const duplicateStaffPendingTag = useMemo(() => {
    const candidate = addPendingForm.barcode || stockData?.matchedBarcode || stockData?.scannedBarcode || '';
    if (!candidate || !candidate.trim() || !stockData?.pendingTagsList) return null;
    return stockData.pendingTagsList.find(t => 
      (t.status === 'active' || !t.status) && isBarcodeDuplicate(t.barcode, candidate)
    );
  }, [addPendingForm.barcode, stockData]);

  // PWA Install / Shortcut State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window !== 'undefined') {
      return Boolean(
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator?.standalone
      );
    }
    return false;
  });
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [dismissedTip, setDismissedTip] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
      } catch (err) {
        console.warn('Install prompt note:', err);
        setShowInstallGuide(true);
      } finally {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const copyDirectStockLink = () => {
    const link = 'https://cobb-store.web.app/#stock';
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(link).catch(() => {});
    }
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraStarting, setCameraStarting] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'
  const [isOcrActive, setIsOcrActive] = useState(false);
  const [detectedBadge, setDetectedBadge] = useState(null);

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
  const nativeRafRef = useRef(null);
  const ocrIntervalRef = useRef(null);
  const isOcrProcessingRef = useRef(false);
  const isCodeResolvedRef = useRef(false);
  const fileInputRef = useRef(null);
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

  // Quick Damage & Defect Quarantine Status Check
  const checkDamageQuarantine = useCallback(async (code) => {
    if (!code) {
      setQuarantineInfo(null);
      return;
    }
    try {
      const endpoint = API_BASE ? `${API_BASE}/api/damages/check/${encodeURIComponent(code)}` : `/api/damages/check/${encodeURIComponent(code)}`;
      const res = await axios.get(endpoint, { timeout: 3500 });
      if (res.data?.isQuarantined && res.data?.damage) {
        setQuarantineInfo(res.data.damage);
        return;
      }
      setQuarantineInfo(null);
    } catch (e) {
      // Cloud Firestore fallback check for Phone Link
      try {
        const { db } = await import('../utils/firebase');
        if (db) {
          const { doc, getDoc } = await import('firebase/firestore');
          const dRef = doc(db, 'stores', activeStore || 'DEMO_STORE_001', 'data', 'damage_records');
          const dSnap = await getDoc(dRef);
          if (dSnap.exists()) {
            const dl = dSnap.data()?.damages || [];
            const normC = String(code).trim().toUpperCase();
            const match = dl.find(d => d.status === 'quarantine' && (
              String(d.barcode || '').trim().toUpperCase() === normC ||
              String(d.articleNo || '').trim().toUpperCase() === normC
            ));
            setQuarantineInfo(match || null);
            return;
          }
        }
      } catch (fbErr) {}
      setQuarantineInfo(null);
    }
  }, [API_BASE, activeStore]);

  // Main Stock Lookup Function
  const handleLookup = useCallback(async (searchQuery) => {
    const q = String(searchQuery || query || '').trim();
    if (!q) return;

    setLoading(true);
    setErrorMsg('');
    setQuarantineInfo(null);

    try {
      const endpoint = API_BASE
        ? `${API_BASE}/api/staff/stock-check?q=${encodeURIComponent(q)}`
        : `/api/staff/stock-check?q=${encodeURIComponent(q)}`;

      const res = await axios.get(endpoint, { timeout: 6000 });

      if (res?.data?.success) {
        setStockData(res.data);
        setSelectedColorFilter('ALL');
        setSelectedSizeFilter('ALL');
        saveToRecentScans(res.data);
        const codeToCheck = res.data?.scannedBarcode || res.data?.matchedBarcode || q;
        checkDamageQuarantine(codeToCheck);

        // Haptic feedback & audio
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([60, 40, 60]);
          }
          playSound('click');
        } catch {}
      } else {
        setErrorMsg(res?.data?.message || `No Cobb article found matching "${q}"`);
        setStockData(null);
        try { playSound('error'); } catch {}
      }
    } catch (err) {
      console.error('[StaffStockCheck Error]', err);
      try {
        const fallbackEndpoint = API_BASE
          ? `${API_BASE}/api/inventory/quick-scan?q=${encodeURIComponent(q)}`
          : `/api/inventory/quick-scan?q=${encodeURIComponent(q)}`;
        const fallbackRes = await axios.get(fallbackEndpoint, { timeout: 6000 });
        if (fallbackRes.data && fallbackRes.data.success) {
          setStockData(fallbackRes.data);
          saveToRecentScans(fallbackRes.data);
          const codeToCheck = fallbackRes.data?.scannedBarcode || fallbackRes.data?.matchedBarcode || q;
          checkDamageQuarantine(codeToCheck);
          return;
        }
      } catch {}

      setErrorMsg(err.response?.data?.message || 'Network error looking up barcode. Check connection.');
      setStockData(null);
    } finally {
      setLoading(false);
    }
  }, [query, API_BASE, saveToRecentScans, checkDamageQuarantine]);

  // Fast Floor Actions for Pending Tags
  const handleOpenAddPendingTag = (prefillColor = '', prefillSize = '') => {
    if (!stockData) return;
    const targetColor = prefillColor || stockData.matchedColor || (stockData.colors?.[0]?.color || '');
    const matchedColorGroup = stockData.colors?.find(c => c.color === targetColor) || stockData.colors?.[0];
    const targetSize = prefillSize || stockData.matchedSize || (matchedColorGroup?.sizes?.[0]?.size || '');
    const matchedSizeObj = matchedColorGroup?.sizes?.find(s => s.size === targetSize) || matchedColorGroup?.sizes?.[0];
    const defaultBarcode = matchedSizeObj?.barcode || stockData.matchedBarcode || stockData.scannedBarcode || '';

    setAddPendingForm({
      color: targetColor,
      size: targetSize,
      barcode: defaultBarcode,
      notes: 'Tag torn / missing in store',
      discountPercent: 60
    });
    setShowAddPendingModal(true);
  };

    const handleSubmitPendingTag = async (e) => {
    e?.preventDefault();
    if (!stockData || isSubmittingPending) return;

    const candidateBarcode = addPendingForm.barcode || stockData.matchedBarcode || stockData.scannedBarcode || '';

    // Quick client check against active pending tags of current article
    if (candidateBarcode && Array.isArray(stockData.pendingTagsList)) {
      const activeExisting = stockData.pendingTagsList.find(t => 
        (t.status === 'active' || !t.status) && isBarcodeDuplicate(t.barcode, candidateBarcode)
      );
      if (activeExisting) {
        alert(`Duplicate Barcode: Barcode "${candidateBarcode}" is already registered on the active pending rack! Duplicate tags cannot be added.`);
        return;
      }
    }

    setIsSubmittingPending(true);
    try {
      const payload = {
        barcode: candidateBarcode,
        articleNo: stockData.articleNo,
        articleName: stockData.itemName,
        size: addPendingForm.size || 'Standard',
        color: addPendingForm.color || 'Standard',
        section: stockData.sectionName || 'Apparel',
        mrp: Number(stockData.mrp) || 0,
        discountPercent: Number(addPendingForm.discountPercent) || 60,
        soldPrice: Math.round(Number(stockData.mrp || 0) * (1 - (Number(addPendingForm.discountPercent) || 60) / 100)),
        salesperson: 'Floor Staff',
        notes: addPendingForm.notes || 'Reported from Staff Stock Checker'
      };

      const endpoint = API_BASE ? `${API_BASE}/api/pending-tags/add` : '/api/pending-tags/add';
      const res = await axios.post(endpoint, payload);

      if (res.data?.success || res.status === 200) {
        setShowAddPendingModal(false);
        setPendingSuccessMsg(`Pending tag logged for ${payload.articleNo} (${payload.size})`);
        setTimeout(() => setPendingSuccessMsg(''), 4000);
        try { playSound('click'); } catch {}
        handleLookup(stockData.articleNo);
      } else {
        alert(res.data?.error || 'Could not save pending tag');
      }
    } catch (err) {
      // If backend rejected as duplicate (409), alert user and do NOT bypass into Firestore
      if (err.response?.status === 409 || err.response?.data?.duplicate) {
        alert(err.response?.data?.error || 'Duplicate Barcode: A pending tag with this barcode already exists in the active rack!');
        return;
      }

      console.warn('Backend pending tags endpoint note:', err.message);
      // Fallback for Phone Link direct to Firestore
      try {
        const { db } = await import('../utils/firebase');
        if (db) {
          const { doc, getDoc, setDoc } = await import('firebase/firestore');
          const ptagRef = doc(db, 'stores', activeStore || 'DEMO_STORE_001', 'data', 'pending_tags');
          const ptagSnap = await getDoc(ptagRef);
          let currentTags = [];
          if (ptagSnap.exists()) {
            const data = ptagSnap.data();
            currentTags = Array.isArray(data) ? data : (data.tags || []);
          }

          // Check duplicate in Firestore before saving
          const isDupInCloud = currentTags.some(t => 
            t.status === 'active' && isBarcodeDuplicate(t.barcode, candidateBarcode)
          );
          if (isDupInCloud) {
            alert(`Duplicate Barcode: Barcode "${candidateBarcode}" is already registered on the active pending rack in Cloud!`);
            return;
          }

          const newTag = {
            id: 'ptag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            barcode: candidateBarcode,
            articleNo: stockData.articleNo,
            articleName: stockData.itemName,
            size: addPendingForm.size || 'Standard',
            color: addPendingForm.color || 'Standard',
            section: stockData.sectionName || 'Apparel',
            mrp: Number(stockData.mrp) || 0,
            discountPercent: Number(addPendingForm.discountPercent) || 60,
            soldPrice: Math.round(Number(stockData.mrp || 0) * (1 - (Number(addPendingForm.discountPercent) || 60) / 100)),
            salesperson: 'Floor Staff',
            notes: addPendingForm.notes || 'Reported from Staff Stock Checker',
            status: 'active',
            createdAt: new Date().toISOString()
          };
          currentTags.push(newTag);
          await setDoc(ptagRef, {
            tags: currentTags.slice(-300),
            activeCount: currentTags.filter(t => t.status === 'active').length,
            lastUpdated: new Date().toISOString()
          }, { merge: true });

          setShowAddPendingModal(false);
          setPendingSuccessMsg(`Pending tag synced to Cloud for ${stockData.articleNo} (${addPendingForm.size})`);
          setTimeout(() => setPendingSuccessMsg(''), 4000);
          handleLookup(stockData.articleNo);
          return;
        }
      } catch (fbErr) {
        console.error('Firebase pending tag fallback error:', fbErr);
      }
      alert('Failed to register pending tag: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmittingPending(false);
    }
  };

  // Copy barcode to clipboard
  const handleCopyBarcode = (bcode) => {
    if (!bcode) return;
    try {
      navigator.clipboard.writeText(bcode);
      setCopiedBarcode(bcode);
      setTimeout(() => setCopiedBarcode(null), 2000);
    } catch {}
  };

  // Open Thermal Tag Modal
  const handleOpenThermalTag = (sizeVal = null, colorVal = null) => {
    if (!stockData) {
      setThermalTagData({ isQuickCategoryMrp: true });
      return;
    }
    const targetSize = sizeVal || selectedSizeFilter || 'Standard';
    const targetColor = colorVal || activeColor || 'Standard';

    let targetBarcode = stockData.scannedBarcode || stockData.articleNo;
    const colorGrp = (stockData.colorGroups || []).find(cg => cg.color === targetColor);
    if (colorGrp) {
      const szObj = (colorGrp.sizes || []).find(s => s.size === targetSize);
      if (szObj?.barcode) targetBarcode = szObj.barcode;
    }

    setThermalTagData({
      barcode: targetBarcode,
      articleNo: stockData.articleNo,
      articleName: stockData.itemName,
      section: stockData.sectionName || 'Apparel',
      size: targetSize,
      color: targetColor,
      mrp: Number(stockData.mrp) || 1999
    });
  };

  // Open Report Defect Modal
  const handleOpenReportDefect = (sizeVal = null, colorVal = null) => {
    if (!stockData) {
      setDefectModalData({ barcode: query || '' });
      return;
    }
    const targetSize = sizeVal || selectedSizeFilter || 'Standard';
    const targetColor = colorVal || activeColor || 'Standard';

    let targetBarcode = stockData.scannedBarcode || stockData.articleNo;
    const colorGrp = (stockData.colorGroups || []).find(cg => cg.color === targetColor);
    if (colorGrp) {
      const szObj = (colorGrp.sizes || []).find(s => s.size === targetSize);
      if (szObj?.barcode) targetBarcode = szObj.barcode;
    }

    setDefectModalData({
      barcode: targetBarcode,
      articleNo: stockData.articleNo,
      itemName: stockData.itemName,
      category: stockData.sectionName || 'Apparel',
      size: targetSize,
      color: targetColor,
      mrp: Number(stockData.mrp) || 1999
    });
  };

  // Start Defect Camera Scan with graceful fallback to modal
  const handleStartDefectScan = () => {
    setScannerMode('defect');
    try {
      startCamera().catch(() => {
        setDefectModalData({ barcode: query || '' });
      });
    } catch {
      setDefectModalData({ barcode: query || '' });
    }
  };

  // Clean Stop of Camera, RAF loops and OCR worker
  const stopCamera = useCallback(async () => {
    if (nativeRafRef.current) {
      cancelAnimationFrame(nativeRafRef.current);
      nativeRafRef.current = null;
    }
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = null;
    }
    isOcrProcessingRef.current = false;

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
    setCameraStarting(false);
    setTorchOn(false);
    setHasTorch(false);
    setIsOcrActive(false);
  }, []);

  // Shared Success Handler for Barcode & OCR Number Detection
  const handleDetectedCode = useCallback(async (code, source = 'barcode') => {
    if (!code || isCodeResolvedRef.current) return;
    isCodeResolvedRef.current = true;

    setDetectedBadge({ code, source });

    // Stop camera and loops immediately
    await stopCamera();

    // Audible confirmation & haptics
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100]);
      }
      playSound('scan');
    } catch {}

    setQuery(code);
    if (scannerMode === 'defect') {
      setDefectModalData({ barcode: code });
      setScannerMode('lookup');
    } else {
      handleLookup(code);
    }

    setTimeout(() => {
      setDetectedBadge(null);
      isCodeResolvedRef.current = false;
    }, 1500);
  }, [stopCamera, handleLookup]);

  // Instant Manual Trigger for Number OCR
  const handleTriggerOcrCapture = useCallback(async () => {
    if (isOcrProcessingRef.current || isCodeResolvedRef.current) return;
    const videoEl = document.querySelector(`#${scannerContainerId} video`);
    if (!videoEl || videoEl.readyState < 2) return;

    isOcrProcessingRef.current = true;
    setIsOcrActive(true);
    try {
      const parsed = await recognizeNumbersFromVideo(videoEl);
      if (parsed?.value) {
        await handleDetectedCode(parsed.value, 'printed_ocr');
      }
    } catch (e) {
      console.warn('Manual OCR capture note:', e);
    } finally {
      isOcrProcessingRef.current = false;
      setIsOcrActive(false);
    }
  }, [handleDetectedCode]);

  // Start Camera with Rock-Solid Standard Constraints & Native Barcode Loop
  const startCamera = useCallback(async () => {
    setCameraError('');
    setCameraStarting(true);
    isCodeResolvedRef.current = false;
    setIsCameraActive(true);

    // Wait until scanner container is attached in DOM
    const containerEl = await waitForElement(scannerContainerId, 1500);
    if (!containerEl) {
      setCameraError('Scanner view container failed to mount in DOM.');
      setCameraStarting(false);
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      html5QrCodeRef.current = html5QrCode;

      // Clean standard constraints supported across Safari iOS & Chrome Android
      const cameraConfig = {
        facingMode: cameraFacing === 'user' ? 'user' : 'environment'
      };

      const qrConfig = {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minEdge * 0.9),
            height: Math.floor(minEdge * 0.55)
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
        cameraConfig,
        qrConfig,
        (decodedText) => {
          const clean = decodedText.trim();
          if (clean) {
            handleDetectedCode(clean, 'barcode_scanner');
          }
        },
        () => {}
      );

      setCameraStarting(false);

      // Check torch capability
      try {
        const stream = html5QrCode.getRunningTrackCameraCapabilities();
        if (stream && stream.torchFeature && stream.torchFeature().isSupported()) {
          setHasTorch(true);
        }
      } catch {}

      // Hardware Native BarcodeDetector GPU Loop
      const videoEl = document.querySelector(`#${scannerContainerId} video`);
      const nativeDetector = getNativeBarcodeDetector();
      if (nativeDetector && videoEl) {
        let runningNative = true;
        const detectNativeFrame = async () => {
          if (!runningNative || isCodeResolvedRef.current || !html5QrCodeRef.current?.isScanning) return;
          try {
            if (videoEl.readyState >= 2) {
              const results = await nativeDetector.detect(videoEl);
              if (results && results.length > 0) {
                const raw = results[0]?.rawValue?.trim();
                if (raw) {
                  runningNative = false;
                  handleDetectedCode(raw, 'barcode_native_gpu');
                  return;
                }
              }
            }
          } catch (e) {}

          if (runningNative && !isCodeResolvedRef.current) {
            nativeRafRef.current = requestAnimationFrame(detectNativeFrame);
          }
        };
        nativeRafRef.current = requestAnimationFrame(detectNativeFrame);
      }

      // Background OCR Reader for numbers beneath barcode
      ocrIntervalRef.current = setInterval(async () => {
        if (isOcrProcessingRef.current || isCodeResolvedRef.current || !html5QrCodeRef.current?.isScanning) return;
        const currentVideo = document.querySelector(`#${scannerContainerId} video`);
        if (!currentVideo || currentVideo.readyState < 2) return;

        isOcrProcessingRef.current = true;
        try {
          const parsed = await recognizeNumbersFromVideo(currentVideo);
          if (parsed?.value) {
            await handleDetectedCode(parsed.value, 'printed_ocr_auto');
          }
        } catch (e) {
        } finally {
          isOcrProcessingRef.current = false;
        }
      }, 750);

    } catch (err) {
      console.error('Camera start failed:', err);
      setCameraStarting(false);
      setCameraError(
        err.message?.includes('NotAllowedError') || err.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access in your browser settings (tap the lock icon in your address bar).'
          : (err.message || 'Unable to open camera stream. Tap "Snap Tag Photo" below to use your phone camera directly.')
      );
    }
  }, [cameraFacing, handleDetectedCode]);

  // Fallback: Snap Tag Photo via phone's native camera input
  const handleFilePhotoScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Try barcode decoding via html5QrCode
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = scanner;
      }
      try {
        const decoded = await scanner.scanFile(file, false);
        if (decoded?.trim()) {
          await handleDetectedCode(decoded.trim(), 'photo_barcode');
          return;
        }
      } catch (scanErr) {
        // Fall through to OCR
      }

      // 2. OCR Fallback on the uploaded image
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const worker = await getOcrWorker();
      if (worker) {
        const ocrRes = await worker.recognize(canvas);
        if (ocrRes?.data?.text) {
          const parsed = parseTagNumbers(ocrRes.data.text);
          if (parsed?.value) {
            await handleDetectedCode(parsed.value, 'photo_ocr');
            return;
          }
        }
      }

      setErrorMsg('Could not detect barcode or numbers in the photo. Please enter code manually.');
    } catch (err) {
      console.error('Photo processing error:', err);
      setErrorMsg('Failed to process tag photo. Try entering barcode manually.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      if (nativeRafRef.current) cancelAnimationFrame(nativeRafRef.current);
      if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {}).then(() => {
          html5QrCodeRef.current?.clear();
        });
      }
      terminateOcrWorker();
    };
  }, []);

  // All unique available sizes across all colors for 1-tap size filter chips
  const allAvailableSizes = useMemo(() => {
    if (!stockData?.colors) return [];
    const sizeMap = {};
    stockData.colors.forEach(c => {
      (c.sizes || []).forEach(sz => {
        const stock = Math.max(0, Number(sz.stock || 0));
        const pending = Math.max(0, Number(sz.pendingTagsCount || sz.pendingStock || 0));
        if (stock > 0 || pending > 0) {
          const sName = String(sz.size || '').trim();
          if (!sizeMap[sName]) {
            sizeMap[sName] = {
              size: sName,
              totalStock: 0,
              totalPendingTags: 0,
              sizeOrder: sz.sizeOrder || 99
            };
          }
          sizeMap[sName].totalStock += stock;
          sizeMap[sName].totalPendingTags += pending;
        }
      });
    });
    return sortSizesNaturally(Object.values(sizeMap));
  }, [stockData]);

  // Filtered color list based on selectedColorFilter AND selectedSizeFilter
  const displayedColors = useMemo(() => {
    if (!stockData?.colors) return [];
    let sourceColors = selectedColorFilter === 'ALL'
      ? stockData.colors
      : stockData.colors.filter(c => c.color === selectedColorFilter);

    let processed = sourceColors.map(colorGroup => {
      const sizeMap = {};
      (colorGroup.sizes || []).forEach(item => {
        const stockQty = Math.max(0, Number(item.stock || 0));
        const pendingCount = Math.max(0, Number(item.pendingTagsCount || item.pendingStock || 0));
        if (stockQty <= 0 && pendingCount <= 0) return;

        const sz = String(item.size || 'Standard').trim();
        if (!sizeMap[sz]) {
          sizeMap[sz] = {
            size: sz,
            stock: 0,
            pendingTagsCount: 0,
            pendingTagDetails: item.pendingTagDetails ? [...item.pendingTagDetails] : [],
            barcode: item.barcode || '',
            barcodes: item.barcodes ? [...item.barcodes] : (item.barcode ? [item.barcode] : []),
            vendorEan: item.vendorEan || '',
            sizeOrder: item.sizeOrder || 99
          };
        }
        sizeMap[sz].stock += stockQty;
        sizeMap[sz].pendingTagsCount += pendingCount;
        if (item.pendingTagDetails && Array.isArray(item.pendingTagDetails)) {
          item.pendingTagDetails.forEach(pt => {
            if (!sizeMap[sz].pendingTagDetails.some(existing => existing.id === pt.id)) {
              sizeMap[sz].pendingTagDetails.push(pt);
            }
          });
        }
        if (item.barcode && !sizeMap[sz].barcodes.includes(item.barcode)) {
          sizeMap[sz].barcodes.push(item.barcode);
        }
      });

      let combinedSizes = sortSizesNaturally(Object.values(sizeMap));

      // If a specific size filter is active (e.g. '34'), filter to only that size
      if (selectedSizeFilter !== 'ALL') {
        combinedSizes = combinedSizes.filter(s => s.size === selectedSizeFilter);
      }

      return {
        ...colorGroup,
        sizes: combinedSizes
      };
    });

    // If size filter is active, only show colours that have that size available!
    if (selectedSizeFilter !== 'ALL') {
      processed = processed.filter(c => c.sizes.length > 0);
    }

    return processed;
  }, [stockData, selectedColorFilter, selectedSizeFilter]);

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-[#231F1C] flex flex-col font-sans pb-20 selection:bg-[#E0A96D] selection:text-[#231F1C]">
      {/* Hidden file input for native camera snapshot fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFilePhotoScan}
        className="hidden"
      />

      {/* --- Sticky Top Header Bar in Warm Sand --- */}
      <header className="sticky top-0 z-40 bg-[#ECE5D8]/95 backdrop-blur-md border-b border-[#D8CEBC] px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-[#B45309] to-[#D97706] text-[#231F1C] shadow-sm">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-[#231F1C]">COBB STAFF</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#231F1C] text-[#F4EFE6] uppercase tracking-wider">
                Stock Checker
              </span>
            </div>
            <p className="text-[11px] text-[#6B5E51] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-pulse"></span>
              <span>Sizes Grouped by Colour • Linen Atelier</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-2.5 py-1.5 rounded-xl border border-[#D8CEBC] bg-[#FAF6F0] hover:bg-[#EAE2D3] text-xs font-bold text-[#4A4036] flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            title="Add shortcut to your phone home screen"
          >
            <Download className="w-3.5 h-3.5 text-[#B45309]" />
            <span className="hidden sm:inline">Add Shortcut</span>
            <span className="sm:hidden">Shortcut</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-[#D8CEBC] bg-[#FAF6F0] hover:bg-[#EAE2D3] text-xs font-semibold text-[#4A4036] flex items-center gap-1 transition-all active:scale-95 shadow-sm"
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
        {/* --- Primary Mode Switcher: Stock Checker vs Chai Tracker --- */}
        <div className="flex bg-[#E8E1D3] p-1 rounded-2xl border border-[#D5C9B7] shadow-inner">
          <button
            type="button"
            onClick={() => setActiveMainTab('stock')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
              activeMainTab === 'stock'
                ? 'bg-[#FFFDF9] text-[#231F1C] shadow-sm border border-[#DCD3C4]'
                : 'text-[#6B5E51] hover:text-[#231F1C]'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-[#B45309]" />
            <span>Stock Checker</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('tea')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
              activeMainTab === 'tea'
                ? 'bg-[#FFFDF9] text-[#231F1C] shadow-sm border border-[#DCD3C4]'
                : 'text-[#6B5E51] hover:text-[#231F1C]'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-[#B45309]" />
            <span>Daily Chai (Tea)</span>
            {todayTeaTotalCups > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                {todayTeaTotalCups} ☕
              </span>
            )}
          </button>
        </div>

        {/* ======================================================== */}
        {/* --- TEA (CHAI) EXPENSE VIEW --- */}
        {/* ======================================================== */}
        {activeMainTab === 'tea' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header Hero Banner */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-[#FFFDF9] via-[#FAF6F0] to-[#F5ECE0] border border-[#DCD3C4] shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#B45309] to-[#D97706] text-[#FFFDF9] flex items-center justify-center font-black shadow-sm">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-sm tracking-tight text-[#231F1C]">Salesman Tea (Chai) Log</h2>
                    <p className="text-[11px] font-semibold text-[#6B5E51]">
                      ₹{teaRecord?.ratePerCup || 10} / cup • Live Synced with Admin Panel
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#8C7E70] block">Store Total Today</span>
                  <span className="text-sm font-black font-mono text-[#B45309]">
                    {todayTeaTotalCups} Cups • ₹{todayTeaTotalAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1: Select Your Salesman Name */}
            <div className="p-4 rounded-3xl bg-[#FFFDF9] border border-[#DCD3C4] shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-[#6B5E51]">
                  1. Select Your Name
                </label>
                <span className="text-[10px] font-semibold text-[#8C7E70]">
                  Active: <strong className="text-[#B45309]">{activeSalesman}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {allSalesmenList.map((name) => {
                  const isSelected = activeSalesman === name;
                  const staffTea = teaRecord?.salesmen?.[name] || { cups: 0, amount: 0 };
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectSalesman(name)}
                      className={`p-2.5 rounded-2xl border text-left transition-all active:scale-95 flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#FEF3C7] border-[#B45309] text-[#92400E] shadow-sm ring-1 ring-[#B45309]/30'
                          : 'bg-[#FAF6F0] border-[#E5DCCF] text-[#4A4036] hover:bg-[#F3ECE0]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          isSelected ? 'bg-[#B45309] text-[#FFFDF9]' : 'bg-[#E5DCCF] text-[#6B5E51]'
                        }`}>
                          {name.charAt(0)}
                        </span>
                        <span className="font-bold text-xs truncate">{name}</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold shrink-0 ml-1">
                        {staffTea.cups > 0 ? `${staffTea.cups} ☕` : '0'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Personal Tea Counter for Selected Salesman */}
            <div className="p-5 rounded-3xl bg-[#FFFDF9] border-2 border-[#DCD3C4] shadow-md space-y-4 text-center">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] uppercase tracking-wide">
                  ☕ {activeSalesman}'s Tea Today
                </span>
                <div className="mt-3 flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-black font-mono text-[#231F1C]">
                    {currentSalesmanTea.cups}
                  </span>
                  <span className="text-lg font-bold text-[#6B5E51]">
                    {currentSalesmanTea.cups === 1 ? 'Cup' : 'Cups'}
                  </span>
                  <span className="text-base font-black font-mono text-[#B45309] ml-1">
                    (₹{currentSalesmanTea.amount || currentSalesmanTea.cups * (teaRecord?.ratePerCup || 10)})
                  </span>
                </div>
                <p className="text-xs text-[#8C7E70] mt-1 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-pulse"></span>
                  <span>Instant live sync to counter & admin panel</span>
                </p>
              </div>

              {/* Success Message Banner */}
              {teaSuccessMsg && (
                <div className="p-2.5 rounded-2xl bg-[#E8F5E9] border border-[#86EFAC] text-[#15803D] text-xs font-black flex items-center justify-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{teaSuccessMsg}</span>
                </div>
              )}

              {/* Quick Stepper Action Buttons */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={teaLogging || currentSalesmanTea.cups <= 0}
                  onClick={() => handleLogSalesmanTea(-1, 'Correction (-1)')}
                  className="py-3 px-2 rounded-2xl border border-[#DCD3C4] bg-[#FAF6F0] hover:bg-[#EAE2D3] active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-xs font-black text-[#6B5E51] transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <span>- 1 Cup</span>
                </button>

                <button
                  type="button"
                  disabled={teaLogging}
                  onClick={() => handleLogSalesmanTea(1, 'Tea Break (+1)')}
                  className="py-3 px-2 rounded-2xl bg-gradient-to-r from-[#B45309] to-[#D97706] text-[#FFFDF9] hover:from-[#92400E] hover:to-[#B45309] active:scale-95 disabled:opacity-50 text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md col-span-1"
                >
                  <Coffee className="w-4 h-4 shrink-0" />
                  <span>+1 Chai ☕</span>
                </button>

                <button
                  type="button"
                  disabled={teaLogging}
                  onClick={() => handleLogSalesmanTea(2, 'Tea Break (+2)')}
                  className="py-3 px-2 rounded-2xl border-2 border-[#B45309]/30 bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A] active:scale-95 disabled:opacity-50 text-xs font-black transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <span>+2 Chai ☕</span>
                </button>
              </div>

              {/* Optional Quick Note Input */}
              <div className="pt-2">
                <input
                  type="text"
                  value={teaNote}
                  onChange={(e) => setTeaNote(e.target.value)}
                  placeholder="Add note (e.g. Morning tea, Client tea) • Optional"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF6F0] border border-[#DCD3C4] text-[#231F1C] placeholder-[#8C7E70] focus:outline-none focus:ring-1 focus:ring-[#B45309]"
                />
              </div>
            </div>

            {/* Step 3: Store Tea Summary Board (All Salesmen) */}
            <div className="p-4 rounded-3xl bg-[#FFFDF9] border border-[#DCD3C4] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#6B5E51]">
                  Today's Store Tea Ledger
                </h3>
                <span className="text-xs font-black font-mono text-[#B45309]">
                  Total: {todayTeaTotalCups} Cups • ₹{todayTeaTotalAmount}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {allSalesmenList.map((name) => {
                  const s = teaRecord?.salesmen?.[name] || { cups: 0, amount: 0 };
                  const isCurrent = activeSalesman === name;
                  return (
                    <div
                      key={name}
                      className={`p-3 rounded-2xl border flex items-center justify-between ${
                        s.cups > 0
                          ? 'bg-[#FEF3C7]/40 border-[#FDE68A]'
                          : 'bg-[#FAF6F0] border-[#E5DCCF]'
                      } ${isCurrent ? 'ring-1 ring-[#B45309]' : ''}`}
                    >
                      <div>
                        <p className="font-bold text-xs text-[#231F1C]">{name}</p>
                        <p className="text-[10px] text-[#8C7E70]">₹{s.amount || s.cups * 10}</p>
                      </div>
                      <span className="text-base font-black font-mono text-[#B45309]">
                        {s.cups} <span className="text-[10px] font-normal text-[#6B5E51]">cups</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Today's Timestamped Log History */}
            {todayTeaLogs.length > 0 && (
              <div className="p-4 rounded-3xl bg-[#FFFDF9] border border-[#DCD3C4] shadow-sm space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#6B5E51]">
                  Today's Floor Tea Logs
                </h3>
                <div className="divide-y divide-[#E5DCCF] max-h-48 overflow-y-auto">
                  {todayTeaLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FAF6F0] text-[#B45309] flex items-center justify-center text-[10px] font-bold">
                          ☕
                        </span>
                        <div>
                          <p className="font-bold text-[#231F1C]">
                            {log.salesman}{' '}
                            <span className="text-[11px] font-semibold text-[#B45309]">
                              ({log.cupsAdded > 0 ? `+${log.cupsAdded}` : log.cupsAdded} cup)
                            </span>
                          </p>
                          {log.note && <p className="text-[10px] text-[#8C7E70]">{log.note}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#8C7E70]">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* --- STOCK CHECKER VIEW (Default) --- */}
        {/* ======================================================== */}
        {activeMainTab === 'stock' && (
          <div className="space-y-4">
        {/* Shortcut Banner Tip for Staff */}
        {!isInstalled && !dismissedTip && (
          <div className="p-3 rounded-2xl bg-[#FFFDF9] border border-[#DCD3C4] flex items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-2 text-[#4A4036]">
              <span className="text-base shrink-0">📲</span>
              <p className="text-[11px] leading-tight">
                <span className="font-bold text-[#B45309]">Fast Floor Access:</span> Add direct shortcut to your home screen!
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-2.5 py-1 rounded-lg bg-[#B45309] text-[#231F1C] font-black text-[11px] shadow hover:bg-[#92400E] active:scale-95 transition-all"
              >
                Add Shortcut
              </button>
              <button
                type="button"
                onClick={() => setDismissedTip(true)}
                className="p-1 text-[#8C7E6F] hover:text-[#231F1C]"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        {/* --- Camera Scanner Controls & Search Form in Warm Linen --- */}
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {/* Primary Live Camera Button */}
            <button
              onClick={startCamera}
              disabled={isCameraActive || loading || cameraStarting}
              className="col-span-4 py-3 px-3 rounded-2xl bg-[#B45309] hover:bg-[#92400E] text-[#231F1C] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all disabled:opacity-50"
            >
              <Camera className="w-4 h-4 fill-current shrink-0" />
              <span>{cameraStarting ? 'Starting Camera...' : 'Open Camera Scanner'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[#231F1C] text-[9.5px] font-black uppercase">
                Dual
              </span>
            </button>

            {/* Direct Native Camera Photo Snap Fallback */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="col-span-1 p-3 rounded-2xl bg-[#FFFDF9] border border-[#D5C9B7] hover:bg-[#FAF6F0] text-[#4A4036] flex flex-col items-center justify-center transition-all active:scale-95 shadow-sm"
              title="Snap photo of tag with phone camera"
            >
              <ImageIcon className="w-4 h-4 text-[#B45309]" />
              <span className="text-[9px] font-bold mt-0.5">Photo</span>
            </button>
          </div>

          {/* Barcode & Article No Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup(query);
            }}
            className="relative flex items-center"
          >
            <div className="absolute left-3.5 text-[#8C7E6F]">
              <Barcode className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter barcode or article no (e.g. 0080... or FSRE...)"
              className="w-full pl-10 pr-24 py-3 rounded-2xl bg-[#FAF7F2] border border-[#D5C9B7] focus:border-[#B45309] focus:ring-2 focus:ring-[#B45309]/20 text-sm font-semibold placeholder-[#9E9080] text-[#231F1C] transition-all outline-none shadow-sm"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1.5 rounded-lg text-[#8C7E6F] hover:text-[#231F1C]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-[#B45309] hover:bg-[#92400E] disabled:opacity-40 text-[#231F1C] font-black text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Find</span>
              </button>
            </div>
          </form>
        </div>
          {/* Quick Category + MRP Tag Maker Action */}
          <div className="flex items-center justify-between gap-2 px-1 text-xs">
            <span className="text-[11px] text-[#6B5E51] font-medium">
              Missing or torn price tag on garment?
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStartDefectScan}
                className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                title="Open camera to scan a defective garment barcode directly"
              >
                <Camera className="w-3.5 h-3.5 text-rose-600" />
                <span>Scan Defect</span>
              </button>
              <button
                type="button"
                onClick={() => setThermalTagModalData({ isQuickCategoryMrp: true })}
                className="px-2.5 py-1 rounded-xl bg-[#FFFDF9] hover:bg-[#FAF6F0] border border-[#D5C9B7] text-[#B45309] font-black text-[11px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Tag</span>
              </button>
            </div>
          </div>

        {/* --- Pending Tag Success Toast --- */}
        {pendingSuccessMsg && (
          <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-between shadow-xl animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{pendingSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setPendingSuccessMsg('')}
              className="p-1 rounded-full hover:bg-slate-950/20 text-slate-950"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* --- Success Detection Flash Notification --- */}
        {detectedBadge && (
          <div className="p-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-between shadow-xl animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {detectedBadge.source.includes('ocr') ? 'Tag Number Recognized:' : 'Barcode Scanned:'}
                <strong className="ml-1 font-mono">{detectedBadge.code}</strong>
              </span>
            </div>
            <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded-full uppercase">
              {detectedBadge.source.includes('ocr') ? 'OCR Number' : '1D Barcode'}
            </span>
          </div>
        )}

        {/* --- Error Banner --- */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Article / Barcode Not Found</div>
              <p className="text-[11px] opacity-90 mt-0.5">{errorMsg}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setThermalTagModalData({ isQuickCategoryMrp: true, barcode: query })}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Replacement Tag (Category + MRP)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Loading Indicator --- */}
        {loading && (
          <div className="p-8 rounded-3xl bg-[#FFFDF9] border border-[#DCD3C4] text-center space-y-3 shadow-sm">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <div className="text-xs font-bold text-[#231F1C]">Searching Cobb Inventory...</div>
            <p className="text-[11px] text-[#6B5E51]">Grouping all sizes and colors</p>
          </div>
        )}

        {/* --- Scanned Article Details & Sizes Grouped By Color --- */}
        {stockData && !loading && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Article Top Bento Summary in Warm Sand & Linen */}
            <div className="p-4 rounded-3xl bg-[#FFFDF9] border border-[#DCD3C4] shadow-sm relative overflow-hidden space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded-lg border border-[#FDE68A]">
                      #{stockData.articleNo}
                    </span>
                    <button
                      onClick={() => handleCopyBarcode(stockData.articleNo)}
                      className="p-1 rounded text-[#8C7E6F] hover:text-[#231F1C]"
                      title="Copy Article No"
                    >
                      {copiedBarcode === stockData.articleNo ? (
                        <Check className="w-3 h-3 text-[#15803D]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    {stockData.mrp > 0 && (
                      <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-[#EFE9DF] text-[#4A4036] border border-[#DDD4C5]">
                        ₹{Number(stockData.mrp).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-black text-[#231F1C] mt-1.5 leading-snug">
                    {stockData.itemName}
                  </h2>
                  <p className="text-xs text-[#6B5E51] font-medium mt-0.5">
                    {stockData.sectionName} {stockData.subSectionName ? `• ${stockData.subSectionName}` : ''}
                  </p>
                </div>

                {/* Stock Status & Pending Tag Badges */}
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <div className={`px-3 py-1.5 rounded-2xl text-xs font-black inline-flex items-center gap-1.5 ${
                    stockData.totalStock > 0
                      ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${stockData.totalStock > 0 ? 'bg-[#2E7D32]' : 'bg-rose-500'}`} />
                    <span>{stockData.totalStock} In Stock</span>
                  </div>

                  {stockData.totalPendingTags > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPendingListModal(true)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1.5 bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#F59E0B] shadow-sm transition-all active:scale-95"
                      title="View active pending tags for this article"
                    >
                      <Tag className="w-3 h-3 text-[#B45309] shrink-0" />
                      <span>{stockData.totalPendingTags} in Pending Tags</span>
                    </button>
                  )}

                  <div className="text-[10px] text-[#7A6E61] font-bold">
                    {stockData.colors?.length || 0} Color{(stockData.colors?.length || 0) === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              {/* Instant Offer & Net Deal Price Breakdown */}
              {stockData.mrp > 0 && (
                <div className="mt-3 pt-2.5 border-t border-[#EFE9DF] space-y-2">
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {/* B1G2 Deal */}
                    <div className="p-2 rounded-2xl bg-[#FAF6F0] border border-[#E5DDCF] flex flex-col justify-between text-center shadow-sm">
                      <div className="text-[10px] font-black text-[#92400E] uppercase tracking-tight flex items-center justify-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 fill-current text-[#B45309] shrink-0" />
                        <span className="truncate">Buy 1 Get 2</span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-[#78350F] my-0.5">
                        ₹{Math.round(stockData.mrp / 3).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[9px] text-[#7A6E61] font-medium truncate">/pc net</div>
                    </div>

                    {/* Flat 50% Deal */}
                    <div className="p-2 rounded-2xl bg-[#E8F5E9]/60 border border-[#C8E6C9] flex flex-col justify-between text-center shadow-sm">
                      <div className="text-[10px] font-black text-[#1B5E20] uppercase tracking-tight flex items-center justify-center gap-1">
                        <Tag className="w-2.5 h-2.5 text-[#2E7D32] shrink-0" />
                        <span className="truncate">Flat 50% Off</span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-[#1B5E20] my-0.5">
                        ₹{Math.round(stockData.mrp * 0.5).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[9px] text-[#7A6E61] font-medium truncate">net price</div>
                    </div>

                    {/* Flat 60% Deal */}
                    <div className="p-2 rounded-2xl bg-[#FBF0DC] border border-[#E9CCA0] flex flex-col justify-between text-center shadow-sm">
                      <div className="text-[10px] font-black text-[#78350F] uppercase tracking-tight flex items-center justify-center gap-1">
                        <Percent className="w-2.5 h-2.5 text-[#B45309] shrink-0" />
                        <span className="truncate">Flat 60% Off</span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-[#78350F] my-0.5">
                        ₹{Math.round(stockData.mrp * 0.4).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[9px] text-[#7A6E61] font-medium truncate">net price</div>
                    </div>
                  </div>

                  {stockData.scannedBarcode && (
                    <div className="text-[#8C7E6F] font-mono text-[10px] text-right">
                      Matched Scanned Code: {stockData.scannedBarcode}
                    </div>
                  )}
                </div>
              )}

              {/* Quarantined Damage Bin Banner (Floor Staff Locked) */}
              {quarantineInfo && (
                <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-red-950/90 to-rose-950/90 border-2 border-red-500/70 shadow-lg text-white">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-red-600/30 text-red-400 border border-red-500/50 mt-0.5">
                      <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white shadow-sm">
                          🔒 QUARANTINED IN DAMAGE BIN
                        </span>
                        <span className="text-[10px] font-bold text-red-300">
                          STAFF LOCKED (READ-ONLY)
                        </span>
                      </div>
                      <p className="text-xs font-bold text-red-100 mt-1">
                        Defect: <span className="text-white font-extrabold">{quarantineInfo.defectType?.replace('_', ' ')}</span>
                        {quarantineInfo.defectDesc && ` — "${quarantineInfo.defectDesc}"`}
                      </p>
                      <p className="text-[11px] text-red-300/90 mt-0.5">
                        Reported by <span className="font-semibold text-white">{quarantineInfo.reportedBy || 'Floor Staff'}</span>
                        {quarantineInfo.reportedAt && ` • ${new Date(quarantineInfo.reportedAt).toLocaleDateString()}`}
                      </p>
                      <div className="mt-2 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-200 flex items-center gap-1.5 leading-snug">
                        <span>🔒</span>
                        <span>
                          Floor staff cannot remove this article from defect. Only Store Admin / Owner can approve repair or return from the Admin Panel.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Tags Notice & Fast Report Button */}
              <div className="mt-3 pt-2.5 border-t border-[#EFE9DF] space-y-2">
                {stockData.totalPendingTags > 0 ? (
                  <div className="p-3 rounded-2xl bg-[#FEF3C7] border border-[#F59E0B] flex items-center justify-between gap-2.5 text-xs shadow-sm">
                    <div className="flex items-center gap-2 text-[#78350F]">
                      <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
                      <p className="text-[11px] leading-tight">
                        <span className="font-bold text-[#78350F]">{stockData.totalPendingTags} piece(s) in Pending Tags</span> (torn / missing tags).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPendingListModal(true)}
                      className="px-2.5 py-1 rounded-xl bg-[#231F1C] hover:bg-[#3D352E] text-[#FEF3C7] font-black text-[11px] shrink-0 shadow active:scale-95 transition-all"
                    >
                      View Tags
                    </button>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-[#6B5E51] flex items-center gap-1">
                    <Tag className="w-3 h-3 text-[#B45309]" />
                    <span>Torn tag on floor?</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenThermalTag()}
                      className="px-2.5 py-1 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-[#231F1C] text-[11px] font-black flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                      title="Print replacement price tag for this garment"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print Tag</span>
                    </button>
                    {quarantineInfo ? (
                      <span
                        className="px-2.5 py-1 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-[11px] font-bold flex items-center gap-1 cursor-not-allowed"
                        title="Item is already quarantined in Damage Bin. Staff cannot remove or re-report."
                      >
                        <ShieldAlert className="w-3 h-3 text-red-400" />
                        <span>Already in Defect Bin</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenReportDefect()}
                        className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                        title="Quarantine damaged or defective garment"
                      >
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        <span>Report Damage</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenAddPendingTag()}
                      className="px-2.5 py-1 rounded-xl bg-[#FFFDF9] hover:bg-[#FAF6F0] border border-[#D8CEBC] text-[#78350F] text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                    >
                      <Plus className="w-3 h-3 text-[#B45309]" />
                      <span>Add Pending Tag</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* --- Quick Filter Chips: 1-Tap Size Filter & Colour Filter --- */}
            {stockData.colors && stockData.colors.length > 0 && (
              <div className="space-y-2.5">
                {/* 1. 1-Tap "Find My Size" Filter Chips */}
                {allAvailableSizes.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-[#6B5E51] uppercase tracking-wider px-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#B45309]">
                        <Tag className="w-3 h-3" />
                        <span>Find Size (All Colours)</span>
                      </span>
                      {selectedSizeFilter !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setSelectedSizeFilter('ALL')}
                          className="text-[10px] text-[#B45309] hover:underline font-bold"
                        >
                          Clear Size Filter
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setSelectedSizeFilter('ALL')}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selectedSizeFilter === 'ALL'
                            ? 'bg-[#B45309] text-[#231F1C] font-black shadow-sm'
                            : 'bg-[#FFFDF9] border border-[#DCD3C4] text-[#4A4036] hover:bg-[#FAF6F0]'
                        }`}
                      >
                        All Sizes ({stockData.totalStock})
                      </button>

                      {allAvailableSizes.map(sz => {
                        const isSelected = selectedSizeFilter === sz.size;
                        return (
                          <button
                            key={sz.size}
                            type="button"
                            onClick={() => setSelectedSizeFilter(isSelected ? 'ALL' : sz.size)}
                            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-[#B45309] text-[#231F1C] font-black shadow-sm'
                                : 'bg-[#FFFDF9] border border-[#DCD3C4] text-[#4A4036] hover:bg-[#FAF6F0]'
                            }`}
                          >
                            <span>{sz.size}</span>
                            <span className={`text-[10px] px-1 py-0.2 rounded ${isSelected ? 'bg-white/20 text-[#231F1C] font-black' : 'bg-[#EFE9DF] text-[#6B5E51]'}`}>
                              {sz.totalStock}
                            </span>
                            {sz.totalPendingTags > 0 && (
                              <span className="text-[9px] px-1 py-0.2 rounded font-black bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]" title={`${sz.totalPendingTags} in Pending Tags`}>
                                🏷️ {sz.totalPendingTags}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Quick Colour Filter Chips */}
                {stockData.colors.length > 1 && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-[#6B5E51] uppercase tracking-wider px-1 flex items-center justify-between">
                      <span>Filter by Colour</span>
                      <span>{stockData.colors.length} Colours</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setSelectedColorFilter('ALL')}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selectedColorFilter === 'ALL'
                            ? 'bg-[#B45309] text-[#231F1C] font-black shadow-sm'
                            : 'bg-[#FFFDF9] border border-[#DCD3C4] text-[#4A4036] hover:bg-[#FAF6F0]'
                        }`}
                      >
                        All Colours
                      </button>

                      {stockData.colors.map(c => {
                        const isSelected = selectedColorFilter === c.color;
                        return (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setSelectedColorFilter(isSelected ? 'ALL' : c.color)}
                            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                              isSelected
                                ? 'bg-[#B45309] text-[#231F1C] font-black shadow-sm'
                                : 'bg-[#FFFDF9] border border-[#DCD3C4] text-[#4A4036] hover:bg-[#FAF6F0]'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: getColorDot(c.color) }}
                            />
                            <span>{c.color}</span>
                            <span className={`text-[10px] ${isSelected ? 'text-[#231F1C]/80 font-black' : 'text-[#7A6E61]'}`}>
                              ({c.totalStock})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- SIZES GROUPED BY EACH COLOUR (Clean Combined List Format) --- */}
            <div className="space-y-3">
              {displayedColors.map((colorGroup) => {
                const sortedSizes = colorGroup.sizes || [];
                const isOutOfStock = colorGroup.totalStock <= 0 || sortedSizes.length === 0;
                const dotColor = getColorDot(colorGroup.color);

                return (
                  <div
                    key={colorGroup.color}
                    className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${
                      isOutOfStock
                        ? 'bg-[#F7F2E9]/60 border-[#DCD3C4] opacity-70'
                        : 'bg-[#FFFDF9] border-[#DCD3C4]'
                    }`}
                  >
                    {/* Colour Header Banner */}
                    <div className="px-4 py-2.5 bg-[#F7F2E9] border-b border-[#E3DAC9] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <h3 className="font-black text-sm text-[#231F1C] tracking-wide uppercase flex items-center gap-2">
                          <span>{colorGroup.color}</span>
                          {stockData.matchedColor === colorGroup.color && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] uppercase tracking-wider">
                              Scanned Color
                            </span>
                          )}
                        </h3>
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                        colorGroup.totalStock > 0
                          ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {colorGroup.totalStock > 0 ? `${colorGroup.totalStock} available` : '0 available'}
                      </span>
                    </div>

                    {/* Sizes in this Colour (Combined Rows: "38 size  2 available") */}
                    {sortedSizes.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-500 italic">
                        No pieces currently available in this colour (Sold out)
                      </div>
                    ) : (
                      <div className="divide-y divide-[#EFE9DF]">
                        {sortedSizes.map((sz) => {
                          const isExactScannedPiece = stockData.scannedBarcode && (
                            sz.barcode === stockData.scannedBarcode ||
                            sz.vendorEan === stockData.scannedBarcode ||
                            sz.barcodes?.includes(stockData.scannedBarcode)
                          );

                          return (
                            <div
                              key={sz.size}
                              className={`px-4 py-2.5 flex items-center justify-between transition-colors ${
                                isExactScannedPiece
                                  ? 'bg-[#FEF3C7]/60 border-l-4 border-[#B45309]'
                                  : 'hover:bg-[#FAF6F0]'
                              }`}
                            >
                              {/* Left: Size & Scanned Tag Badge */}
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-black tracking-tight text-[#231F1C]">
                                  {sz.size} size
                                </span>

                                {isExactScannedPiece && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#B45309] text-[#231F1C] uppercase tracking-wider">
                                    Scanned Tag
                                  </span>
                                )}

                                {sz.barcode && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyBarcode(sz.barcode)}
                                    className="text-[10px] text-[#7A6E61] hover:text-[#231F1C] font-mono flex items-center gap-0.5 ml-1"
                                    title={sz.barcodes?.length > 1 ? `Barcodes: ${sz.barcodes.join(', ')}` : 'Tap to copy barcode'}
                                  >
                                    <span>#{sz.barcode}</span>
                                    {sz.barcodes?.length > 1 && (
                                      <span className="text-[9px] text-amber-400/80 font-sans">
                                        (+{sz.barcodes.length - 1})
                                      </span>
                                    )}
                                    {copiedBarcode === sz.barcode ? (
                                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Right: Availability & Pending Tag Option */}
                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                {sz.pendingTagsCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPendingSize(sz)}
                                    className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#F59E0B] flex items-center gap-1 shadow-sm transition-all active:scale-95"
                                    title="Tap to see pending tag details for this size"
                                  >
                                    <AlertTriangle className="w-3 h-3 text-[#B45309] shrink-0" />
                                    <span>{sz.pendingTagsCount} in Pending Tag</span>
                                  </button>
                                )}
                                <span className={`text-xs font-black ${
                                  sz.stock <= 0
                                    ? 'text-[#8C7E6F]'
                                    : (sz.stock <= 2 ? 'text-[#B45309]' : 'text-[#1B5E20]')
                                }`}>
                                  {sz.stock} available
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenThermalTag(sz.size, colorGroup.color)}
                                    className="p-1.5 rounded-lg border border-[#D5C9B7] hover:bg-[#FAF6F0] text-[#7A6E61] hover:text-[#231F1C] transition-all"
                                    title={`Print replacement tag for ${sz.size}`}
                                  >
                                    <Printer className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReportDefect(sz.size, colorGroup.color)}
                                    className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-all"
                                    title={`Report damage for ${sz.size}`}
                                  >
                                    <ShieldAlert className="w-3 h-3" />
                                  </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- Recent Searches / Floor Quick History --- */}
        {recentScans.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#6B5E51] px-1">
              <span className="font-bold uppercase tracking-wider text-[#6B5E51]">Recent Floor Checks</span>
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
                  className="w-full p-2.5 rounded-2xl bg-slate-900/60 hover:bg-[#FAF8F5] border border-[#E3DAC9]/80 hover:border-slate-700 text-left flex items-center justify-between transition-all active:scale-98"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-slate-800 text-amber-400 shrink-0">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#231F1C] flex items-center gap-2">
                        <span>{item.articleNo}</span>
                        {item.mrp && <span className="text-[#6B5E51] font-normal">₹{item.mrp}</span>}
                      </div>
                      <div className="text-[11px] text-[#6B5E51] truncate mt-0.5">{item.itemName}</div>
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
          </div>
        )}
      </main>

      {/* --- Fullscreen Camera Scanner Modal Overlay --- */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between animate-in fade-in duration-200">
          {/* Camera Viewfinder Header */}
          <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-[#EFE9DF] flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <Camera className={`w-4 h-4 ${scannerMode === 'defect' ? 'text-rose-500' : 'text-amber-400'}`} />
              <div>
                <span className="text-xs font-bold text-white block">
                  {scannerMode === 'defect' ? '⚠️ DEFECT SCANNER ACTIVE' : 'Fast Barcode + Number Reader'}
                </span>
                <span className={`text-[10px] flex items-center gap-1 font-semibold ${
                  scannerMode === 'defect' ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    scannerMode === 'defect' ? 'bg-rose-500' : 'bg-emerald-400'
                  }`} />
                  <span>{scannerMode === 'defect' ? 'Point at tag to quarantine damaged item' : 'Dual Scan Active (60 FPS + OCR)'}</span>
                </span>
              </div>
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
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-[#231F1C] transition-all"
                title="Close Scanner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Camera Viewport with Dual Target Reticle */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
            {/* Explicit width/height on scanner element to guarantee Html5Qrcode initialization */}
            <div
              id={scannerContainerId}
              style={{ width: '100%', minHeight: '300px', maxHeight: '100%' }}
              className="w-full max-w-md h-full object-cover"
            />

            {/* Target Reticle Overlay covering Barcode Lines & Printed Numbers beneath */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
              <div className="w-72 h-44 border-2 border-amber-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] flex flex-col justify-between p-2">
                {/* Upper Zone: Barcode stripes target */}
                <div className="flex items-center justify-between text-[9px] font-black uppercase text-amber-300/80 px-1 pt-0.5">
                  <span>|||| Barcode Stripes</span>
                  <span>Code-128 / EAN</span>
                </div>

                {/* Animated Red Laser Scanning Beam */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent absolute top-1/2 -translate-y-2 animate-pulse" />

                {/* Lower Zone: Printed numbers beneath barcode */}
                <div className="border-t border-dashed border-amber-400/50 pt-1 pb-0.5 flex items-center justify-between text-[9.5px] font-mono font-bold text-emerald-300 bg-slate-950/60 px-2 rounded-lg">
                  <span className="flex items-center gap-1">
                    <Focus className="w-3 h-3 text-emerald-400" />
                    <span>0080... Numbers Beneath</span>
                  </span>
                  <span className="text-[9px] uppercase text-emerald-400 font-sans font-black">
                    {isOcrActive ? 'Reading...' : 'OCR Ready'}
                  </span>
                </div>
              </div>
            </div>

            {/* Camera Error Display with Fallback Buttons */}
            {cameraError && (
              <div className="absolute inset-x-4 top-20 p-4 rounded-2xl bg-rose-950/95 border border-rose-500/50 text-[#231F1C] text-xs space-y-3 z-20 shadow-2xl">
                <div className="font-bold flex items-center gap-1.5 text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Camera Access Issue</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">{cameraError}</p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      fileInputRef.current?.click();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 fill-current" />
                    <span>Snap Tag Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Type Barcode
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Camera Bottom Controls: Shutter Button for instant Number OCR + Cancel */}
          <div className="p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95"
            >
              Cancel
            </button>

            {/* Instant Snap & Read Printed Number button */}
            <button
              type="button"
              onClick={handleTriggerOcrCapture}
              disabled={isOcrActive}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-60"
            >
              <ScanLine className={`w-4 h-4 ${isOcrActive ? 'animate-spin' : ''}`} />
              <span>{isOcrActive ? 'Reading Numbers...' : '⚡ Snap & Read Tag Number'}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- Pending Tag Details Modal (For a specific size) --- */}
      {selectedPendingSize && (
        <div className="fixed inset-0 z-50 bg-[#231F1C]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#DCD3C4] rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl text-[#231F1C] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#231F1C]">Pending Tag Size Details</h3>
                  <p className="text-[11px] text-[#6B5E51]">
                    Size: <strong className="text-amber-300">{selectedPendingSize.size}</strong> • {selectedPendingSize.pendingTagsCount || 1} piece(s) registered
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPendingSize(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-[#6B5E51] hover:text-[#231F1C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed">
              ⚠️ <strong>Floor Notice:</strong> This piece physically exists in the store without a printed/attached barcode tag. Locate it in the pending tags rack/trial room box.
            </div>

            <div className="space-y-2">
              {(selectedPendingSize.pendingTagDetails || []).map((pt, idx) => (
                <div key={pt.id || idx} className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E3DAC9] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400">#{pt.barcode || 'NO-BARCODE'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyBarcode(pt.barcode)}
                      className="text-[10px] text-[#6B5E51] hover:text-[#231F1C] flex items-center gap-1 font-bold"
                    >
                      {copiedBarcode === pt.barcode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedBarcode === pt.barcode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  {pt.notes && (
                    <p className="text-slate-300 text-[11px]">
                      <span className="text-slate-500 font-medium">Notes:</span> {pt.notes}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                    <span>Added: {pt.createdAt ? new Date(pt.createdAt).toLocaleDateString('en-IN') : 'Recent'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 uppercase font-black">Active Tag</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedPendingSize(null)}
              className="w-full py-2.5 rounded-xl bg-[#EFE9DF] hover:bg-[#E5DDCF] text-[#4A4036] font-bold text-xs transition-all active:scale-98"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- All Pending Tags Modal for this Article --- */}
      {showPendingListModal && stockData && (
        <div className="fixed inset-0 z-50 bg-[#231F1C]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#DCD3C4] rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl text-[#231F1C] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#231F1C]">Pending Tags for {stockData.articleNo}</h3>
                  <p className="text-[11px] text-[#6B5E51]">{stockData.totalPendingTags || 0} active pending piece(s)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingListModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-[#6B5E51] hover:text-[#231F1C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {(stockData.pendingTagsList || []).map((t) => (
                <div key={t.id} className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E3DAC9] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">#{t.barcode}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                        {t.color} • {t.size}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyBarcode(t.barcode)}
                      className="text-[10px] text-[#6B5E51] hover:text-[#231F1C] flex items-center gap-1 font-bold"
                    >
                      {copiedBarcode === t.barcode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedBarcode === t.barcode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  {t.notes && (
                    <p className="text-slate-300 text-[11px] leading-tight">
                      <span className="text-slate-500">Reason:</span> {t.notes}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                    <span>By: {t.salesperson || 'Staff'} • {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : 'Recent'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 uppercase font-black">Active</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPendingListModal(false);
                  handleOpenAddPendingTag();
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-black text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Tag</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPendingListModal(false)}
                className="px-4 py-2.5 rounded-xl bg-[#EFE9DF] hover:bg-[#E5DDCF] text-[#4A4036] font-bold text-xs transition-all active:scale-98"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

            {/* --- Thermal Replacement Garment Tag Modal --- */}
      {thermalTagData && (
        <ThermalTagModal
          isOpen={Boolean(thermalTagData)}
          onClose={() => setThermalTagData(null)}
          tagData={thermalTagData}
        />
      )}

      {/* --- Report Defect & Damage Modal --- */}
      {defectModalData && (
        <ReportDefectModal
          isOpen={Boolean(defectModalData)}
          onClose={() => setDefectModalData(null)}
          initialBarcode={defectModalData?.barcode || ''}
          initialArticle={defectModalData}
          onQuarantineSuccess={(d) => {
            setQuarantineInfo(d);
            setPendingSuccessMsg(`Garment #${d.articleNo} (${d.size}) quarantined in Damage Bin!`);
            setTimeout(() => setPendingSuccessMsg(''), 4000);
            if (stockData?.articleNo) {
              handleLookup(stockData.articleNo);
            }
          }}
          onOpenScanner={() => {
            handleStartDefectScan();
          }}
        />
      )}

      {/* --- Add / Report Pending Tag Modal --- */}
      {showAddPendingModal && stockData && (
        <div className="fixed inset-0 z-50 bg-[#231F1C]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#DCD3C4] rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl text-[#231F1C] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#231F1C]">Report Pending / Missing Tag</h3>
                  <p className="text-[11px] text-[#6B5E51]">{stockData.articleNo} • {stockData.itemName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPendingModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-[#6B5E51] hover:text-[#231F1C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPendingTag} className="space-y-3.5 text-xs">
              {/* Select Color */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#4A4036]">Colour</label>
                <select
                  value={addPendingForm.color}
                  onChange={(e) => {
                    const newClr = e.target.value;
                    const cGroup = stockData.colors?.find(c => c.color === newClr);
                    const firstSz = cGroup?.sizes?.[0];
                    setAddPendingForm(prev => ({
                      ...prev,
                      color: newClr,
                      size: firstSz?.size || prev.size,
                      barcode: firstSz?.barcode || prev.barcode
                    }));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D5C9B7] text-[#231F1C] font-bold outline-none focus:border-[#B45309]"
                >
                  {(stockData.colors || []).map(c => (
                    <option key={c.color} value={c.color}>{c.color}</option>
                  ))}
                </select>
              </div>

              {/* Select Size */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#4A4036]">Size</label>
                <select
                  value={addPendingForm.size}
                  onChange={(e) => {
                    const newSz = e.target.value;
                    const cGroup = stockData.colors?.find(c => c.color === addPendingForm.color) || stockData.colors?.[0];
                    const matchedSz = cGroup?.sizes?.find(s => s.size === newSz);
                    setAddPendingForm(prev => ({
                      ...prev,
                      size: newSz,
                      barcode: matchedSz?.barcode || prev.barcode
                    }));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D5C9B7] text-[#231F1C] font-bold outline-none focus:border-[#B45309]"
                >
                  {allAvailableSizes.map(sz => (
                    <option key={sz.size} value={sz.size}>{sz.size}</option>
                  ))}
                </select>
              </div>

              {/* Barcode */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#4A4036]">Barcode / SKU</label>
                <input
                  type="text"
                  value={addPendingForm.barcode}
                  onChange={(e) => setAddPendingForm(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Barcode (optional or auto-selected)"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D5C9B7] text-[#231F1C] font-mono font-bold outline-none focus:border-[#B45309]"
                />
              </div>

              {/* Duplicate Barcode Warning Banner */}
              {duplicateStaffPendingTag && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2 shadow-sm animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">⚠️ Barcode Already on Pending Rack</span>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
                      A pending tag with barcode <span className="font-mono font-bold">{duplicateStaffPendingTag.barcode}</span> ({duplicateStaffPendingTag.color} - {duplicateStaffPendingTag.size}) already exists on the active rack. Duplicate tags cannot be added.
                    </p>
                  </div>
                </div>
              )}

              {/* Note / Reason Chips */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#4A4036]">Reason / Note</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Tag torn on floor', 'Missing tag in trial room', 'Barcode unreadable', 'Defective tag'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAddPendingForm(prev => ({ ...prev, notes: preset }))}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        addPendingForm.notes === preset
                          ? 'bg-[#B45309] text-white'
                          : 'bg-[#FAF7F2] border border-[#D5C9B7] text-[#4A4036] hover:bg-[#EAE2D3]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={addPendingForm.notes}
                  onChange={(e) => setAddPendingForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter note or reason"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#D5C9B7] text-[#231F1C] text-xs outline-none focus:border-[#B45309] mt-1"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPending || Boolean(duplicateStaffPendingTag)}
                  className="flex-1 py-3 rounded-xl bg-[#B45309] hover:bg-[#92400E] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
                  title={duplicateStaffPendingTag ? "Cannot add duplicate barcode" : "Register Pending Tag"}
                >
                  {isSubmittingPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{duplicateStaffPendingTag ? 'Duplicate Barcode' : (isSubmittingPending ? 'Registering...' : 'Register Pending Tag')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPendingModal(false)}
                  className="px-4 py-3 rounded-xl bg-[#EFE9DF] hover:bg-[#E5DDCF] text-[#4A4036] font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Install / Shortcut Guidance Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 bg-[#231F1C]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border border-[#DCD3C4] rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl text-[#231F1C] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#231F1C]">Add Stock Checker to Home Screen</h3>
                  <p className="text-[11px] text-[#6B5E51]">Launch directly in 1-tap from your phone</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-[#6B5E51] hover:text-[#231F1C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Link Box with 1-Tap Copy */}
            <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#D5C9B7] space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#6B5E51]">Direct Staff Link:</span>
                <button
                  type="button"
                  onClick={copyDirectStockLink}
                  className="text-amber-400 font-bold flex items-center gap-1 hover:underline"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-[#B45309] font-bold break-all select-all">
                https://cobb-store.web.app/#stock
              </p>
            </div>

            {/* Step-by-Step for Chrome & Safari */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E3DAC9] space-y-1">
                <p className="font-black text-amber-300 flex items-center gap-1.5">
                  <span>🤖</span>
                  <span>Google Chrome (Android)</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[#4A4036] text-[11.5px] leading-relaxed">
                  <li>Tap the <strong>3 dots (⋮)</strong> menu in Chrome at top right.</li>
                  <li>Select <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install app&quot;</strong>.</li>
                  <li>Tap <strong>&quot;Install / Add&quot;</strong>.</li>
                  <li>The <strong>Cobb Stock</strong> icon is now on your phone home screen!</li>
                </ol>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E3DAC9] space-y-1">
                <p className="font-black text-rose-300 flex items-center gap-1.5">
                  <span>🍎</span>
                  <span>iPhone / Safari (iOS)</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[#4A4036] text-[11.5px] leading-relaxed">
                  <li>Tap the <strong>Share (📤)</strong> button at the bottom of Safari.</li>
                  <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot; (➕)</strong>.</li>
                  <li>Tap <strong>&quot;Add&quot;</strong> at the top right.</li>
                </ol>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E3DAC9] space-y-1">
                <p className="font-black text-sky-300 flex items-center gap-1.5">
                  <span>💻</span>
                  <span>Desktop Chrome / Edge</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[#4A4036] text-[11.5px] leading-relaxed">
                  <li>Click the <strong>Install icon</strong> in the right side of the address bar.</li>
                  <li>Or tap <strong>⋮ ➔ Save and share ➔ Create shortcut...</strong></li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-black text-xs transition-all active:scale-98 shadow-sm"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
