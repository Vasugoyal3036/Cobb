import React, { useState, useRef } from 'react';
import { Printer, ScanBarcode, Box, Tag, Layers, RefreshCw, Eye } from 'lucide-react';
import Barcode from 'react-barcode';

export default function BarcodeGeneratorTab({ darkMode }) {
  const [sku, setSku] = useState('CB-1001-BLU-M');
  const [itemName, setItemName] = useState('Classic Denim Jacket');
  const [price, setPrice] = useState(2499);
  const [size, setSize] = useState('M');
  const [color, setColor] = useState('Blue');
  const [copies, setCopies] = useState(1);
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128');

  const printRef = useRef(null);

  const handlePrint = () => {
    // A simple print mechanism for the barcode section
    const printContent = printRef.current;
    if (!printContent) return;
    
    const originalContents = document.body.innerHTML;
    const printMarkup = printContent.innerHTML;
    
    // Replace body with print content, trigger print, then restore
    // Using a new window is safer for React apps
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Barcode Labels</title>
            <style>
              body {
                margin: 0;
                padding: 10mm;
                font-family: monospace;
              }
              .label-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 10px;
              }
              .label-item {
                border: 1px dashed #ccc;
                padding: 10px;
                text-align: center;
                break-inside: avoid;
              }
              .item-name { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
              .item-meta { font-size: 11px; margin-bottom: 5px; color: #555; }
              .item-price { font-weight: bold; font-size: 16px; margin-top: 5px; }
              @media print {
                @page { margin: 0; }
                body { margin: 1cm; }
                .label-item { border: none; }
              }
            </style>
          </head>
          <body>
            <div class="label-grid">
              ${Array.from({ length: copies }).map(() => `
                <div class="label-item">
                  <div class="item-name">${itemName}</div>
                  <div class="item-meta">${color} | Size: ${size}</div>
                  <div style="display: flex; justify-content: center;">
                    ${printMarkup}
                  </div>
                  <div class="item-price">MRP: ₹${price.toLocaleString('en-IN')}</div>
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      // Delay printing to allow barcode to render (it's SVG so it should be fast)
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const generateRandomSku = () => {
    const prefix = ['CB', 'TS', 'DN', 'SW'][Math.floor(Math.random() * 4)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const col = ['BLK', 'WHT', 'BLU', 'GRY', 'RED'][Math.floor(Math.random() * 5)];
    const sz = ['S', 'M', 'L', 'XL', 'XXL'][Math.floor(Math.random() * 5)];
    setSku(`${prefix}-${num}-${col}-${sz}`);
    setColor(col);
    setSize(sz);
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 overflow-hidden">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <ScanBarcode className="w-7 h-7 text-emerald-500" />
            <span className={darkMode ? 'text-white' : 'text-slate-900'}>Barcode Factory</span>
          </h2>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
            Generate and print thermal labels for new inventory arrivals
          </p>
        </div>
        <button
          onClick={handlePrint}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-sm cursor-pointer ${
            darkMode 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Print {copies > 1 ? `${copies} Labels` : 'Label'}</span>
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left Column: Form Setup */}
        <div className={`lg:col-span-5 flex flex-col rounded-2xl border shadow-sm p-5 overflow-y-auto ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-5 pb-3 border-b ${darkMode ? 'text-slate-300 border-slate-800' : 'text-slate-500 border-slate-100'}`}>
            SKU Parameters
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Article / SKU Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-mono font-bold border transition-all outline-none ${
                    darkMode 
                      ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-white' 
                      : 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-900'
                  }`}
                  placeholder="e.g. CB-1001-BLU-M"
                />
                <button 
                  onClick={generateRandomSku}
                  className={`px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Generate Random"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Product Name</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-all outline-none ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-white' 
                    : 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-900'
                }`}
                placeholder="e.g. Classic Denim Jacket"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-all outline-none ${
                    darkMode 
                      ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-white' 
                      : 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Size</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-all outline-none ${
                    darkMode 
                      ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-white' 
                      : 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-900'
                  }`}
                >
                  {['FS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '30', '32', '34', '36', '38'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>MRP (₹)</label>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>₹</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                    className={`w-full pl-7 pr-3 py-2 rounded-lg text-sm font-mono font-bold border transition-all outline-none ${
                      darkMode 
                        ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-emerald-400' 
                        : 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-emerald-600'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Print Quantity</label>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>#</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={copies}
                    onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                    className={`w-full pl-7 pr-3 py-2 rounded-lg text-sm font-mono font-bold border transition-all outline-none ${
                      darkMode 
                        ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-white' 
                        : 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1.5 mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Barcode Format</label>
              <select
                value={barcodeFormat}
                onChange={(e) => setBarcodeFormat(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-all outline-none ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-white' 
                    : 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-900'
                }`}
              >
                <option value="CODE128">CODE128 (Standard)</option>
                <option value="CODE39">CODE39 (Legacy)</option>
                <option value="EAN13">EAN-13 (Retail Standard)</option>
                <option value="UPC">UPC-A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Live Preview Studio */}
        <div className={`lg:col-span-7 flex flex-col rounded-2xl border shadow-sm p-1 ${
          darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 p-4 border-b shrink-0 border-inherit">
            <Eye className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <h3 className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Thermal Print Preview
            </h3>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 min-h-[400px]">
            {/* The actual label that gets printed */}
            <div className="bg-white shadow-xl rounded border border-slate-200 p-6 flex flex-col items-center justify-center min-w-[300px] max-w-[400px] mx-auto scale-[1.1] transition-all relative group">
              
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg font-bold text-xs transform group-hover:scale-110 transition-transform">
                x{copies}
              </div>

              <div className="text-center mb-3 w-full">
                <h4 className="font-bold text-lg text-black tracking-tight">{itemName || 'Item Name'}</h4>
                <div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-widest flex items-center justify-center gap-2">
                  <span>{color || 'Color'}</span>
                  <span>•</span>
                  <span>Size {size || '-'}</span>
                </div>
              </div>

              {/* Barcode component wrapper for printing */}
              <div ref={printRef} className="my-2 bg-white flex justify-center w-full">
                {sku ? (
                  <Barcode 
                    value={sku} 
                    format={barcodeFormat}
                    width={2} 
                    height={60} 
                    displayValue={true} 
                    fontSize={14}
                    font="monospace"
                    lineColor="#000000"
                    background="#FFFFFF"
                    margin={0}
                  />
                ) : (
                  <div className="w-[200px] h-[60px] bg-slate-100 border border-slate-300 border-dashed flex items-center justify-center text-slate-400 font-mono text-sm">
                    Enter SKU
                  </div>
                )}
              </div>

              <div className="mt-4 text-center">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest block mb-1">MRP</span>
                <span className="text-2xl font-black text-black">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-gray-400 block mt-1">(Incl. of all taxes)</span>
              </div>
            </div>

            <div className={`mt-10 text-xs font-semibold px-4 py-2 rounded-full border flex items-center gap-2 ${
              darkMode ? 'bg-amber-950/30 border-amber-900/50 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Printer Ready: 4"x2" Thermal Label Roll Detected
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
