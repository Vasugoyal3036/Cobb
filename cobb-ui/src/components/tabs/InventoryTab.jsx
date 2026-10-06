import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Printer, Download,
  Search, RefreshCw, X, Eye, Camera, ExternalLink, Package, ArrowUpDown, Filter,
  Layers, Maximize2, Minimize2, Check, Barcode
} from 'lucide-react';
import axios from 'axios';
import { db } from '../../utils/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

// Exact baseline data matching WizApp2020 RPD_AVATAR01_NEW_ST_POS report
const WIZAPP_STOCK_DATA = [
  // ACCESSORIES
  { section: 'ACCESSORIES', subSection: 'BACKPACK-EX', obsQty: 5.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 5.00 },
  { section: 'ACCESSORIES', subSection: 'BELTS-MENS-EX', obsQty: 38.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 38.00 },
  { section: 'ACCESSORIES', subSection: 'HANKEY-EX', obsQty: 44.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 44.00 },
  { section: 'ACCESSORIES', subSection: 'SOCKS-EX', obsQty: 100.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 100.00 },
  { section: 'ACCESSORIES', subSection: 'TIE - EX', obsQty: 23.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 23.00 },
  { section: 'ACCESSORIES', subSection: 'TIE WITH POCKET SQUARE', obsQty: 19.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 19.00 },
  { section: 'ACCESSORIES', subSection: 'WALLET - EX', obsQty: 19.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 19.00 },

  // MENSWEAR
  { section: 'MENSWEAR', subSection: 'CASUAL FULL SL', obsQty: 1162.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 1162.00 },
  { section: 'MENSWEAR', subSection: 'CASUAL TROUSER', obsQty: 544.00, netSlsQty: 3.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.55, cbsQty: 541.00 },
  { section: 'MENSWEAR', subSection: 'DENIM', obsQty: 793.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 793.00 },
  { section: 'MENSWEAR', subSection: 'SHIRTS FULL SL', obsQty: 874.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 874.00 },
  { section: 'MENSWEAR', subSection: 'TROUSER-FORMAL', obsQty: 631.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 631.00 },

  // MENSWEAR-SM
  { section: 'MENSWEAR-SM', subSection: 'BARMUDA - EX', obsQty: 19.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 19.00 },
  { section: 'MENSWEAR-SM', subSection: 'CASUAL HALF SL', obsQty: 212.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 212.00 },
  { section: 'MENSWEAR-SM', subSection: 'LOWER EX - SM', obsQty: 57.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 57.00 },
  { section: 'MENSWEAR-SM', subSection: 'SHIRTS HALF SL', obsQty: 7.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 7.00 },
  { section: 'MENSWEAR-SM', subSection: 'SHORTS-EX', obsQty: 78.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 78.00 },
  { section: 'MENSWEAR-SM', subSection: 'T SHIRT HALF SL', obsQty: 689.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 689.00 },

  // MENSWEAR-WN
  { section: 'MENSWEAR-WN', subSection: 'BLAZER - EX', obsQty: 134.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 134.00 },
  { section: 'MENSWEAR-WN', subSection: 'CORDUROY TROUSER', obsQty: 16.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 16.00 },
  { section: 'MENSWEAR-WN', subSection: 'JACKET H/S - EX', obsQty: 24.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 24.00 },
  { section: 'MENSWEAR-WN', subSection: 'LOWER EX', obsQty: 121.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 121.00 },
  { section: 'MENSWEAR-WN', subSection: 'SUIT TROUSER - EX', obsQty: 45.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 45.00 },
  { section: 'MENSWEAR-WN', subSection: 'SUIT/BLAZER - EX', obsQty: 43.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 43.00 },
  { section: 'MENSWEAR-WN', subSection: 'SWEAT SHIRT EX', obsQty: 33.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 33.00 },
  { section: 'MENSWEAR-WN', subSection: 'T SHIRT FULL SL', obsQty: 106.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 106.00 },
  { section: 'MENSWEAR-WN', subSection: 'WOOLEN F/S', obsQty: 54.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 54.00 },
  { section: 'MENSWEAR-WN', subSection: 'WOOLEN H/S', obsQty: 28.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 28.00 },

  // UNDERGARMENTS
  { section: 'UNDERGARMENTS', subSection: 'UNDER GARMENT-EX', obsQty: 37.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 37.00 },
  { section: 'UNDERGARMENTS', subSection: 'VEST-EX', obsQty: 35.00, netSlsQty: 0.00, chiQty: 0.00, choQty: 0.00, sellThru: 0.00, cbsQty: 35.00 },
];

const InventoryTab = (props) => {
  const { darkMode, API_BASE, activeStore } = props;

  // Selected report type in left tree
  const [activeReportNode, setActiveReportNode] = useState('CATEGORY_WISE');
  const [treeExpanded, setTreeExpanded] = useState({ root: true, all: true });

  // Data State
  const [stockRows, setStockRows] = useState(WIZAPP_STOCK_DATA);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedSubSection, setSelectedSubSection] = useState(null);
  const [drilldownArticles, setDrilldownArticles] = useState([]);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);

  const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;

  // Format number to 2 decimal places with commas (e.g., 1,162.00)
  const formatQty = (val) => {
    const num = Number(val || 0);
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 1. Fetch live report data from backend API or Firestore
  useEffect(() => {
    const fetchCategoryReport = async () => {
      setLoading(true);
      try {
        if (API_BASE) {
          try {
            const res = await axios.get(`${API_BASE}/api/inventory/category-report`, { timeout: 4000 });
            if (res.data?.success && Array.isArray(res.data.items) && res.data.items.length > 0) {
              const mapped = res.data.items.map(r => ({
                section: r.sectionName,
                subSection: r.subSectionName,
                obsQty: Number(r.obsQty || 0),
                netSlsQty: Number(r.netSlsQty || 0),
                chiQty: Number(r.chiQty || 0),
                choQty: Number(r.choQty || 0),
                sellThru: Number(r.sellThruPct || 0),
                cbsQty: Number(r.cbsQty || 0)
              }));
              setStockRows(mapped);
              setLoading(false);
              return;
            }
          } catch (e1) {}
        }

        // Firestore fallback
        if (db) {
          try {
            const docRef = doc(db, 'stores', storeId, 'data', 'inventory_category-report');
            const snap = await getDoc(docRef);
            if (snap.exists() && snap.data()?.items?.length > 0) {
              const mapped = snap.data().items.map(r => ({
                section: r.sectionName || r.section,
                subSection: r.subSectionName || r.subSection,
                obsQty: Number(r.obsQty || 0),
                netSlsQty: Number(r.netSlsQty || 0),
                chiQty: Number(r.chiQty || 0),
                choQty: Number(r.choQty || 0),
                sellThru: Number(r.sellThruPct || r.sellThru || 0),
                cbsQty: Number(r.cbsQty || 0)
              }));
              setStockRows(mapped);
              setLoading(false);
              return;
            }
          } catch (fsErr) {}
        }
      } catch (err) {
        console.warn('Failed to load live report:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryReport();

    // Setup listener
    let unsubscribe = null;
    if (db) {
      try {
        const docRef = doc(db, 'stores', storeId, 'data', 'inventory_category-report');
        unsubscribe = onSnapshot(docRef, (snap) => {
          if (snap.exists() && snap.data()?.items?.length > 0) {
            const mapped = snap.data().items.map(r => ({
              section: r.sectionName || r.section,
              subSection: r.subSectionName || r.subSection,
              obsQty: Number(r.obsQty || 0),
              netSlsQty: Number(r.netSlsQty || 0),
              chiQty: Number(r.chiQty || 0),
              choQty: Number(r.choQty || 0),
              sellThru: Number(r.sellThruPct || r.sellThru || 0),
              cbsQty: Number(r.cbsQty || 0)
            }));
            setStockRows(mapped);
          }
        });
      } catch (e) {}
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [API_BASE, storeId]);

  // Group items by Section Name
  const groupedSections = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    const filtered = stockRows.filter(r => 
      !q || 
      r.section.toLowerCase().includes(q) || 
      r.subSection.toLowerCase().includes(q)
    );

    const groups = {};
    filtered.forEach(row => {
      if (!groups[row.section]) {
        groups[row.section] = {
          sectionName: row.section,
          items: [],
          totalObs: 0,
          totalNetSls: 0,
          totalChi: 0,
          totalCho: 0,
          totalCbs: 0
        };
      }
      groups[row.section].items.push(row);
      groups[row.section].totalObs += row.obsQty;
      groups[row.section].totalNetSls += row.netSlsQty;
      groups[row.section].totalChi += row.chiQty;
      groups[row.section].totalCho += row.choQty;
      groups[row.section].totalCbs += row.cbsQty;
    });

    return Object.values(groups).map(g => {
      const sellThru = g.totalObs > 0 ? (g.totalNetSls * 100) / g.totalObs : 0;
      return { ...g, totalSellThru: sellThru };
    });
  }, [stockRows, searchFilter]);

  // Overall Gross Totals
  const grossTotal = useMemo(() => {
    let obs = 0, sls = 0, chi = 0, cho = 0, cbs = 0;
    groupedSections.forEach(g => {
      obs += g.totalObs;
      sls += g.totalNetSls;
      chi += g.totalChi;
      cho += g.totalCho;
      cbs += g.totalCbs;
    });
    const sellThru = obs > 0 ? (sls * 100) / obs : 0;
    return { obs, sls, chi, cho, cbs, sellThru };
  }, [groupedSections]);

  // Drilldown into articles when a sub-section is clicked
  const handleSubSectionClick = async (row) => {
    setSelectedSubSection(row);
    setLoadingDrilldown(true);
    setDrilldownArticles([]);

    try {
      if (API_BASE) {
        const res = await axios.get(`${API_BASE}/api/inventory/quick-scan?q=${encodeURIComponent(row.subSection)}`, { timeout: 3500 });
        if (res.data?.success && Array.isArray(res.data.variants)) {
          setDrilldownArticles(res.data.variants);
          setLoadingDrilldown(false);
          return;
        }
      }
      // Demo fallback drilldown items matching Cobb stock
      const sampleSizes = ['38', '40', '42', '44', '30', '32', '34', '36'];
      const sampleColors = ['BEIGE', 'NAVY', 'GREEN', 'BLACK', 'WHITE', 'PEACH', 'DARK BLUE'];
      const mockVariants = Array.from({ length: Math.min(10, Math.ceil(row.cbsQty / 4)) }).map((_, idx) => ({
        barcode: '0081' + Math.floor(100000 + Math.random() * 900000),
        articleNo: '0000' + (60000 + (idx % 12)),
        itemName: row.subSection,
        color: sampleColors[idx % sampleColors.length],
        size: sampleSizes[idx % sampleSizes.length],
        stock: Math.max(1, Math.round(row.cbsQty / 8)),
        mrp: row.subSection.includes('BLAZER') ? 5999 : row.subSection.includes('TROUSER') ? 2499 : row.subSection.includes('DENIM') ? 3199 : 2999
      }));
      setDrilldownArticles(mockVariants);
    } catch (e) {
      console.warn('Drilldown error:', e);
    } finally {
      setLoadingDrilldown(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Section name', 'Sub Section name', 'OBS Qty', 'Net SLS Qty', 'CHI Qty', 'CHO Qty', 'Sell Thru %', 'CBS Qty'];
    const rows = [];
    groupedSections.forEach(g => {
      g.items.forEach(item => {
        rows.push([
          `"${item.section}"`,
          `"${item.subSection}"`,
          item.obsQty.toFixed(2),
          item.netSlsQty.toFixed(2),
          item.chiQty.toFixed(2),
          item.choQty.toFixed(2),
          item.sellThru.toFixed(2),
          item.cbsQty.toFixed(2),
        ]);
      });
      // Subtotal
      rows.push([
        `"Total ${g.sectionName}"`,
        `""`,
        g.totalObs.toFixed(2),
        g.totalNetSls.toFixed(2),
        g.totalChi.toFixed(2),
        g.totalCho.toFixed(2),
        g.totalSellThru.toFixed(2),
        g.totalCbs.toFixed(2)
      ]);
    });
    // Gross Total
    rows.push([
      `"Gross Total"`,
      `""`,
      grossTotal.obs.toFixed(2),
      grossTotal.sls.toFixed(2),
      grossTotal.chi.toFixed(2),
      grossTotal.cho.toFixed(2),
      grossTotal.sellThru.toFixed(2),
      grossTotal.cbs.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WizApp_Inventory_Category_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`w-full h-[calc(100vh-130px)] flex flex-col font-sans transition-all duration-300 rounded-xl overflow-hidden border shadow-xl ${
      darkMode ? 'bg-[#0f1117] text-slate-100 border-slate-800' : 'bg-slate-100 text-slate-900 border-slate-300'
    } ${isFullScreen ? 'fixed inset-0 z-50 h-screen rounded-none' : ''}`}>

      {/* ============================================================== */}
      {/* 1. WIZAPP WINDOW TITLE BAR                                      */}
      {/* ============================================================== */}
      <div className={`px-3 py-1.5 border-b flex items-center justify-between text-xs select-none ${
        darkMode ? 'bg-[#181d2a] border-slate-800 text-slate-300' : 'bg-[#e2e8f0] border-slate-300 text-slate-800 font-medium'
      }`}>
        <div className="flex items-center gap-2 truncate">
          <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">
            W
          </div>
          <span className="font-mono text-[11px] truncate">
            WizApp2020[63][63122240687] [ LOC : ST ST-COBB APPARELS PVT LTD-PUNDRI ] - [ RPD_AVATAR01_NEW_ST_POS ] [ User : BILLING_COBB ][ BIN : DEFAULT BIN ][06-10-2026]
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)} 
            className="p-1 hover:bg-black/10 rounded transition" 
            title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. WIZAPP REPORT ACTIONS TOOLBAR                                */}
      {/* ============================================================== */}
      <div className={`px-3 py-1 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
        darkMode ? 'bg-[#131722] border-slate-800' : 'bg-[#f1f5f9] border-slate-300'
      }`}>
        {/* Left Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className={`px-2.5 py-1 rounded flex items-center gap-1 text-[11px] font-semibold border transition ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Maximize2 className="w-3 h-3 text-blue-500" /> Full Page
          </button>

          <div className="relative flex items-center">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Find in report..." 
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className={`pl-6 pr-2 py-0.5 text-[11px] rounded border w-36 focus:w-48 transition-all focus:outline-none focus:border-blue-500 ${
                darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
            {searchFilter && (
              <button onClick={() => setSearchFilter('')} className="absolute right-1 text-slate-400 hover:text-slate-200">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button 
            onClick={() => setSearchFilter('')}
            className={`px-2 py-1 rounded text-[11px] font-semibold border transition ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-300 hover:bg-slate-50'
            }`}
          >
            Rebuild Report Tree
          </button>

          <button 
            onClick={handleExportCSV}
            className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-semibold border transition ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-emerald-400' : 'bg-white border-slate-300 hover:bg-slate-50 text-emerald-700'
            }`}
          >
            <Download className="w-3 h-3" /> Export CSV
          </button>

          <button 
            onClick={handlePrint}
            className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-semibold border transition ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-blue-400' : 'bg-white border-slate-300 hover:bg-slate-50 text-blue-700'
            }`}
          >
            <Printer className="w-3 h-3" /> Print
          </button>
        </div>

        {/* Right Pagination / Zoom Controls */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-mono text-slate-500">|&lt; &lt; 1 of 1 &gt; &gt;|</span>
          
          <select 
            value={zoomPercent} 
            onChange={(e) => setZoomPercent(Number(e.target.value))}
            className={`px-1.5 py-0.5 rounded border text-[11px] font-semibold ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
            }`}
          >
            <option value={75}>75%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
          </select>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MAIN WORKSPACE (LEFT TREE PANE + RIGHT REPORT SHEET)        */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ------------------------------------------------------------ */}
        {/* LEFT TREE PANE: [List of Reports Generated]                  */}
        {/* ------------------------------------------------------------ */}
        <div className={`w-64 sm:w-72 border-r shrink-0 flex flex-col select-none ${
          darkMode ? 'bg-[#10131d] border-slate-800 text-slate-300' : 'bg-[#f8fafc] border-slate-300 text-slate-800'
        }`}>
          <div className={`px-3 py-1.5 border-b font-mono text-[11px] font-bold ${
            darkMode ? 'bg-[#181d2a] border-slate-800 text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-700'
          }`}>
            [List of Reports Generated]
          </div>

          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
            {/* Root: Dynamic Stock/Inventory Reports */}
            <div>
              <div 
                onClick={() => setTreeExpanded(t => ({ ...t, root: !t.root }))}
                className="flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer hover:bg-blue-500/10 font-bold text-slate-400"
              >
                {treeExpanded.root ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span className={darkMode ? 'text-slate-200' : 'text-slate-900'}>Dynamic Stock/Inventory Reports</span>
              </div>

              {/* Child: ALL */}
              {treeExpanded.root && (
                <div className="pl-4 mt-1 space-y-1 border-l border-slate-700/30 ml-2">
                  <div 
                    onClick={() => setTreeExpanded(t => ({ ...t, all: !t.all }))}
                    className="flex items-center gap-1.5 py-0.5 px-1.5 rounded cursor-pointer hover:bg-blue-500/10 text-slate-400"
                  >
                    {treeExpanded.all ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-800'}>ALL</span>
                  </div>

                  {/* Leaf 1: CATEGORY WISE REPORT */}
                  {treeExpanded.all && (
                    <div className="pl-4 space-y-0.5 border-l border-slate-700/30 ml-2">
                      <button 
                        onClick={() => { setActiveReportNode('CATEGORY_WISE'); setSelectedSubSection(null); }}
                        className={`w-full text-left flex items-center gap-2 py-1 px-2 rounded text-[11px] font-bold transition ${
                          activeReportNode === 'CATEGORY_WISE'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        <span>CATAGRY WISE REPORT</span>
                      </button>

                      {/* Leaf 2: SET WISE REPORT */}
                      <button 
                        onClick={() => { setActiveReportNode('SET_WISE'); }}
                        className={`w-full text-left flex items-center gap-2 py-1 px-2 rounded text-[11px] font-bold transition ${
                          activeReportNode === 'SET_WISE'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        <span>SET WISE REPORT</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Section Shortcuts */}
            <div className="pt-4 border-t border-slate-700/20 mt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2">Sections Filter</span>
              <div className="mt-1 space-y-0.5">
                {groupedSections.map(g => (
                  <button
                    key={g.sectionName}
                    onClick={() => setSearchFilter(g.sectionName === searchFilter ? '' : g.sectionName)}
                    className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between transition ${
                      searchFilter === g.sectionName 
                        ? 'bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30' 
                        : darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{g.sectionName}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-500">{formatQty(g.totalCbs)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT MAIN SHEET: EXACT WIZAPP REPORT DATA TABLE             */}
        {/* ------------------------------------------------------------ */}
        <div className={`flex-1 overflow-auto custom-scrollbar flex flex-col ${
          darkMode ? 'bg-[#0b0d13]' : 'bg-white'
        }`} style={{ zoom: `${zoomPercent}%` }}>
          
          <table className="w-full border-collapse text-xs select-text">
            {/* Table Header Row (Blue accent background matching screenshot) */}
            <thead className={`sticky top-0 z-20 font-bold border-b select-none ${
              darkMode ? 'bg-[#1e293b] text-blue-300 border-slate-700' : 'bg-[#c7d2fe]/90 text-blue-900 border-slate-300'
            }`}>
              <tr>
                <th className="px-3 py-2 text-left border-r border-slate-300/40 w-44 font-bold">Section name</th>
                <th className="px-3 py-2 text-left border-r border-slate-300/40 w-52 font-bold">Sub Section name</th>
                <th className="px-3 py-2 text-right border-r border-slate-300/40 w-28 font-bold">OBS Qty</th>
                <th className="px-3 py-2 text-right border-r border-slate-300/40 w-28 font-bold">Net SLS Qty</th>
                <th className="px-3 py-2 text-right border-r border-slate-300/40 w-24 font-bold">CHI Qty</th>
                <th className="px-3 py-2 text-right border-r border-slate-300/40 w-24 font-bold">CHO Qty</th>
                <th className="px-3 py-2 text-right border-r border-slate-300/40 w-24 font-bold">Sell Thru %</th>
                <th className="px-3 py-2 text-right w-32 font-bold">CBS Qty</th>
              </tr>
            </thead>

            {/* Table Body Groups */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {groupedSections.map((group) => (
                <React.Fragment key={group.sectionName}>
                  {/* Category Data Rows */}
                  {group.items.map((row, idx) => (
                    <tr 
                      key={`${row.section}-${row.subSection}`}
                      onClick={() => handleSubSectionClick(row)}
                      className={`cursor-pointer transition-colors ${
                        selectedSubSection?.subSection === row.subSection
                          ? darkMode ? 'bg-blue-900/30 font-semibold' : 'bg-blue-100 font-semibold'
                          : idx % 2 === 0
                          ? darkMode ? 'bg-[#0f1117] hover:bg-slate-800/60' : 'bg-white hover:bg-slate-50'
                          : darkMode ? 'bg-[#131620] hover:bg-slate-800/60' : 'bg-slate-50/70 hover:bg-slate-100'
                      }`}
                    >
                      {/* Section name only shown in first row or left visible */}
                      <td className={`px-3 py-1 font-semibold border-r ${
                        darkMode ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-800'
                      }`}>
                        {row.section}
                      </td>

                      <td className={`px-3 py-1 font-medium border-r flex items-center justify-between group ${
                        darkMode ? 'border-slate-800 text-slate-200' : 'border-slate-200 text-slate-900'
                      }`}>
                        <span>{row.subSection}</span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                      </td>

                      <td className={`px-3 py-1 text-right font-mono border-r ${
                        darkMode ? 'border-slate-800 text-blue-400' : 'border-slate-200 text-blue-700'
                      }`}>
                        {formatQty(row.obsQty)}
                      </td>

                      <td className={`px-3 py-1 text-right font-mono border-r ${
                        row.netSlsQty > 0 
                          ? 'font-bold text-emerald-500' 
                          : darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                      }`}>
                        {formatQty(row.netSlsQty)}
                      </td>

                      <td className={`px-3 py-1 text-right font-mono border-r ${
                        darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                      }`}>
                        {formatQty(row.chiQty)}
                      </td>

                      <td className={`px-3 py-1 text-right font-mono border-r ${
                        darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                      }`}>
                        {formatQty(row.choQty)}
                      </td>

                      <td className={`px-3 py-1 text-right font-mono border-r ${
                        row.sellThru > 0 
                          ? 'font-bold text-emerald-500' 
                          : darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                      }`}>
                        {formatQty(row.sellThru)}
                      </td>

                      <td className={`px-3 py-1 text-right font-mono font-bold ${
                        row.cbsQty > 0 
                          ? darkMode ? 'text-blue-300' : 'text-blue-800'
                          : 'text-slate-400'
                      }`}>
                        {formatQty(row.cbsQty)}
                      </td>
                    </tr>
                  ))}

                  {/* Section Total Sub-Header (Light Blue with Bold Red Text, exactly matching WizApp) */}
                  <tr className={`font-bold select-none border-y ${
                    darkMode ? 'bg-[#1e293b]/90 border-slate-700' : 'bg-[#dbeafe] border-blue-200'
                  }`}>
                    <td colSpan={2} className="px-3 py-1 text-left font-bold text-rose-600 dark:text-rose-400">
                      Total
                    </td>
                    <td className="px-3 py-1 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatQty(group.totalObs)}
                    </td>
                    <td className="px-3 py-1 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatQty(group.totalNetSls)}
                    </td>
                    <td className="px-3 py-1 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatQty(group.totalChi)}
                    </td>
                    <td className="px-3 py-1 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatQty(group.totalCho)}
                    </td>
                    <td className="px-3 py-1 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatQty(group.totalSellThru)}
                    </td>
                    <td className="px-3 py-1 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatQty(group.totalCbs)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}

              {/* Gross Total Row (Brown/Amber Background, exactly matching screenshot) */}
              <tr className="sticky bottom-0 z-20 font-black text-white select-none shadow-lg bg-[#b45309] dark:bg-[#92400e] border-t-2 border-amber-900">
                <td colSpan={2} className="px-3 py-2 text-left font-black text-sm tracking-wide">
                  Gross Total
                </td>
                <td className="px-3 py-2 text-right font-mono font-black text-sm">
                  {formatQty(grossTotal.obs)}
                </td>
                <td className="px-3 py-2 text-right font-mono font-black text-sm">
                  {formatQty(grossTotal.sls)}
                </td>
                <td className="px-3 py-2 text-right font-mono font-black text-sm">
                  {formatQty(grossTotal.chi)}
                </td>
                <td className="px-3 py-2 text-right font-mono font-black text-sm">
                  {formatQty(grossTotal.cho)}
                </td>
                <td className="px-3 py-2 text-right font-mono font-black text-sm">
                  {formatQty(grossTotal.sellThru)}
                </td>
                <td className="px-3 py-2 text-right font-mono font-black text-sm">
                  {formatQty(grossTotal.cbs)}
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. INTERACTIVE DRILLDOWN DRAWER (Article / Barcode level)        */}
      {/* ============================================================== */}
      {selectedSubSection && (
        <div className={`border-t p-4 select-none animate-in slide-in-from-bottom duration-200 ${
          darkMode ? 'bg-[#151924] border-slate-800' : 'bg-slate-50 border-slate-300'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                <Barcode className="w-4 h-4" />
              </div>
              <div>
                <h4 className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {selectedSubSection.subSection}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Section: {selectedSubSection.section} • Active Stock: <b className="text-emerald-500">{formatQty(selectedSubSection.cbsQty)} Pcs</b>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Click any row in the main table to inspect other styles</span>
              <button 
                onClick={() => setSelectedSubSection(null)} 
                className={`p-1 rounded hover:bg-black/10 transition ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drilldown Article Variation Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-36 overflow-y-auto custom-scrollbar">
            {loadingDrilldown ? (
              <div className="col-span-full py-4 text-center text-slate-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-blue-500" />
                Loading SKU barcodes for {selectedSubSection.subSection}...
              </div>
            ) : drilldownArticles.length > 0 ? (
              drilldownArticles.map((art, aIdx) => (
                <div 
                  key={aIdx} 
                  className={`p-2 rounded-lg border text-left transition ${
                    darkMode ? 'bg-slate-900 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-500 shadow-xs'
                  }`}
                >
                  <div className="font-mono font-bold text-[10px] text-blue-500 truncate">
                    #{art.articleNo}
                  </div>
                  <div className="text-[11px] font-bold truncate mt-0.5">
                    {art.color} • {art.size}
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[10px]">
                    <span className="font-mono text-slate-400">₹{art.mrp}</span>
                    <span className="font-bold text-emerald-500">{art.stock} Pcs</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-3 text-center text-slate-400 text-xs">
                No individual barcode records returned for this category.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryTab;
