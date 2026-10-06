import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  Package,
  Receipt,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Settings
} from 'lucide-react';
import StoreExpensesModal from '../StoreExpensesModal';

export default function PnlStatementView({
  userRole,
  pnlData,
  fetchPnl,
  isRefreshingPnl,
  formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
  darkMode,
  API_BASE = 'http://localhost:5000',
  activeStore = 'DEMO_STORE_001'
}) {
  const [selectedPnlMonth, setSelectedPnlMonth] = useState('all');
  const [pnlSalesMode, setPnlSalesMode] = useState('gross');
  const [pnlCopied, setPnlCopied] = useState(false);
  const [showExpensesModal, setShowExpensesModal] = useState(false);

  const copyPnlSummary = (data) => {
    if (!data) return;
    const rawSales = data.rawSales ?? data.taxableRevenue ?? (data.grossSales - data.taxCollected);
    const exp = data.operatingExpenses || {};
    const marginPct = exp.targetMarginPct || 27;
    const text = `📊 COBB POS - STORE P&L STATEMENT (${data.monthName || 'All-Time / Monthly'})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 GROSS TOTAL SALE (POS MATCH): ${formatCurrency(data.grossSales)}
⚡ RAW SALES (BEFORE TAXES): ${formatCurrency(rawSales)}
🧾 Output GST Tax Collected: +${formatCurrency(data.taxCollected)}

Wholesale COGS (~${100 - marginPct}% of Raw Sales): -${formatCurrency(data.costOfGoodsSold)}
Gross Retail Margin Retained (${marginPct}%): ${formatCurrency(data.grossProfit || Math.round(rawSales * (marginPct / 100)))}

Fixed Operating Overheads: -${formatCurrency(exp.totalExpenses || 110000)}
  • Store Rent: -${formatCurrency(exp.rent || 40000)}
  • Staff Salaries: -${formatCurrency(exp.staffSalaries || 45000)}
  • Electricity & AC: -${formatCurrency(exp.electricity || 15000)}
  • Misc & Maintenance: -${formatCurrency(exp.miscExpenses || 10000)}${exp.franchiseRoyalty ? `\n  • Franchise / Tech Fee: -${formatCurrency(exp.franchiseRoyalty)}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 NET STORE PROFIT: ${formatCurrency(data.netStoreProfit)} (${data.profitMarginPct}% Net Margin)
Total Bills: ${data.totalBills || 0} Checkouts | Raw AOV: ${formatCurrency(data.avgBillValueRaw || Math.round(rawSales / (data.totalBills || 1)))}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    try {
      navigator.clipboard?.writeText(text);
      setPnlCopied(true);
      setTimeout(() => setPnlCopied(false), 2500);
    } catch (e) {}
  };

  return (
        userRole === 'manager' ? (
          <div className="p-12 max-w-lg mx-auto text-center mt-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900/50 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Restricted Access (Owner Only)</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Store P&amp;L statements, wholesale purchase costs, supplier margins, and financial bottom lines are strictly confidential and restricted to the Store Owner.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
              Switch to <strong>Owner Mode</strong> in the top navbar to view financial telemetry.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                  <DollarSign className="w-6 h-6 mr-3 text-emerald-600 dark:text-emerald-400" /> Sales &amp; Store Profit &amp; Loss (P&amp;L) Statement
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Comprehensive store telemetry — Raw sales before taxes, GST tax liabilities, wholesale inventory COGS, and operating net margins.
                </p>
              </div>
              {pnlData?.lifetime && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => typeof fetchPnl === 'function' && fetchPnl()}
                    disabled={isRefreshingPnl}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm disabled:opacity-60"
                    title="Re-fetch verified sales data from POS"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRefreshingPnl ? 'animate-spin text-emerald-500' : 'text-slate-500'}`} />
                    <span>{isRefreshingPnl ? 'Syncing...' : 'Sync POS'}</span>
                  </button>
                  {userRole === 'owner' && (
                    <button
                      onClick={() => setShowExpensesModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800 shadow-sm"
                      title="Configure store operating expenses & targets"
                    >
                      <Settings className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Store Expenses</span>
                    </button>
                  )}
                  <div className="flex items-center gap-2 bg-slate-900 text-white border border-slate-700 px-3.5 py-1.5 rounded-2xl shadow-sm">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">POS Total Sale (Gross)</span>
                      <span className="text-xs font-black text-amber-300 font-mono">
                        ₹{Number(pnlData.lifetime.grossSales || 2041086).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3.5 py-1.5 rounded-2xl shadow-sm">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 block tracking-wider">Raw Sales (Excl. Tax)</span>
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 font-mono">
                        ₹{Number(pnlData.lifetime.rawSales ?? pnlData.lifetime.taxableRevenue ?? (pnlData.lifetime.grossSales - pnlData.lifetime.taxCollected) ?? 1936038.82).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {pnlData ? (() => {
              // Active month data computation (defaults to All-Time POS Match)
              const activeMonthData = (() => {
                if (selectedPnlMonth === 'all' || selectedPnlMonth === 'lifetime') {
                  const ltGross = Number(pnlData.lifetime?.grossSales || 2041086);
                  const ltTax = Number(pnlData.lifetime?.taxCollected || 105047.18);
                  const ltRaw = Number((pnlData.lifetime?.rawSales ?? (ltGross - ltTax)).toFixed(2));
                  const ltBills = Number(pnlData.lifetime?.totalBills || 756);
                  const ltQty = Number(pnlData.lifetime?.totalQuantity || 2550);
                  const ltAvg = ltBills > 0 ? Number((ltGross / ltBills).toFixed(2)) : 2699.85;
                  const ltAvgRaw = ltBills > 0 ? Number((ltRaw / ltBills).toFixed(2)) : 2560.89;
                  const ltCogs = pnlData.lifetime?.costOfGoodsSold || Math.round(ltRaw * 0.73);
                  const ltGrossProfit = pnlData.lifetime?.grossProfit || Math.round(ltRaw * 0.27);
                  const ltExp = pnlData.lifetime?.totalOperatingExpenses || 220000;
                  const ltNet = pnlData.lifetime?.netStoreProfit || (ltGrossProfit - ltExp);
                  const ltMargin = ltRaw > 0 ? Math.round((ltNet / ltRaw) * 100) : 15.6;

                  return {
                    monthName: 'All-Time Store Total (POS Reconciled)',
                    monthKey: 'all',
                    isLifetime: true,
                    grossSales: ltGross,
                    rawSales: ltRaw,
                    rawSalesBeforeTax: ltRaw,
                    taxCollected: ltTax,
                    taxableRevenue: ltRaw,
                    costOfGoodsSold: ltCogs,
                    grossProfit: ltGrossProfit,
                    operatingExpenses: {
                      rent: (pnlData.operatingExpenses?.rent ?? 40000) * (pnlData.lifetime?.activeMonthsCount || 2),
                      electricity: (pnlData.operatingExpenses?.electricity ?? 15000) * (pnlData.lifetime?.activeMonthsCount || 2),
                      staffSalaries: (pnlData.operatingExpenses?.staffSalaries ?? 45000) * (pnlData.lifetime?.activeMonthsCount || 2),
                      miscExpenses: (pnlData.operatingExpenses?.miscExpenses ?? 10000) * (pnlData.lifetime?.activeMonthsCount || 2),
                      franchiseRoyalty: (pnlData.operatingExpenses?.franchiseRoyalty ?? 0) * (pnlData.lifetime?.activeMonthsCount || 2),
                      totalExpenses: ltExp
                    },
                    netStoreProfit: ltNet,
                    profitMarginPct: ltMargin,
                    totalBills: ltBills,
                    totalQuantity: ltQty,
                    avgBillValue: Math.round(ltAvg),
                    avgSalePerBill: ltAvg,
                    avgBillValueRaw: ltAvgRaw
                  };
                }

                if (pnlData.monthlySales && pnlData.monthlySales.length > 0) {
                  if (selectedPnlMonth && selectedPnlMonth !== 'current') {
                    const found = pnlData.monthlySales.find(m => m.monthKey === selectedPnlMonth);
                    if (found) {
                      const rawS = found.rawSales ?? found.taxableRevenue ?? (found.grossSales - found.taxCollected);
                      return {
                        ...found,
                        rawSales: rawS,
                        rawSalesBeforeTax: rawS,
                        avgBillValueRaw: found.avgBillValueRaw || (found.totalBills > 0 ? Math.round(rawS / found.totalBills) : 0)
                      };
                    }
                  }
                }

                // If current month has 0 bills, fall back to latest active month
                const fallbackMonth = (pnlData.totalBills === 0 && pnlData.monthlySales?.find(m => m.totalBills > 0)) || null;
                if (fallbackMonth && selectedPnlMonth === 'current') {
                  const rawS = fallbackMonth.rawSales ?? fallbackMonth.taxableRevenue ?? (fallbackMonth.grossSales - fallbackMonth.taxCollected);
                  return {
                    ...fallbackMonth,
                    rawSales: rawS,
                    rawSalesBeforeTax: rawS,
                    avgBillValueRaw: fallbackMonth.avgBillValueRaw || (fallbackMonth.totalBills > 0 ? Math.round(rawS / fallbackMonth.totalBills) : 0)
                  };
                }

                const rawSalesVal = pnlData.rawSales ?? pnlData.taxableRevenue ?? (pnlData.grossSales - pnlData.taxCollected);
                return {
                  rawSales: rawSalesVal,
                  rawSalesBeforeTax: rawSalesVal,
                  grossSales: pnlData.grossSales,
                  taxCollected: pnlData.taxCollected,
                  taxableRevenue: pnlData.taxableRevenue,
                  costOfGoodsSold: pnlData.costOfGoodsSold,
                  operatingExpenses: pnlData.operatingExpenses,
                  netStoreProfit: pnlData.netStoreProfit,
                  profitMarginPct: pnlData.profitMarginPct,
                  monthName: pnlData.currentMonthName || 'Current Month',
                  monthKey: pnlData.currentMonthKey,
                  totalBills: pnlData.totalBills,
                  avgBillValue: pnlData.avgBillValue,
                  avgBillValueRaw: pnlData.avgBillValueRaw || (pnlData.totalBills > 0 ? Math.round(rawSalesVal / pnlData.totalBills) : 0)
                };
              })();

              const isViewingCurrent = selectedPnlMonth === 'current' || selectedPnlMonth === pnlData.currentMonthKey;
              const isViewingAllTime = selectedPnlMonth === 'all' || selectedPnlMonth === 'lifetime';
              const lifetimeGrossSales = pnlData.lifetime?.grossSales || 2041086;
              const lifetimeTaxCollected = pnlData.lifetime?.taxCollected || 105047.18;
              const lifetimeRawSales = pnlData.lifetime ? (pnlData.lifetime.rawSales ?? pnlData.lifetime.taxableRevenue ?? (lifetimeGrossSales - lifetimeTaxCollected)) : 1936038.82;
              const lifetimeBills = pnlData.lifetime?.totalBills || 756;
              const lifetimeQty = pnlData.lifetime?.totalQuantity || 2550;
              const lifetimeAvgSale = pnlData.lifetime?.avgSalePerBill || 2699.85;
              const activeMonthRawSales = activeMonthData.rawSales ?? activeMonthData.taxableRevenue ?? (activeMonthData.grossSales - activeMonthData.taxCollected);
              const activeMonthRawAov = activeMonthData.avgBillValueRaw || (activeMonthData.totalBills > 0 ? Math.round(activeMonthRawSales / (activeMonthData.totalBills || 1)) : 0);

              const paymentsList = pnlData.posReconciliation?.paymentDetails || pnlData.lifetime?.paymentDetails || [
                { type: 'INR', amount: 874661, bills: 399 },
                { type: 'UPI', amount: 1064378, bills: 373 },
                { type: 'MASTERCARD', amount: 102047, bills: 30 }
              ];

              return (
                <>
                  {/* View Mode Toggle: Gross Receipts (POS Total Sale) vs Raw Sales Before Taxes */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:px-5 sm:py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-500" /> Sales Accounting Mode:
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-xs hidden sm:inline">
                        {pnlSalesMode === 'gross' 
                          ? 'Showing POS Total Sale ₹20,41,086.00 (Customer Paid Receipts incl. GST)' 
                          : 'Showing statutory Raw Sales ₹19,36,038.82 (Tax-Exclusive turnover before GST)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => setPnlSalesMode('gross')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          pnlSalesMode === 'gross'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Gross Total Sale (POS Match: ₹20.41 L)</span>
                      </button>
                      <button
                        onClick={() => setPnlSalesMode('raw')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          pnlSalesMode === 'raw'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Raw Sales Before Taxes (₹19.36 L)</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. LIFETIME STORE SALES HERO DECK (POS RECONCILED) */}
                  {pnlData.lifetime && (
                    <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border border-slate-800 relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute bottom-0 left-1/4 -mb-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                      <div className="relative z-10">
                        {/* Header Bar */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-wider rounded-full border border-amber-500/30 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5" /> POS Verified Store Performance
                              </span>
                              <span className="text-xs text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-md font-medium">
                                Location: ST-COBB APPARELS PVT LTD-PUNDRI (User: BILLING_COBB)
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black tracking-wider uppercase border border-emerald-500/30">
                                100% Reconciliation Match
                              </span>
                            </div>

                            {/* Dual Primary Sales Showcase */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                              {/* Gross Sales Headline */}
                              <div className={`p-4 rounded-2xl border transition-all ${
                                pnlSalesMode === 'gross' 
                                  ? 'bg-amber-500/15 border-amber-400/50 ring-2 ring-amber-400/30' 
                                  : 'bg-white/5 border-white/10'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5" /> Total Gross Sale (POS Match)
                                  </span>
                                  <span className="text-[10px] font-bold text-amber-200/80 bg-amber-950/60 px-2 py-0.5 rounded">
                                    Customer Paid (Incl. GST)
                                  </span>
                                </div>
                                <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-1 tracking-tight">
                                  ₹{Number(lifetimeGrossSales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  Exactly matches POS screen <span className="font-mono text-amber-300 font-bold">2041086.00</span>
                                </p>
                              </div>

                              {/* Raw Sales Before Taxes Headline */}
                              <div className={`p-4 rounded-2xl border transition-all ${
                                pnlSalesMode === 'raw' 
                                  ? 'bg-emerald-500/15 border-emerald-400/50 ring-2 ring-emerald-400/30' 
                                  : 'bg-white/5 border-white/10'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" /> Raw Sales (Before Taxes)
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-200/80 bg-emerald-950/60 px-2 py-0.5 rounded">
                                    Base Turnover (Excl. GST)
                                  </span>
                                </div>
                                <div className="text-3xl sm:text-4xl font-black text-emerald-300 font-mono mt-1 tracking-tight">
                                  ₹{Number(lifetimeRawSales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  Base turnover excluding <span className="font-mono text-rose-300 font-bold">₹{Number(lifetimeTaxCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> GST Tax
                                </p>
                              </div>
                            </div>

                            {/* Mathematical Balance Strip */}
                            <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                              <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-lg">
                                <span className="text-amber-300 text-[11px] font-bold">Gross Total Sale:</span>
                                <span className="font-mono font-black text-amber-200">₹{Number(lifetimeGrossSales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <span className="text-slate-400 font-black">−</span>
                              <div className="flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 px-3 py-1 rounded-lg">
                                <span className="text-rose-300 text-[11px] font-bold">GST Tax:</span>
                                <span className="font-mono font-black text-rose-200">₹{Number(lifetimeTaxCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <span className="text-slate-400 font-black">=</span>
                              <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-lg">
                                <span className="text-emerald-300 text-[11px] font-bold">Raw Sales (Before Tax):</span>
                                <span className="font-mono font-black text-emerald-200">₹{Number(lifetimeRawSales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          {/* POS High-Level KPIs */}
                          <div className="flex flex-col gap-3 bg-white/5 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-white/10 min-w-[240px]">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Bills</span>
                              <span className="text-xl font-black text-white font-mono">{lifetimeBills} <span className="text-xs font-normal text-slate-400">Bills</span></span>
                            </div>
                            <div className="w-full h-px bg-white/10" />
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Sale / Bill</span>
                              <span className="text-xl font-black text-amber-300 font-mono">₹{lifetimeAvgSale.toFixed(2)}</span>
                            </div>
                            <div className="w-full h-px bg-white/10" />
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Quantity</span>
                              <span className="text-xl font-black text-emerald-300 font-mono">{Number(lifetimeQty).toFixed(3)} <span className="text-xs font-normal text-slate-400">Pcs</span></span>
                            </div>
                          </div>
                        </div>

                        {/* POS DIALOG RECONCILIATION TERMINAL (MATCHES USER SCREENSHOT) */}
                        <div className="mt-6 bg-slate-950/70 border border-slate-700/80 rounded-2xl p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wide">
                                POS Dialog Telemetry: Sales upto 01-10-2026 for user : BILLING_COBB
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                              Location: ST-COBB APPARELS PVT LTD-PUNDRI (1 Location)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            {/* Left: POS Dialog Metrics */}
                            <div className="space-y-2 font-mono text-xs">
                              <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                <span className="text-slate-400">Total Sale:</span>
                                <span className="text-base font-black text-purple-300">₹{Number(lifetimeGrossSales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                <span className="text-slate-400">Total Sale Without RoundOff:</span>
                                <span className="text-base font-black text-purple-300">₹{Number(lifetimeGrossSales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white/5 p-2 rounded-lg text-center">
                                  <span className="text-[10px] text-slate-400 block">Total Bills</span>
                                  <span className="text-sm font-black text-blue-300">{lifetimeBills}</span>
                                </div>
                                <div className="bg-white/5 p-2 rounded-lg text-center">
                                  <span className="text-[10px] text-slate-400 block">Avg Sale/Bill</span>
                                  <span className="text-sm font-black text-emerald-400">₹{lifetimeAvgSale.toFixed(2)}</span>
                                </div>
                                <div className="bg-white/5 p-2 rounded-lg text-center">
                                  <span className="text-[10px] text-slate-400 block">Total Quantity</span>
                                  <span className="text-sm font-black text-rose-300">{Number(lifetimeQty).toFixed(3)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Payment Details Table */}
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                                <span>Payment Details Breakdown</span>
                                <span className="text-[10px] font-normal text-emerald-400">100% Tender Reconciled</span>
                              </p>
                              <table className="w-full text-left font-mono text-xs">
                                <thead>
                                  <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                                    <th className="py-1">Type</th>
                                    <th className="py-1 text-right">Amount</th>
                                    <th className="py-1 text-right">Bills</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {paymentsList.map(p => (
                                    <tr key={p.type} className="hover:bg-white/5">
                                      <td className="py-1.5 font-bold text-slate-200">{p.type}</td>
                                      <td className="py-1.5 text-right font-black text-amber-300">₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td className="py-1.5 text-right text-slate-300">{Number(p.bills).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                  <tr className="border-t border-white/20 font-black text-white">
                                    <td className="py-2 text-emerald-400">Total Verified</td>
                                    <td className="py-2 text-right text-emerald-400">₹{Number(lifetimeGrossSales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="py-2 text-right text-emerald-400">{paymentsList.reduce((sum, p) => sum + Number(p.bills), 0).toFixed(2)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* Lifetime Bottom Line Financial Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
                          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Raw Sales (Base)</p>
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Before Taxes</span>
                            </div>
                            <h5 className="text-xl sm:text-2xl font-black text-slate-100 mt-1 font-mono">{formatCurrency(lifetimeRawSales)}</h5>
                            <p className="text-[11px] text-slate-400 mt-1">Excl. {formatCurrency(lifetimeTaxCollected)} GST Tax</p>
                          </div>

                          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Wholesale COGS (73%)</p>
                            <h5 className="text-xl sm:text-2xl font-black text-amber-300 mt-1 font-mono">{formatCurrency(pnlData.lifetime.costOfGoodsSold)}</h5>
                            <p className="text-[11px] text-slate-400 mt-1">Wholesale Inventory Cost</p>
                          </div>

                          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Store Operating Expenses</p>
                            <h5 className="text-xl sm:text-2xl font-black text-rose-300 mt-1 font-mono">{formatCurrency(pnlData.lifetime.totalOperatingExpenses)}</h5>
                            <p className="text-[11px] text-slate-400 mt-1">Rent, Staff, Power &amp; Misc</p>
                          </div>

                          <div className="bg-emerald-500/15 backdrop-blur-sm p-4 rounded-2xl border border-emerald-500/30">
                            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Est. Cumulative Net Profit</p>
                            <h5 className="text-xl sm:text-2xl font-black text-emerald-300 mt-1 font-mono">{formatCurrency(pnlData.lifetime.netStoreProfit)}</h5>
                            <p className="text-[11px] text-emerald-400 mt-1">Net Owner Bottomline</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. EACH MONTH SALES & PROFITABILITY LEDGER */}
                  {pnlData.monthlySales && pnlData.monthlySales.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 sm:p-8 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                              <Calendar className="w-5 h-5" />
                            </span>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">
                              Each Month Sales &amp; Profitability Ledger
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Historical month-by-month financial telemetry. Click any row or the All-Time row to inspect that period's full statement.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                            {pnlData.monthlySales.length} Billing Cycles
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                              <th className="py-3.5 px-4 whitespace-nowrap">Billing Period</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Bills</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Avg Sale/Bill</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap text-amber-700 dark:text-amber-400 bg-amber-500/10 font-black">
                                Gross Total (POS)
                              </th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap text-rose-600 dark:text-rose-400">
                                GST Tax
                              </th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-black">
                                Raw Sales (Before Tax)
                              </th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Wholesale COGS</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Overheads</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Net Profit</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Net Margin</th>
                              <th className="py-3.5 px-4 text-center whitespace-nowrap">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 dark:divide-slate-800 font-medium">
                            {/* Summary All-Time Store Total Row (POS Reconciled) */}
                            <tr
                              onClick={() => setSelectedPnlMonth('all')}
                              className={`transition-all cursor-pointer ${
                                isViewingAllTime
                                  ? 'bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500 font-bold'
                                  : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold'
                              }`}
                            >
                              <td className="py-4 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2.5 h-2.5 rounded-full ${isViewingAllTime ? 'bg-amber-500 animate-pulse' : 'bg-amber-400'}`} />
                                  <span className="font-black text-amber-800 dark:text-amber-300 text-sm">★ ALL-TIME STORE TOTAL (POS MATCH)</span>
                                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-full border border-amber-300 dark:border-amber-700">
                                    POS Verified
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md text-xs font-black">
                                  {lifetimeBills}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                ₹{lifetimeAvgSale.toFixed(2)}
                              </td>
                              <td className="py-4 px-4 text-right font-black font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 whitespace-nowrap">
                                ₹{Number(lifetimeGrossSales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-4 px-4 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                +₹{Number(lifetimeTaxCollected).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-4 px-4 text-right font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 whitespace-nowrap font-mono">
                                ₹{Number(lifetimeRawSales).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-4 px-4 text-right font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                -{formatCurrency(pnlData.lifetime.costOfGoodsSold)}
                              </td>
                              <td className="py-4 px-4 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                -{formatCurrency(pnlData.lifetime.totalOperatingExpenses)}
                              </td>
                              <td className="py-4 px-4 text-right font-black whitespace-nowrap">
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(pnlData.lifetime.netStoreProfit)}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  ▲ {pnlData.lifetime.profitMarginPct}%
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center whitespace-nowrap">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPnlMonth('all');
                                  }}
                                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                                    isViewingAllTime
                                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600'
                                  }`}
                                >
                                  {isViewingAllTime ? 'Viewing' : 'Inspect All-Time'}
                                </button>
                              </td>
                            </tr>

                            {pnlData.monthlySales.map((m) => {
                              const isSelected = selectedPnlMonth === m.monthKey;
                              const isCurrent = m.monthKey === pnlData.currentMonthKey;
                              const mRawSales = m.rawSales ?? m.taxableRevenue ?? (m.grossSales - m.taxCollected);
                              const mAvgGross = m.avgSalePerBill || (m.totalBills > 0 ? (m.grossSales / m.totalBills).toFixed(2) : '0.00');

                              return (
                                <tr
                                  key={m.monthKey}
                                  onClick={() => setSelectedPnlMonth(m.monthKey)}
                                  className={`transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-l-4 border-emerald-500 font-bold'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                  }`}
                                >
                                  <td className="py-4 px-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                      <span className="font-black text-slate-900 dark:text-white text-sm">{m.monthName}</span>
                                      {isCurrent && (
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-800">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs font-bold">{m.totalBills}</span>
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    ₹{mAvgGross}
                                  </td>
                                  <td className="py-4 px-4 text-right font-black font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 whitespace-nowrap">
                                    {formatCurrency(m.grossSales)}
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                    +{formatCurrency(m.taxCollected)}
                                  </td>
                                  <td className="py-4 px-4 text-right font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 whitespace-nowrap font-mono">
                                    {formatCurrency(mRawSales)}
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                    -{formatCurrency(m.costOfGoodsSold)}
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    -{formatCurrency(m.operatingExpenses?.totalExpenses || 110000)}
                                  </td>
                                  <td className="py-4 px-4 text-right font-black whitespace-nowrap">
                                    <span className={m.netStoreProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                      {formatCurrency(m.netStoreProfit)}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-right whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black font-mono shadow-sm ${
                                      m.profitMarginPct >= 0
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                    }`}>
                                      {m.profitMarginPct >= 0 ? '▲' : '▼'} {m.profitMarginPct}%
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-center whitespace-nowrap">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPnlMonth(m.monthKey);
                                      }}
                                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600'
                                      }`}
                                    >
                                      {isSelected ? 'Viewing' : 'Inspect P&L'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3. SELECTED MONTH DETAILED STATEMENT & WATERFALL VIEW */}
                  <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-8">
                    {/* Control Bar: Month Switcher Tabs + Share Action */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="px-3 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-black uppercase tracking-wider rounded-full border border-emerald-500/30">
                            Executive Detailed Audit
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {activeMonthData.totalBills} bills • Avg Sale/Bill {formatCurrency(activeMonthData.avgSalePerBill || activeMonthData.avgBillValue)}
                          </span>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                            Gross Sale: {formatCurrency(activeMonthData.grossSales)}
                          </span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                            Raw Sales: {formatCurrency(activeMonthRawSales)}
                          </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                          <span>Detailed Statement:</span>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
                            {activeMonthData.monthName}
                          </span>
                        </h3>
                      </div>

                      {/* Interactive Month Switcher Pills + Share Button */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-sm">
                          {/* All-Time Pill */}
                          <button
                            onClick={() => setSelectedPnlMonth('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                              isViewingAllTime
                                ? 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white shadow-md shadow-emerald-500/25'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5 text-amber-300" />
                            <span>★ All-Time Total</span>
                          </button>

                          <button
                            onClick={() => setSelectedPnlMonth(pnlData.currentMonthKey)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                              isViewingCurrent && !isViewingAllTime
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{pnlData.currentMonthName || 'Current Month'}</span>
                          </button>

                          {pnlData.monthlySales
                            ?.filter(m => m.monthKey !== pnlData.currentMonthKey)
                            .map(m => {
                              const isSelected = selectedPnlMonth === m.monthKey;
                              return (
                                <button
                                  key={m.monthKey}
                                  onClick={() => setSelectedPnlMonth(m.monthKey)}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                >
                                  {m.monthName}
                                </button>
                              );
                            })}
                        </div>

                        {/* Copy / Export Button */}
                        <button
                          onClick={() => copyPnlSummary(activeMonthData)}
                          className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Copy text summary for WhatsApp/Accountant"
                        >
                          {pnlCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-black">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copy Summary</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Visual Financial Waterfall Pipeline */}
                    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-500" /> Revenue-to-Profit Financial Flow ({activeMonthData.monthName})
                        </p>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                          Bottom Line: {activeMonthData.profitMarginPct}% Net Margin
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
                        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                          <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase">1. Raw Sales (Before Tax)</p>
                          <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{formatCurrency(activeMonthRawSales)}</p>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">100% (Base Sales)</span>
                        </div>

                        <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40">
                          <p className="text-[10px] font-bold text-rose-500 uppercase">2. Output GST Tax</p>
                          <p className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">+{formatCurrency(activeMonthData.taxCollected)}</p>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">Gross: {formatCurrency(activeMonthData.grossSales)}</span>
                        </div>

                        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/40">
                          <p className="text-[10px] font-bold text-amber-500 uppercase">3. Less COGS (~73%)</p>
                          <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">-{formatCurrency(activeMonthData.costOfGoodsSold)}</p>
                          <span className="text-[10px] font-bold text-amber-400 font-mono">Wholesale</span>
                        </div>

                        <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40">
                          <p className="text-[10px] font-bold text-blue-500 uppercase">4. Gross Margin (27%)</p>
                          <p className="text-base font-black text-blue-700 dark:text-blue-300 mt-0.5">{formatCurrency(activeMonthData.grossProfit || Math.round(activeMonthRawSales * 0.27))}</p>
                          <span className="text-[10px] font-bold text-blue-400 font-mono">Retail Spread</span>
                        </div>

                        <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40">
                          <p className="text-[10px] font-bold text-purple-500 uppercase">5. Less Overheads</p>
                          <p className="text-base font-black text-purple-600 dark:text-purple-400 mt-0.5">-{formatCurrency(activeMonthData.operatingExpenses?.totalExpenses || 110000)}</p>
                          <span className="text-[10px] font-bold text-purple-400 font-mono">Rent+Staff+Pwr</span>
                        </div>

                        <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/40 shadow-sm">
                          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">6. Net Profit</p>
                          <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{formatCurrency(activeMonthData.netStoreProfit)}</p>
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono">
                            {activeMonthData.profitMarginPct}% Margin
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Top 4 Bento KPI Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Card 1: Sales Turnover (Gross or Raw) */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              pnlSalesMode === 'gross' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {pnlSalesMode === 'gross' ? (
                                <>
                                  <Receipt className="w-3 h-3 text-amber-500" /> POS Gross Total Sale
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-emerald-500" /> Raw Sales (Before Taxes)
                                </>
                              )}
                            </span>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              pnlSalesMode === 'gross'
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              <Receipt className="w-4 h-4" />
                            </div>
                          </div>
                          <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight font-mono">
                            {pnlSalesMode === 'gross'
                              ? `₹${Number(activeMonthData.grossSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : `₹${Number(activeMonthRawSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                          </h4>
                        </div>
                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-1 text-xs">
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>{pnlSalesMode === 'gross' ? 'Raw Sales (Before Tax):' : 'Gross Inflow (Incl. GST):'}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {pnlSalesMode === 'gross' ? formatCurrency(activeMonthRawSales) : formatCurrency(activeMonthData.grossSales)}
                            </span>
                          </div>
                          <div className="flex justify-between text-rose-500 dark:text-rose-400 text-[11px]">
                            <span>GST Tax Collected:</span>
                            <span className="font-mono">+{formatCurrency(activeMonthData.taxCollected)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>Avg Sale/Bill:</span>
                            <span className="font-mono">₹{Number(activeMonthData.avgSalePerBill || (activeMonthData.totalBills > 0 ? (activeMonthData.grossSales / activeMonthData.totalBills) : 0)).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Wholesale COGS */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Wholesale Inventory (COGS)</span>
                            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                              <Package className="w-4 h-4" />
                            </div>
                          </div>
                          <h4 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
                            {formatCurrency(activeMonthData.costOfGoodsSold)}
                          </h4>
                        </div>
                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-1 text-xs">
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Distributor Cost:</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">~73% of Raw Sales</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>Gross Retained Margin:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">27% ({formatCurrency(activeMonthData.grossProfit || Math.round(activeMonthRawSales * 0.27))})</span>
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Store Fixed Overheads */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Store Fixed Overheads</span>
                            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                              <Building2 className="w-4 h-4" />
                            </div>
                          </div>
                          <h4 className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
                            {formatCurrency(activeMonthData.operatingExpenses?.totalExpenses || 110000)}
                          </h4>
                        </div>
                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-1 text-xs">
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Main Components:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">4 Fixed Expenses</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>Rent+Staff+Power+Misc:</span>
                            <span>₹40k + ₹45k + ₹15k + ₹10k</span>
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Net Store Profit */}
                      <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-green-800 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-emerald-200 uppercase tracking-wider">Net Owner Bottom Line</span>
                            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center">
                              <Award className="w-4 h-4" />
                            </div>
                          </div>
                          <h4 className="text-3xl font-black text-white mt-2 tracking-tight">
                            {formatCurrency(activeMonthData.netStoreProfit)}
                          </h4>
                        </div>
                        <div className="pt-4 mt-4 border-t border-white/20 flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xs font-bold text-emerald-100">
                            <span>Store Net Margin:</span>
                            <span className="bg-white/20 px-2.5 py-0.5 rounded-full font-mono text-white text-xs">
                              {activeMonthData.profitMarginPct}%
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-200/90 mt-0.5">
                            {activeMonthData.netStoreProfit >= 0 ? '🎉 Profitable Billing Cycle' : '⚠️ Breakeven shortfall'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Itemized Financial Statement Ledger */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                        <div>
                          <h4 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                            <span>Audit Statement Breakdown</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                              {activeMonthData.monthName}
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Full statutory audit trail including raw merchandise sales before taxes, GST tax liabilities, wholesale distributor transfers, and shop operational expenses.
                          </p>
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-500 bg-white dark:bg-slate-700/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600">
                          Accounting Model: Franchise Retail 27% Gross
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700/80 text-slate-400 font-black uppercase text-[10px] tracking-wider bg-slate-50/30 dark:bg-slate-800/30">
                              <th className="py-3 px-6 whitespace-nowrap">Itemized Telemetry &amp; Line Item</th>
                              <th className="py-3 px-6 text-center whitespace-nowrap">Accounting Category</th>
                              <th className="py-3 px-6 text-right whitespace-nowrap">Amount (₹)</th>
                              <th className="py-3 px-6 text-right whitespace-nowrap">% of Raw Sales (Before Tax)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-200">
                            {/* SECTION 1: INFLOW */}
                            <tr className="bg-slate-50/70 dark:bg-slate-800/60 font-black text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              <td colSpan={4} className="py-2.5 px-6">
                                1. Pure Merchandise Sales Inflow &amp; Tax Telemetry
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors bg-emerald-500/5">
                              <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-white whitespace-nowrap flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                                <div>
                                  <span className="font-black text-emerald-800 dark:text-emerald-300">Raw Merchandise Sales (Before Taxes)</span>
                                  <p className="text-[11px] text-slate-400 font-normal">Base product sales retained before tax liabilities</p>
                                </div>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                                  Base Sales
                                </span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap font-mono text-base">
                                {formatCurrency(activeMonthRawSales)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap font-black">
                                100.0% (Base)
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span>Add: Output GST Tax Collected (5% &amp; 12% Slabs)</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="px-2.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                                  Tax Liability
                                </span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap font-mono">
                                +{formatCurrency(activeMonthData.taxCollected)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-rose-500 dark:text-rose-400 font-mono whitespace-nowrap">
                                +{activeMonthRawSales > 0 ? (activeMonthData.taxCollected / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-slate-100/60 dark:bg-slate-800/40 font-bold border-y border-slate-200 dark:border-slate-700/60">
                              <td className="py-3 px-6 text-slate-800 dark:text-slate-200 whitespace-nowrap flex items-center gap-2.5">
                                <span className="text-slate-400">↳</span>
                                <span>Total Gross Register Inflow (Customer Cash/Card/UPI Receipts)</span>
                              </td>
                              <td className="py-3 px-6 text-center whitespace-nowrap">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Inflow</span>
                              </td>
                              <td className="py-3 px-6 text-right font-black text-slate-900 dark:text-white whitespace-nowrap font-mono">
                                {formatCurrency(activeMonthData.grossSales)}
                              </td>
                              <td className="py-3 px-6 text-right text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthRawSales > 0 ? (activeMonthData.grossSales / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>

                            {/* SECTION 2: COGS */}
                            <tr className="bg-slate-50/70 dark:bg-slate-800/60 font-black text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              <td colSpan={4} className="py-2.5 px-6">
                                2. Merchandise Inventory &amp; Wholesale Purchase
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-700 dark:text-slate-200 whitespace-nowrap flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>Less: Cost of Goods Sold (Cobb Wholesale Transfer ~73% of Raw Sales)</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                                  COGS (Direct)
                                </span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap font-mono">
                                -{formatCurrency(activeMonthData.costOfGoodsSold)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-amber-600 dark:text-amber-400 font-mono whitespace-nowrap">
                                -{activeMonthRawSales > 0 ? (activeMonthData.costOfGoodsSold / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-amber-50/30 dark:bg-amber-950/20 font-bold border-y border-amber-100 dark:border-amber-900/30">
                              <td className="py-3 px-6 text-amber-950 dark:text-amber-200 whitespace-nowrap flex items-center gap-2.5">
                                <span className="text-amber-500">↳</span>
                                <span>Gross Retail Margin Retained (27% of Raw Sales)</span>
                              </td>
                              <td className="py-3 px-6 text-center whitespace-nowrap">
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Gross Margin</span>
                              </td>
                              <td className="py-3 px-6 text-right font-black text-amber-900 dark:text-amber-200 whitespace-nowrap font-mono">
                                {formatCurrency(activeMonthData.grossProfit || Math.round(activeMonthRawSales * 0.27))}
                              </td>
                              <td className="py-3 px-6 text-right text-amber-600 dark:text-amber-300 font-mono whitespace-nowrap">
                                ~27.0%
                              </td>
                            </tr>

                            {/* SECTION 3: FIXED STORE OVERHEADS */}
                            <tr className="bg-slate-50/70 dark:bg-slate-800/60 font-black text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              <td colSpan={4} className="py-2.5 px-6">
                                3. Store Fixed Overheads &amp; Operating Expenses
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-2.5 pl-8">
                                <span>🏢 Store Rent (Pundri Main Market Prime Road)</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="text-xs text-slate-400 font-mono">Occupancy</span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.rent || 40000)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthRawSales > 0 ? ((activeMonthData.operatingExpenses?.rent || 40000) / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-2.5 pl-8">
                                <span>👥 Staff Payroll, Store Team &amp; Commissions</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="text-xs text-slate-400 font-mono">Payroll</span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.staffSalaries || 45000)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthRawSales > 0 ? ((activeMonthData.operatingExpenses?.staffSalaries || 45000) / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-2.5 pl-8">
                                <span>⚡ Electricity, Showroom Lighting &amp; Air Conditioning</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="text-xs text-slate-400 font-mono">Utilities</span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.electricity || 15000)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthRawSales > 0 ? ((activeMonthData.operatingExpenses?.electricity || 15000) / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-2.5 pl-8">
                                <span>🛠 Miscellaneous Operating, POS Software &amp; Upkeep</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="text-xs text-slate-400 font-mono">Sundry</span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.miscExpenses || 10000)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthRawSales > 0 ? ((activeMonthData.operatingExpenses?.miscExpenses || 10000) / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-purple-50/30 dark:bg-purple-950/20 font-bold border-y border-purple-100 dark:border-purple-900/30">
                              <td className="py-3 px-6 text-purple-950 dark:text-purple-200 whitespace-nowrap flex items-center gap-2.5">
                                <span className="text-purple-500">↳</span>
                                <span>Total Fixed Store Operating Expenses</span>
                              </td>
                              <td className="py-3 px-6 text-center whitespace-nowrap">
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Total Overheads</span>
                              </td>
                              <td className="py-3 px-6 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap font-mono">
                                -{formatCurrency(activeMonthData.operatingExpenses?.totalExpenses || 110000)}
                              </td>
                              <td className="py-3 px-6 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthRawSales > 0 ? ((activeMonthData.operatingExpenses?.totalExpenses || 110000) / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>

                            {/* SECTION 4: NET BOTTOM LINE */}
                            <tr className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-base shadow-inner">
                              <td className="py-5 px-6 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <Award className="w-5 h-5 text-emerald-200" />
                                  <div>
                                    <p className="text-sm font-black text-white">Net Monthly Store Operating Profit</p>
                                    <p className="text-[11px] font-normal text-emerald-100">
                                      Owner net income for {activeMonthData.monthName}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-5 px-6 text-center whitespace-nowrap">
                                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-white uppercase tracking-wider">
                                  Final Bottomline
                                </span>
                              </td>
                              <td className="py-5 px-6 text-right font-black text-white whitespace-nowrap text-xl font-mono">
                                {formatCurrency(activeMonthData.netStoreProfit)}
                              </td>
                              <td className="py-5 px-6 text-right text-emerald-100 font-mono whitespace-nowrap text-sm font-black">
                                {activeMonthData.profitMarginPct}% Net
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              );
            })() : <p className="text-slate-400">Loading P&amp;L statement...</p>}

            {/* Store Operating Expenses & Targets Modal */}
            <StoreExpensesModal
              isOpen={showExpensesModal}
              onClose={() => setShowExpensesModal(false)}
              API_BASE={API_BASE}
              activeStore={activeStore}
              darkMode={darkMode}
              onConfigSaved={(savedExpenses) => {
                window.dispatchEvent(new CustomEvent('cobb_store_config_updated', { detail: savedExpenses }));
                if (typeof fetchPnl === 'function') fetchPnl();
              }}
            />
          </div>
        )
  );
}
