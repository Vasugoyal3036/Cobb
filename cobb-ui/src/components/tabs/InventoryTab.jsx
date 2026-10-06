import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Search, Filter, Camera, UploadCloud, Eye, X, Download, Printer,
  Sparkles, Wand2, Send, CheckCircle2, RefreshCw, Barcode, ChevronRight,
  Layers, Tag, Image as ImageIcon, Grid, Table as TableIcon, ArrowUpDown,
  Plus, ExternalLink, Loader2, Info
} from 'lucide-react';
import axios from 'axios';
import { db, storage } from '../../utils/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Base data using the format provided in the user's screenshot
const INITIAL_CATEGORY_DATA = [
  // ACCESSORIES
  { section: 'ACCESSORIES', subSection: 'BACKPACK-EX', obsQty: 5.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 5.0, mrp: 1999, articleNo: '000071101', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80' },
  { section: 'ACCESSORIES', subSection: 'BELTS-MENS-EX', obsQty: 38.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 38.0, mrp: 999, articleNo: '000071102', imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=500&q=80' },
  { section: 'ACCESSORIES', subSection: 'HANKEY-EX', obsQty: 44.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 44.0, mrp: 299, articleNo: '000071103', imageUrl: null },
  { section: 'ACCESSORIES', subSection: 'SOCKS-EX', obsQty: 100.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 100.0, mrp: 399, articleNo: '000071104', imageUrl: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=500&q=80' },
  { section: 'ACCESSORIES', subSection: 'TIE - EX', obsQty: 23.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 23.0, mrp: 799, articleNo: '000071105', imageUrl: 'https://images.unsplash.com/photo-1589756823695-278bc923f962?auto=format&fit=crop&w=500&q=80' },
  { section: 'ACCESSORIES', subSection: 'TIE WITH POCKET SQUARE', obsQty: 19.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 19.0, mrp: 1299, articleNo: '000071106', imageUrl: null },
  { section: 'ACCESSORIES', subSection: 'WALLET - EX', obsQty: 19.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 19.0, mrp: 1499, articleNo: '000071107', imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=500&q=80' },

  // MENSWEAR
  { section: 'MENSWEAR', subSection: 'CASUAL FULL SL', obsQty: 1162.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 1162.0, mrp: 2999, articleNo: '000060869', imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e23?auto=format&fit=crop&w=500&q=80' },
  { section: 'MENSWEAR', subSection: 'CASUAL TROUSER', obsQty: 544.0, netSlsQty: 3.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.55, cbsQty: 541.0, mrp: 2499, articleNo: '000062340', imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=500&q=80' },
  { section: 'MENSWEAR', subSection: 'DENIM', obsQty: 793.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 793.0, mrp: 3199, articleNo: '000059124', imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=500&q=80' },
  { section: 'MENSWEAR', subSection: 'SHIRTS FULL SL', obsQty: 874.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 874.0, mrp: 2799, articleNo: '000061578', imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=500&q=80' },
  { section: 'MENSWEAR', subSection: 'TROUSER-FORMAL', obsQty: 631.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 631.0, mrp: 2699, articleNo: '000063991', imageUrl: null },

  // MENSWEAR-SM (Summer)
  { section: 'MENSWEAR-SM', subSection: 'BARMUDA - EX', obsQty: 19.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 19.0, mrp: 1799, articleNo: '000064112', imageUrl: null },
  { section: 'MENSWEAR-SM', subSection: 'CASUAL HALF SL', obsQty: 212.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 212.0, mrp: 2299, articleNo: '000064223', imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=500&q=80' },
  { section: 'MENSWEAR-SM', subSection: 'LOWER EX - SM', obsQty: 57.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 57.0, mrp: 1899, articleNo: '000064334', imageUrl: null },
  { section: 'MENSWEAR-SM', subSection: 'SHIRTS HALF SL', obsQty: 7.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 7.0, mrp: 2199, articleNo: '000064445', imageUrl: null },
  { section: 'MENSWEAR-SM', subSection: 'SHORTS-EX', obsQty: 78.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 78.0, mrp: 1599, articleNo: '000064556', imageUrl: null },
  { section: 'MENSWEAR-SM', subSection: 'T SHIRT HALF SL', obsQty: 689.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 689.0, mrp: 1299, articleNo: '000064520', imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&q=80' },

  // MENSWEAR-WN (Winter)
  { section: 'MENSWEAR-WN', subSection: 'BLAZER - EX', obsQty: 134.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 134.0, mrp: 5999, articleNo: '000063110', imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=500&q=80' },
  { section: 'MENSWEAR-WN', subSection: 'CORDUROY TROUSER', obsQty: 16.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 16.0, mrp: 2899, articleNo: '000065111', imageUrl: null },
  { section: 'MENSWEAR-WN', subSection: 'JACKET H/S - EX', obsQty: 24.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 24.0, mrp: 3999, articleNo: '000065222', imageUrl: null },
  { section: 'MENSWEAR-WN', subSection: 'LOWER EX', obsQty: 121.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 121.0, mrp: 1999, articleNo: '000065333', imageUrl: null },
  { section: 'MENSWEAR-WN', subSection: 'SUIT TROUSER - EX', obsQty: 45.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 45.0, mrp: 2999, articleNo: '000065444', imageUrl: null },
  { section: 'MENSWEAR-WN', subSection: 'SUIT/BLAZER - EX', obsQty: 43.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 43.0, mrp: 6999, articleNo: '000065555', imageUrl: null },
  { section: 'MENSWEAR-WN', subSection: 'SWEAT SHIRT EX', obsQty: 33.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 33.0, mrp: 2499, articleNo: '000065666', imageUrl: null },
  { section: 'MENSWEAR-WN', subSection: 'T SHIRT FULL SL', obsQty: 106.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 106.0, mrp: 1699, articleNo: '000065777', imageUrl: null },
  { section: 'MENSWEAR-WN', subSection: 'WOOLEN F/S', obsQty: 54.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 54.0, mrp: 3499, articleNo: '000065888', imageUrl: null },
  { section: 'MENSWEAR-WN', subSection: 'WOOLEN H/S', obsQty: 28.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 28.0, mrp: 2999, articleNo: '000065999', imageUrl: null },

  // UNDERGARMENTS
  { section: 'UNDERGARMENTS', subSection: 'UNDER GARMENT-EX', obsQty: 37.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 37.0, mrp: 499, articleNo: '000072111', imageUrl: null },
  { section: 'UNDERGARMENTS', subSection: 'VEST-EX', obsQty: 35.0, netSlsQty: 0.0, chiQty: 0.0, choQty: 0.0, sellThru: 0.0, cbsQty: 35.0, mrp: 399, articleNo: '000072222', imageUrl: null },
];

const InventoryTab = (props) => {
  const { 
    darkMode, 
    API_BASE, 
    activeStore, 
    activeOutfitMatch, 
    setActiveOutfitMatch, 
    outfitPitch, 
    isGeneratingOutfit, 
    handleGenerateOutfitMatch 
  } = props;

  const [activeTab, setActiveTab] = useState('LEDGER'); // 'LEDGER' | 'GALLERY'
  const [items, setItems] = useState(INITIAL_CATEGORY_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [filterMissingPhoto, setFilterMissingPhoto] = useState(false);
  const [selectedItem, setSelectedItem] = useState(INITIAL_CATEGORY_DATA[7]); // CASUAL FULL SL default
  const [uploadingKey, setUploadingKey] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeStoreId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;

  const formatNum = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // 1. Fetch live data & real-time sync with Firebase
  useEffect(() => {
    let isSubscribed = true;

    const loadData = async () => {
      setLoading(true);
      try {
        // Try local backend API first
        if (API_BASE) {
          try {
            const res = await axios.get(`${API_BASE}/api/inventory/category-report`, { timeout: 3500 });
            if (res.data?.success && Array.isArray(res.data.items) && res.data.items.length > 0) {
              const mapped = res.data.items.map(r => {
                const existing = INITIAL_CATEGORY_DATA.find(i => i.subSection === r.subSectionName) || {};
                return {
                  section: r.sectionName,
                  subSection: r.subSectionName,
                  obsQty: Number(r.obsQty || 0),
                  netSlsQty: Number(r.netSlsQty || 0),
                  chiQty: Number(r.chiQty || 0),
                  choQty: Number(r.choQty || 0),
                  sellThru: Number(r.sellThruPct || 0),
                  cbsQty: Number(r.cbsQty || 0),
                  mrp: existing.mrp || 2499,
                  articleNo: existing.articleNo || '0000' + Math.floor(60000 + Math.random() * 9000),
                  imageUrl: existing.imageUrl || null
                };
              });
              if (isSubscribed) setItems(mapped);
              setLoading(false);
              return;
            }
          } catch (e1) {}
        }

        // Firestore fallback
        if (db) {
          try {
            const docRef = doc(db, 'stores', activeStoreId, 'data', 'inventory_category-report');
            const snap = await getDoc(docRef);
            if (snap.exists() && snap.data()?.items?.length > 0) {
              const cloudItems = snap.data().items;
              const merged = cloudItems.map(c => {
                const local = INITIAL_CATEGORY_DATA.find(i => i.subSection === (c.subSectionName || c.subSection)) || {};
                return {
                  section: c.sectionName || c.section || local.section,
                  subSection: c.subSectionName || c.subSection || local.subSection,
                  obsQty: Number(c.obsQty || 0),
                  netSlsQty: Number(c.netSlsQty || 0),
                  chiQty: Number(c.chiQty || 0),
                  choQty: Number(c.choQty || 0),
                  sellThru: Number(c.sellThruPct || c.sellThru || 0),
                  cbsQty: Number(c.cbsQty || 0),
                  mrp: c.mrp || local.mrp || 2499,
                  articleNo: c.articleNo || local.articleNo || '000060869',
                  imageUrl: c.imageUrl || local.imageUrl || null
                };
              });
              if (isSubscribed) setItems(merged);
            }
          } catch (fsErr) {}
        }
      } catch (err) {
        console.warn('Error loading inventory:', err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    loadData();

    // Listen for image updates in Firestore
    let unsubImages = null;
    if (db) {
      try {
        const imgRef = doc(db, 'stores', activeStoreId, 'data', 'catalog_photos');
        unsubImages = onSnapshot(imgRef, (snap) => {
          if (snap.exists()) {
            const photoMap = snap.data();
            setItems(prev => prev.map(item => {
              const savedUrl = photoMap[item.subSection] || photoMap[item.articleNo];
              return savedUrl ? { ...item, imageUrl: savedUrl } : item;
            }));
            setSelectedItem(prev => {
              if (!prev) return prev;
              const savedUrl = photoMap[prev.subSection] || photoMap[prev.articleNo];
              return savedUrl ? { ...prev, imageUrl: savedUrl } : prev;
            });
          }
        });
      } catch (e) {}
    }

    return () => {
      isSubscribed = false;
      if (unsubImages) unsubImages();
    };
  }, [API_BASE, activeStoreId]);

  // Handle Image Upload / Camera Capture
  const handlePhotoUpload = async (e, targetItem) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = targetItem.subSection;
    setUploadingKey(key);

    try {
      // 1. Upload file to Firebase Storage
      const storageRef = ref(storage, `catalog/${activeStoreId}_${encodeURIComponent(targetItem.articleNo || key)}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Save image URL to Firestore under catalog_photos
      if (db) {
        const photoDocRef = doc(db, 'stores', activeStoreId, 'data', 'catalog_photos');
        await setDoc(photoDocRef, {
          [targetItem.subSection]: downloadURL,
          [targetItem.articleNo]: downloadURL,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      }

      // 3. Update local state
      const updated = items.map(i => i.subSection === targetItem.subSection ? { ...i, imageUrl: downloadURL } : i);
      setItems(updated);
      setSelectedItem(prev => prev?.subSection === targetItem.subSection ? { ...prev, imageUrl: downloadURL } : prev);

      alert(`Photo successfully saved for ${targetItem.subSection}!`);
    } catch (err) {
      console.error('Photo upload failed:', err);
      alert('Failed to upload image. Please check network connection.');
    } finally {
      setUploadingKey(null);
    }
  };

  // Section List
  const sectionsList = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.section)));
    return ['ALL', ...list];
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter(item => {
      const matchSearch = !q || 
        item.section.toLowerCase().includes(q) || 
        item.subSection.toLowerCase().includes(q) ||
        item.articleNo?.toLowerCase().includes(q);

      const matchSec = selectedSection === 'ALL' || item.section === selectedSection;
      const matchPhoto = !filterMissingPhoto || !item.imageUrl;

      return matchSearch && matchSec && matchPhoto;
    });
  }, [items, searchQuery, selectedSection, filterMissingPhoto]);

  // Grouped by section for the table format
  const groupedSections = useMemo(() => {
    const groups = {};
    filteredItems.forEach(row => {
      if (!groups[row.section]) {
        groups[row.section] = {
          sectionName: row.section,
          items: [],
          totalObs: 0,
          totalNetSls: 0,
          totalChi: 0,
          totalCho: 0,
          totalCbs: 0,
          totalValue: 0
        };
      }
      groups[row.section].items.push(row);
      groups[row.section].totalObs += row.obsQty;
      groups[row.section].totalNetSls += row.netSlsQty;
      groups[row.section].totalChi += row.chiQty;
      groups[row.section].totalCho += row.choQty;
      groups[row.section].totalCbs += row.cbsQty;
      groups[row.section].totalValue += row.cbsQty * (row.mrp || 2499);
    });

    return Object.values(groups).map(g => {
      const sellThru = g.totalObs > 0 ? (g.totalNetSls * 100) / g.totalObs : 0;
      return { ...g, totalSellThru: sellThru };
    });
  }, [filteredItems]);

  // Overall Gross Totals
  const grossTotal = useMemo(() => {
    let obs = 0, sls = 0, chi = 0, cho = 0, cbs = 0, val = 0;
    items.forEach(i => {
      obs += i.obsQty;
      sls += i.netSlsQty;
      chi += i.chiQty;
      cho += i.choQty;
      cbs += i.cbsQty;
      val += i.cbsQty * (i.mrp || 2499);
    });
    const sellThru = obs > 0 ? (sls * 100) / obs : 0;
    const photoCount = items.filter(i => Boolean(i.imageUrl)).length;
    return { obs, sls, chi, cho, cbs, val, sellThru, photoCount, totalArticles: items.length };
  }, [items]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Section', 'Sub Section', 'Article No', 'OBS Qty', 'Net SLS Qty', 'CHI Qty', 'CHO Qty', 'Sell Thru %', 'CBS Qty', 'Est Value'];
    const rows = filteredItems.map(i => [
      `"${i.section}"`,
      `"${i.subSection}"`,
      i.articleNo || '',
      i.obsQty.toFixed(2),
      i.netSlsQty.toFixed(2),
      i.chiQty.toFixed(2),
      i.choQty.toFixed(2),
      i.sellThru.toFixed(2),
      i.cbsQty.toFixed(2),
      (i.cbsQty * (i.mrp || 2499)).toFixed(2)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`w-full h-[calc(100vh-135px)] flex flex-col font-sans transition-all duration-300 rounded-2xl overflow-hidden border shadow-xl ${
      darkMode ? 'bg-[#0b0e14] text-slate-100 border-[#1c2436]' : 'bg-slate-50 text-slate-900 border-slate-200'
    }`}>

      {/* ============================================================== */}
      {/* 1. TOP STATS BAR (Modern KPI Summary)                           */}
      {/* ============================================================== */}
      <div className={`p-4 border-b flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 ${
        darkMode ? 'bg-[#0f131c] border-[#1c2436]' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight leading-none">
                Inventory Explorer
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Live Ledger & Photos
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Store: Cobb Pundri • {grossTotal.totalArticles} Active Sub-Sections • {grossTotal.photoCount} Cataloged with Photos
            </p>
          </div>
        </div>

        {/* KPI Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <span className="text-[10px] font-bold uppercase text-slate-400">Closing Stock</span>
            <span className="text-sm font-black font-mono text-emerald-500">{formatNum(grossTotal.cbs)} Pcs</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <span className="text-[10px] font-bold uppercase text-slate-400">Net Sales</span>
            <span className="text-sm font-black font-mono text-blue-500">{formatNum(grossTotal.sls)} Pcs</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <span className="text-[10px] font-bold uppercase text-slate-400">Stock Value</span>
            <span className="text-sm font-black font-mono text-amber-500">₹{(grossTotal.val / 100000).toFixed(2)} L</span>
          </div>

          {/* View Mode Toggle: Table Ledger vs Photo Gallery */}
          <div className={`flex rounded-xl p-0.5 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'LEDGER' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" /> Ledger Table
            </button>
            <button
              onClick={() => setActiveTab('GALLERY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'GALLERY' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Visual Gallery
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. FILTER & ACTION TOOLBAR                                      */}
      {/* ============================================================== */}
      <div className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
        darkMode ? 'bg-[#0f131c]/70 border-[#1c2436]' : 'bg-slate-100/70 border-slate-200'
      }`}>
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search box */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search section, category, article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-7 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-blue-500 ${
                darkMode ? 'bg-[#151a27] border-[#222b3d] text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Section filter pills */}
          <div className="flex gap-1 overflow-x-auto custom-scrollbar">
            {sectionsList.map(sec => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                  selectedSection === sec
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-[#151a27] text-slate-400 hover:bg-slate-800' : 'bg-white text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          {/* Filter: Missing photos */}
          <button
            onClick={() => setFilterMissingPhoto(!filterMissingPhoto)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition ${
              filterMissingPhoto
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : darkMode ? 'border-[#222b3d] text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Camera className="w-3 h-3 text-amber-500" />
            <span>Missing Photos</span>
          </button>
        </div>

        {/* Right actions: Export CSV & Print */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold transition ${
              darkMode ? 'bg-[#151a27] border-[#222b3d] hover:bg-slate-800 text-emerald-400' : 'bg-white border-slate-300 hover:bg-slate-100 text-emerald-700'
            }`}
          >
            <Download className="w-3.5 h-3.5" /> Export Excel/CSV
          </button>

          <button
            onClick={() => window.print()}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold transition ${
              darkMode ? 'bg-[#151a27] border-[#222b3d] hover:bg-slate-800 text-blue-400' : 'bg-white border-slate-300 hover:bg-slate-100 text-blue-700'
            }`}
          >
            <Printer className="w-3.5 h-3.5" /> Print Ledger
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MAIN WORKSPACE (LEDGER TABLE vs VISUAL GALLERY)              */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ------------------------------------------------------------ */}
        {/* VIEW 1: CATEGORY STOCK LEDGER TABLE (Exact requested format)  */}
        {/* ------------------------------------------------------------ */}
        {activeTab === 'LEDGER' ? (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse text-xs whitespace-nowrap">
              
              {/* Header */}
              <thead className={`sticky top-0 z-20 font-bold border-b select-none ${
                darkMode ? 'bg-[#131926] text-blue-300 border-[#1f293d]' : 'bg-[#e0e7ff] text-blue-900 border-indigo-200'
              }`}>
                <tr>
                  <th className="px-3 py-2.5 text-center w-12 border-r border-slate-500/20">Photo</th>
                  <th className="px-4 py-2.5 text-left border-r border-slate-500/20 font-bold">Section name</th>
                  <th className="px-4 py-2.5 text-left border-r border-slate-500/20 font-bold">Sub Section name</th>
                  <th className="px-4 py-2.5 text-right border-r border-slate-500/20 font-bold">OBS Qty</th>
                  <th className="px-4 py-2.5 text-right border-r border-slate-500/20 font-bold">Net SLS Qty</th>
                  <th className="px-4 py-2.5 text-right border-r border-slate-500/20 font-bold">CHI Qty</th>
                  <th className="px-4 py-2.5 text-right border-r border-slate-500/20 font-bold">CHO Qty</th>
                  <th className="px-4 py-2.5 text-right border-r border-slate-500/20 font-bold">Sell Thru %</th>
                  <th className="px-4 py-2.5 text-right font-bold w-32">CBS Qty</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {groupedSections.map((group) => (
                  <React.Fragment key={group.sectionName}>
                    
                    {/* Rows in Section */}
                    {group.items.map((row, idx) => {
                      const isSelected = selectedItem?.subSection === row.subSection;
                      return (
                        <tr
                          key={`${row.section}-${row.subSection}`}
                          onClick={() => setSelectedItem(row)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? darkMode ? 'bg-blue-900/30' : 'bg-blue-50 font-semibold'
                              : idx % 2 === 0
                              ? darkMode ? 'bg-[#0b0e14] hover:bg-slate-800/40' : 'bg-white hover:bg-slate-50'
                              : darkMode ? 'bg-[#0f131c] hover:bg-slate-800/40' : 'bg-slate-50/70 hover:bg-slate-100'
                          }`}
                        >
                          {/* Photo Thumbnail / Upload trigger */}
                          <td className="px-2 py-1.5 text-center border-r border-slate-500/10" onClick={e => e.stopPropagation()}>
                            {row.imageUrl ? (
                              <div 
                                className="w-8 h-8 rounded-lg overflow-hidden border border-blue-500/30 mx-auto relative group/img cursor-pointer"
                                onClick={() => setZoomImage(row.imageUrl)}
                                title="Click to view full photo"
                              >
                                <img src={row.imageUrl} alt={row.subSection} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>
                            ) : (
                              <label className="w-8 h-8 rounded-lg border border-dashed border-slate-600/50 hover:border-blue-500 flex items-center justify-center mx-auto cursor-pointer text-slate-500 hover:text-blue-500 transition" title="Add / Take photo">
                                {uploadingKey === row.subSection ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                ) : (
                                  <Camera className="w-3.5 h-3.5" />
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => handlePhotoUpload(e, row)}
                                />
                              </label>
                            )}
                          </td>

                          {/* Section name */}
                          <td className="px-4 py-2 font-bold border-r border-slate-500/10 text-slate-400">
                            {row.section}
                          </td>

                          {/* Sub section name */}
                          <td className="px-4 py-2 font-bold border-r border-slate-500/10 text-slate-200">
                            <div className="flex items-center justify-between">
                              <span>{row.subSection}</span>
                              <ChevronRight className="w-3.5 h-3.5 opacity-40 text-blue-400" />
                            </div>
                          </td>

                          {/* OBS Qty */}
                          <td className="px-4 py-2 text-right font-mono border-r border-slate-500/10 text-blue-400">
                            {formatNum(row.obsQty)}
                          </td>

                          {/* Net SLS Qty */}
                          <td className={`px-4 py-2 text-right font-mono border-r border-slate-500/10 ${row.netSlsQty > 0 ? 'font-black text-emerald-400' : 'text-slate-400'}`}>
                            {formatNum(row.netSlsQty)}
                          </td>

                          {/* CHI Qty */}
                          <td className="px-4 py-2 text-right font-mono border-r border-slate-500/10 text-slate-400">
                            {formatNum(row.chiQty)}
                          </td>

                          {/* CHO Qty */}
                          <td className="px-4 py-2 text-right font-mono border-r border-slate-500/10 text-slate-400">
                            {formatNum(row.choQty)}
                          </td>

                          {/* Sell Thru % */}
                          <td className={`px-4 py-2 text-right font-mono border-r border-slate-500/10 ${row.sellThru > 0 ? 'font-bold text-emerald-400' : 'text-slate-400'}`}>
                            {formatNum(row.sellThru)}%
                          </td>

                          {/* CBS Qty */}
                          <td className="px-4 py-2 text-right font-mono font-black text-blue-400">
                            {formatNum(row.cbsQty)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Section Sub-Total Row (Light Blue / Bold Red Text format from image) */}
                    <tr className={`font-bold select-none border-y ${
                      darkMode ? 'bg-[#182030] border-slate-700 text-rose-400' : 'bg-[#dbeafe] border-blue-200 text-rose-600'
                    }`}>
                      <td colSpan={3} className="px-4 py-1.5 text-left font-black">
                        Total {group.sectionName}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono font-black">
                        {formatNum(group.totalObs)}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono font-black">
                        {formatNum(group.totalNetSls)}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono font-black">
                        {formatNum(group.totalChi)}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono font-black">
                        {formatNum(group.totalCho)}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono font-black">
                        {formatNum(group.totalSellThru)}%
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono font-black">
                        {formatNum(group.totalCbs)}
                      </td>
                    </tr>

                  </React.Fragment>
                ))}

                {/* Gross Total Row (Brown/Amber Background format from image) */}
                <tr className="sticky bottom-0 z-20 font-black text-white select-none shadow-2xl bg-[#9a3412] dark:bg-[#7c2d12] border-t-2 border-amber-800">
                  <td colSpan={3} className="px-4 py-2.5 text-left font-black text-sm tracking-wide">
                    Gross Total
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-black text-sm">
                    {formatNum(grossTotal.obs)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-black text-sm">
                    {formatNum(grossTotal.sls)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-black text-sm">
                    {formatNum(grossTotal.chi)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-black text-sm">
                    {formatNum(grossTotal.cho)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-black text-sm">
                    {formatNum(grossTotal.sellThru)}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-black text-sm">
                    {formatNum(grossTotal.cbs)}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        ) : (

          /* ------------------------------------------------------------ */
          /* VIEW 2: VISUAL STYLE & PHOTO DOSSIER GALLERY                 */
          /* ------------------------------------------------------------ */
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {filteredItems.map(item => (
                <div
                  key={item.subSection}
                  onClick={() => setSelectedItem(item)}
                  className={`rounded-2xl border overflow-hidden transition-all duration-200 group flex flex-col cursor-pointer ${
                    selectedItem?.subSection === item.subSection
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                      : darkMode ? 'bg-[#121622] border-[#1e273a] hover:border-slate-600' : 'bg-white border-slate-200 hover:shadow-md'
                  }`}
                >
                  {/* Photo Container */}
                  <div className="relative h-56 bg-slate-900 overflow-hidden flex items-center justify-center">
                    {item.imageUrl ? (
                      <>
                        <img src={item.imageUrl} alt={item.subSection} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setZoomImage(item.imageUrl); }}
                          className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-black/60 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/80"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-500 p-4 text-center">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                        <span className="text-[11px] font-bold">No photo attached</span>
                      </div>
                    )}

                    {/* Camera upload button overlay */}
                    <label 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition"
                    >
                      {uploadingKey === item.subSection ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      <span>{item.imageUrl ? 'Change' : 'Add Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, item)}
                        disabled={uploadingKey === item.subSection}
                      />
                    </label>

                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur">
                      {item.section}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-black text-sm truncate">{item.subSection}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">Article: #{item.articleNo}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-700/20 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Closing (CBS)</span>
                        <p className="font-mono font-black text-sm text-emerald-500">{formatNum(item.cbsQty)} Pcs</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">MRP</span>
                        <p className="font-mono font-bold text-sm text-slate-200">₹{item.mrp}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* RIGHT DETAIL SLIDEOUT / DOSSIER PANEL                        */}
        {/* ------------------------------------------------------------ */}
        {selectedItem && (
          <div className={`w-80 lg:w-96 border-l shrink-0 flex flex-col overflow-y-auto custom-scrollbar p-5 ${
            darkMode ? 'bg-[#0f131c] border-[#1c2436]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-500">Category Dossier</span>
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Preview & Camera Upload Card */}
            <div className="mt-4 rounded-2xl border overflow-hidden relative group/dossier bg-slate-900 border-slate-800 shadow-md">
              <div className="h-60 relative flex items-center justify-center">
                {selectedItem.imageUrl ? (
                  <>
                    <img src={selectedItem.imageUrl} alt={selectedItem.subSection} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setZoomImage(selectedItem.imageUrl)}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 transition"
                      title="View full screen"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-500 p-6 text-center">
                    <ImageIcon className="w-10 h-10 opacity-40 text-blue-400" />
                    <p className="text-xs font-bold text-slate-300">No Photo Uploaded Yet</p>
                    <p className="text-[11px] text-slate-500">Take a photo with camera or choose from gallery</p>
                  </div>
                )}
              </div>

              {/* Direct Photo Action Strip */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2">
                <label className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition">
                  {uploadingKey === selectedItem.subSection ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  <span>{selectedItem.imageUrl ? 'Retake / Change Photo' : 'Take / Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, selectedItem)}
                    disabled={uploadingKey === selectedItem.subSection}
                  />
                </label>
              </div>
            </div>

            {/* Details & Specs */}
            <div className="mt-4">
              <h3 className="text-lg font-black">{selectedItem.subSection}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Section: <b className="text-slate-200">{selectedItem.section}</b></p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Article ID: #{selectedItem.articleNo}</p>
            </div>

            {/* Stock Movement Grid (From screenshot format) */}
            <div className="mt-4 p-4 rounded-xl border grid grid-cols-2 gap-3 bg-slate-900/40 border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Closing Balance (CBS)</span>
                <p className="text-base font-black font-mono text-emerald-400">{formatNum(selectedItem.cbsQty)} Pcs</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Opening Stock (OBS)</span>
                <p className="text-base font-black font-mono text-blue-400">{formatNum(selectedItem.obsQty)} Pcs</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Net Sales (SLS)</span>
                <p className="text-sm font-bold font-mono text-purple-400">{formatNum(selectedItem.netSlsQty)} Pcs</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Sell Through</span>
                <p className="text-sm font-bold font-mono text-amber-400">{formatNum(selectedItem.sellThru)}%</p>
              </div>
            </div>

            {/* AI Pitch Section */}
            {handleGenerateOutfitMatch && (
              <div className="mt-4 pt-4 border-t border-slate-700/30">
                <button
                  onClick={() => handleGenerateOutfitMatch({
                    ArticleNo: selectedItem.articleNo,
                    ItemName: selectedItem.subSection,
                    Category: selectedItem.section,
                    MRP: selectedItem.mrp
                  })}
                  disabled={isGeneratingOutfit && activeOutfitMatch === selectedItem.articleNo}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGeneratingOutfit && activeOutfitMatch === selectedItem.articleNo ? 'Generating Pitch...' : 'Generate AI Styling Pitch'}</span>
                </button>

                {activeOutfitMatch === selectedItem.articleNo && outfitPitch && (
                  <div className="mt-3 p-3.5 rounded-xl border bg-indigo-900/20 border-indigo-500/30">
                    <p className="text-xs leading-relaxed text-indigo-100 whitespace-pre-wrap">{outfitPitch}</p>
                    <button
                      onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(outfitPitch)}`, '_blank')}
                      className="mt-2 text-[11px] w-full py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold flex items-center justify-center gap-1.5 shadow"
                    >
                      <Send className="w-3.5 h-3.5" /> Share to WhatsApp Status
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-slate-700/30 flex gap-2">
              <button
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (!printWin) return;
                  printWin.document.write(`
                    <h2>COBB APPARELS - BARCODE SLIP</h2>
                    <p><b>${selectedItem.subSection}</b> (${selectedItem.section})</p>
                    <p>Article: ${selectedItem.articleNo} | CBS Stock: ${selectedItem.cbsQty} Pcs | MRP: ₹${selectedItem.mrp}</p>
                    <script>window.print();</script>
                  `);
                  printWin.document.close();
                }}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-center transition"
              >
                Print Slip
              </button>

              <button
                onClick={() => setSelectedItem(null)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition"
              >
                Done
              </button>
            </div>

          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* 4. FULL RESOLUTION PHOTO ZOOM MODAL                             */}
      {/* ============================================================== */}
      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-3 border-b border-slate-800 flex items-center justify-between text-white text-xs font-bold">
              <span>Catalog High-Res Preview</span>
              <button onClick={() => setZoomImage(null)} className="p-1 hover:bg-slate-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={zoomImage} alt="Preview" className="w-full h-auto max-h-[75vh] object-contain bg-black" />
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryTab;
