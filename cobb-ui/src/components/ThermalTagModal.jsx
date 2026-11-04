import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  X,
  Copy,
  Check,
  Tag,
  Sparkles,
  SlidersHorizontal,
  Layers,
  RefreshCw,
  ShoppingBag,
  Zap,
  RotateCcw
} from 'lucide-react';
import {
  COBB_CATEGORIES,
  MRP_PRESETS,
  PROMO_PRESETS,
  generateQuickTagBarcode,
  generateBarcodeSvg,
  triggerThermalTagPrint
} from '../utils/thermalTagPrinter';

export default function ThermalTagModal({
  isOpen,
  onClose,
  tagData = null,
  initialMode = null,
  onPrintSuccess
}) {
  // Modal Mode: 'quick' (Category + MRP) or 'detailed' (Individual Item / Scanned Tag)
  const [activeMode, setActiveMode] = useState('quick');
  const [paperSize, setPaperSize] = useState('58mm'); // '58mm' | '80mm'
  const [copies, setCopies] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Form State for Quick / Custom Category + MRP Tag
  const [categoryItem, setCategoryItem] = useState(COBB_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [mrp, setMrp] = useState(2799);
  const [size, setSize] = useState('40 (L)');
  const [customSize, setCustomSize] = useState('');
  const [color, setColor] = useState('Standard');
  const [promo, setPromo] = useState('BUY 1 GET 2 FREE');
  const [barcode, setBarcode] = useState('');
  const [articleNo, setArticleNo] = useState('CB-CS-2799');
  const [singleDealPrice, setSingleDealPrice] = useState('');

  // Detailed Tag Mode Form State (for editing raw scanned/pending tags)
  const [detailedForm, setDetailedForm] = useState({
    barcode: '',
    articleNo: '',
    articleName: '',
    size: 'Free',
    color: 'Standard',
    section: 'Apparel',
    mrp: 1999,
    soldPrice: '',
    promo: 'BUY 1 GET 2 FREE'
  });
  const [isCustomizingDetailed, setIsCustomizingDetailed] = useState(false);

  // Sync incoming tagData on open
  useEffect(() => {
    if (!isOpen) return;

    if (tagData) {
      const isQuickRequested = initialMode === 'quick' || tagData.isQuickCategoryMrp;
      if (isQuickRequested) {
        setActiveMode('quick');
      } else if (initialMode === 'detailed' || tagData.barcode || tagData.articleNo) {
        // If an explicit pending tag or stock article is provided, start in detailed or populate
        setActiveMode(initialMode || 'detailed');
      }

      // Populate detailed form
      setDetailedForm({
        barcode: tagData.barcode || tagData.scannedBarcode || '',
        articleNo: tagData.articleNo || 'COBB-ART',
        articleName: tagData.articleName || tagData.itemName || tagData.category || 'Cobb Apparel',
        size: tagData.size || 'Free',
        color: tagData.color || 'Standard',
        section: tagData.section || tagData.sectionName || 'Apparel',
        mrp: Number(tagData.mrp || 1999),
        soldPrice: tagData.soldPrice ? Number(tagData.soldPrice) : '',
        promo: tagData.promo || 'BUY 1 GET 2 FREE'
      });

      // Also pre-fill quick form if category or mrp matched
      if (tagData.category || tagData.articleName) {
        const foundCat = COBB_CATEGORIES.find(c =>
          c.name.toLowerCase() === (tagData.category || tagData.articleName || '').toLowerCase()
        );
        if (foundCat) {
          setCategoryItem(foundCat);
          setCustomCategory('');
        } else {
          setCustomCategory(tagData.category || tagData.articleName || '');
        }
      }
      if (tagData.mrp) {
        setMrp(Number(tagData.mrp));
      }
      if (tagData.size) {
        setSize(tagData.size);
      }
      if (tagData.color) {
        setColor(tagData.color);
      }
      if (tagData.barcode) {
        setBarcode(tagData.barcode);
      } else {
        setBarcode(generateQuickTagBarcode(tagData.category || 'MENSWEAR', tagData.mrp || 1999));
      }
    } else {
      // Default to quick Category + MRP mode with fresh barcode
      setActiveMode('quick');
      const defaultCat = COBB_CATEGORIES[0];
      setCategoryItem(defaultCat);
      setMrp(defaultCat.defaultMrp);
      setSize(defaultCat.defaultSizes[2] || defaultCat.defaultSizes[0]);
      setPromo(defaultCat.promo);
      setArticleNo(`CB-${defaultCat.shortCode}-${defaultCat.defaultMrp}`);
      setBarcode(generateQuickTagBarcode(defaultCat.name, defaultCat.defaultMrp));
    }
  }, [isOpen, tagData, initialMode]);

  // Handle switching category
  const handleSelectCategory = (cat) => {
    setCategoryItem(cat);
    setCustomCategory('');
    setMrp(cat.defaultMrp);
    setPromo(cat.promo);
    const chosenSize = cat.defaultSizes[2] || cat.defaultSizes[0] || 'FREE';
    setSize(chosenSize);
    setCustomSize('');
    const newArt = `CB-${cat.shortCode}-${cat.defaultMrp}`;
    setArticleNo(newArt);
    setBarcode(generateQuickTagBarcode(cat.name, cat.defaultMrp));
  };

  // Handle regenerating fresh barcode
  const handleRegenerateBarcode = () => {
    const catName = customCategory || (categoryItem ? categoryItem.name : 'GARMENT');
    const newCode = generateQuickTagBarcode(catName, mrp);
    setBarcode(newCode);
  };

  // Active Tag Object for Rendering Preview and Printing
  const currentTagData = useMemo(() => {
    if (activeMode === 'quick') {
      const activeCatName = (customCategory || (categoryItem ? categoryItem.name : 'MENSWEAR')).toUpperCase();
      const activeSize = (customSize || size || 'FREE').toUpperCase();
      const cleanMrp = Number(mrp) || 1999;
      const cleanArtNo = articleNo || `CB-${categoryItem ? categoryItem.shortCode : 'GM'}-${cleanMrp}`;
      const defaultBarcode = barcode || generateQuickTagBarcode(activeCatName, cleanMrp);

      return {
        category: activeCatName,
        articleName: activeCatName,
        articleNo: cleanArtNo,
        size: activeSize,
        color: (color || 'STANDARD').toUpperCase(),
        section: categoryItem ? categoryItem.section : 'MENSWEAR',
        mrp: cleanMrp,
        soldPrice: singleDealPrice ? Number(singleDealPrice) : Math.round(cleanMrp * 0.5),
        promo: promo || 'BUY 1 GET 2 FREE',
        barcode: defaultBarcode
      };
    }

    return {
      category: detailedForm.articleName || 'MENSWEAR',
      articleName: detailedForm.articleName || 'Garment',
      articleNo: detailedForm.articleNo || 'COBB-ART',
      size: detailedForm.size || 'FREE',
      color: detailedForm.color || 'Standard',
      section: detailedForm.section || 'Apparel',
      mrp: Number(detailedForm.mrp || 0),
      soldPrice: detailedForm.soldPrice ? Number(detailedForm.soldPrice) : null,
      promo: detailedForm.promo || 'BUY 1 GET 2 FREE',
      barcode: detailedForm.barcode || '0082107519'
    };
  }, [
    activeMode,
    customCategory,
    categoryItem,
    customSize,
    size,
    mrp,
    articleNo,
    barcode,
    color,
    singleDealPrice,
    promo,
    detailedForm
  ]);

  if (!isOpen) return null;

  // Generate SVG barcode for live mockup preview
  const barcodeSvgHtml = generateBarcodeSvg(currentTagData.barcode, {
    width: paperSize === '80mm' ? 2.1 : 1.7,
    height: paperSize === '80mm' ? 44 : 36
  });

  const handleCopyBarcode = () => {
    if (!currentTagData.barcode) return;
    try {
      navigator.clipboard.writeText(currentTagData.barcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      triggerThermalTagPrint(currentTagData, { paperSize, copies });
      if (onPrintSuccess) onPrintSuccess(currentTagData);
    } catch (e) {
      console.error('Thermal tag print error:', e);
    } finally {
      setTimeout(() => setIsPrinting(false), 800);
    }
  };

  const currentSizes = categoryItem ? categoryItem.defaultSizes : ['38', '40', '42', '44'];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-rose-950/30 to-amber-950/30 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/25">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span>Thermal Garment Tag Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-500 text-slate-950">
                  Category + MRP Format
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Print official replacement garment price tags for floor garments by Category and MRP
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

        {/* Mode Selector & Roll Size Bar */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2.5">
          {/* Mode Switcher */}
          <div className="flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveMode('quick')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                activeMode === 'quick'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Quick: Category + MRP</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('detailed')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                activeMode === 'detailed'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Custom / Scanned Tag</span>
            </button>
          </div>

          {/* Roll Size & Copies */}
          <div className="flex items-center gap-2">
            <div className="flex p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setPaperSize('58mm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === '58mm'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                58mm Roll
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('80mm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === '80mm'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                80mm POS
              </button>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <span>Copies:</span>
              <select
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
                <option value={5}>5x</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Body: Left Inputs & Right Live Realistic Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
          {/* Controls Column */}
          <div className="md:col-span-7 space-y-4">
            {activeMode === 'quick' ? (
              <div className="space-y-4">
                {/* 1. Category Fast-Select Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-rose-500" />
                      <span>1. Select Garment Category</span>
                    </label>
                    <span className="text-[10px] text-slate-400">1-Tap Preset</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    {COBB_CATEGORIES.map((cat) => {
                      const isSelected = !customCategory && categoryItem?.id === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            isSelected
                              ? 'bg-rose-500 text-white shadow-sm scale-102'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-rose-400'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">Or custom category:</span>
                    <input
                      type="text"
                      placeholder="e.g. NEHRU JACKET, KURTA, BOXER"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold uppercase"
                    />
                  </div>
                </div>

                {/* 2. MRP Fast-Select Chips & Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                      <span>2. Select MRP (₹)</span>
                    </label>
                    <span className="text-[10px] font-black text-rose-500">₹{mrp}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    {MRP_PRESETS.map((p) => {
                      const isSelected = Number(mrp) === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setMrp(p)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black shadow-sm scale-102'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
                          }`}
                        >
                          ₹{p}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">Custom MRP:</span>
                    <input
                      type="number"
                      value={mrp}
                      onChange={(e) => setMrp(Number(e.target.value))}
                      className="w-32 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* 3. Size Fast-Select */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      3. Garment Size
                    </label>
                    <span className="text-[10px] text-slate-400">Dynamic to Category</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    {currentSizes.map((s) => {
                      const isSelected = !customSize && size === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSize(s);
                            setCustomSize('');
                          }}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">Custom Size:</span>
                    <input
                      type="text"
                      placeholder="e.g. 42 (105 CM.) or XL"
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      className="w-36 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold uppercase"
                    />
                  </div>
                </div>

                {/* 4. Color, Promo & Barcode */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Color / Shade</label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="e.g. Navy, Black, Mix"
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Promo Offer Banner</label>
                    <select
                      value={promo}
                      onChange={(e) => setPromo(e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                    >
                      {PROMO_PRESETS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Barcode & Article No Details */}
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                      Barcode & Style Code
                    </span>
                    <button
                      type="button"
                      onClick={handleRegenerateBarcode}
                      className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Regenerate Barcode</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400">Barcode (Scannable)</label>
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className="w-full px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400">Article / Style No</label>
                      <input
                        type="text"
                        value={articleNo}
                        onChange={(e) => setArticleNo(e.target.value)}
                        className="w-full px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Detailed / Scanned Tag Mode */
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs">
                  <strong>Detailed Tag Editor</strong>: Edit individual article fields directly from scanned pending tags or stock articles.
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Barcode</label>
                    <input
                      type="text"
                      value={detailedForm.barcode}
                      onChange={(e) => setDetailedForm({ ...detailedForm, barcode: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Article No</label>
                    <input
                      type="text"
                      value={detailedForm.articleNo}
                      onChange={(e) => setDetailedForm({ ...detailedForm, articleNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500">Item / Category Name</label>
                  <input
                    type="text"
                    value={detailedForm.articleName}
                    onChange={(e) => setDetailedForm({ ...detailedForm, articleName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Size</label>
                    <input
                      type="text"
                      value={detailedForm.size}
                      onChange={(e) => setDetailedForm({ ...detailedForm, size: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Color</label>
                    <input
                      type="text"
                      value={detailedForm.color}
                      onChange={(e) => setDetailedForm({ ...detailedForm, color: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">MRP (₹)</label>
                    <input
                      type="number"
                      value={detailedForm.mrp}
                      onChange={(e) => setDetailedForm({ ...detailedForm, mrp: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Section</label>
                    <input
                      type="text"
                      value={detailedForm.section}
                      onChange={(e) => setDetailedForm({ ...detailedForm, section: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Promo Offer</label>
                    <input
                      type="text"
                      value={detailedForm.promo}
                      onChange={(e) => setDetailedForm({ ...detailedForm, promo: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Realistic Visual Thermal Tag Preview Column */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="w-full text-center mb-1 text-[11px] font-bold text-slate-500">
              Live {paperSize} Print Preview ({copies} {copies > 1 ? 'copies' : 'copy'})
            </div>

            <div className="w-full flex justify-center p-3 bg-slate-100 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div
                className={`bg-white text-black p-3.5 rounded-xl shadow-lg border-2 border-black transition-all ${
                  paperSize === '80mm' ? 'w-[250px]' : 'w-[215px]'
                }`}
              >
                {/* Hole Punch Circle at Top Center */}
                <div className="flex justify-center mb-1">
                  <div className="w-3 h-3 rounded-full border-2 border-black bg-slate-100" />
                </div>

                {/* Brand Header */}
                <div className="text-center">
                  <h4 className="font-black text-xs tracking-wider uppercase">COBB APPARELS</h4>
                  <div className="text-[8px] font-bold tracking-tight text-slate-700 uppercase">
                    GOYAL - HOUSE OF FASHION • PUNDRI
                  </div>
                </div>

                <div className="my-1.5 border-t border-dashed border-black" />

                {/* Category Banner */}
                <div className="bg-slate-100 border border-black rounded p-1 text-center mb-1.5">
                  <div className="text-[7px] font-extrabold uppercase text-slate-600 tracking-wider">
                    COMMODITY / ITEM
                  </div>
                  <div className="text-[11px] font-black uppercase text-black leading-tight">
                    {currentTagData.category}
                  </div>
                </div>

                {/* Article & Specs Details */}
                <div className="text-[10px] space-y-0.5 font-bold">
                  <div className="flex justify-between">
                    <span>ART: {currentTagData.articleNo}</span>
                    <span>COL: {currentTagData.color}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600">
                    <span>SEC: {currentTagData.section}</span>
                    <span>QTY: 1 N</span>
                  </div>
                </div>

                {/* High-Visibility Size Badge */}
                <div className="my-1.5 py-1 px-1.5 bg-black text-white rounded font-black text-center text-xs tracking-wide">
                  SIZE: {currentTagData.size}
                </div>

                {/* Scannable Barcode Render */}
                <div
                  className="my-1 flex justify-center overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: barcodeSvgHtml }}
                />

                <div className="my-1.5 border-t border-dashed border-black" />

                {/* Pricing Block */}
                <div className="text-center space-y-0.5">
                  <div className="text-[8px] uppercase font-bold text-slate-600">Max Retail Price</div>
                  <div className="text-lg font-black tracking-tight leading-none">
                    ₹{Number(currentTagData.mrp || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[7.5px] text-slate-500 font-semibold">(Inclusive of all taxes)</div>

                  <div className="mt-1 inline-block border border-black rounded px-1.5 py-0.5 text-[9px] font-black uppercase">
                    {currentTagData.promo}
                  </div>

                  <div className="text-[7.5px] text-slate-600 pt-1 flex justify-between px-1">
                    <span>Pkd: Nov 2026</span>
                    <span>Std. Fit</span>
                  </div>
                </div>

                <div className="my-1.5 border-t-2 border-black" />

                <div className="text-[7px] text-center text-slate-600 uppercase leading-tight font-medium">
                  COBB APPARELS PVT. LTD.<br />
                  REPLACEMENT GARMENT PRICE TAG
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyBarcode}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Barcode'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-all"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>
                {isPrinting
                  ? 'Printing...'
                  : `Print ${copies > 1 ? `${copies}x ` : ''}${paperSize} Tag`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
