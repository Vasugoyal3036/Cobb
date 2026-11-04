import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  X,
  Copy,
  Check,
  Tag,
  Sparkles,
  SlidersHorizontal,
  Scissors
} from 'lucide-react';
import { generateBarcodeSvg, triggerThermalTagPrint } from '../utils/thermalTagPrinter';

export default function ThermalTagModal({
  isOpen,
  onClose,
  tagData = null,
  onPrintSuccess
}) {
  const [paperSize, setPaperSize] = useState('58mm'); // '58mm' | '80mm'
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [tagForm, setTagForm] = useState({
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
  const [isCustomizing, setIsCustomizing] = useState(false);

  useEffect(() => {
    if (tagData) {
      setTagForm({
        barcode: tagData.barcode || tagData.scannedBarcode || '',
        articleNo: tagData.articleNo || 'COBB-ART',
        articleName: tagData.articleName || tagData.itemName || 'Cobb Apparel',
        size: tagData.size || 'Free',
        color: tagData.color || 'Standard',
        section: tagData.section || tagData.sectionName || 'Apparel',
        mrp: Number(tagData.mrp || 0),
        soldPrice: tagData.soldPrice ? Number(tagData.soldPrice) : '',
        promo: tagData.promo || 'BUY 1 GET 2 FREE'
      });
    }
  }, [tagData]);

  if (!isOpen || !tagData) return null;

  const barcodeSvgHtml = generateBarcodeSvg(tagForm.barcode, {
    width: paperSize === '80mm' ? 2.1 : 1.7,
    height: paperSize === '80mm' ? 46 : 38
  });

  const handleCopyBarcode = () => {
    if (!tagForm.barcode) return;
    try {
      navigator.clipboard.writeText(tagForm.barcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      triggerThermalTagPrint(tagForm, { paperSize });
      if (onPrintSuccess) onPrintSuccess(tagForm);
    } catch (e) {
      console.error('Print error:', e);
    } finally {
      setTimeout(() => setIsPrinting(false), 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Replacement Garment Tag</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-500 text-slate-950">
                  Thermal
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">Staple or pin onto garments with missing/torn tags</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Paper Size Selector & Quick Toggles */}
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPaperSize('58mm')}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                  paperSize === '58mm'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                58mm (2-inch Roll)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('80mm')}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
                  paperSize === '80mm'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                80mm (3-inch POS)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsCustomizing(!isCustomizing)}
              className={`p-1.5 rounded-xl flex items-center gap-1 font-bold text-[11px] ${
                isCustomizing
                  ? 'bg-rose-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Edit tag text"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isCustomizing ? 'Hide Edit' : 'Edit'}</span>
            </button>
          </div>

          {/* Quick Edit Form (Collapsible) */}
          {isCustomizing && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5 animate-in fade-in">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Barcode</label>
                  <input
                    type="text"
                    value={tagForm.barcode}
                    onChange={(e) => setTagForm({ ...tagForm, barcode: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Article No</label>
                  <input
                    type="text"
                    value={tagForm.articleNo}
                    onChange={(e) => setTagForm({ ...tagForm, articleNo: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Size</label>
                  <input
                    type="text"
                    value={tagForm.size}
                    onChange={(e) => setTagForm({ ...tagForm, size: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Color</label>
                  <input
                    type="text"
                    value={tagForm.color}
                    onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">MRP (₹)</label>
                  <input
                    type="number"
                    value={tagForm.mrp}
                    onChange={(e) => setTagForm({ ...tagForm, mrp: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Visual Realistic Thermal Tag Mockup */}
          <div className="flex justify-center p-2 bg-slate-100 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div
              className={`bg-white text-black p-4 rounded-xl shadow-lg border-2 border-black transition-all ${
                paperSize === '80mm' ? 'w-[280px]' : 'w-[230px]'
              }`}
            >
              {/* Hole Punch Circle at Top */}
              <div className="flex justify-center mb-1">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-black bg-slate-100" />
              </div>

              {/* Brand Header */}
              <div className="text-center">
                <h4 className="font-black text-sm tracking-wider uppercase">COBB APPARELS</h4>
                <div className="text-[9px] font-bold tracking-tight text-slate-700 uppercase">
                  GOYAL - HOUSE OF FASHION • PUNDRI
                </div>
              </div>

              <div className="my-2 border-t border-dashed border-black" />

              {/* Article & Details */}
              <div className="text-[11px] space-y-0.5 font-bold">
                <div className="truncate">ART: {tagForm.articleNo}</div>
                <div className="truncate text-slate-800">{tagForm.articleName}</div>
                <div className="flex justify-between text-[10px] text-slate-600 font-semibold pt-0.5">
                  <span>COL: {tagForm.color}</span>
                  <span>SEC: {tagForm.section}</span>
                </div>
              </div>

              {/* High-Visibility Size Badge */}
              <div className="my-2 py-1 px-2 bg-black text-white rounded font-black text-center text-sm tracking-wide">
                SIZE: {tagForm.size}
              </div>

              {/* Barcode Render */}
              <div
                className="my-1.5 flex justify-center overflow-hidden"
                dangerouslySetInnerHTML={{ __html: barcodeSvgHtml }}
              />

              <div className="my-2 border-t border-dashed border-black" />

              {/* Pricing & Promo Block */}
              <div className="text-center space-y-0.5">
                <div className="text-[9px] uppercase font-bold text-slate-600">Max Retail Price</div>
                <div className="text-xl font-black tracking-tight">
                  ₹{Number(tagForm.mrp || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[8px] text-slate-500 font-semibold">(Inclusive of all taxes)</div>
                <div className="mt-1 inline-block border border-black rounded px-2 py-0.5 text-[10px] font-black uppercase">
                  {tagForm.promo}
                </div>
              </div>

              <div className="my-2 border-t-2 border-black" />

              <div className="text-[8px] text-center text-slate-600">
                REPLACEMENT PRICE TAG • STAPLE TO GARMENT
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyBarcode}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy SKU'}</span>
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
              <span>{isPrinting ? 'Printing Tag...' : `Print ${paperSize} Tag`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

