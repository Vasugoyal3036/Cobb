import React from 'react';
import { Terminal, Barcode, Search, X, Calculator, AlarmClock, Wallet, ArrowRight } from 'lucide-react';

const QuickToolsWidget = ({
  dashboardZone,
  overviewStats,
  khataSummary,
  holds,
  quickScanInputRef,
  quickScanQuery,
  setQuickScanQuery,
  isScannerFocused,
  setIsScannerFocused,
  quickScanResult,
  setQuickScanResult,
  quickScanError,
  setQuickScanError,
  handleQuickScan,
  setActiveTab,
  calcOffer,
  setCalcOffer,
  calcMrp,
  setCalcMrp,
  b1g3Items,
  setB1g3Items,
  formatCurrency,
  darkMode
}) => {
  if (dashboardZone !== 'all' && dashboardZone !== 'counter') {
    return null;
  }

  const grossCashSales = overviewStats?.today?.CashAmount || 0;
  const totalPettyCash = khataSummary?.totalSpent || 0;
  const netExpectedDrawer = Math.max(0, grossCashSales - totalPettyCash);
  const latestExpense = khataSummary?.items?.[0];

  const activeHolds = Array.isArray(holds) ? holds.filter(h => h.status !== 'released' && h.status !== 'expired') : [];

  const isB1G3 = calcOffer === 'b1g3';
  const isB3_70 = calcOffer === 'b3_70';
  const numMrp = Math.max(0, Number(calcMrp) || 0);
  const p1 = Number(b1g3Items[0]) || 0;
  const p2 = Number(b1g3Items[1]) || 0;
  const p3 = Number(b1g3Items[2]) || 0;
  const highestMrp = Math.max(p1, p2, p3);
  const sumMrp = p1 + p2 + p3;

  let displayFinal = 0;
  let displayOriginal = 0;
  let displaySavings = 0;
  let effPerPc = 0;
  let offerTitle = 'Buy 3 @ 70% Off';

  if (isB3_70) {
    displayOriginal = numMrp * 3;
    displayFinal = Math.round((numMrp * 3) * 0.3);
    displaySavings = Math.max(0, displayOriginal - displayFinal);
    effPerPc = Math.round(displayFinal / 3);
    offerTitle = `B3 @ 70%`;
  } else if (isB1G3) {
    displayOriginal = sumMrp;
    displayFinal = highestMrp;
    displaySavings = Math.max(0, sumMrp - highestMrp);
    effPerPc = Math.round(highestMrp / 3);
    offerTitle = `B1G3`;
  } else {
    displayOriginal = numMrp;
    if (calcOffer === '40') {
      displayFinal = Math.round(numMrp * 0.6);
      displaySavings = numMrp - displayFinal;
      offerTitle = '40% Off';
    } else if (calcOffer === '60') {
      displayFinal = Math.round(numMrp * 0.4);
      displaySavings = numMrp - displayFinal;
      offerTitle = '60% Off';
    }
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg border border-blue-500/20">
            <Terminal className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              ⚡ Counter Speed Operations Desk
            </h3>
            <p className="text-[11px] text-slate-400">Barcode stock checker, quick offer calculator, holds &amp; pocket khata</p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
          POS Cashier Ready
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

        {/* TILE 1: FAST BARCODE & SIZE CHECKER */}
        <div 
          className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-all group ${
            darkMode ? 'bg-[#0e1320] border-[#1c2436] text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}
          onClick={() => quickScanInputRef.current?.focus()}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Barcode &amp; Size Matrix</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                {quickScanResult ? (
                  <span className="font-mono text-blue-500 dark:text-blue-400 truncate max-w-[170px]">
                    {quickScanResult.articleNo}
                  </span>
                ) : (
                  <span>Gun <span className="text-sm font-bold text-slate-400">Scanner</span></span>
                )}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl border transition-all ${
              isScannerFocused 
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 animate-pulse' 
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              <Barcode className="w-5 h-5" />
            </div>
          </div>

          <div className="my-3 space-y-2 text-xs">
            {/* Search / Scan Input */}
            <div className="relative flex items-center">
              <input
                ref={quickScanInputRef}
                type="text"
                value={quickScanQuery}
                onChange={(e) => setQuickScanQuery(e.target.value)}
                onFocus={() => setIsScannerFocused(true)}
                onBlur={() => setIsScannerFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickScan();
                  }
                }}
                placeholder="Scan barcode or type style..."
                className={`w-full py-1.5 pl-2.5 pr-8 rounded-lg text-xs font-mono font-semibold border outline-none transition-all ${
                  isScannerFocused
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-white dark:bg-[#121829] text-slate-800 dark:text-white'
                    : 'bg-slate-50 dark:bg-[#121829] border-slate-200 dark:border-[#1c2436] text-slate-700 dark:text-slate-200'
                }`}
              />
              {quickScanQuery ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickScanQuery('');
                    setQuickScanResult(null);
                    setQuickScanError(null);
                    quickScanInputRef.current?.focus();
                  }}
                  className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickScan();
                  }}
                  className="absolute right-1.5 p-1 text-blue-500 hover:text-blue-400 cursor-pointer"
                  title="Search"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Result Display: Sizes Matrix */}
            {quickScanResult ? (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400 truncate max-w-[130px] font-medium">
                    {quickScanResult.itemName} • {quickScanResult.color}
                  </span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                    ₹{quickScanResult.mrp?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-0.5">
                  {quickScanResult.sizes.map((s, sIdx) => (
                    <span
                      key={sIdx}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                        s.stock > 3
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : s.stock > 0
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 opacity-50'
                      }`}
                    >
                      <span>{s.size.split(' ')[0]}</span>
                      <span className="font-mono">({s.stock})</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : quickScanError ? (
              <div className="text-xs text-rose-400 font-semibold py-1">
                ⚠️ {quickScanError}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Ready for scanner gun</span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-1 pt-0.5">
                  <span className="text-[10px] text-slate-400">Quick:</span>
                  {['FSRE', 'TSBW', 'CFAJ'].map(sample => (
                    <button
                      key={sample}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickScanQuery(sample);
                        handleQuickScan(sample);
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#121829] hover:bg-blue-50 text-[10px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1c2436] cursor-pointer"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1c2436] flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              {quickScanResult ? `${quickScanResult.totalStock} in stock` : 'Gun Ready'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (typeof setActiveTab === 'function') setActiveTab('sizematrix');
              }}
              className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
            >
              <span>Size Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* TILE 2: SMART COUNTER DISCOUNT & OFFER CALC */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-all ${
          darkMode ? 'bg-[#0e1320] border-[#1c2436] text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fast Offer Quote</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{displayFinal.toLocaleString('en-IN')}
                </h3>
                <span className="text-xs font-mono font-bold text-slate-400 line-through">
                  ₹{displayOriginal.toLocaleString('en-IN')}
                </span>
                {(isB3_70 || isB1G3) && (
                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                    ₹{effPerPc}/pc
                  </span>
                )}
              </div>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Calculator className="w-5 h-5" />
            </div>
          </div>

          <div className="my-2 space-y-1.5 text-xs">
            {/* Price Inputs */}
            {isB1G3 ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 w-8">3 Pcs:</span>
                <div className="flex-1 grid grid-cols-3 gap-1">
                  <input
                    type="number"
                    value={b1g3Items[0] === 0 ? '' : b1g3Items[0]}
                    onChange={(e) => setB1g3Items([parseInt(e.target.value) || 0, b1g3Items[1], b1g3Items[2]])}
                    className="w-full py-1 px-1 text-center font-mono font-bold text-xs rounded border border-slate-200 dark:border-[#1c2436] bg-slate-50 dark:bg-[#121829] text-slate-800 dark:text-slate-100 focus:outline-none"
                    placeholder="P1"
                  />
                  <input
                    type="number"
                    value={b1g3Items[1] === 0 ? '' : b1g3Items[1]}
                    onChange={(e) => setB1g3Items([b1g3Items[0], parseInt(e.target.value) || 0, b1g3Items[2]])}
                    className="w-full py-1 px-1 text-center font-mono font-bold text-xs rounded border border-slate-200 dark:border-[#1c2436] bg-slate-50 dark:bg-[#121829] text-slate-800 dark:text-slate-100 focus:outline-none"
                    placeholder="P2"
                  />
                  <input
                    type="number"
                    value={b1g3Items[2] === 0 ? '' : b1g3Items[2]}
                    onChange={(e) => setB1g3Items([b1g3Items[0], b1g3Items[1], parseInt(e.target.value) || 0])}
                    className="w-full py-1 px-1 text-center font-mono font-bold text-xs rounded border border-slate-200 dark:border-[#1c2436] bg-slate-50 dark:bg-[#121829] text-slate-800 dark:text-slate-100 focus:outline-none"
                    placeholder="P3"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 w-8">MRP:</span>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={calcMrp === 0 ? '' : calcMrp}
                    onChange={(e) => setCalcMrp(parseInt(e.target.value) || 0)}
                    className="w-full py-1 pl-6 pr-2.5 font-mono font-bold text-xs rounded-lg border border-slate-200 dark:border-[#1c2436] bg-slate-50 dark:bg-[#121829] text-slate-800 dark:text-slate-100 focus:outline-none"
                    placeholder="Type MRP"
                  />
                </div>
              </div>
            )}

            {/* Deal presets */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 w-8">Deal:</span>
              <div className="flex-1 grid grid-cols-4 gap-1">
                {[
                  { id: 'b3_70', label: 'B3@70%' },
                  { id: 'b1g3', label: 'B1G3' },
                  { id: '40', label: '40%' },
                  { id: '60', label: '60%' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCalcOffer(opt.id)}
                    className={`py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer truncate ${
                      calcOffer === opt.id 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-[#121829] dark:text-slate-300 dark:border-[#1c2436]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1c2436] flex items-center justify-between text-xs">
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 truncate max-w-[170px]">
              Save ₹{displaySavings.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {isB3_70 ? '3 Pcs' : isB1G3 ? '3 Pcs' : offerTitle}
            </span>
          </div>
        </div>

        {/* TILE 3: HOLD DESK */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-all ${
          darkMode ? 'bg-[#0e1320] border-[#1c2436] text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Hold Desk</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {activeHolds.length} <span className="text-sm font-sans font-bold text-slate-400">Active</span>
              </h3>
            </div>
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <AlarmClock className="w-5 h-5" />
            </div>
          </div>

          <div className="my-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>Checkout Lane:</span>
              <span className={`font-semibold ${activeHolds.length > 0 ? 'text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {activeHolds.length > 0 ? `${activeHolds.length} Reserved` : 'Lane Clear'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>Auto Expiry:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                30 Min Policy
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Keeps sizes reserved for shoppers trying outfits.
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1c2436] flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              {activeHolds.length} Reserved
            </span>
            {typeof setActiveTab === 'function' && (
              <button
                onClick={() => setActiveTab('hold_desk')}
                className="font-bold text-purple-600 hover:text-purple-500 dark:text-purple-400 flex items-center gap-1 cursor-pointer"
              >
                <span>Open Desk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* TILE 4: POCKET KHATA */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-all ${
          darkMode ? 'bg-[#0e1320] border-[#1c2436] text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pocket Khata</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-rose-500 dark:text-rose-400 mt-1">
                {totalPettyCash > 0 ? `- ${formatCurrency(totalPettyCash)}` : '₹0'}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="my-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>Expected in Drawer:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(netExpectedDrawer)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>Recent Outflow:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">
                {latestExpense ? `${latestExpense.categoryIcon || '☕'} ${latestExpense.description || 'Expense'}` : 'No petty outflows'}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Drawer net = Cash sales minus petty cash.
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1c2436] flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Drawer Safe
            </span>
            {typeof setActiveTab === 'function' && (
              <button
                onClick={() => setActiveTab('pocket_khata')}
                className="font-bold text-amber-600 hover:text-amber-500 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
              >
                <span>Petty Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default QuickToolsWidget;
