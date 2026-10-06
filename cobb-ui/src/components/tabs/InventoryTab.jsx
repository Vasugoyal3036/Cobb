import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Search, Sparkles, Wand2, Send, ChevronLeft, ChevronRight, Tag,
  Barcode, Camera, UploadCloud, Loader2, Download, Printer, ExternalLink,
  CheckCircle2, Box, X, Layers, Filter, Eye, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { db, storage } from '../../utils/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Base sample catalog with realistic Cobb POS articles and SKU-level variations
const FALLBACK_INVENTORY = [
  {
    ArticleNo: '000060869',
    ItemName: 'CASUAL FULL SL SHIRT',
    Category: 'Shirts',
    Department: 'Apparel',
    Section: 'Men Casuals',
    MRP: 2999,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e23?auto=format&fit=crop&w=600&q=80',
    status: 'IN STOCK',
    variants: [
      { code: '0081308460', article: '000060869', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '38 (97 CM.)', p3: 'REGULAR', qty: 3, uom: 'PCS', mrp: 2999 },
      { code: '0081308535', article: '000060869', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '40 (1.02 MTR.)', p3: 'REGULAR', qty: 5, uom: 'PCS', mrp: 2999 },
      { code: '0081308872', article: '000060869', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '42 (1.07 MTR.)', p3: 'REGULAR', qty: 4, uom: 'PCS', mrp: 2999 },
      { code: '0081309138', article: '000060869', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '44 (1.12 MTR.)', p3: 'REGULAR', qty: 2, uom: 'PCS', mrp: 2999 },
      { code: '0081309503', article: '000060869', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '46 (1.17 MTR.)', p3: 'REGULAR', qty: 1, uom: 'PCS', mrp: 2999 },
      { code: '0081309621', article: '000060869', desc: 'CASUAL FULL SL', p1: 'NAVY', p2: '38 (97 CM.)', p3: 'REGULAR', qty: 2, uom: 'PCS', mrp: 2999 },
      { code: '0081309784', article: '000060869', desc: 'CASUAL FULL SL', p1: 'NAVY', p2: '40 (1.02 MTR.)', p3: 'REGULAR', qty: 4, uom: 'PCS', mrp: 2999 },
      { code: '0081309890', article: '000060869', desc: 'CASUAL FULL SL', p1: 'NAVY', p2: '42 (1.07 MTR.)', p3: 'REGULAR', qty: 3, uom: 'PCS', mrp: 2999 },
    ]
  },
  {
    ArticleNo: '000061578',
    ItemName: 'CASUAL FULL SL LINEN SHIRT',
    Category: 'Shirts',
    Department: 'Apparel',
    Section: 'Men Casuals',
    MRP: 2699,
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80',
    status: 'IN STOCK',
    variants: [
      { code: '0082203068', article: '000061578', desc: 'CASUAL FULL SL', p1: 'GREEN', p2: '38 (97 CM.)', p3: 'SLIM', qty: 2, uom: 'PCS', mrp: 2699 },
      { code: '0082203775', article: '000061578', desc: 'CASUAL FULL SL', p1: 'GREEN', p2: '40 (1.02 MTR.)', p3: 'SLIM', qty: 4, uom: 'PCS', mrp: 2699 },
      { code: '0082200380', article: '000061578', desc: 'CASUAL FULL SL', p1: 'BEIGE', p2: '42 (1.07 MTR.)', p3: 'SLIM', qty: 3, uom: 'PCS', mrp: 2699 },
      { code: '0082205562', article: '000061578', desc: 'CASUAL FULL SL', p1: 'PEACH', p2: '40 (1.02 MTR.)', p3: 'SLIM', qty: 2, uom: 'PCS', mrp: 2699 },
      { code: '0082206215', article: '000061578', desc: 'CASUAL FULL SL', p1: 'PEACH', p2: '42 (1.07 MTR.)', p3: 'SLIM', qty: 1, uom: 'PCS', mrp: 2699 },
    ]
  },
  {
    ArticleNo: '000059124',
    ItemName: 'STRETCH SLIM FIT DENIM JEANS',
    Category: 'Jeans',
    Department: 'Apparel',
    Section: 'Bottomwear',
    MRP: 3199,
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80',
    status: 'IN STOCK',
    variants: [
      { code: '0083100121', article: '000059124', desc: 'SLIM FIT DENIM', p1: 'DARK BLUE', p2: '30 (76 CM.)', p3: 'STRETCH', qty: 3, uom: 'PCS', mrp: 3199 },
      { code: '0083100234', article: '000059124', desc: 'SLIM FIT DENIM', p1: 'DARK BLUE', p2: '32 (81 CM.)', p3: 'STRETCH', qty: 6, uom: 'PCS', mrp: 3199 },
      { code: '0083100345', article: '000059124', desc: 'SLIM FIT DENIM', p1: 'DARK BLUE', p2: '34 (86 CM.)', p3: 'STRETCH', qty: 5, uom: 'PCS', mrp: 3199 },
      { code: '0083100456', article: '000059124', desc: 'SLIM FIT DENIM', p1: 'DARK BLUE', p2: '36 (91 CM.)', p3: 'STRETCH', qty: 2, uom: 'PCS', mrp: 3199 },
      { code: '0083100567', article: '000059124', desc: 'SLIM FIT DENIM', p1: 'ICE BLUE', p2: '32 (81 CM.)', p3: 'STRETCH', qty: 4, uom: 'PCS', mrp: 3199 },
      { code: '0083100678', article: '000059124', desc: 'SLIM FIT DENIM', p1: 'ICE BLUE', p2: '34 (86 CM.)', p3: 'STRETCH', qty: 3, uom: 'PCS', mrp: 3199 },
    ]
  },
  {
    ArticleNo: '000062340',
    ItemName: 'PREMIUM COTTON CHINO TROUSER',
    Category: 'Trousers',
    Department: 'Apparel',
    Section: 'Bottomwear',
    MRP: 2499,
    imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=600&q=80',
    status: 'IN STOCK',
    variants: [
      { code: '0084201102', article: '000062340', desc: 'COTTON CHINO', p1: 'KHAKI', p2: '30 (76 CM.)', p3: 'FLAT FRONT', qty: 2, uom: 'PCS', mrp: 2499 },
      { code: '0084201215', article: '000062340', desc: 'COTTON CHINO', p1: 'KHAKI', p2: '32 (81 CM.)', p3: 'FLAT FRONT', qty: 5, uom: 'PCS', mrp: 2499 },
      { code: '0084201328', article: '000062340', desc: 'COTTON CHINO', p1: 'KHAKI', p2: '34 (86 CM.)', p3: 'FLAT FRONT', qty: 4, uom: 'PCS', mrp: 2499 },
      { code: '0084201439', article: '000062340', desc: 'COTTON CHINO', p1: 'NAVY', p2: '32 (81 CM.)', p3: 'FLAT FRONT', qty: 3, uom: 'PCS', mrp: 2499 },
      { code: '0084201540', article: '000062340', desc: 'COTTON CHINO', p1: 'NAVY', p2: '34 (86 CM.)', p3: 'FLAT FRONT', qty: 3, uom: 'PCS', mrp: 2499 },
      { code: '0084201651', article: '000062340', desc: 'COTTON CHINO', p1: 'OLIVE', p2: '32 (81 CM.)', p3: 'FLAT FRONT', qty: 2, uom: 'PCS', mrp: 2499 },
    ]
  },
  {
    ArticleNo: '000063110',
    ItemName: 'ITALIAN CUT FORMAL BLAZER',
    Category: 'Blazers',
    Department: 'Apparel',
    Section: 'Formalwear',
    MRP: 5999,
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80',
    status: 'IN STOCK',
    variants: [
      { code: '0085100010', article: '000063110', desc: 'FORMAL BLAZER', p1: 'CHARCOAL', p2: '38 (97 CM.)', p3: '2-BUTTON', qty: 2, uom: 'PCS', mrp: 5999 },
      { code: '0085100021', article: '000063110', desc: 'FORMAL BLAZER', p1: 'CHARCOAL', p2: '40 (1.02 MTR.)', p3: '2-BUTTON', qty: 3, uom: 'PCS', mrp: 5999 },
      { code: '0085100032', article: '000063110', desc: 'FORMAL BLAZER', p1: 'CHARCOAL', p2: '42 (1.07 MTR.)', p3: '2-BUTTON', qty: 2, uom: 'PCS', mrp: 5999 },
      { code: '0085100043', article: '000063110', desc: 'FORMAL BLAZER', p1: 'ROYAL NAVY', p2: '40 (1.02 MTR.)', p3: '2-BUTTON', qty: 2, uom: 'PCS', mrp: 5999 },
      { code: '0085100054', article: '000063110', desc: 'FORMAL BLAZER', p1: 'ROYAL NAVY', p2: '42 (1.07 MTR.)', p3: '2-BUTTON', qty: 1, uom: 'PCS', mrp: 5999 },
    ]
  },
  {
    ArticleNo: '000064520',
    ItemName: 'SOLID SUPIMA CREW NECK TEE',
    Category: 'T-Shirts',
    Department: 'Apparel',
    Section: 'Casuals',
    MRP: 1299,
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
    status: 'IN STOCK',
    variants: [
      { code: '0086200111', article: '000064520', desc: 'SUPIMA CREW TEE', p1: 'BLACK', p2: 'M (97 CM.)', p3: 'CREW', qty: 4, uom: 'PCS', mrp: 1299 },
      { code: '0086200222', article: '000064520', desc: 'SUPIMA CREW TEE', p1: 'BLACK', p2: 'L (1.02 MTR.)', p3: 'CREW', qty: 6, uom: 'PCS', mrp: 1299 },
      { code: '0086200333', article: '000064520', desc: 'SUPIMA CREW TEE', p1: 'BLACK', p2: 'XL (1.07 MTR.)', p3: 'CREW', qty: 3, uom: 'PCS', mrp: 1299 },
      { code: '0086200444', article: '000064520', desc: 'SUPIMA CREW TEE', p1: 'WHITE', p2: 'M (97 CM.)', p3: 'CREW', qty: 5, uom: 'PCS', mrp: 1299 },
      { code: '0086200555', article: '000064520', desc: 'SUPIMA CREW TEE', p1: 'WHITE', p2: 'L (1.02 MTR.)', p3: 'CREW', qty: 4, uom: 'PCS', mrp: 1299 },
      { code: '0086200666', article: '000064520', desc: 'SUPIMA CREW TEE', p1: 'MAROON', p2: 'L (1.02 MTR.)', p3: 'CREW', qty: 3, uom: 'PCS', mrp: 1299 },
    ]
  }
];

const InventoryTab = (props) => {
  const { 
    deadStock, 
    inventory: propInventory,
    searchQuery: globalSearchQuery, 
    setSearchQuery: setGlobalSearchQuery, 
    darkMode, 
    activeOutfitMatch, 
    setActiveOutfitMatch, 
    outfitPitch, 
    isGeneratingOutfit, 
    handleGenerateOutfitMatch,
    API_BASE,
    activeStore
  } = props;

  const [localSearch, setLocalSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'LOW_STOCK'
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'detailed'
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [selectedItem, setSelectedItem] = useState(null);
  const [uploadingArticle, setUploadingArticle] = useState(null);
  const [isZoomImageOpen, setIsZoomImageOpen] = useState(false);
  const [masterCatalog, setMasterCatalog] = useState(FALLBACK_INVENTORY);
  const [loading, setLoading] = useState(false);
  const [variantLoading, setVariantLoading] = useState(false);

  const activeStoreId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;

  // 1. Fetch live stock from Firestore and / or local backend
  useEffect(() => {
    let isSubscribed = true;

    const loadData = async () => {
      setLoading(true);
      try {
        // A. Priority 1: Check Firestore real-time doc
        if (db) {
          try {
            const invRef = doc(db, 'stores', activeStoreId, 'data', 'inventory');
            const invSnap = await getDoc(invRef);
            if (invSnap.exists() && invSnap.data()?.items?.length > 0) {
              const rawItems = invSnap.data().items;
              const mapped = mapRawItemsToCatalog(rawItems);
              if (isSubscribed && mapped.length > 0) {
                setMasterCatalog(mapped);
                if (!selectedItem) setSelectedItem(mapped[0]);
                setLoading(false);
                return;
              }
            }
          } catch (e1) {
            console.warn('[InventoryTab] Firestore read note:', e1);
          }
        }

        // B. Priority 2: Use passed props (deadStock) if available
        if (Array.isArray(deadStock) && deadStock.length > 0) {
          const mapped = mapDeadStockToCatalog(deadStock);
          if (isSubscribed && mapped.length > 0) {
            setMasterCatalog(mapped);
            if (!selectedItem) setSelectedItem(mapped[0]);
            setLoading(false);
            return;
          }
        }

        // C. Priority 3: Try API_BASE endpoint
        if (API_BASE) {
          try {
            const res = await axios.get(`${API_BASE}/api/inventory/dead-stock`, { timeout: 4000 });
            if (Array.isArray(res.data) && res.data.length > 0) {
              const mapped = mapDeadStockToCatalog(res.data);
              if (isSubscribed && mapped.length > 0) {
                setMasterCatalog(mapped);
                if (!selectedItem) setSelectedItem(mapped[0]);
                setLoading(false);
                return;
              }
            }
          } catch (apiErr) {
            // fallback
          }
        }

        // D. Fallback default
        if (isSubscribed) {
          setMasterCatalog(FALLBACK_INVENTORY);
          if (!selectedItem) setSelectedItem(FALLBACK_INVENTORY[0]);
        }
      } catch (err) {
        console.warn('[InventoryTab] Load error:', err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    loadData();

    // Setup Firestore listener for instant changes
    let unsubscribe = null;
    if (db) {
      try {
        const invRef = doc(db, 'stores', activeStoreId, 'data', 'inventory');
        unsubscribe = onSnapshot(invRef, (snap) => {
          if (snap.exists() && snap.data()?.items?.length > 0) {
            const rawItems = snap.data().items;
            const mapped = mapRawItemsToCatalog(rawItems);
            if (mapped.length > 0) {
              setMasterCatalog(mapped);
              setSelectedItem(prev => {
                if (!prev) return mapped[0];
                const updated = mapped.find(m => m.ArticleNo === prev.ArticleNo);
                return updated || prev;
              });
            }
          }
        }, (err) => console.warn('[InventoryTab] Snapshot note:', err));
      } catch (e) {}
    }

    return () => {
      isSubscribed = false;
      if (unsubscribe) unsubscribe();
    };
  }, [API_BASE, activeStoreId]);

  // Set default selected item
  useEffect(() => {
    if (!selectedItem && masterCatalog.length > 0) {
      setSelectedItem(masterCatalog[0]);
    }
  }, [masterCatalog, selectedItem]);

  // Synchronize search query with global header search if provided
  useEffect(() => {
    if (globalSearchQuery !== undefined && globalSearchQuery !== localSearch) {
      setLocalSearch(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  // Fetch or generate rich variants when an article is selected
  const handleSelectArticle = async (article) => {
    setSelectedItem(article);
    if (activeOutfitMatch !== article.ArticleNo && setActiveOutfitMatch) {
      setActiveOutfitMatch(null);
    }

    // If variants are already detailed (> 0 variants with code/barcode), we're good
    if (article.variants && article.variants.length > 0 && article.variants[0].code) {
      return;
    }

    // Try fetching live SQL quick-scan for live barcodes & sizes
    if (API_BASE) {
      setVariantLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/inventory/quick-scan?q=${encodeURIComponent(article.ArticleNo)}`, { timeout: 3500 });
        if (res.data?.success && Array.isArray(res.data.variants) && res.data.variants.length > 0) {
          const freshVariants = res.data.variants.map(v => ({
            code: v.barcode || v.product_Code || '00' + Math.floor(Math.random() * 90000000),
            article: article.ArticleNo,
            desc: v.itemName || article.ItemName,
            p1: (v.color || 'STANDARD').toUpperCase(),
            p2: (v.size || 'STD').toUpperCase(),
            p3: 'REGULAR',
            qty: Math.max(1, Number(v.stock) || 1),
            uom: 'PCS',
            mrp: Number(v.mrp) || article.MRP || 2999
          }));

          const updated = { ...article, variants: freshVariants };
          setSelectedItem(updated);
          setMasterCatalog(prev => prev.map(item => item.ArticleNo === article.ArticleNo ? updated : item));
        }
      } catch (e) {
        // silent fallback
      } finally {
        setVariantLoading(false);
      }
    }
  };

  // Helper: map raw inventory items to catalog structure
  function mapRawItemsToCatalog(rawItems) {
    const grouped = {};
    rawItems.forEach(item => {
      const art = item.ArticleNo || item.articleNo || 'ART_' + (item.Barcode || 'STD');
      if (!grouped[art]) {
        grouped[art] = {
          ArticleNo: art,
          ItemName: item.ItemName || item.Description || item.desc || 'Apparel Item',
          Category: item.Category || item.section_name || 'Apparel',
          Department: item.Department || 'Apparel',
          Section: item.Section || item.section_name || 'Store Stock',
          MRP: Number(item.MRP || item.mrp || 2499),
          imageUrl: item.imageUrl || null,
          status: 'IN STOCK',
          variants: []
        };
      }

      grouped[art].variants.push({
        code: item.Barcode || item.product_Code || item.code || '00' + Math.floor(Math.random() * 90000000),
        article: art,
        desc: item.ItemName || item.Description || grouped[art].ItemName,
        p1: (item.Color || item.Para1 || item.p1 || 'STANDARD').toUpperCase(),
        p2: (item.Size || item.Para2 || item.p2 || 'STD').toUpperCase(),
        p3: (item.Para3 || item.Fit || item.p3 || 'NA').toUpperCase(),
        qty: Math.max(1, Number(item.Qty || item.quantity || item.qty || 1)),
        uom: item.UOM || item.uom || 'PCS',
        mrp: Number(item.MRP || item.mrp || grouped[art].MRP)
      });
    });

    return Object.values(grouped);
  }

  // Helper: map deadStock array to catalog structure
  function mapDeadStockToCatalog(list) {
    return list.map((item, idx) => {
      const art = item.ArticleNo || '0000' + (60000 + idx);
      const skuCount = Number(item.SkuCount) || 6;
      const mrp = Number(item.MRP) || 2999;
      
      // Synthesize realistic variants if empty
      const colors = ['BEIGE', 'NAVY', 'BLACK', 'OLIVE'];
      const sizes = ['38 (97 CM.)', '40 (1.02 MTR.)', '42 (1.07 MTR.)', '44 (1.12 MTR.)'];
      const variants = [];
      for (let i = 0; i < Math.min(skuCount, 8); i++) {
        variants.push({
          code: '0081' + Math.floor(100000 + Math.random() * 900000),
          article: art,
          desc: item.ItemName || 'CASUAL APPAREL',
          p1: colors[i % colors.length],
          p2: sizes[Math.floor(i / colors.length) % sizes.length],
          p3: 'REGULAR',
          qty: 1 + (i % 3),
          uom: 'PCS',
          mrp: mrp
        });
      }

      return {
        ArticleNo: art,
        ItemName: item.ItemName || 'CASUAL FULL SL',
        Category: item.Category || (item.ItemName?.toLowerCase().includes('shirt') ? 'Shirts' : 'Apparel'),
        Department: 'Apparel',
        Section: 'Ready Stock',
        MRP: mrp,
        imageUrl: item.imageUrl || null,
        status: idx > 15 ? 'LOW STOCK' : 'IN STOCK',
        variants
      };
    });
  }

  // Handle Image Upload
  const handleImageUpload = async (e, articleNo) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingArticle(articleNo);
    try {
      const storageRef = ref(storage, `inventory/${articleNo}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      if (db) {
        const docRef = doc(db, 'stores', activeStoreId, 'data', 'inventory');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const items = data.items || [];
          const updatedItems = items.map(i => {
            if (i.ArticleNo === articleNo || i.articleNo === articleNo) {
              return { ...i, imageUrl: downloadURL };
            }
            return i;
          });
          await updateDoc(docRef, { items: updatedItems });
        }
      }

      setSelectedItem(prev => ({ ...prev, imageUrl: downloadURL }));
      setMasterCatalog(prev => prev.map(i => i.ArticleNo === articleNo ? { ...i, imageUrl: downloadURL } : i));
      alert(`Image successfully attached to Article ${articleNo}!`);
    } catch (err) {
      console.error('Upload failed', err);
      alert('Upload failed. Please check internet connection.');
    } finally {
      setUploadingArticle(null);
    }
  };

  // Export CSV of the active article's variations
  const handleExportCSV = () => {
    if (!selectedItem || !selectedItem.variants?.length) return;
    const headers = ['Item Code', 'Article No', 'Description', 'Color', 'Size', 'Fit', 'Qty', 'UOM', 'MRP', 'Stock Value'];
    const rows = selectedItem.variants.map(v => [
      v.code,
      v.article,
      `"${v.desc}"`,
      v.p1,
      v.p2,
      v.p3,
      v.qty,
      v.uom,
      v.mrp,
      v.qty * v.mrp
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cobb_Inventory_${selectedItem.ArticleNo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Barcode Slips
  const handlePrintBarcode = () => {
    if (!selectedItem) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const variants = selectedItem.variants || [];
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcodes - ${selectedItem.ArticleNo}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #111; }
            h2 { margin-bottom: 4px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 16px; }
            .card { border: 1.5px dashed #333; padding: 12px; border-radius: 8px; page-break-inside: avoid; }
            .barcode { font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 2px; }
            .row { display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Print Now</button>
          </div>
          <h2>COBB EXCLUSIVE STORE</h2>
          <p style="margin: 0; font-size: 13px; color: #555;">Article: ${selectedItem.ArticleNo} • ${selectedItem.ItemName}</p>
          <div class="grid">
            ${variants.map(v => `
              <div class="card">
                <div style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase;">COBB APPAREL</div>
                <div style="font-weight: bold; font-size: 13px; margin-top: 2px;">${v.desc}</div>
                <div class="barcode" style="margin: 8px 0;">*${v.code}*</div>
                <div class="row">
                  <span>Color: <b>${v.p1}</b></span>
                  <span>Size: <b>${v.p2}</b></span>
                </div>
                <div class="row" style="margin-top: 6px; border-top: 1px solid #ddd; padding-top: 4px;">
                  <span>QTY: <b>${v.qty} PCS</b></span>
                  <span style="font-weight: bold; font-size: 14px;">MRP ₹${v.mrp}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter Catalog
  const categoriesList = useMemo(() => {
    const set = new Set(masterCatalog.map(i => i.Category).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [masterCatalog]);

  const filteredCatalog = useMemo(() => {
    const q = (localSearch || '').toLowerCase().trim();
    return masterCatalog.filter(item => {
      const matchSearch = !q || 
        item.ArticleNo?.toLowerCase().includes(q) || 
        item.ItemName?.toLowerCase().includes(q) ||
        item.Category?.toLowerCase().includes(q) ||
        item.variants?.some(v => v.code?.toLowerCase().includes(q) || v.p1?.toLowerCase().includes(q) || v.p2?.toLowerCase().includes(q));

      const matchCat = selectedCategory === 'ALL' || item.Category === selectedCategory;

      let matchStock = true;
      const totalUnits = (item.variants || []).reduce((sum, v) => sum + (v.qty || 1), 0);
      if (stockFilter === 'IN_STOCK') matchStock = totalUnits > 3;
      if (stockFilter === 'LOW_STOCK') matchStock = totalUnits <= 3;

      return matchSearch && matchCat && matchStock;
    });
  }, [masterCatalog, localSearch, selectedCategory, stockFilter]);

  // Overall Store Metrics
  const storeSummary = useMemo(() => {
    let totalPieces = 0;
    let totalValue = 0;
    masterCatalog.forEach(item => {
      const variants = item.variants || [];
      if (variants.length > 0) {
        variants.forEach(v => {
          totalPieces += (v.qty || 1);
          totalValue += (v.qty || 1) * (v.mrp || item.MRP || 2999);
        });
      } else {
        totalPieces += (item.SkuCount || 1);
        totalValue += (item.SkuCount || 1) * (item.MRP || 2999);
      }
    });

    return {
      totalStyles: masterCatalog.length,
      totalPieces,
      totalValue
    };
  }, [masterCatalog]);

  // Active Item Metrics
  const activeDispatchMetrics = useMemo(() => {
    if (!selectedItem) return { totalPcs: 0, totalVal: 0, avgMrp: 0, variantsCount: 0 };
    const variants = selectedItem.variants || [];
    let totalPcs = 0;
    let totalVal = 0;
    variants.forEach(v => {
      const q = v.qty || 1;
      totalPcs += q;
      totalVal += q * (v.mrp || selectedItem.MRP || 2999);
    });

    return {
      totalPcs: totalPcs || selectedItem.SkuCount || 1,
      totalVal: totalVal || ((selectedItem.SkuCount || 1) * (selectedItem.MRP || 2999)),
      avgMrp: totalPcs > 0 ? Math.round(totalVal / totalPcs) : (selectedItem.MRP || 2999),
      variantsCount: variants.length
    };
  }, [selectedItem]);

  // Filter Table Variants (Grouped vs Detailed)
  const filteredVariants = useMemo(() => {
    if (!selectedItem || !selectedItem.variants) return [];
    const q = tableSearch.toLowerCase().trim();
    if (!q) return selectedItem.variants;
    return selectedItem.variants.filter(v => 
      v.code?.toLowerCase().includes(q) ||
      v.p1?.toLowerCase().includes(q) ||
      v.p2?.toLowerCase().includes(q) ||
      v.desc?.toLowerCase().includes(q)
    );
  }, [selectedItem, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / pageSize));
  const paginatedCatalog = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCatalog.slice(start, start + pageSize);
  }, [filteredCatalog, currentPage, pageSize]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-[1600px] mx-auto">
      
      {/* ============================================================== */}
      {/* LAYER 2: Master List (Left Pane - Stock Directory)             */}
      {/* ============================================================== */}
      <div className={`w-full lg:w-[410px] shrink-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-[#0f1115] border-[#1c2436]' : 'bg-white border-slate-200'}`}>
        
        {/* Header / Inward Velocity Style Banner */}
        <div className={`p-5 border-b ${darkMode ? 'border-[#1c2436]' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-lg font-black tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Inventory Explorer
                </h2>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Store Stock Dossier</p>
              </div>
            </div>

            {loading && (
              <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            )}
          </div>

          {/* Master Velocity Metrics Box (Identical to Goods in Transit) */}
          <div className={`rounded-xl p-3 flex justify-between ${darkMode ? 'bg-slate-900/60 border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Store Holdings</p>
              <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {storeSummary.totalPieces.toLocaleString('en-IN')} <span className="text-xs text-slate-500 font-semibold">Pcs</span>
              </p>
            </div>
            <div className="text-right">
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Retail Value</p>
              <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                ₹{storeSummary.totalValue.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Article, SKU, Category..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (setGlobalSearchQuery) setGlobalSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-9 pr-8 py-2 border rounded-xl text-sm focus:outline-none focus:border-blue-500 shadow-sm transition-colors ${darkMode ? 'bg-[#121829] border-[#232e47] text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
            />
            {localSearch && (
              <button 
                onClick={() => {
                  setLocalSearch('');
                  if (setGlobalSearchQuery) setGlobalSearchQuery('');
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 custom-scrollbar">
            {categoriesList.slice(0, 6).map(cat => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Master Articles List Header */}
        <div className={`px-4 py-2.5 border-b flex justify-between items-center ${darkMode ? 'border-[#1c2436] bg-[#0c0e12]' : 'border-slate-100 bg-slate-50/70'}`}>
          <h3 className={`text-xs font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Store Styles ({filteredCatalog.length})
          </h3>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setStockFilter(f => f === 'ALL' ? 'IN_STOCK' : f === 'IN_STOCK' ? 'LOW_STOCK' : 'ALL')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                stockFilter === 'ALL'
                  ? darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
                  : stockFilter === 'IN_STOCK'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-amber-500 text-amber-400 bg-amber-500/10'
              }`}
            >
              {stockFilter === 'ALL' ? 'Filter: All' : stockFilter === 'IN_STOCK' ? 'In Stock' : 'Low Stock'}
            </button>
          </div>
        </div>

        {/* Article Cards List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {paginatedCatalog.length > 0 ? (
            paginatedCatalog.map(item => {
              const isSelected = selectedItem?.ArticleNo === item.ArticleNo;
              const unitsCount = (item.variants || []).reduce((sum, v) => sum + (v.qty || 1), 0) || item.SkuCount || 1;
              const isLowStock = unitsCount <= 3;

              return (
                <button
                  key={item.ArticleNo}
                  onClick={() => handleSelectArticle(item)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    isSelected 
                      ? darkMode ? 'bg-blue-900/20 border-blue-500/50 ring-1 ring-blue-500/20' : 'bg-blue-50 border-blue-300 ring-1 ring-blue-200'
                      : darkMode ? 'bg-[#121829] border-[#232e47] hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                      <p className={`font-mono font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        #{item.ArticleNo}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isLowStock 
                        ? darkMode ? 'bg-amber-900/30 text-amber-400 border-orange-500/30' : 'bg-amber-100 text-amber-700 border-amber-200'
                        : darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}>
                      {isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                    </span>
                  </div>

                  <div className="flex justify-between items-end mt-3">
                    <div>
                      <p className={`text-xs font-semibold truncate max-w-[210px] ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                        {item.ItemName}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.Category} • MRP ₹{item.MRP?.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-emerald-500 font-bold text-xs">{unitsCount} pcs</p>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className={`p-8 text-center rounded-xl border border-dashed ${darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
              No articles found matching filters.
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className={`p-3 border-t flex items-center justify-between shrink-0 ${darkMode ? 'bg-[#0f1115] border-[#1c2436]' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={`p-1.5 rounded text-xs transition ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : (darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700')}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={`p-1.5 rounded text-xs transition ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : (darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700')}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* LAYER 3: Detail View (Main Pane - Article Breakdown)          */}
      {/* ============================================================== */}
      <div className={`flex-1 rounded-2xl border shadow-sm overflow-hidden flex flex-col relative ${darkMode ? 'bg-[#0f1115] border-[#1c2436]' : 'bg-white border-slate-200'}`}>
        {selectedItem ? (
          <div className="flex flex-col h-full">
            
            {/* Header: Article Dossier & Action Buttons */}
            <div className={`px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              
              <div className="flex items-center gap-4">
                {/* Photo Thumbnail with Camera / Upload Trigger */}
                <div className="relative group shrink-0">
                  {selectedItem.imageUrl ? (
                    <div className="w-14 h-16 rounded-xl overflow-hidden border-2 border-blue-500/40 shadow-md relative bg-slate-900 cursor-pointer" onClick={() => setIsZoomImageOpen(true)}>
                      <img src={selectedItem.imageUrl} alt={selectedItem.ArticleNo} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ) : (
                    <label className={`w-14 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${darkMode ? 'border-slate-700 bg-slate-900/60 hover:border-blue-500 text-slate-400' : 'border-slate-300 bg-slate-50 hover:border-blue-500 text-slate-500'}`}>
                      {uploadingArticle === selectedItem.ArticleNo ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mb-0.5 text-blue-500" />
                          <span className="text-[8px] font-black uppercase">Photo</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={(e) => handleImageUpload(e, selectedItem.ArticleNo)} 
                        disabled={uploadingArticle === selectedItem.ArticleNo} 
                      />
                    </label>
                  )}

                  {/* Change photo badge overlay */}
                  {selectedItem.imageUrl && (
                    <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg cursor-pointer hover:bg-blue-500 transition">
                      <Camera className="w-3 h-3" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={(e) => handleImageUpload(e, selectedItem.ArticleNo)} 
                      />
                    </label>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-xl font-black tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Article {selectedItem.ArticleNo}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/30 font-bold">
                      {selectedItem.Category}
                    </span>
                  </div>
                  <p className={`text-sm mt-0.5 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {selectedItem.ItemName} • Base MRP ₹{selectedItem.MRP?.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  onClick={handleExportCSV}
                  title="Export variant table as CSV"
                  className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition ${
                    darkMode ? 'bg-[#121829] border-[#232e47] hover:bg-[#1a2333] text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>

                <button 
                  onClick={handlePrintBarcode}
                  title="Print barcode tags for all SKUs"
                  className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition ${
                    darkMode ? 'bg-[#121829] border-[#232e47] hover:bg-[#1a2333] text-blue-400' : 'bg-white border-slate-200 hover:bg-slate-50 text-blue-600'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" /> Print Tags
                </button>

                {handleGenerateOutfitMatch && (
                  <button
                    onClick={() => handleGenerateOutfitMatch(selectedItem)}
                    disabled={isGeneratingOutfit && activeOutfitMatch === selectedItem.ArticleNo}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGeneratingOutfit && activeOutfitMatch === selectedItem.ArticleNo ? 'Drafting...' : 'AI Pitch'}
                  </button>
                )}
              </div>

            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              
              {/* TOP KPI ROW: Status, Total Volume, Total Asset Value, Avg MRP (Exactly like Goods in Transit) */}
              <div className={`rounded-xl border p-5 mb-6 flex flex-col md:flex-row justify-between gap-4 ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Stock Health</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-black border inline-block ${
                    activeDispatchMetrics.totalPcs <= 3
                      ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                  }`}>
                    {activeDispatchMetrics.totalPcs <= 3 ? 'LOW STOCK' : 'ACTIVE IN STORE'}
                  </span>
                </div>

                <div>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Available Volume</p>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-500 font-bold text-lg">
                      {activeDispatchMetrics.totalPcs} Pcs
                    </span>
                  </div>
                </div>

                <div>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Store Inventory Value</p>
                  <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    ₹{activeDispatchMetrics.totalVal.toLocaleString('en-IN')}
                  </p>
                </div>

                <div>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>SKU Variations</p>
                  <p className={`text-sm font-bold mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {activeDispatchMetrics.variantsCount} Unique Barcodes
                  </p>
                </div>
              </div>

              {/* AI Pitch Section Banner */}
              {activeOutfitMatch === selectedItem.ArticleNo && outfitPitch && (
                <div className={`border p-5 rounded-2xl mb-6 shadow-sm relative overflow-hidden animate-in zoom-in-95 duration-300 ${darkMode ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'}`}>
                  <div className="absolute top-0 right-0 w-1.5 bg-indigo-500 h-full"></div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest flex items-center">
                      <Wand2 className="w-4 h-4 mr-2" /> AI "Style of the Week" Pitch
                    </p>
                    <button
                      onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(outfitPitch)}`, '_blank')}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center shadow-md transition"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" /> Share to WhatsApp
                    </button>
                  </div>
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-indigo-100' : 'text-slate-700'}`}>
                    {outfitPitch}
                  </p>
                </div>
              )}

              {/* Table Controls Row: Grouped vs Detailed View Switch (The Goods in Transit Signature) */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 px-1">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Store Inventory Breakdown
                  </span>
                  
                  {/* Table search filter */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filter color or size..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className={`text-xs px-2.5 py-1 pl-7 rounded-lg border focus:outline-none focus:border-blue-500 ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
                    {tableSearch && (
                      <button onClick={() => setTableSearch('')} className="absolute right-2 top-1.5 text-slate-400">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* View Switch Button Group (Grouped | Detailed) */}
                <div className={`flex rounded-lg overflow-hidden border ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                  <button 
                    onClick={() => setViewMode('grouped')}
                    className={`px-3 py-1 text-xs font-bold transition-colors ${
                      viewMode === 'grouped' 
                        ? 'bg-blue-600 text-white' 
                        : (darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                    }`}
                  >
                    Grouped
                  </button>
                  <button 
                    onClick={() => setViewMode('detailed')}
                    className={`px-3 py-1 text-xs font-bold transition-colors ${
                      viewMode === 'detailed' 
                        ? 'bg-blue-600 text-white' 
                        : (darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                    }`}
                  >
                    Detailed
                  </button>
                </div>
              </div>

              {/* Data Table with Goods in Transit styling */}
              <div className={`rounded-xl border overflow-y-auto overflow-x-auto max-h-[50vh] custom-scrollbar ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className={`text-xs uppercase font-bold sticky top-0 z-10 border-b ${
                    darkMode ? 'bg-slate-800 text-blue-300 border-slate-700' : 'bg-blue-50 text-blue-800 border-slate-300'
                  }`}>
                    {viewMode === 'grouped' ? (
                      <tr>
                        <th className="px-4 py-3 border-r border-slate-700/50">Category (Desc)</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Color (P1)</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Size (P2)</th>
                        <th className="px-4 py-3 border-r border-slate-700/50 text-center">In-Stock Qty</th>
                        <th className="px-4 py-3 border-r border-slate-700/50 text-right">Avg MRP</th>
                        <th className="px-4 py-3 text-right">Total Value</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-4 py-3 border-r border-slate-700/50">Item Code / Barcode</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Article No.</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Description</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Para1 (Color)</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Para2 (Size)</th>
                        <th className="px-4 py-3 border-r border-slate-700/50">Para3 (Fit)</th>
                        <th className="px-4 py-3 border-r border-slate-700/50 text-center">Qty</th>
                        <th className="px-4 py-3 border-r border-slate-700/50 text-center">UOM</th>
                        <th className="px-4 py-3 border-r border-slate-700/50 text-right">MRP (₹)</th>
                        <th className="px-4 py-3 text-right">Total Asset (₹)</th>
                      </tr>
                    )}
                  </thead>

                  <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {variantLoading ? (
                      <tr>
                        <td colSpan={viewMode === 'grouped' ? 6 : 10} className="px-4 py-8 text-center text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                          Querying live store inventory...
                        </td>
                      </tr>
                    ) : filteredVariants.length === 0 ? (
                      <tr>
                        <td colSpan={viewMode === 'grouped' ? 6 : 10} className={`px-4 py-8 text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          No variation details found matching the filter.
                        </td>
                      </tr>
                    ) : viewMode === 'grouped' ? (
                      (() => {
                        // Group by desc, color, size
                        const grouped = filteredVariants.reduce((acc, v) => {
                          const key = `${v.desc || 'ITEM'}|${v.p1 || 'STD'}|${v.p2 || 'STD'}`;
                          if (!acc[key]) {
                            acc[key] = {
                              desc: v.desc || selectedItem.ItemName,
                              p1: v.p1 || 'STANDARD',
                              p2: v.p2 || 'STD',
                              qty: 0,
                              mrpSum: 0,
                              count: 0
                            };
                          }
                          const q = v.qty || 1;
                          acc[key].qty += q;
                          acc[key].mrpSum += (v.mrp || selectedItem.MRP || 2999) * q;
                          acc[key].count += 1;
                          return acc;
                        }, {});

                        return Object.values(grouped).map((g, idx) => (
                          <tr key={idx} className={`hover:bg-blue-500/5 transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            <td className={`px-4 py-2.5 font-bold border-r ${darkMode ? 'border-slate-800 text-blue-400' : 'border-slate-200 text-blue-600'}`}>
                              {g.desc}
                            </td>
                            <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                              <span className="font-semibold">{g.p1}</span>
                            </td>
                            <td className={`px-4 py-2.5 border-r font-bold ${darkMode ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'}`}>
                              {g.p2}
                            </td>
                            <td className={`px-4 py-2.5 border-r text-center font-bold ${darkMode ? 'border-slate-800 text-emerald-400 bg-emerald-500/10' : 'border-slate-200 text-emerald-600 bg-emerald-50'}`}>
                              {g.qty} Pcs
                            </td>
                            <td className={`px-4 py-2.5 border-r text-right font-mono ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                              ₹{Math.round(g.mrpSum / g.qty).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-500">
                              ₹{g.mrpSum.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ));
                      })()
                    ) : (
                      filteredVariants.map((item, idx) => (
                        <tr key={idx} className={`hover:bg-blue-500/5 transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          <td className={`px-4 py-2.5 font-mono font-bold border-r ${darkMode ? 'border-slate-800 text-blue-400' : 'border-slate-200 text-blue-600'}`}>
                            {item.code || 'UNKNOWN'}
                          </td>
                          <td className={`px-4 py-2.5 font-mono border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                            {item.article || selectedItem.ArticleNo}
                          </td>
                          <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                            {item.desc || selectedItem.ItemName}
                          </td>
                          <td className={`px-4 py-2.5 border-r font-semibold ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                            {item.p1 || 'STANDARD'}
                          </td>
                          <td className={`px-4 py-2.5 border-r font-bold ${darkMode ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'}`}>
                            {item.p2 || 'STD'}
                          </td>
                          <td className={`px-4 py-2.5 border-r ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                            {item.p3 || 'NA'}
                          </td>
                          <td className={`px-4 py-2.5 border-r text-center font-bold ${darkMode ? 'border-slate-800 text-emerald-400 bg-emerald-500/10' : 'border-slate-200 text-emerald-600 bg-emerald-50'}`}>
                            {item.qty || 1}
                          </td>
                          <td className={`px-4 py-2.5 border-r text-center ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                            {item.uom || 'PCS'}
                          </td>
                          <td className={`px-4 py-2.5 border-r text-right font-mono ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                            {(item.mrp || selectedItem.MRP || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-500">
                            {((item.qty || 1) * (item.mrp || selectedItem.MRP || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {/* Summary Totals Table Footer */}
                  {filteredVariants.length > 0 && (
                    <tfoot className={`font-bold border-t ${darkMode ? 'bg-slate-900/80 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}>
                      <tr>
                        <td colSpan={viewMode === 'grouped' ? 3 : 6} className="px-4 py-2.5 text-right uppercase text-xs">
                          Total Active In Store:
                        </td>
                        <td className="px-4 py-2.5 text-center text-emerald-500 font-black">
                          {filteredVariants.reduce((sum, v) => sum + (v.qty || 1), 0)} Pcs
                        </td>
                        <td colSpan={viewMode === 'grouped' ? 1 : 2} className="px-4 py-2.5 text-right text-xs"></td>
                        <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-500">
                          ₹{filteredVariants.reduce((sum, v) => sum + (v.qty || 1) * (v.mrp || selectedItem.MRP || 0), 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${darkMode ? 'bg-slate-900 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
              <Package className="w-8 h-8" />
            </div>
            <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Select an Article
            </h3>
            <p className={`text-xs max-w-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Select an article style from the left pane to view detailed barcodes, color runs, size stock runs, and export slips.
            </p>
          </div>
        )}
      </div>

      {/* High-Resolution Zoom Preview Modal */}
      {isZoomImageOpen && selectedItem?.imageUrl && (
        <div 
          onClick={() => setIsZoomImageOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div className="relative max-w-lg w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-slate-800 text-white">
              <span className="font-mono font-bold text-sm">#{selectedItem.ArticleNo} - {selectedItem.ItemName}</span>
              <button onClick={() => setIsZoomImageOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={selectedItem.imageUrl} alt={selectedItem.ArticleNo} className="w-full h-auto max-h-[70vh] object-contain bg-black" />
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryTab;
