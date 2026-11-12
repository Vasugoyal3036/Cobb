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
import OrsLogo from './OrsLogo';
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
  // --- SWISS MINIMALIST BOUTIQUE THEME STATE (Obsidian Black vs Ceramic White) ---
  const [staffTheme, setStaffTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('cobb_staff_theme') || localStorage.getItem('cobb_owner_theme');
      if (saved === 'ceramic' || saved === 'obsidian') return saved;
      return darkMode ? 'obsidian' : 'ceramic';
    } catch {
      return 'obsidian';
    }
  });

  const isObsidian = staffTheme === 'obsidian';

  const toggleStaffTheme = () => {
    const next = isObsidian ? 'ceramic' : 'obsidian';
    setStaffTheme(next);
    try {
      localStorage.setItem('cobb_staff_theme', next);
    } catch {}
  };

  // --- Active Tab & Salesman State ---
  const [activeMainTab, setActiveMainTab] = useState('stock'); // 'stock' | 'defect'
  const [defectManualInput, setDefectManualInput] = useState('');
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
  const scannerModeRef = useRef('lookup');
  const [quarantineInfo, setQuarantineInfo] = useState(null); // Quarantined damage record (staff read-only)
  const [quarantinedDamages, setQuarantinedDamages] = useState([]);
  const [isSubmittingPending, setIsSubmittingPending] = useState(false);

  const [pendingSuccessMsg, setPendingSuccessMsg] = useState('');
  const [addPendingForm, setAddPendingForm] = useState({
    color: '',
    size: '',
    barcode: '',
    notes: 'Tag torn on floor',
    discountPercent: 60
  });

  // Real-time detection of duplicate or already-billed tag in Add Modal
  const duplicateStaffPendingTag = useMemo(() => {
    const candidate = addPendingForm.barcode || stockData?.matchedBarcode || stockData?.scannedBarcode || '';
    if (!candidate || !candidate.trim() || !stockData?.pendingTagsList) return null;
    return stockData.pendingTagsList.find(t => 
      isBarcodeDuplicate(t.barcode, candidate)
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

  // Subscribe to live Damage Bin records for real-time quarantined size flags
  useEffect(() => {
    let unsub = null;
    let isMounted = true;
    (async () => {
      try {
        const { db } = await import('../utils/firebase');
        if (db && isMounted) {
          const { doc, onSnapshot } = await import('firebase/firestore');
          const dRef = doc(db, 'stores', activeStore || 'DEMO_STORE_001', 'data', 'damage_records');
          unsub = onSnapshot(dRef, snap => {
            if (snap.exists() && isMounted) {
              const dl = snap.data()?.damages || [];
              setQuarantinedDamages(dl.filter(d => d.status === 'quarantine'));
            }
          }, () => {});
        }
      } catch (e) {}
    })();

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [activeStore]);

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

    // Quick client check against pending tags of current article (both active and billed)
    if (candidateBarcode && Array.isArray(stockData.pendingTagsList)) {
      const existing = stockData.pendingTagsList.find(t => 
        isBarcodeDuplicate(t.barcode, candidateBarcode)
      );
      if (existing) {
        if (existing.status === 'billed') {
          alert(`Already Billed: Barcode "${candidateBarcode}" was already billed in POS (${existing.billedInBillNo ? 'Bill #' + existing.billedInBillNo : 'Billed'})! Already billed items cannot be re-added as pending tags.`);
          return;
        }
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
      // If backend rejected as duplicate (409) or billed, alert user and do NOT bypass into Firestore
      if (err.response?.status === 409 || err.response?.data?.duplicate || err.response?.data?.billed) {
        alert(err.response?.data?.error || 'A pending tag with this barcode cannot be added!');
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

          // Check duplicate or billed in Firestore before saving
          const cloudExisting = currentTags.find(t => 
            isBarcodeDuplicate(t.barcode, candidateBarcode)
          );
          if (cloudExisting) {
            if (cloudExisting.status === 'billed') {
              alert(`Already Billed: Barcode "${candidateBarcode}" was already billed in POS (${cloudExisting.billedInBillNo ? 'Bill #' + cloudExisting.billedInBillNo : 'Billed'})! Cannot add as pending tag.`);
              return;
            }
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
    scannerModeRef.current = 'lookup';
    setScannerMode('lookup');
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
    scannerModeRef.current = 'defect';
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
    const isDefect = scannerModeRef.current === 'defect' || scannerMode === 'defect';
    if (isDefect) {
      scannerModeRef.current = 'lookup';
      setScannerMode('lookup');

      // If stockData already contains verified details for this item, pre-fill it
      let matchedData = null;
      if (stockData) {
        const matchesCurrent = stockData.matchedBarcode === code || 
          stockData.scannedBarcode === code || 
          stockData.articleNo === code ||
          (stockData.variants || []).some(v => v.barcode === code);
        if (matchesCurrent) {
          const v = (stockData.variants || []).find(it => it.barcode === code);
          matchedData = {
            barcode: code,
            articleNo: stockData.articleNo,
            itemName: stockData.itemName,
            sectionName: stockData.sectionName || stockData.subSectionName,
            size: v?.size || stockData.matchedSize || 'Standard',
            color: v?.color || stockData.matchedColor || 'Standard',
            mrp: Number(v?.mrp || stockData.mrp || 0)
          };
        }
      }

      setDefectModalData(matchedData || { barcode: code });
    } else {
      handleLookup(code);
    }

    setTimeout(() => {
      setDetectedBadge(null);
      isCodeResolvedRef.current = false;
    }, 1500);
  }, [stopCamera, handleLookup, scannerMode]);

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
    const artNoClean = String(stockData.articleNo || '').trim().toUpperCase();
    const barcodeClean = String(stockData.scannedBarcode || stockData.matchedBarcode || '').trim().toUpperCase();

    // Check damages matching this article or scanned barcode
    const matchedDamages = (quarantinedDamages || []).filter(d => {
      const dArt = String(d.articleNo || '').trim().toUpperCase();
      const dBc = String(d.barcode || '').trim().toUpperCase();
      return (dArt && dArt === artNoClean) || (dBc && (dBc === barcodeClean || dBc === artNoClean));
    });

    stockData.colors.forEach(c => {
      (c.sizes || []).forEach(sz => {
        const stock = Math.max(0, Number(sz.stock || 0));
        const pending = Math.max(0, Number(sz.pendingTagsCount || sz.pendingStock || 0));
        const sName = String(sz.size || '').trim();
        const sNameClean = sName.toUpperCase();

        const quarantinedForThisSize = matchedDamages.filter(d =>
          String(d.size || '').trim().toUpperCase() === sNameClean
        ).length;

        if (stock > 0 || pending > 0 || quarantinedForThisSize > 0) {
          if (!sizeMap[sName]) {
            sizeMap[sName] = {
              size: sName,
              totalStock: 0,
              totalPendingTags: 0,
              quarantinedCount: 0,
              sizeOrder: sz.sizeOrder || 99
            };
          }
          sizeMap[sName].totalStock += stock;
          sizeMap[sName].totalPendingTags += pending;
          sizeMap[sName].quarantinedCount += quarantinedForThisSize;
        }
      });
    });
    return sortSizesNaturally(Object.values(sizeMap));
  }, [stockData, quarantinedDamages]);

  // Filtered color list based on selectedColorFilter AND selectedSizeFilter
  const displayedColors = useMemo(() => {
    if (!stockData?.colors) return [];
    let sourceColors = selectedColorFilter === 'ALL'
      ? stockData.colors
      : stockData.colors.filter(c => c.color === selectedColorFilter);

    let processed = sourceColors.map(colorGroup => {
      const sizeMap = {};
      const rawSizes = Array.isArray(colorGroup.sizes)
        ? colorGroup.sizes
        : (colorGroup.sizeMap ? Object.values(colorGroup.sizeMap) : []);

      rawSizes.forEach(item => {
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
      processed = processed.filter(c => (c.sizes || []).length > 0);
    }

    return processed;
  }, [stockData, selectedColorFilter, selectedSizeFilter]);

  return (
    <div className={`min-h-screen flex flex-col font-sans pb-20 transition-colors ${
      isObsidian
        ? 'bg-[#000000] text-white selection:bg-amber-500 selection:text-black'
        : 'bg-[#F8F9FA] text-[#111827] selection:bg-amber-100 selection:text-slate-900'
    }`}>
      {/* Hidden file input for native camera snapshot fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFilePhotoScan}
        className="hidden"
      />

      {/* --- Sticky Top Header Bar in Swiss Minimalist Boutique --- */}
      <header className={`sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between transition-colors ${
        isObsidian ? 'bg-black/90 border-neutral-800' : 'bg-white/95 border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="shrink-0">
            <OrsLogo size={36} showGlow={isObsidian} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`font-black text-sm tracking-tight ${isObsidian ? 'text-white' : 'text-[#111827]'}`}>COBB STAFF</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                isObsidian ? 'bg-amber-500 text-black' : 'bg-slate-900 text-white'
              }`}>
                Stock Checker
              </span>
            </div>
            <p className={`text-[11px] font-semibold flex items-center gap-1 ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Sizes Grouped by Colour • Swiss Boutique</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 1-Tap Theme Switcher: Ceramic White vs Obsidian Black */}
          <button
            type="button"
            onClick={toggleStaffTheme}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
              isObsidian
                ? 'bg-neutral-900 border-neutral-800 text-amber-400 hover:text-white'
                : 'bg-white border-slate-300 text-slate-800 shadow-xs'
            }`}
            title="Toggle Ceramic White vs Obsidian Black"
          >
            <span>{isObsidian ? '⚫ Obsidian' : '⚪ Ceramic'}</span>
          </button>

          <button
            type="button"
            onClick={handleInstallClick}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer ${
              isObsidian
                ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Add shortcut to your phone home screen"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Add Shortcut</span>
            <span className="sm:hidden">Shortcut</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer ${
                isObsidian
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>
      </header>

      {/* --- Main Mobile Content Container --- */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 pb-28 space-y-4">
        {/* --- Primary Mode Switcher: Stock Checker vs Damage Bin --- */}
        <div className={`flex p-1 rounded-2xl border transition-all ${
          isObsidian ? 'bg-neutral-900/90 border-neutral-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setActiveMainTab('stock')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'stock'
                ? (isObsidian ? 'bg-amber-500 text-black shadow-md' : 'bg-white text-slate-900 shadow-sm border border-slate-200')
                : (isObsidian ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-950')
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Stock Checker</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('defect')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'defect'
                ? 'bg-rose-600 text-white shadow-md'
                : (isObsidian ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-950')
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Damage Bin (Defect)</span>
            {quarantinedDamages.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm">
                {quarantinedDamages.length} 🔒
              </span>
            )}
          </button>
        </div>

        {/* ======================================================== */}
        {/* --- DEFECT & DAMAGE QUARANTINE DESK VIEW --- */}
        {/* ======================================================== */}
        {activeMainTab === 'defect' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header Hero Banner */}
            <div className={`p-4 rounded-3xl border transition-all ${
              isObsidian
                ? 'bg-gradient-to-br from-rose-950/40 via-red-950/20 to-neutral-950 border-rose-900/40 text-white'
                : 'bg-gradient-to-br from-rose-50 via-red-50/50 to-white border-rose-200 text-slate-900 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center font-black shadow-md shadow-rose-600/30">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`font-black text-sm tracking-tight flex items-center gap-2 ${isObsidian ? 'text-white' : 'text-slate-900'}`}>
                      <span>Damage Bin & Quarantine Desk</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-rose-500 text-white uppercase">
                        Locked
                      </span>
                    </h2>
                    <p className={`text-[11px] font-semibold ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>
                      Staff can report defects • Contact Admin/Owner to release
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] uppercase font-bold block ${isObsidian ? 'text-neutral-500' : 'text-slate-400'}`}>Total Quarantined</span>
                  <span className="text-sm font-black font-mono text-rose-500">
                    {quarantinedDamages.length} Pieces
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Action Card: Scan Defect (Camera) or Quick Search */}
            <div className={`p-4 rounded-3xl border transition-all space-y-3 ${
              isObsidian ? 'bg-[#09090C] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isObsidian ? 'text-neutral-300' : 'text-slate-600'}`}>
                  <Camera className="w-3.5 h-3.5 text-rose-500" />
                  <span>1. Scan Defective Garment</span>
                </label>
                <span className={`text-[10px] font-semibold ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>
                  Reporter: <strong className="text-rose-500">{activeSalesman}</strong>
                </span>
              </div>

              {/* Big Touch-Friendly Camera Button */}
              <button
                type="button"
                onClick={handleStartDefectScan}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-98 transition-all cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Scan Defect with Camera</span>
              </button>

              {/* Manual Barcode Input Row */}
              <div className="pt-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Or enter barcode / article no..."
                    value={defectManualInput}
                    onChange={(e) => setDefectManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && defectManualInput.trim()) {
                        setDefectModalData({ barcode: defectManualInput.trim() });
                        setDefectManualInput('');
                      }
                    }}
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                      isObsidian
                        ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-400'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-600 shadow-xs'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={!defectManualInput.trim()}
                    onClick={() => {
                      if (defectManualInput.trim()) {
                        setDefectModalData({ barcode: defectManualInput.trim() });
                        setDefectManualInput('');
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs disabled:opacity-40 transition-all cursor-pointer ${
                      isObsidian ? 'bg-white text-black hover:bg-neutral-200' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Report
                  </button>
                </div>
              </div>
            </div>

            {/* Quarantined Damage Bin Garments List */}
            <div className={`p-4 rounded-3xl border transition-all space-y-3 ${
              isObsidian ? 'bg-[#09090C] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isObsidian ? 'text-neutral-300' : 'text-slate-600'}`}>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  <span>Currently Quarantined Garments ({quarantinedDamages.length})</span>
                </h3>
                <span className="text-[10px] text-rose-500 font-bold">🔒 Locked from Sales</span>
              </div>

              {quarantinedDamages.length === 0 ? (
                <div className={`p-6 text-center space-y-2 border border-dashed rounded-2xl ${
                  isObsidian ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                }`}>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <div className="text-xs font-black">
                    Damage Bin is Empty!
                  </div>
                  <p className={`text-[11px] ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>
                    No defective garments reported. All floor stock is clean for sale.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {quarantinedDamages.map((item) => (
                    <div
                      key={item.id || item.barcode}
                      className={`p-3 rounded-2xl border flex items-center justify-between ${
                        isObsidian ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-black text-xs ${isObsidian ? 'text-white' : 'text-slate-900'}`}>
                            {item.articleNo || item.barcode}
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Size {item.size}
                          </span>
                          {item.color && (
                            <span className={`text-[10px] font-medium ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>
                              {item.color}
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] font-medium ${isObsidian ? 'text-neutral-300' : 'text-slate-700'}`}>
                          {item.articleName || 'Cobb Garment'} • Defect: <strong className="text-rose-500">{item.defectDesc || item.defectType}</strong>
                        </div>
                        <div className={`text-[10px] ${isObsidian ? 'text-neutral-500' : 'text-slate-400'}`}>
                          Reported by {item.reportedBy || 'Staff'} • {item.date || 'Today'}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-xs font-mono font-black text-rose-500">
                          ₹{item.mrp || 0}
                        </div>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          🔒 Quarantined
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* --- STOCK CHECKER VIEW (Default) --- */}
        {/* ======================================================== */}
        {activeMainTab === 'stock' && (
          <div className="space-y-4">
        {/* Shortcut Banner Tip for Staff */}
        {!isInstalled && !dismissedTip && (
          <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-xs ${
            isObsidian ? 'bg-neutral-900/80 border-neutral-800 text-neutral-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">📲</span>
              <p className="text-[11px] leading-tight">
                <span className={`font-bold ${isObsidian ? 'text-amber-400' : 'text-amber-700'}`}>Fast Floor Access:</span> Add direct shortcut to your home screen!
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className={`px-2.5 py-1 rounded-lg font-black text-[11px] shadow active:scale-95 transition-all cursor-pointer ${
                  isObsidian ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                Add Shortcut
              </button>
              <button
                type="button"
                onClick={() => setDismissedTip(true)}
                className={`p-1 cursor-pointer ${isObsidian ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* --- Camera Scanner Controls & Search Form in Swiss Minimalist Boutique --- */}
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {/* Primary Live Camera Button */}
            <button
              onClick={startCamera}
              disabled={isCameraActive || loading || cameraStarting}
              className={`col-span-4 py-3 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all disabled:opacity-50 cursor-pointer ${
                isObsidian
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black'
                  : 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white'
              }`}
            >
              <Camera className="w-4 h-4 fill-current shrink-0" />
              <span>{cameraStarting ? 'Starting Camera...' : 'Open Camera Scanner'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black uppercase ${
                isObsidian ? 'bg-black/20 text-black' : 'bg-white/20 text-white'
              }`}>
                Dual
              </span>
            </button>

            {/* Direct Native Camera Photo Snap Fallback */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className={`col-span-1 p-3 rounded-2xl border flex flex-col items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer ${
                isObsidian
                  ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
              title="Snap photo of tag with phone camera"
            >
              <ImageIcon className="w-4 h-4 text-amber-500" />
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
            <div className={`absolute left-3.5 ${isObsidian ? 'text-neutral-500' : 'text-slate-400'}`}>
              <Barcode className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter barcode or article no (e.g. 0080... or FSRE...)"
              className={`w-full pl-10 pr-24 py-3 rounded-2xl border text-sm font-semibold transition-all outline-none shadow-xs ${
                isObsidian
                  ? 'bg-neutral-900/80 border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20'
              }`}
            />
            <div className="absolute right-2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className={`p-1.5 rounded-lg cursor-pointer ${isObsidian ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className={`px-3.5 py-1.5 rounded-xl disabled:opacity-40 font-black text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm cursor-pointer ${
                  isObsidian
                    ? 'bg-amber-500 hover:bg-amber-400 text-black'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Find</span>
              </button>
            </div>
          </form>
        </div>

        {/* Quick Category + MRP Tag Maker Action */}
        <div className="flex items-center justify-between gap-2 px-1 text-xs">
          <span className={`text-[11px] font-medium ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>
            Missing or torn price tag on garment?
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleStartDefectScan}
              className={`px-2.5 py-1 rounded-xl border font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer ${
                isObsidian
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
              title="Open camera to scan a defective garment barcode directly"
            >
              <Camera className="w-3.5 h-3.5 text-rose-500" />
              <span>Scan Defect</span>
            </button>
            <button
              type="button"
              onClick={() => setThermalTagModalData({ isQuickCategoryMrp: true })}
              className={`px-2.5 py-1 rounded-xl border font-black text-[11px] flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer ${
                isObsidian
                  ? 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-neutral-800'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100'
              }`}
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
          <div className={`p-8 rounded-3xl border text-center space-y-3 transition-all ${
            isObsidian ? 'bg-[#09090C] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}>
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <div className={`text-xs font-bold ${isObsidian ? 'text-white' : 'text-slate-900'}`}>Searching Cobb Inventory...</div>
            <p className={`text-[11px] ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>Grouping all sizes and colors</p>
          </div>
        )}

        {/* --- Scanned Article Details & Sizes Grouped By Color --- */}
        {stockData && !loading && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Article Top Bento Summary in Swiss Minimalist Boutique */}
            <div className={`p-4 rounded-3xl border transition-all overflow-hidden space-y-3 ${
              isObsidian ? 'bg-[#09090C] border-neutral-800 text-white shadow-none' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg border ${
                      isObsidian ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}>
                      #{stockData.articleNo}
                    </span>
                    <button
                      onClick={() => handleCopyBarcode(stockData.articleNo)}
                      className={`p-1 rounded cursor-pointer ${isObsidian ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
                      title="Copy Article No"
                    >
                      {copiedBarcode === stockData.articleNo ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    {stockData.mrp > 0 && (
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                        isObsidian ? 'bg-neutral-800 text-neutral-200 border-neutral-700' : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        ₹{Number(stockData.mrp).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <h2 className={`text-base font-black mt-1.5 leading-snug ${isObsidian ? 'text-white' : 'text-slate-900'}`}>
                    {stockData.itemName}
                  </h2>
                  <p className={`text-xs font-medium mt-0.5 ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {stockData.sectionName} {stockData.subSectionName ? `• ${stockData.subSectionName}` : ''}
                  </p>
                </div>

                {/* Stock Status & Pending Tag Badges */}
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <div className={`px-3 py-1.5 rounded-2xl text-xs font-black inline-flex items-center gap-1.5 ${
                    stockData.totalStock > 0
                      ? (isObsidian ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${stockData.totalStock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span>{stockData.totalStock} In Stock</span>
                  </div>

                  {stockData.totalPendingTags > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPendingListModal(true)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer ${
                        isObsidian
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                          : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                      }`}
                      title="View active pending tags for this article"
                    >
                      <Tag className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>{stockData.totalPendingTags} in Pending Tags</span>
                    </button>
                  )}

                  <div className={`text-[10px] font-bold ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {stockData.colors?.length || 0} Color{(stockData.colors?.length || 0) === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              {/* Instant Offer & Net Deal Price Breakdown */}
              {stockData.mrp > 0 && (
                <div className="mt-3 pt-2.5 border-t space-y-2" style={{ borderColor: isObsidian ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {/* B1G2 Deal */}
                    <div className={`p-2 rounded-2xl border flex flex-col justify-between text-center transition-all ${
                      isObsidian ? 'bg-neutral-900/80 border-neutral-800 text-white' : 'bg-amber-50/50 border-amber-200/80 text-amber-950 shadow-xs'
                    }`}>
                      <div className={`text-[10px] font-black uppercase tracking-tight flex items-center justify-center gap-1 ${
                        isObsidian ? 'text-amber-400' : 'text-amber-800'
                      }`}>
                        <Sparkles className="w-2.5 h-2.5 fill-current text-amber-500 shrink-0" />
                        <span className="truncate">Buy 1 Get 2</span>
                      </div>
                      <div className={`text-xs sm:text-sm font-black my-0.5 ${isObsidian ? 'text-amber-300' : 'text-amber-900'}`}>
                        ₹{Math.round(stockData.mrp / 3).toLocaleString('en-IN')}
                      </div>
                      <div className={`text-[9px] font-medium truncate ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>/pc net</div>
                    </div>

                    {/* Flat 50% Deal */}
                    <div className={`p-2 rounded-2xl border flex flex-col justify-between text-center transition-all ${
                      isObsidian ? 'bg-neutral-900/80 border-neutral-800 text-white' : 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950 shadow-xs'
                    }`}>
                      <div className={`text-[10px] font-black uppercase tracking-tight flex items-center justify-center gap-1 ${
                        isObsidian ? 'text-emerald-400' : 'text-emerald-800'
                      }`}>
                        <Tag className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                        <span className="truncate">Flat 50% Off</span>
                      </div>
                      <div className={`text-xs sm:text-sm font-black my-0.5 ${isObsidian ? 'text-emerald-300' : 'text-emerald-900'}`}>
                        ₹{Math.round(stockData.mrp * 0.5).toLocaleString('en-IN')}
                      </div>
                      <div className={`text-[9px] font-medium truncate ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>net price</div>
                    </div>

                    {/* Flat 60% Deal */}
                    <div className={`p-2 rounded-2xl border flex flex-col justify-between text-center transition-all ${
                      isObsidian ? 'bg-neutral-900/80 border-neutral-800 text-white' : 'bg-blue-50/50 border-blue-200/80 text-blue-950 shadow-xs'
                    }`}>
                      <div className={`text-[10px] font-black uppercase tracking-tight flex items-center justify-center gap-1 ${
                        isObsidian ? 'text-blue-400' : 'text-blue-800'
                      }`}>
                        <Percent className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                        <span className="truncate">Flat 60% Off</span>
                      </div>
                      <div className={`text-xs sm:text-sm font-black my-0.5 ${isObsidian ? 'text-blue-300' : 'text-blue-900'}`}>
                        ₹{Math.round(stockData.mrp * 0.4).toLocaleString('en-IN')}
                      </div>
                      <div className={`text-[9px] font-medium truncate ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>net price</div>
                    </div>
                  </div>

                  {stockData.scannedBarcode && (
                    <div className={`font-mono text-[10px] text-right ${isObsidian ? 'text-neutral-500' : 'text-slate-400'}`}>
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
              <div className="mt-3 pt-2.5 border-t space-y-2" style={{ borderColor: isObsidian ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                {stockData.totalPendingTags > 0 ? (
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 text-xs shadow-xs ${
                    isObsidian ? 'bg-amber-500/10 border-amber-500/25 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-[11px] leading-tight">
                        <span className="font-bold">{stockData.totalPendingTags} piece(s) in Pending Tags</span> (torn / missing tags).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPendingListModal(true)}
                      className={`px-2.5 py-1 rounded-xl font-black text-[11px] shrink-0 shadow-sm active:scale-95 transition-all cursor-pointer ${
                        isObsidian ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      View Tags
                    </button>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className={`text-[10px] flex items-center gap-1 ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>
                    <Tag className="w-3 h-3 text-amber-500" />
                    <span>Torn tag on floor?</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenThermalTag()}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all active:scale-95 shadow-sm cursor-pointer ${
                        isObsidian ? 'bg-neutral-800 text-amber-400 hover:bg-neutral-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
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
                        className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer ${
                          isObsidian ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                        }`}
                        title="Quarantine damaged or defective garment"
                      >
                        <ShieldAlert className="w-3 h-3 text-rose-500" />
                        <span>Report Damage</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenAddPendingTag()}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer ${
                        isObsidian ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Plus className="w-3 h-3 text-amber-500" />
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
                    <div className={`text-[11px] font-bold uppercase tracking-wider px-1 flex items-center justify-between ${
                      isObsidian ? 'text-neutral-400' : 'text-slate-500'
                    }`}>
                      <span className="flex items-center gap-1.5 text-amber-500">
                        <Tag className="w-3 h-3" />
                        <span>Find Size (All Colours)</span>
                      </span>
                      {selectedSizeFilter !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setSelectedSizeFilter('ALL')}
                          className="text-[10px] text-amber-500 hover:underline font-bold cursor-pointer"
                        >
                          Clear Size Filter
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setSelectedSizeFilter('ALL')}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedSizeFilter === 'ALL'
                            ? (isObsidian ? 'bg-amber-500 text-black font-black shadow-sm' : 'bg-slate-900 text-white font-black shadow-sm')
                            : (isObsidian ? 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50')
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
                            onClick={() => {
                              setSelectedSizeFilter(isSelected ? 'ALL' : sz.size);
                              if (sz.quarantinedCount > 0) {
                                const matchedDmg = (quarantinedDamages || []).find(d =>
                                  String(d.size || '').trim().toUpperCase() === String(sz.size).trim().toUpperCase()
                                );
                                if (matchedDmg) setQuarantineInfo(matchedDmg);
                              }
                            }}
                            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? (isObsidian ? 'bg-amber-500 text-black font-black shadow-sm' : 'bg-slate-900 text-white font-black shadow-sm')
                                : (isObsidian ? 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50')
                            }`}
                          >
                            <span>{sz.size}</span>
                            <span className={`text-[10px] px-1 py-0.2 rounded ${
                              isSelected
                                ? (isObsidian ? 'bg-black/20 text-black font-black' : 'bg-white/20 text-white font-black')
                                : (isObsidian ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-100 text-slate-600')
                            }`}>
                              {sz.totalStock}
                            </span>
                            {sz.totalPendingTags > 0 && (
                              <span className="text-[9px] px-1 py-0.2 rounded font-black bg-amber-500/20 text-amber-400 border border-amber-500/30" title={`${sz.totalPendingTags} in Pending Tags`}>
                                🏷️ {sz.totalPendingTags}
                              </span>
                            )}
                            {sz.quarantinedCount > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-0.5" title={`${sz.quarantinedCount} piece(s) quarantined in Damage Bin`}>
                                <span>🔒</span>
                                <span>Damaged</span>
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
                    <div className={`text-[11px] font-bold uppercase tracking-wider px-1 flex items-center justify-between ${
                      isObsidian ? 'text-neutral-400' : 'text-slate-500'
                    }`}>
                      <span>Filter by Colour</span>
                      <span>{stockData.colors.length} Colours</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setSelectedColorFilter('ALL')}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedColorFilter === 'ALL'
                            ? (isObsidian ? 'bg-amber-500 text-black font-black shadow-sm' : 'bg-slate-900 text-white font-black shadow-sm')
                            : (isObsidian ? 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50')
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
                            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? (isObsidian ? 'bg-amber-500 text-black font-black shadow-sm' : 'bg-slate-900 text-white font-black shadow-sm')
                                : (isObsidian ? 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50')
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: getColorDot(c.color) }}
                            />
                            <span>{c.color}</span>
                            <span className={`text-[10px] ${
                              isSelected
                                ? (isObsidian ? 'text-black/80 font-black' : 'text-white/80 font-black')
                                : (isObsidian ? 'text-neutral-400' : 'text-slate-500')
                            }`}>
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
              {displayedColors.length === 0 && (
                <div className={`p-5 rounded-2xl border text-center space-y-2.5 ${
                  isObsidian ? 'bg-[#09090C] border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <p className={`text-xs ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>
                    No pieces match the selected filter ({selectedSizeFilter !== 'ALL' ? `Size ${selectedSizeFilter}` : selectedColorFilter}).
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSelectedSizeFilter('ALL'); setSelectedColorFilter('ALL'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      isObsidian ? 'bg-amber-400 text-black' : 'bg-slate-900 text-white'
                    }`}
                  >
                    Show All Sizes & Colours
                  </button>
                </div>
              )}
              {displayedColors.map((colorGroup) => {
                const sortedSizes = Array.isArray(colorGroup.sizes) ? colorGroup.sizes : [];
                const isOutOfStock = colorGroup.totalStock <= 0 || sortedSizes.length === 0;
                const dotColor = getColorDot(colorGroup.color);

                return (
                  <div
                    key={colorGroup.color}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isOutOfStock
                        ? (isObsidian ? 'bg-[#09090C]/60 border-neutral-800 opacity-60' : 'bg-slate-50/60 border-slate-200 opacity-70')
                        : (isObsidian ? 'bg-[#09090C] border-neutral-800' : 'bg-white border-slate-200 shadow-sm')
                    }`}
                  >
                    {/* Colour Header Banner */}
                    <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                      isObsidian ? 'bg-neutral-900/80 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <h3 className={`font-black text-sm tracking-wide uppercase flex items-center gap-2 ${
                          isObsidian ? 'text-white' : 'text-slate-900'
                        }`}>
                          <span>{colorGroup.color}</span>
                          {stockData.matchedColor === colorGroup.color && (
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                              isObsidian ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              Scanned Color
                            </span>
                          )}
                        </h3>
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                        colorGroup.totalStock > 0
                          ? (isObsidian ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {colorGroup.totalStock > 0 ? `${colorGroup.totalStock} available` : '0 available'}
                      </span>
                    </div>

                    {/* Sizes in this Colour (Combined Rows: "38 size  2 available") */}
                    {sortedSizes.length === 0 ? (
                      <div className={`px-4 py-3 text-xs italic ${isObsidian ? 'text-neutral-500' : 'text-slate-400'}`}>
                        No pieces currently available in this colour (Sold out)
                      </div>
                    ) : (
                      <div className={`divide-y ${isObsidian ? 'divide-neutral-800/80' : 'divide-slate-100'}`}>
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
                                  ? (isObsidian ? 'bg-amber-500/15 border-l-4 border-amber-500' : 'bg-amber-50 border-l-4 border-amber-600')
                                  : (isObsidian ? 'hover:bg-neutral-900/40' : 'hover:bg-slate-50')
                              }`}
                            >
                              {/* Left: Size & Scanned Tag Badge */}
                              <div className="flex items-center gap-2.5">
                                <span className={`text-sm font-black tracking-tight ${isObsidian ? 'text-white' : 'text-slate-900'}`}>
                                  {sz.size} size
                                </span>

                                {isExactScannedPiece && (
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                                    isObsidian ? 'bg-amber-500 text-black' : 'bg-slate-900 text-white'
                                  }`}>
                                    Scanned Tag
                                  </span>
                                )}

                                {sz.barcode && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyBarcode(sz.barcode)}
                                    className={`text-[10px] font-mono flex items-center gap-0.5 ml-1 cursor-pointer ${
                                      isObsidian ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'
                                    }`}
                                    title={sz.barcodes?.length > 1 ? `Barcodes: ${sz.barcodes.join(', ')}` : 'Tap to copy barcode'}
                                  >
                                    <span>#{sz.barcode}</span>
                                    {sz.barcodes?.length > 1 && (
                                      <span className="text-[9px] text-amber-500 font-sans">
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
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer ${
                                      isObsidian
                                        ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30'
                                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                                    }`}
                                    title="Tap to see pending tag details for this size"
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                    <span>{sz.pendingTagsCount} in Pending Tag</span>
                                  </button>
                                )}
                                <span className={`text-xs font-black ${
                                  sz.stock <= 0
                                    ? (isObsidian ? 'text-neutral-500' : 'text-slate-400')
                                    : (sz.stock <= 2
                                        ? (isObsidian ? 'text-amber-400' : 'text-amber-700')
                                        : (isObsidian ? 'text-emerald-400' : 'text-emerald-700'))
                                }`}>
                                  {sz.stock} available
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenThermalTag(sz.size, colorGroup.color)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isObsidian ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                                  }`}
                                  title={`Print replacement tag for ${sz.size}`}
                                >
                                  <Printer className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReportDefect(sz.size, colorGroup.color)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isObsidian ? 'border-rose-900/60 hover:bg-rose-950/40 text-rose-400' : 'border-rose-200 hover:bg-rose-50 text-rose-600'
                                  }`}
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
          <div className="pt-4 border-t space-y-2.5" style={{ borderColor: isObsidian ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
            <div className="flex items-center justify-between text-xs px-1">
              <span className={`font-bold uppercase tracking-wider ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>Recent Floor Checks</span>
              <button
                onClick={() => {
                  setRecentScans([]);
                  localStorage.removeItem(RECENT_SCANS_KEY);
                }}
                className={`text-[10px] transition-colors cursor-pointer ${isObsidian ? 'text-neutral-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-600'}`}
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
                  className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-98 cursor-pointer ${
                    isObsidian
                      ? 'bg-neutral-900/60 hover:bg-neutral-900 border-neutral-800 text-white'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isObsidian ? 'bg-neutral-800 text-amber-400' : 'bg-slate-100 text-amber-600'}`}>
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className={`text-xs font-bold flex items-center gap-2 ${isObsidian ? 'text-white' : 'text-slate-900'}`}>
                        <span>{item.articleNo}</span>
                        {item.mrp && <span className={`font-normal ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>₹{item.mrp}</span>}
                      </div>
                      <div className={`text-[11px] truncate mt-0.5 ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>{item.itemName}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-bold ${
                      item.totalStock > 0
                        ? (isObsidian ? 'text-emerald-400' : 'text-emerald-600')
                        : (isObsidian ? 'text-rose-400' : 'text-rose-600')
                    }`}>
                      {item.totalStock > 0 ? `${item.totalStock} in stock` : 'Out of stock'}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 ${isObsidian ? 'text-neutral-600' : 'text-slate-400'}`} />
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
          <div className="px-4 py-3 bg-slate-900 border-b border-[#EFE9DF] flex items-center justify-between z-10">
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
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
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
        <div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-4">
          <div className={`rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border max-h-[85vh] overflow-y-auto ${
            isObsidian ? 'bg-[#0D0E12] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isObsidian ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-black font-black">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isObsidian ? 'text-white' : 'text-slate-900'}`}>Pending Tag Size Details</h3>
                  <p className={`text-[11px] ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Size: <strong className="text-amber-400">{selectedPendingSize.size}</strong> • {selectedPendingSize.pendingTagsCount || 1} piece(s) registered
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPendingSize(null)}
                className={`p-1.5 rounded-full cursor-pointer ${isObsidian ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`p-3 rounded-2xl border text-xs leading-relaxed ${
              isObsidian ? 'bg-amber-500/10 border-amber-500/25 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              ⚠️ <strong>Floor Notice:</strong> This piece physically exists in the store without a printed/attached barcode tag. Locate it in the pending tags rack/trial room box.
            </div>

            <div className="space-y-2">
              {(selectedPendingSize.pendingTagDetails || []).map((pt, idx) => (
                <div key={pt.id || idx} className={`p-3 rounded-2xl border space-y-1.5 text-xs ${
                  isObsidian ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400">#{pt.barcode || 'NO-BARCODE'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyBarcode(pt.barcode)}
                      className={`text-[10px] flex items-center gap-1 font-bold cursor-pointer ${
                        isObsidian ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {copiedBarcode === pt.barcode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedBarcode === pt.barcode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  {pt.notes && (
                    <p className={`text-[11px] ${isObsidian ? 'text-neutral-300' : 'text-slate-700'}`}>
                      <span className={isObsidian ? 'text-neutral-500 font-medium' : 'text-slate-400 font-medium'}>Notes:</span> {pt.notes}
                    </p>
                  )}
                  <div className={`flex items-center justify-between text-[10px] pt-1 border-t ${
                    isObsidian ? 'text-neutral-500 border-neutral-800' : 'text-slate-400 border-slate-200'
                  }`}>
                    <span>Added: {pt.createdAt ? new Date(pt.createdAt).toLocaleDateString('en-IN') : 'Recent'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 uppercase font-black">Active Tag</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedPendingSize(null)}
              className={`w-full py-2.5 rounded-xl border font-bold text-xs transition-all active:scale-98 cursor-pointer ${
                isObsidian ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- All Pending Tags Modal for this Article --- */}
      {showPendingListModal && stockData && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-4">
          <div className={`rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border max-h-[85vh] overflow-y-auto ${
            isObsidian ? 'bg-[#0D0E12] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isObsidian ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-black font-black">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isObsidian ? 'text-white' : 'text-slate-900'}`}>Pending Tags for {stockData.articleNo}</h3>
                  <p className={`text-[11px] ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>{stockData.totalPendingTags || 0} active pending piece(s)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingListModal(false)}
                className={`p-1.5 rounded-full cursor-pointer ${isObsidian ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {(stockData.pendingTagsList || []).map((t) => (
                <div key={t.id} className={`p-3 rounded-2xl border space-y-1.5 text-xs ${
                  isObsidian ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">#{t.barcode}</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        isObsidian ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {t.color} • {t.size}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyBarcode(t.barcode)}
                      className={`text-[10px] flex items-center gap-1 font-bold cursor-pointer ${
                        isObsidian ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {copiedBarcode === t.barcode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedBarcode === t.barcode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  {t.notes && (
                    <p className={`text-[11px] leading-tight ${isObsidian ? 'text-neutral-300' : 'text-slate-700'}`}>
                      <span className={isObsidian ? 'text-neutral-500' : 'text-slate-400'}>Reason:</span> {t.notes}
                    </p>
                  )}
                  <div className={`flex items-center justify-between text-[10px] pt-1 border-t ${
                    isObsidian ? 'text-neutral-500 border-neutral-800' : 'text-slate-400 border-slate-200'
                  }`}>
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
                className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                  isObsidian ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Tag</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPendingListModal(false)}
                className={`px-4 py-2.5 rounded-xl border font-bold text-xs transition-all active:scale-98 cursor-pointer ${
                  isObsidian ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
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
          onClose={() => {
            setDefectModalData(null);
            scannerModeRef.current = 'lookup';
            setScannerMode('lookup');
          }}
          initialBarcode={defectModalData?.barcode || ''}
          initialArticle={defectModalData}
          activeStore={activeStore}
          API_BASE={API_BASE}
          reportedBy={activeSalesman || 'Floor Staff'}
          initialPrintSlip={false}
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
          onScanNext={() => {
            handleStartDefectScan();
          }}
        />
      )}

      {/* --- Add / Report Pending Tag Modal --- */}
      {showAddPendingModal && stockData && (
        <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 ${
          isObsidian ? 'bg-black/85' : 'bg-black/65'
        }`}>
          <div className={`rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto border ${
            isObsidian ? 'bg-[#0E0E12] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isObsidian ? 'border-neutral-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl font-black ${
                  isObsidian ? 'bg-amber-400 text-black' : 'bg-slate-900 text-amber-300'
                }`}>
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm tracking-tight ${isObsidian ? 'text-white' : 'text-slate-900'}`}>Report Pending / Missing Tag</h3>
                  <p className={`text-[11px] font-mono ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>{stockData.articleNo} • {stockData.itemName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPendingModal(false)}
                className={`p-1.5 rounded-full transition-colors ${
                  isObsidian ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPendingTag} className="space-y-3.5 text-xs">
              {/* Select Color */}
              <div className="space-y-1">
                <label className={`text-[11px] font-bold uppercase tracking-wider ${isObsidian ? 'text-neutral-400' : 'text-slate-600'}`}>Colour</label>
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
                  className={`w-full px-3 py-2.5 rounded-xl font-bold outline-none border transition-all ${
                    isObsidian
                      ? 'bg-[#14141A] border-neutral-800 text-white focus:border-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-900'
                  }`}
                >
                  {(stockData.colors || []).map(c => (
                    <option key={c.color} value={c.color} className={isObsidian ? 'bg-[#14141A] text-white' : 'bg-white text-slate-900'}>{c.color}</option>
                  ))}
                </select>
              </div>

              {/* Select Size */}
              <div className="space-y-1">
                <label className={`text-[11px] font-bold uppercase tracking-wider ${isObsidian ? 'text-neutral-400' : 'text-slate-600'}`}>Size</label>
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
                  className={`w-full px-3 py-2.5 rounded-xl font-bold outline-none border transition-all ${
                    isObsidian
                      ? 'bg-[#14141A] border-neutral-800 text-white focus:border-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-900'
                  }`}
                >
                  {allAvailableSizes.map(sz => (
                    <option key={sz.size} value={sz.size} className={isObsidian ? 'bg-[#14141A] text-white' : 'bg-white text-slate-900'}>{sz.size}</option>
                  ))}
                </select>
              </div>

              {/* Barcode */}
              <div className="space-y-1">
                <label className={`text-[11px] font-bold uppercase tracking-wider ${isObsidian ? 'text-neutral-400' : 'text-slate-600'}`}>Barcode / SKU</label>
                <input
                  type="text"
                  value={addPendingForm.barcode}
                  onChange={(e) => setAddPendingForm(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Barcode (optional or auto-selected)"
                  className={`w-full px-3 py-2.5 rounded-xl font-mono font-bold outline-none border transition-all ${
                    isObsidian
                      ? 'bg-[#14141A] border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-900'
                  }`}
                />
              </div>

              {/* Duplicate or Already-Billed Barcode Warning Banner */}
              {duplicateStaffPendingTag && (
                <div className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 border shadow-sm ${
                  duplicateStaffPendingTag.status === 'billed'
                    ? (isObsidian ? 'bg-rose-950/40 border-rose-800/80 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-900')
                    : (isObsidian ? 'bg-amber-950/30 border-amber-800/60 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900')
                }`}>
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${duplicateStaffPendingTag.status === 'billed' ? 'text-rose-500' : 'text-amber-400'}`} />
                  <div>
                    <span className="font-bold">
                      {duplicateStaffPendingTag.status === 'billed' ? '🚫 Barcode Already Billed in POS' : '⚠️ Barcode Already on Pending Rack'}
                    </span>
                    <p className={`mt-0.5 text-[11px] leading-relaxed ${
                      duplicateStaffPendingTag.status === 'billed'
                        ? (isObsidian ? 'text-rose-200/90' : 'text-rose-800')
                        : (isObsidian ? 'text-amber-200/90' : 'text-amber-800')
                    }`}>
                      {duplicateStaffPendingTag.status === 'billed'
                        ? `Barcode ${duplicateStaffPendingTag.barcode} was already billed in POS (${duplicateStaffPendingTag.billedInBillNo ? 'Bill #' + duplicateStaffPendingTag.billedInBillNo : 'Billed'}). Already billed articles cannot be re-added as pending tags.`
                        : `A pending tag with barcode ${duplicateStaffPendingTag.barcode} (${duplicateStaffPendingTag.color} - ${duplicateStaffPendingTag.size}) already exists on the active rack. Duplicate tags cannot be added.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Note / Reason Chips */}
              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold uppercase tracking-wider ${isObsidian ? 'text-neutral-400' : 'text-slate-600'}`}>Reason / Note</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Tag torn on floor', 'Missing tag in trial room', 'Barcode unreadable', 'Defective tag'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAddPendingForm(prev => ({ ...prev, notes: preset }))}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                        addPendingForm.notes === preset
                          ? isObsidian
                            ? 'bg-amber-400 border-amber-400 text-black shadow-sm'
                            : 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : isObsidian
                            ? 'bg-[#181820] border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
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
                  className={`w-full px-3 py-2 rounded-xl text-xs outline-none border transition-all mt-1 ${
                    isObsidian
                      ? 'bg-[#14141A] border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPending || Boolean(duplicateStaffPendingTag)}
                  className={`flex-1 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all ${
                    isObsidian
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:brightness-110 shadow-amber-500/10'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  title={
                    duplicateStaffPendingTag?.status === 'billed'
                      ? 'Already Billed in POS'
                      : duplicateStaffPendingTag
                      ? 'Cannot add duplicate barcode'
                      : 'Register Pending Tag'
                  }
                >
                  {isSubmittingPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>
                    {duplicateStaffPendingTag
                      ? (duplicateStaffPendingTag.status === 'billed' ? 'Already Billed in POS' : 'Duplicate Barcode')
                      : (isSubmittingPending ? 'Registering...' : 'Register Pending Tag')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPendingModal(false)}
                  className={`px-4 py-3 rounded-xl font-bold text-xs transition-colors ${
                    isObsidian
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
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
        <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 ${
          isObsidian ? 'bg-black/85' : 'bg-black/65'
        }`}>
          <div className={`rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto border ${
            isObsidian ? 'bg-[#0E0E12] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isObsidian ? 'border-neutral-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl font-black ${
                  isObsidian ? 'bg-amber-400 text-black' : 'bg-slate-900 text-amber-300'
                }`}>
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm tracking-tight ${isObsidian ? 'text-white' : 'text-slate-900'}`}>Add Stock Checker to Home Screen</h3>
                  <p className={`text-[11px] ${isObsidian ? 'text-neutral-400' : 'text-slate-500'}`}>Launch directly in 1-tap from your phone</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className={`p-1.5 rounded-full transition-colors ${
                  isObsidian ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Link Box with 1-Tap Copy */}
            <div className={`p-3 rounded-2xl border space-y-1.5 ${
              isObsidian ? 'bg-[#14141A] border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-[11px]">
                <span className={isObsidian ? 'text-neutral-400' : 'text-slate-500'}>Direct Staff Link:</span>
                <button
                  type="button"
                  onClick={copyDirectStockLink}
                  className="text-amber-500 dark:text-amber-400 font-bold flex items-center gap-1 hover:underline"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
              <p className={`font-mono text-xs font-bold break-all select-all ${
                isObsidian ? 'text-amber-400' : 'text-slate-900'
              }`}>
                https://cobb-store.web.app/#stock
              </p>
            </div>

            {/* Step-by-Step for Chrome & Safari */}
            <div className="space-y-2.5 text-xs">
              <div className={`p-3 rounded-2xl border space-y-1 ${
                isObsidian ? 'bg-[#14141A] border-neutral-800/80 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <p className="font-black text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                  <span>🤖</span>
                  <span>Google Chrome (Android)</span>
                </p>
                <ol className={`list-decimal list-inside space-y-1 text-[11.5px] leading-relaxed ${
                  isObsidian ? 'text-neutral-300' : 'text-slate-600'
                }`}>
                  <li>Tap the <strong>3 dots (⋮)</strong> menu in Chrome at top right.</li>
                  <li>Select <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install app&quot;</strong>.</li>
                  <li>Tap <strong>&quot;Install / Add&quot;</strong>.</li>
                  <li>The <strong>Cobb Stock</strong> icon is now on your phone home screen!</li>
                </ol>
              </div>

              <div className={`p-3 rounded-2xl border space-y-1 ${
                isObsidian ? 'bg-[#14141A] border-neutral-800/80 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <p className="font-black text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                  <span>🍎</span>
                  <span>iPhone / Safari (iOS)</span>
                </p>
                <ol className={`list-decimal list-inside space-y-1 text-[11.5px] leading-relaxed ${
                  isObsidian ? 'text-neutral-300' : 'text-slate-600'
                }`}>
                  <li>Tap the <strong>Share (📤)</strong> button at the bottom of Safari.</li>
                  <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot; (➕)</strong>.</li>
                  <li>Tap <strong>&quot;Add&quot;</strong> at the top right.</li>
                </ol>
              </div>

              <div className={`p-3 rounded-2xl border space-y-1 ${
                isObsidian ? 'bg-[#14141A] border-neutral-800/80 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <p className="font-black text-sky-500 dark:text-sky-400 flex items-center gap-1.5">
                  <span>💻</span>
                  <span>Desktop Chrome / Edge</span>
                </p>
                <ol className={`list-decimal list-inside space-y-1 text-[11.5px] leading-relaxed ${
                  isObsidian ? 'text-neutral-300' : 'text-slate-600'
                }`}>
                  <li>Click the <strong>Install icon</strong> in the right side of the address bar.</li>
                  <li>Or tap <strong>⋮ ➔ Save and share ➔ Create shortcut...</strong></li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className={`w-full py-2.5 rounded-xl font-black text-xs transition-all active:scale-98 shadow-sm ${
                isObsidian
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:brightness-110 shadow-amber-500/10'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* --- Thumb-Friendly Floor Mobile Bottom Bar --- */}
      <nav aria-label="Floor Staff Navigation" className={`fixed bottom-0 inset-x-0 z-40 px-3 py-2 flex items-center justify-around gap-2 ${
        isObsidian
          ? 'bg-[#0A0A0E]/95 border-t border-neutral-800 shadow-[0_-4px_20px_rgba(0,0,0,0.8)]'
          : 'bg-white/95 border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
      }`}>
        {/* Tab 1: Check Stock */}
        <button
          type="button"
          onClick={() => setActiveMainTab('stock')}
          className={`flex-1 py-2 px-2.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
            activeMainTab === 'stock'
              ? isObsidian
                ? 'bg-amber-400 text-black font-black shadow-md shadow-amber-400/20'
                : 'bg-slate-900 text-white font-black shadow-md'
              : isObsidian
                ? 'text-neutral-400 hover:bg-neutral-900'
                : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" />
          <span className="text-[11px] font-black tracking-tight">Check Stock</span>
        </button>

        {/* Tab 2: Damage Bin (Defect Desk) */}
        <button
          type="button"
          aria-label="Damage Bin Desk"
          onClick={() => setActiveMainTab('defect')}
          className={`flex-1 py-2 px-2.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
            activeMainTab === 'defect'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : isObsidian
                ? 'text-neutral-400 hover:bg-neutral-900'
                : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <div className="relative">
            <ShieldAlert className="w-4 h-4" />
            {quarantinedDamages.length > 0 && (
              <span className="absolute -top-1.5 -right-3 px-1 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white">
                {quarantinedDamages.length}
              </span>
            )}
          </div>
          <span className="text-[11px] font-black tracking-tight">Damage Bin</span>
        </button>

        {/* Tab 3: Fast Camera Scan Defect */}
        <button
          type="button"
          aria-label="Scan Defect"
          onClick={handleStartDefectScan}
          className={`flex-1 py-2 px-2.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 border ${
            isObsidian
              ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/40'
              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
          }`}
        >
          <Camera className="w-4 h-4 text-rose-500" />
          <span className="text-[11px] font-black tracking-tight">Scan Defect</span>
        </button>
      </nav>
    </div>
  );
}
