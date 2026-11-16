import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Barcode,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Package,
  Layers,
  Download,
  Printer,
  RefreshCw,
  Camera,
  ArrowRight,
  Sparkles,
  Volume2,
  VolumeX,
  ClipboardCheck,
  Check,
  Flag,
  RotateCcw,
  Tag,
  ShieldAlert,
  ArrowUpDown,
  Sliders,
  ChevronDown,
  Info
} from 'lucide-react';
import axios from 'axios';
import { playBarcodeBeep, playScanErrorBeep, playCheckoutChime, getSoundSettings, saveSoundSettings } from '../utils/sound';

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

const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function RackAuditModal({
  isOpen,
  onClose,
  API_BASE = '',
  darkMode = true,
  currentAuditor = 'Owner / Manager',
  activeStore = 'DEMO_STORE_001',
  initialSection = '',
  initialSubSection = ''
}) {
  // Phase: 'SETUP' | 'AUDIT'
  const [phase, setPhase] = useState('SETUP');

  // Metadata from backend
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Setup Form State
  const [selectedRackName, setSelectedRackName] = useState("Men's Formal Shirts - Section A");
  const [selectedSection, setSelectedSection] = useState(initialSection || 'MENSWEAR');
  const [selectedSubSection, setSelectedSubSection] = useState(initialSubSection || 'SHIRTS FULL SL');
  const [auditorName, setAuditorName] = useState(currentAuditor || 'Showroom Staff');

  // Audit State
  const [expectedItems, setExpectedItems] = useState([]);
  const [expectedLoading, setExpectedLoading] = useState(false);
  const [scannedMap, setScannedMap] = useState({}); // barcode -> { count, firstScannedAt, item }
  const [surpriseItems, setSurpriseItems] = useState([]); // items scanned but not expected in this section
  const [activeTab, setActiveTab] = useState('MISSING'); // 'MISSING' | 'SURPRISE' | 'VERIFIED' | 'ALL'

  // Scanner Input State
  const [scanQuery, setScanQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanAlert, setLastScanAlert] = useState(null); // { type: 'MATCH'|'SURPRISE'|'DUPLICATE'|'NOT_FOUND', item }
  const [soundEnabled, setSoundEnabled] = useState(() => getSoundSettings().soundEnabled);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | null
  const [flagStatus, setFlagStatus] = useState(null); // 'flagging' | 'flagged' | null

  const inputRef = useRef(null);
  const cameraScannerRef = useRef(null);

  // 1. Fetch available sections, categories & rack presets
  const loadMetadata = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const res = await axios.get(`${API_BASE || ''}/api/inventory/rack-audit/sections`);
      if (res.data?.success) {
        setSections(res.data.sections || []);
        setCategories(res.data.categories || []);
        setPresets(res.data.presets || []);

        if (!selectedSection && res.data.sections?.length > 0) {
          setSelectedSection(res.data.sections[0]);
        }
      }
    } catch (err) {
      console.warn('[RackAudit] Meta load err:', err.message);
    } finally {
      setLoadingMeta(false);
    }
  }, [API_BASE, selectedSection]);

  useEffect(() => {
    if (isOpen) {
      loadMetadata();
    }
  }, [isOpen, loadMetadata]);

  // Keep scanner input focused during audit
  useEffect(() => {
    if (isOpen && phase === 'AUDIT' && inputRef.current && !showCameraScanner) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, phase, showCameraScanner, lastScanAlert]);

  // Filtered categories for selected section
  const availableSubSections = useMemo(() => {
    if (!selectedSection || selectedSection === 'ALL') return categories;
    return categories.filter(c => c.section === selectedSection);
  }, [categories, selectedSection]);

  // Handle Preset Selection
  const applyPreset = (preset) => {
    setSelectedRackName(preset.name);
    setSelectedSection(preset.section);
    setSelectedSubSection(preset.subSection);
  };

  // 2. Start Audit: Fetch expected inventory for selected Section & Sub-Section
  const handleStartAudit = async () => {
    setExpectedLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSection && selectedSection !== 'ALL') params.append('section', selectedSection);
      if (selectedSubSection && selectedSubSection !== 'ALL') params.append('subSection', selectedSubSection);

      const res = await axios.get(`${API_BASE || ''}/api/inventory/rack-audit/expected?${params.toString()}`);
      if (res.data?.success) {
        setExpectedItems(res.data.items || []);
        setScannedMap({});
        setSurpriseItems([]);
        setLastScanAlert(null);
        setSaveStatus(null);
        setFlagStatus(null);
        setPhase('AUDIT');
        setActiveTab('MISSING');
      } else {
        alert(res.data?.message || 'Failed to fetch expected inventory');
      }
    } catch (err) {
      alert(`Error starting audit: ${err.message}`);
    } finally {
      setExpectedLoading(false);
    }
  };

  // 3. Fast Map Lookup for Expected Items
  const expectedBarcodeMap = useMemo(() => {
    const map = {};
    for (const item of expectedItems) {
      const code = String(item.barcode || '').trim().toUpperCase();
      if (code) {
        map[code] = item;
        // Also map unpadded digits
        const unpadded = code.replace(/^0+/, '') || code;
        map[unpadded] = item;
        if (item.vendorEan) {
          map[String(item.vendorEan).trim().toUpperCase()] = item;
        }
      }
    }
    return map;
  }, [expectedItems]);

  // 4. Rapid Gun Scanner Barcode Handler
  const processScannedBarcode = async (rawCode) => {
    const code = String(rawCode || '').trim();
    if (!code) return;

    const upperCode = code.toUpperCase();
    const cleanDigits = upperCode.replace(/^0+/, '') || upperCode;

    // Check if expected on this rack
    const expectedMatch = expectedBarcodeMap[upperCode] || expectedBarcodeMap[cleanDigits];

    if (expectedMatch) {
      const primaryKey = expectedMatch.barcode;
      const alreadyScanned = Boolean(scannedMap[primaryKey]);

      setScannedMap(prev => {
        const existing = prev[primaryKey] || { count: 0, firstScannedAt: new Date().toISOString(), item: expectedMatch };
        return {
          ...prev,
          [primaryKey]: {
            ...existing,
            count: existing.count + 1
          }
        };
      });

      if (alreadyScanned) {
        if (soundEnabled) playScanErrorBeep();
        setLastScanAlert({
          type: 'DUPLICATE',
          message: `Already scanned (${(scannedMap[primaryKey]?.count || 1) + 1}x on rack)`,
          item: expectedMatch
        });
      } else {
        if (soundEnabled) playBarcodeBeep();
        setLastScanAlert({
          type: 'MATCH',
          message: 'Matched Expected Rack Item',
          item: expectedMatch
        });
      }
    } else {
      // Garment is NOT in the expected list for this rack!
      // Check if already in surprise list
      const alreadySurprise = surpriseItems.find(s => s.barcode === code || s.barcode === cleanDigits);
      if (alreadySurprise) {
        if (soundEnabled) playScanErrorBeep();
        setLastScanAlert({
          type: 'DUPLICATE',
          message: 'Duplicate surprise garment already recorded',
          item: alreadySurprise
        });
        return;
      }

      // Query lookup to find what garment this is and where it belongs
      try {
        const res = await axios.get(`${API_BASE || ''}/api/inventory/rack-audit/lookup?barcode=${encodeURIComponent(code)}`);
        if (res.data?.success) {
          const item = res.data;
          const surpriseItem = {
            ...item,
            scannedAt: new Date().toISOString(),
            expectedSection: item.sectionName,
            expectedSubSection: item.subSectionName
          };

          setSurpriseItems(prev => [surpriseItem, ...prev]);
          if (soundEnabled) playScanErrorBeep();
          setLastScanAlert({
            type: 'SURPRISE',
            message: `MISPLACED! Belongs to ${item.sectionName} > ${item.subSectionName}`,
            item: surpriseItem
          });
        } else {
          // Unrecognized barcode
          const unknownItem = {
            barcode: code,
            articleNo: 'UNKNOWN-SKU',
            itemName: 'Unrecorded / Foreign Barcode',
            sectionName: 'UNKNOWN',
            subSectionName: 'UNKNOWN',
            color: 'N/A',
            size: 'N/A',
            mrp: 0,
            scannedAt: new Date().toISOString()
          };
          setSurpriseItems(prev => [unknownItem, ...prev]);
          if (soundEnabled) playScanErrorBeep();
          setLastScanAlert({
            type: 'NOT_FOUND',
            message: 'Unrecorded Barcode (Not in Showroom Database)',
            item: unknownItem
          });
        }
      } catch (err) {
        if (soundEnabled) playScanErrorBeep();
        setLastScanAlert({
          type: 'NOT_FOUND',
          message: `Lookup error: ${err.message}`,
          item: { barcode: code, itemName: 'Scan Error' }
        });
      }
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!scanQuery.trim()) return;
    processScannedBarcode(scanQuery.trim());
    setScanQuery('');
  };

  // 5. Tally & Metrics Calculation
  const totalExpectedPcs = useMemo(() => {
    return expectedItems.reduce((s, r) => s + (r.expectedQty || 1), 0);
  }, [expectedItems]);

  const verifiedMatches = useMemo(() => {
    return Object.values(scannedMap).map(s => s.item);
  }, [scannedMap]);

  const verifiedScannedCount = useMemo(() => {
    return Object.keys(scannedMap).length;
  }, [scannedMap]);

  const missingItems = useMemo(() => {
    return expectedItems.filter(item => !scannedMap[item.barcode]);
  }, [expectedItems, scannedMap]);

  const totalMissingPcs = useMemo(() => {
    return missingItems.reduce((s, r) => s + (r.expectedQty || 1), 0);
  }, [missingItems]);

  const totalMissingValue = useMemo(() => {
    return missingItems.reduce((s, r) => s + (r.mrp * (r.expectedQty || 1)), 0);
  }, [missingItems]);

  const accuracyPct = useMemo(() => {
    if (totalExpectedPcs === 0) return 100;
    const match = Math.min(verifiedScannedCount, totalExpectedPcs);
    return Math.round((match / totalExpectedPcs) * 100);
  }, [totalExpectedPcs, verifiedScannedCount]);

  // 6. Camera Scanner Toggle (Mobile / Tablet sales floor staff)
  const toggleCameraScanner = () => {
    if (showCameraScanner) {
      if (cameraScannerRef.current) {
        cameraScannerRef.current.stop().catch(() => {});
        cameraScannerRef.current = null;
      }
      setShowCameraScanner(false);
      setCameraError(null);
    } else {
      setShowCameraScanner(true);
      setCameraError(null);
      setTimeout(startCameraScanner, 200);
    }
  };

  const startCameraScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('rack-audit-reader');
      cameraScannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          processScannedBarcode(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setCameraError(err.message || 'Unable to access rear camera');
    }
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (cameraScannerRef.current) {
        cameraScannerRef.current.stop().catch(() => {});
        cameraScannerRef.current = null;
      }
    };
  }, []);

  // 7. Save Audit Session to Local + Cloud
  const handleSaveAudit = async () => {
    setSaveStatus('saving');
    try {
      const payload = {
        id: `AUDIT-${Date.now()}`,
        rackName: selectedRackName,
        section: selectedSection,
        subSection: selectedSubSection,
        auditor: auditorName,
        expectedCount: totalExpectedPcs,
        scannedCount: verifiedScannedCount,
        missingCount: totalMissingPcs,
        surpriseCount: surpriseItems.length,
        matchedCount: verifiedScannedCount,
        accuracyPct,
        scannedItems: verifiedMatches,
        missingItems,
        surpriseItems,
        notes: `Physical cycle count of ${selectedRackName}. Accuracy: ${accuracyPct}%.`
      };

      const res = await axios.post(`${API_BASE || ''}/api/inventory/rack-audit/save`, payload);
      if (res.data?.success) {
        setSaveStatus('saved');
        if (soundEnabled) playCheckoutChime();
      } else {
        alert(res.data?.message || 'Failed to save audit');
        setSaveStatus(null);
      }
    } catch (err) {
      alert(`Error saving audit: ${err.message}`);
      setSaveStatus(null);
    }
  };

  // 8. Flag Missing Garments to Investigation Queue
  const handleFlagMissing = async () => {
    if (missingItems.length === 0) {
      alert('No missing garments on this rack to flag!');
      return;
    }
    setFlagStatus('flagging');
    try {
      const res = await axios.post(`${API_BASE || ''}/api/inventory/rack-audit/flag-missing`, {
        auditId: `AUDIT-${selectedRackName.replace(/\s+/g, '_')}-${Date.now()}`,
        rackName: selectedRackName,
        missingItems
      });
      if (res.data?.success) {
        setFlagStatus('flagged');
      } else {
        alert(res.data?.message || 'Failed to flag missing items');
        setFlagStatus(null);
      }
    } catch (err) {
      alert(`Error flagging items: ${err.message}`);
      setFlagStatus(null);
    }
  };

  // 9. Export Audit Sheet (CSV / Excel)
  const handleExportCSV = () => {
    const timestamp = new Date().toLocaleString('en-IN');
    const headerLines = [
      `"COBB ITALY - PHYSICAL RACK AUDIT / CYCLE COUNT REPORT"`,
      `"Rack Name:","${selectedRackName}"`,
      `"Target Section:","${selectedSection}"`,
      `"Category:","${selectedSubSection}"`,
      `"Auditor:","${auditorName}"`,
      `"Audit Time:","${timestamp}"`,
      `"Expected Pcs:","${totalExpectedPcs}"`,
      `"Physically Scanned:","${verifiedScannedCount}"`,
      `"Missing Pcs:","${totalMissingPcs}"`,
      `"Surprise / Wrong Rack:","${surpriseItems.length}"`,
      `"Rack Accuracy:","${accuracyPct}%"`,
      `""`,
      `"STATUS","BARCODE","ARTICLE NO","DESCRIPTION","COLOR","SIZE","MRP","EXPECTED QTY","SCANNED QTY","REMARKS"`
    ];

    const missingRows = missingItems.map(item =>
      `"MISSING","${item.barcode}","${item.articleNo}","${item.itemName}","${item.color}","${item.size}","${item.mrp}","${item.expectedQty || 1}","0","Expected but not found on rack"`
    );

    const surpriseRows = surpriseItems.map(item =>
      `"WRONG_RACK","${item.barcode}","${item.articleNo}","${item.itemName}","${item.color}","${item.size}","${item.mrp}","0","1","Misplaced! Belongs to: ${item.expectedSection || 'OTHER'} > ${item.expectedSubSection || 'OTHER'}"`
    );

    const verifiedRows = verifiedMatches.map(item =>
      `"VERIFIED","${item.barcode}","${item.articleNo}","${item.itemName}","${item.color}","${item.size}","${item.mrp}","${item.expectedQty || 1}","${scannedMap[item.barcode]?.count || 1}","Confirmed on rack"`
    );

    const csvContent = "data:text/csv;charset=utf-8," + [...headerLines, ...missingRows, ...surpriseRows, ...verifiedRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cobb_RackAudit_${selectedRackName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 10. Thermal Receipt Slip Print (80mm)
  const handlePrintThermalSlip = () => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>COBB Rack Audit - ${selectedRackName}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body {
              font-family: 'Courier New', monospace;
              width: 76mm;
              margin: 0 auto;
              padding: 4mm;
              font-size: 11px;
              color: #000;
              background: #fff;
              line-height: 1.3;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .title { font-size: 14px; margin-bottom: 2px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
            th { text-align: left; border-bottom: 1px dashed #000; padding: 2px 0; }
            td { padding: 3px 0; vertical-align: top; }
            .tag { padding: 1px 3px; border: 1px solid #000; font-size: 9px; }
          </style>
        </head>
        <body>
          <div class="center bold title">COBB SHOWROOM</div>
          <div class="center">PHYSICAL RACK CYCLE COUNT</div>
          <div class="divider"></div>
          <div class="flex-between"><span>Rack:</span><span class="bold">${selectedRackName}</span></div>
          <div class="flex-between"><span>Section:</span><span>${selectedSection}</span></div>
          <div class="flex-between"><span>Category:</span><span>${selectedSubSection}</span></div>
          <div class="flex-between"><span>Auditor:</span><span>${auditorName}</span></div>
          <div class="flex-between"><span>Date/Time:</span><span>${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
          
          <div class="divider"></div>
          <div class="flex-between bold"><span>EXPECTED ON RACK:</span><span>${totalExpectedPcs} Pcs</span></div>
          <div class="flex-between bold"><span>PHYSICALLY SCANNED:</span><span>${verifiedScannedCount} Pcs</span></div>
          <div class="flex-between bold"><span>MISSING / SHRINKAGE:</span><span>${totalMissingPcs} Pcs</span></div>
          <div class="flex-between bold"><span>WRONG RACK / SURPRISE:</span><span>${surpriseItems.length} Pcs</span></div>
          <div class="flex-between bold"><span>RACK ACCURACY:</span><span>${accuracyPct}%</span></div>
          
          ${missingItems.length > 0 ? `
            <div class="divider"></div>
            <div class="bold">MISSING GARMENTS (${missingItems.length}):</div>
            <table>
              <tr><th>Barcode</th><th>Art / Size</th><th>MRP</th></tr>
              ${missingItems.map(m => `
                <tr>
                  <td>${m.barcode}</td>
                  <td>${m.articleNo}<br>${m.color} | ${m.size}</td>
                  <td>₹${m.mrp}</td>
                </tr>
              `).join('')}
            </table>
          ` : ''}

          ${surpriseItems.length > 0 ? `
            <div class="divider"></div>
            <div class="bold">MISPLACED / WRONG RACK (${surpriseItems.length}):</div>
            <table>
              <tr><th>Barcode</th><th>Item</th><th>Should Be In</th></tr>
              ${surpriseItems.map(s => `
                <tr>
                  <td>${s.barcode}</td>
                  <td>${s.articleNo}<br>${s.color} | ${s.size}</td>
                  <td>${s.expectedSection || 'OTHER'}</td>
                </tr>
              `).join('')}
            </table>
          ` : ''}

          <div class="divider"></div>
          <div class="center" style="font-size: 9px; margin-top: 8px;">
            Auditor Signature: ____________________<br>
            Manager Verified: ____________________<br>
            COBB POS INTELLIGENCE
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
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
        darkMode ? 'bg-[#0a0a0a] border-white/10 text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
      }`}>

        {/* ============================================================== */}
        {/* 1. HEADER WITH BRANDING & CONTROLS                             */}
        {/* ============================================================== */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
          darkMode ? 'bg-[#121212] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-red-600/30 overflow-hidden flex items-center justify-center shrink-0 shadow-md shadow-red-600/20">
              <img src="/cobb-logo.png" alt="Cobb" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black uppercase tracking-wider text-white">COB</span>
                <span className="text-base font-black uppercase tracking-wider text-red-600 -ml-2">B</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600/20 border border-red-600/40 text-red-400">
                  RACK AUDIT & CYCLE COUNT
                </span>
                {phase === 'AUDIT' && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> LIVE SCANNER
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                {phase === 'SETUP' ? 'Configure showroom rack bay and target inventory section' : `${selectedRackName} • Auditor: ${auditorName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                saveSoundSettings({ soundEnabled: next });
              }}
              className={`p-2 rounded-xl border transition-all active:scale-95 ${
                soundEnabled
                  ? (darkMode ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700')
                  : (darkMode ? 'bg-white/5 border-white/10 text-zinc-500' : 'bg-slate-100 border-slate-200 text-slate-400')
              }`}
              title={soundEnabled ? 'Scanner Beeps Enabled' : 'Sound Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-all hover:rotate-90 duration-200 active:scale-95 ${
                darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. PHASE CONTENT: SETUP vs AUDIT SCANNER                        */}
        {/* ============================================================== */}
        {phase === 'SETUP' ? (
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            {/* Showroom Rack Presets */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-red-500" />
                  Quick Showroom Bay Presets
                </label>
                <span className="text-[11px] text-zinc-500 font-medium">1-Click setup standard floor bays</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {presets.map((preset) => {
                  const isSelected = selectedRackName === preset.name;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`p-3 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-red-600/15 border-red-600 text-white shadow-sm shadow-red-600/20'
                          : darkMode ? 'bg-white/5 border-white/5 hover:border-white/20 text-zinc-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight block">{preset.name}</span>
                      <span className="text-[9px] font-semibold text-zinc-500 mt-2 block uppercase tracking-wider truncate">
                        {preset.subSection}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Configuration Details */}
            <div className={`p-5 rounded-2xl border space-y-4 ${
              darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/50 border-slate-200'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rack / Bay Identifier */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Rack / Bay Identifier
                  </label>
                  <input
                    type="text"
                    value={selectedRackName}
                    onChange={(e) => setSelectedRackName(e.target.value)}
                    placeholder="e.g. Rack 03 - Men's Formal Shirts"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-red-500 ${
                      darkMode ? 'bg-black border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Auditor Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Auditor / Staff Name
                  </label>
                  <input
                    type="text"
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    placeholder="e.g. Owner / Rohit"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-red-500 ${
                      darkMode ? 'bg-black border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Section Select */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Target Floor Section
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => {
                      setSelectedSection(e.target.value);
                      setSelectedSubSection('ALL');
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-red-500 ${
                      darkMode ? 'bg-black border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="ALL">All Sections (Entire Store)</option>
                    {sections.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Sub-Section / Category Select */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Category / Sub-Section Rack
                  </label>
                  <select
                    value={selectedSubSection}
                    onChange={(e) => setSelectedSubSection(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-red-500 ${
                      darkMode ? 'bg-black border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="ALL">All Categories in this Section</option>
                    {availableSubSections.map(c => (
                      <option key={c.subSection} value={c.subSection}>
                        {c.subSection} ({c.totalStock} pcs in stock)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2.5 rounded-xl border font-bold text-xs transition active:scale-95 ${
                  darkMode ? 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={expectedLoading || !selectedRackName}
                onClick={handleStartAudit}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-xs tracking-wide shadow-lg shadow-red-600/30 flex items-center gap-2 transition disabled:opacity-50"
              >
                {expectedLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading Expected Garments...
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    Launch Rapid Gun Scanner
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* AUDIT SCANNING & TALLY WORKSPACE                             */
          /* ============================================================ */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Top Bar: Gun Scanner Input & Live Stats */}
            <div className={`p-4 border-b space-y-3 shrink-0 ${
              darkMode ? 'bg-[#0f0f0f] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              {/* Gun Barcode Input */}
              <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-2.5 flex items-center gap-1.5 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <Barcode className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={scanQuery}
                    onChange={(e) => setScanQuery(e.target.value)}
                    placeholder="READY TO SCAN: Point Gun Scanner at barcode tag or type number..."
                    className={`w-full pl-12 pr-10 py-2.5 rounded-2xl border-2 text-sm font-bold tracking-wide focus:outline-none transition-all ${
                      darkMode 
                        ? 'bg-black border-emerald-500/50 focus:border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                        : 'bg-white border-emerald-500 focus:border-emerald-600 text-slate-900 shadow-sm'
                    }`}
                  />
                  {scanQuery && (
                    <button
                      type="button"
                      onClick={() => setScanQuery('')}
                      className="absolute right-3 top-3 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!scanQuery.trim()}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide shadow-md shadow-emerald-600/30 active:scale-95 transition disabled:opacity-40"
                >
                  Enter
                </button>

                {/* Mobile Camera Scanner Toggle */}
                <button
                  type="button"
                  onClick={toggleCameraScanner}
                  className={`p-2.5 rounded-2xl border font-bold text-xs flex items-center gap-1.5 transition active:scale-95 ${
                    showCameraScanner
                      ? 'bg-red-600 text-white border-red-600'
                      : darkMode ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Camera Barcode Scanner"
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">{showCameraScanner ? 'Close Cam' : 'Camera'}</span>
                </button>
              </form>

              {/* Camera Scanner Container */}
              {showCameraScanner && (
                <div className="p-3 rounded-2xl border border-red-600/30 bg-black/90 flex flex-col items-center">
                  <div id="rack-audit-reader" className="w-full max-w-sm overflow-hidden rounded-xl" />
                  {cameraError && (
                    <p className="text-xs text-rose-400 mt-2 font-medium">{cameraError}</p>
                  )}
                </div>
              )}

              {/* Recent Scan Flash Toast */}
              {lastScanAlert && (
                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs animate-in slide-in-from-top-1 duration-150 ${
                  lastScanAlert.type === 'MATCH'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : lastScanAlert.type === 'DUPLICATE'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-red-600/20 border-red-600/40 text-red-300'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {lastScanAlert.type === 'MATCH' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className="font-bold truncate">{lastScanAlert.message}</span>
                    {lastScanAlert.item && (
                      <span className="text-[11px] opacity-80 truncate hidden sm:inline">
                        — {lastScanAlert.item.barcode} • {lastScanAlert.item.articleNo} ({lastScanAlert.item.color || 'Standard'} / {lastScanAlert.item.size || 'N/A'})
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] font-bold shrink-0">
                    {lastScanAlert.item?.mrp ? formatCurrency(lastScanAlert.item.mrp) : ''}
                  </span>
                </div>
              )}

              {/* 4 Real-Time Live Tally Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. Expected in System */}
                <div className={`p-3 rounded-2xl border ${
                  darkMode ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Expected System</span>
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-blue-400 font-mono">{totalExpectedPcs}</span>
                    <span className="text-xs text-zinc-500 font-bold">Pcs</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 truncate block mt-0.5">
                    {selectedSubSection || selectedSection}
                  </span>
                </div>

                {/* 2. Physically Scanned */}
                <div className={`p-3 rounded-2xl border ${
                  darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Physically Scanned</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-emerald-400 font-mono">{verifiedScannedCount}</span>
                    <span className="text-xs text-emerald-500 font-bold">Pcs</span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80 font-bold block mt-0.5">
                    {accuracyPct}% Accuracy
                  </span>
                </div>

                {/* 3. Missing Garments */}
                <div className={`p-3 rounded-2xl border ${
                  totalMissingPcs > 0
                    ? (darkMode ? 'bg-red-600/10 border-red-600/30' : 'bg-red-50 border-red-200')
                    : (darkMode ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Missing Garments</span>
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-red-500 font-mono">{totalMissingPcs}</span>
                    <span className="text-xs text-red-400 font-bold">Pcs</span>
                  </div>
                  <span className="text-[10px] text-red-400 font-bold truncate block mt-0.5">
                    {totalMissingValue > 0 ? formatCurrency(totalMissingValue) : 'All Accounted'}
                  </span>
                </div>

                {/* 4. Surprise / Wrong Rack */}
                <div className={`p-3 rounded-2xl border ${
                  surpriseItems.length > 0
                    ? (darkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200')
                    : (darkMode ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200')
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Wrong Rack / Surprise</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-amber-500 font-mono">{surpriseItems.length}</span>
                    <span className="text-xs text-amber-400 font-bold">Pcs</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold truncate block mt-0.5">
                    {surpriseItems.length > 0 ? 'Relocate to home rack' : 'Zero misplaced'}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Section: Tally Tabs & Itemized Tables */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Tab Selector */}
              <div className={`px-4 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
                darkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-slate-100 border-slate-200'
              }`}>
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
                  {/* Missing Garments Tab */}
                  <button
                    onClick={() => setActiveTab('MISSING')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      activeTab === 'MISSING'
                        ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                        : darkMode ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span>⚠️ Missing Garments</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-white">
                      {totalMissingPcs}
                    </span>
                  </button>

                  {/* Wrong Rack / Surprise Tab */}
                  <button
                    onClick={() => setActiveTab('SURPRISE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      activeTab === 'SURPRISE'
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                        : darkMode ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span>🚨 Wrong Rack / Surprise</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-white">
                      {surpriseItems.length}
                    </span>
                  </button>

                  {/* Verified Matches Tab */}
                  <button
                    onClick={() => setActiveTab('VERIFIED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      activeTab === 'VERIFIED'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : darkMode ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span>✅ Verified on Rack</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-white">
                      {verifiedScannedCount}
                    </span>
                  </button>

                  {/* Master Comparison All Tab */}
                  <button
                    onClick={() => setActiveTab('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      activeTab === 'ALL'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : darkMode ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span>📋 All Items</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-white">
                      {expectedItems.length + surpriseItems.length}
                    </span>
                  </button>
                </div>

                <span className="text-[11px] text-zinc-500 font-medium hidden sm:inline">
                  {activeTab === 'MISSING' && 'Expected in system but not physically found on rack'}
                  {activeTab === 'SURPRISE' && 'Garments scanned on this rack that belong elsewhere'}
                  {activeTab === 'VERIFIED' && 'Physically scanned and confirmed in stock'}
                  {activeTab === 'ALL' && 'Full comparison ledger'}
                </span>
              </div>

              {/* Table / List Workspace */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {/* 1. Missing Garments Table */}
                {activeTab === 'MISSING' && (
                  missingItems.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-emerald-400">Perfect 100% Match!</p>
                      <p className="text-xs text-zinc-500">Every expected piece in this section has been physically accounted for.</p>
                    </div>
                  ) : (
                    <div className="border rounded-2xl overflow-hidden border-white/5">
                      <table className="w-full text-left text-xs">
                        <thead className={`text-[10px] font-black uppercase tracking-wider ${
                          darkMode ? 'bg-white/5 text-zinc-400' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <tr>
                            <th className="py-2.5 px-3">Barcode</th>
                            <th className="py-2.5 px-3">Style / Article</th>
                            <th className="py-2.5 px-3">Garment Description</th>
                            <th className="py-2.5 px-3">Color</th>
                            <th className="py-2.5 px-3">Size</th>
                            <th className="py-2.5 px-3">MRP</th>
                            <th className="py-2.5 px-3 text-right">System Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium">
                          {missingItems.map((item) => (
                            <tr key={item.barcode} className={`transition ${darkMode ? 'hover:bg-red-500/5' : 'hover:bg-red-50/50'}`}>
                              <td className="py-2 px-3 font-mono text-[11px] font-bold text-red-400">
                                {item.barcode}
                              </td>
                              <td className="py-2 px-3 font-bold text-white">
                                {item.articleNo}
                              </td>
                              <td className="py-2 px-3 text-zinc-300">
                                {item.itemName}
                              </td>
                              <td className="py-2 px-3">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20" style={{ backgroundColor: getColorDot(item.color) }} />
                                  <span>{item.color}</span>
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-white/10 font-bold text-[10px]">
                                  {item.size}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-zinc-300">
                                {formatCurrency(item.mrp)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-black text-red-400">
                                {item.expectedQty || 1} Pc
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* 2. Wrong Rack / Surprise Table */}
                {activeTab === 'SURPRISE' && (
                  surpriseItems.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                        <Check className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-blue-400">Zero Misplaced Items</p>
                      <p className="text-xs text-zinc-500">No garments belonging to other racks were found in this bay.</p>
                    </div>
                  ) : (
                    <div className="border rounded-2xl overflow-hidden border-amber-500/20">
                      <table className="w-full text-left text-xs">
                        <thead className={`text-[10px] font-black uppercase tracking-wider ${
                          darkMode ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-800'
                        }`}>
                          <tr>
                            <th className="py-2.5 px-3">Barcode</th>
                            <th className="py-2.5 px-3">Style / Article</th>
                            <th className="py-2.5 px-3">Item Description</th>
                            <th className="py-2.5 px-3">Color / Size</th>
                            <th className="py-2.5 px-3">MRP</th>
                            <th className="py-2.5 px-3 text-right">Correct Home Rack</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium">
                          {surpriseItems.map((item, idx) => (
                            <tr key={`${item.barcode}_${idx}`} className={`transition ${darkMode ? 'hover:bg-amber-500/5' : 'hover:bg-amber-50/50'}`}>
                              <td className="py-2 px-3 font-mono text-[11px] font-bold text-amber-400">
                                {item.barcode}
                              </td>
                              <td className="py-2 px-3 font-bold text-white">
                                {item.articleNo}
                              </td>
                              <td className="py-2 px-3 text-zinc-300">
                                {item.itemName}
                              </td>
                              <td className="py-2 px-3">
                                {item.color} • {item.size}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-zinc-300">
                                {formatCurrency(item.mrp)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                  👉 Move to: {item.expectedSection || 'OTHER'} &gt; {item.expectedSubSection || 'OTHER'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* 3. Verified & Matched Items Table */}
                {activeTab === 'VERIFIED' && (
                  verifiedMatches.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      No garments scanned yet. Shoot barcodes using the gun scanner above to verify.
                    </div>
                  ) : (
                    <div className="border rounded-2xl overflow-hidden border-emerald-500/20">
                      <table className="w-full text-left text-xs">
                        <thead className={`text-[10px] font-black uppercase tracking-wider ${
                          darkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          <tr>
                            <th className="py-2.5 px-3">Barcode</th>
                            <th className="py-2.5 px-3">Style / Article</th>
                            <th className="py-2.5 px-3">Item Description</th>
                            <th className="py-2.5 px-3">Color</th>
                            <th className="py-2.5 px-3">Size</th>
                            <th className="py-2.5 px-3">MRP</th>
                            <th className="py-2.5 px-3 text-right">Scanned Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium">
                          {verifiedMatches.map((item) => (
                            <tr key={item.barcode} className={`transition ${darkMode ? 'hover:bg-emerald-500/5' : 'hover:bg-emerald-50/50'}`}>
                              <td className="py-2 px-3 font-mono text-[11px] font-bold text-emerald-400">
                                {item.barcode}
                              </td>
                              <td className="py-2 px-3 font-bold text-white">
                                {item.articleNo}
                              </td>
                              <td className="py-2 px-3 text-zinc-300">
                                {item.itemName}
                              </td>
                              <td className="py-2 px-3">
                                {item.color}
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-white/10 font-bold text-[10px]">
                                  {item.size}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-zinc-300">
                                {formatCurrency(item.mrp)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-black text-emerald-400">
                                {scannedMap[item.barcode]?.count || 1} Pc
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* 4. Master Comparison All Tab */}
                {activeTab === 'ALL' && (
                  <div className="border rounded-2xl overflow-hidden border-white/5">
                    <table className="w-full text-left text-xs">
                      <thead className={`text-[10px] font-black uppercase tracking-wider ${
                        darkMode ? 'bg-white/5 text-zinc-400' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <tr>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Barcode</th>
                          <th className="py-2.5 px-3">Style / Article</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Color / Size</th>
                          <th className="py-2.5 px-3">Expected</th>
                          <th className="py-2.5 px-3 text-right">Scanned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {/* Expected Items */}
                        {expectedItems.map(item => {
                          const isScanned = Boolean(scannedMap[item.barcode]);
                          return (
                            <tr key={item.barcode} className={isScanned ? 'bg-emerald-500/5' : 'bg-red-500/5'}>
                              <td className="py-2 px-3">
                                {isScanned ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[9px]">
                                    VERIFIED
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-red-600/20 text-red-400 font-bold text-[9px]">
                                    MISSING
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold">{item.barcode}</td>
                              <td className="py-2 px-3 font-bold text-white">{item.articleNo}</td>
                              <td className="py-2 px-3 text-zinc-300">{item.itemName}</td>
                              <td className="py-2 px-3">{item.color} | {item.size}</td>
                              <td className="py-2 px-3 font-mono">{item.expectedQty || 1}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold">
                                {scannedMap[item.barcode]?.count || 0}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Surprise Items */}
                        {surpriseItems.map((item, idx) => (
                          <tr key={`surp_${item.barcode}_${idx}`} className="bg-amber-500/5">
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold text-[9px]">
                                WRONG RACK
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-amber-400">{item.barcode}</td>
                            <td className="py-2 px-3 font-bold text-white">{item.articleNo}</td>
                            <td className="py-2 px-3 text-zinc-300">{item.itemName}</td>
                            <td className="py-2 px-3">{item.color} | {item.size}</td>
                            <td className="py-2 px-3 font-mono text-zinc-500">0</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">1</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
              darkMode ? 'bg-[#121212] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                {/* Reset / New Rack */}
                <button
                  type="button"
                  onClick={() => setPhase('SETUP')}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                    darkMode ? 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Switch Rack</span>
                </button>

                {/* Export CSV */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                    darkMode ? 'bg-white/5 border-white/10 text-emerald-400 hover:bg-white/10' : 'bg-white border-slate-300 text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Report (CSV)</span>
                </button>

                {/* Print 80mm Slip */}
                <button
                  type="button"
                  onClick={handlePrintThermalSlip}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                    darkMode ? 'bg-white/5 border-white/10 text-blue-400 hover:bg-white/10' : 'bg-white border-slate-300 text-blue-700 hover:bg-slate-50'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print 80mm Slip</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Flag Missing Items to Investigation Queue */}
                {totalMissingPcs > 0 && (
                  <button
                    type="button"
                    disabled={flagStatus === 'flagging' || flagStatus === 'flagged'}
                    onClick={handleFlagMissing}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                      flagStatus === 'flagged'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-red-600/15 border-red-600/30 text-red-400 hover:bg-red-600/25'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{flagStatus === 'flagged' ? 'Flagged to Investigation' : 'Flag Missing to Investigation'}</span>
                  </button>
                )}

                {/* Finalize & Save Audit to Cloud */}
                <button
                  type="button"
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                  onClick={handleSaveAudit}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-xs tracking-wide shadow-md shadow-red-600/30 flex items-center gap-2 transition disabled:opacity-50"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving to Cloud...
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Audit Saved &amp; Synced
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Finalize &amp; Save Audit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
