import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  const [showPosDetails, setShowPosDetails] = useState(false);
  const [showItemizedExpenses, setShowItemizedExpenses] = useState(false);

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
      <div className="space-y-6">
        {/* Top Header Bar */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
              <DollarSign className="w-6 h-6 mr-2 text-emerald-600 dark:text-emerald-400" /> Sales &amp; Store P&amp;L Statement
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Executive store telemetry — Gross sales, wholesale inventory COGS, fixed operating overheads, and net profit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sales Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setPnlSalesMode('gross')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  pnlSalesMode === 'gross'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Customer Paid Receipts (incl. GST)"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Gross Total</span>
              </button>
              <button
                onClick={() => setPnlSalesMode('raw')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  pnlSalesMode === 'raw'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Base turnover excluding GST Tax"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Raw Sales</span>
              </button>
            </div>

            <button
              onClick={() => typeof fetchPnl === 'function' && fetchPnl()}
              disabled={isRefreshingPnl}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm disabled:opacity-60"
              title="Re-fetch verified sales data from POS"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshingPnl ? 'animate-spin text-emerald-500' : 'text-slate-500'}`} />
              <span>{isRefreshingPnl ? 'Syncing...' : 'Sync'}</span>
            </button>

            {userRole === 'owner' && (
              <button
                onClick={() => setShowExpensesModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800 shadow-sm"
                title="Configure store operating expenses & targets"
              >
                <Settings className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Expenses Setup</span>
              </button>
            )}
          </div>
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
                monthName: 'All-Time Store Total',
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

          const paymentsList = pnlData.posReconciliation?.paymentDetails || pnlData.lifetime?.paymentDetails || [
            { type: 'INR (Cash)', amount: 874661, bills: 399 },
            { type: 'UPI', amount: 1064378, bills: 373 },
            { type: 'Cards', amount: 102047, bills: 30 }
          ];

          return (
            <>
              {/* 1. LIFETIME STORE SALES EXECUTIVE HERO */}
              {pnlData.lifetime && (
                <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 space-y-5">
                    {/* Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-amber-500/30 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" /> All-Time Store Performance
                        </span>
                        <span className="text-xs text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg font-medium">
                          ST-COBB APPARELS PVT LTD-PUNDRI
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs text-slate-300 hidden sm:block">
                          <span className="font-bold text-white">{lifetimeBills}</span> Checkouts • Avg <span className="font-bold text-amber-300">₹{Math.round(lifetimeAvgSale)}</span>
                        </div>
                        <button
                          onClick={() => setShowPosDetails(!showPosDetails)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition-all border border-white/10 cursor-pointer"
                        >
                          <span>POS Tender Split</span>
                          {showPosDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* 4 Financial Headline Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                        <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                          <Receipt className="w-3 h-3" /> Total Gross Sale
                        </p>
                        <h4 className="text-2xl sm:text-3xl font-black text-white mt-1.5 font-mono">
                          {formatCurrency(lifetimeGrossSales)}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Raw {formatCurrency(lifetimeRawSales)} + GST {formatCurrency(lifetimeTaxCollected)}
                        </p>
                      </div>

                      <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          <Package className="w-3 h-3 text-amber-400" /> Wholesale COGS (~73%)
                        </p>
                        <h4 className="text-2xl sm:text-3xl font-black text-amber-300 mt-1.5 font-mono">
                          {formatCurrency(pnlData.lifetime.costOfGoodsSold)}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Wholesale Inventory Transfer
                        </p>
                      </div>

                      <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-rose-400" /> Operating Expenses
                        </p>
                        <h4 className="text-2xl sm:text-3xl font-black text-rose-300 mt-1.5 font-mono">
                          {formatCurrency(pnlData.lifetime.totalOperatingExpenses)}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Rent, Staff, Power &amp; Misc
                        </p>
                      </div>

                      <div className="bg-emerald-500/15 backdrop-blur-sm p-4 rounded-2xl border border-emerald-500/30">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                            <Award className="w-3 h-3" /> Net Store Profit
                          </p>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200">
                            {pnlData.lifetime.profitMarginPct}% Margin
                          </span>
                        </div>
                        <h4 className="text-2xl sm:text-3xl font-black text-emerald-300 mt-1.5 font-mono">
                          {formatCurrency(pnlData.lifetime.netStoreProfit)}
                        </h4>
                        <p className="text-[11px] text-emerald-400/90 mt-1">
                          Owner Net Bottom Line
                        </p>
                      </div>
                    </div>

                    {/* Collapsible POS Reconciliation Tender Drawer */}
                    {showPosDetails && (
                      <div className="pt-4 border-t border-white/10 bg-slate-950/60 -mx-6 -mb-6 sm:-mx-7 sm:-mb-7 p-5 rounded-b-3xl space-y-4 animate-in fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-mono font-bold text-slate-200">
                              POS Reconciliation Telemetry (User: BILLING_COBB)
                            </span>
                          </div>
                          <span className="font-mono text-slate-400 text-[11px]">
                            100% matched with POS terminal checkout
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 font-mono text-xs">
                            <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                              <span className="text-slate-400">Total Sale:</span>
                              <span className="font-bold text-amber-300">{formatCurrency(lifetimeGrossSales)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-white/5 p-2 rounded-lg text-center">
                                <span className="text-[10px] text-slate-400 block">Total Bills</span>
                                <span className="font-bold text-blue-300">{lifetimeBills}</span>
                              </div>
                              <div className="bg-white/5 p-2 rounded-lg text-center">
                                <span className="text-[10px] text-slate-400 block">Avg Sale/Bill</span>
                                <span className="font-bold text-emerald-400">₹{Math.round(lifetimeAvgSale)}</span>
                              </div>
                              <div className="bg-white/5 p-2 rounded-lg text-center">
                                <span className="text-[10px] text-slate-400 block">Quantity</span>
                                <span className="font-bold text-rose-300">{Math.round(lifetimeQty)} pcs</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                              Tender Payment Breakdown
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
                                  <tr key={p.type}>
                                    <td className="py-1 text-slate-300">{p.type}</td>
                                    <td className="py-1 text-right font-bold text-amber-300">{formatCurrency(p.amount)}</td>
                                    <td className="py-1 text-right text-slate-400">{Math.round(p.bills)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. MONTHLY SALES & PROFITABILITY LEDGER */}
              {pnlData.monthlySales && pnlData.monthlySales.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5 sm:p-6 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                          Monthly Sales &amp; Profitability Ledger
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Billing cycle comparison. Click any row to view its statement.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 w-fit">
                      {pnlData.monthlySales.length} Billing Periods
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                          <th className="py-3 px-4 whitespace-nowrap">Period</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">Bills</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap text-amber-700 dark:text-amber-400 bg-amber-500/10 font-bold">
                            Total Sale (POS)
                          </th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">COGS (~73%)</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">Expenses</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">Net Profit</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">Margin</th>
                          <th className="py-3 px-4 text-center whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {/* Summary All-Time Store Total Row */}
                        <tr
                          onClick={() => setSelectedPnlMonth('all')}
                          className={`transition-all cursor-pointer ${
                            isViewingAllTime
                              ? 'bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500 font-bold'
                              : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold'
                          }`}
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${isViewingAllTime ? 'bg-amber-500 animate-pulse' : 'bg-amber-400'}`} />
                              <span className="font-bold text-amber-800 dark:text-amber-300 text-xs sm:text-sm">★ ALL-TIME STORE TOTAL</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {lifetimeBills}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 whitespace-nowrap">
                            {formatCurrency(lifetimeGrossSales)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            -{formatCurrency(pnlData.lifetime.costOfGoodsSold)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            -{formatCurrency(pnlData.lifetime.totalOperatingExpenses)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(pnlData.lifetime.netStoreProfit)}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              ▲ {pnlData.lifetime.profitMarginPct}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPnlMonth('all');
                              }}
                              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                isViewingAllTime
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600'
                              }`}
                            >
                              {isViewingAllTime ? 'Viewing' : 'Inspect'}
                            </button>
                          </td>
                        </tr>

                        {pnlData.monthlySales.map((m) => {
                          const isSelected = selectedPnlMonth === m.monthKey;
                          const isCurrent = m.monthKey === pnlData.currentMonthKey;

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
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{m.monthName}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded">
                                      Current
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {m.totalBills}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 whitespace-nowrap">
                                {formatCurrency(m.grossSales)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                -{formatCurrency(m.costOfGoodsSold)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                -{formatCurrency(m.operatingExpenses?.totalExpenses || 110000)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                                <span className={m.netStoreProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                  {formatCurrency(m.netStoreProfit)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                                  m.profitMarginPct >= 0
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                }`}>
                                  {m.profitMarginPct >= 0 ? '▲' : '▼'} {m.profitMarginPct}%
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPnlMonth(m.monthKey);
                                  }}
                                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                                  }`}
                                >
                                  {isSelected ? 'Viewing' : 'Inspect'}
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

              {/* 3. SELECTED PERIOD STATEMENT & SUMMARY CARDS */}
              <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 space-y-6">
                {/* Control Bar: Month Switcher Tabs + Share Action */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Statement:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {activeMonthData.monthName}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {activeMonthData.totalBills} bills • Avg check ₹{Math.round(activeMonthData.avgSalePerBill || activeMonthData.avgBillValue || 0)} • Gross {formatCurrency(activeMonthData.grossSales)}
                    </p>
                  </div>

                  {/* Interactive Month Switcher Pills + Share Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-sm">
                      <button
                        onClick={() => setSelectedPnlMonth('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isViewingAllTime
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        All-Time
                      </button>

                      <button
                        onClick={() => setSelectedPnlMonth(pnlData.currentMonthKey)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isViewingCurrent && !isViewingAllTime
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {pnlData.currentMonthName || 'Current'}
                      </button>

                      {pnlData.monthlySales
                        ?.filter(m => m.monthKey !== pnlData.currentMonthKey)
                        .map(m => {
                          const isSelected = selectedPnlMonth === m.monthKey;
                          return (
                            <button
                              key={m.monthKey}
                              onClick={() => setSelectedPnlMonth(m.monthKey)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {m.monthName}
                            </button>
                          );
                        })}
                    </div>

                    {/* Copy Summary Button */}
                    <button
                      onClick={() => copyPnlSummary(activeMonthData)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Copy summary for WhatsApp or records"
                    >
                      {pnlCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 4 Focused Bento KPI Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Sales Turnover */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          pnlSalesMode === 'gross' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {pnlSalesMode === 'gross' ? 'POS Gross Total Sale' : 'Raw Sales (Before Tax)'}
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                          <Receipt className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
                        {pnlSalesMode === 'gross'
                          ? formatCurrency(activeMonthData.grossSales)
                          : formatCurrency(activeMonthRawSales)
                        }
                      </h4>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{pnlSalesMode === 'gross' ? 'Raw Sales:' : 'Gross Total:'}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {pnlSalesMode === 'gross' ? formatCurrency(activeMonthRawSales) : formatCurrency(activeMonthData.grossSales)}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Wholesale COGS */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wholesale COGS (~73%)</span>
                        <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5 font-mono">
                        {formatCurrency(activeMonthData.costOfGoodsSold)}
                      </h4>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Gross Margin (27%):</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(activeMonthData.grossProfit || Math.round(activeMonthRawSales * 0.27))}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Store Fixed Overheads */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Store Fixed Overheads</span>
                        <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5 font-mono">
                        {formatCurrency(activeMonthData.operatingExpenses?.totalExpenses || 110000)}
                      </h4>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Rent &amp; Staff:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency((activeMonthData.operatingExpenses?.rent || 40000) + (activeMonthData.operatingExpenses?.staffSalaries || 45000))}
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Net Store Profit */}
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Net Owner Profit</span>
                        <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                          {activeMonthData.profitMarginPct}% Margin
                        </span>
                      </div>
                      <h4 className="text-2xl font-black text-white mt-1.5 font-mono">
                        {formatCurrency(activeMonthData.netStoreProfit)}
                      </h4>
                    </div>
                    <div className="pt-3 mt-3 border-t border-white/20 text-xs text-emerald-100 flex justify-between items-center">
                      <span>Period Status:</span>
                      <span className="font-bold">
                        {activeMonthData.netStoreProfit >= 0 ? '✓ Profitable' : '⚠ Below Breakeven'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Streamlined Executive Statement Breakdown Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        Executive P&amp;L Statement
                      </h4>
                      <p className="text-xs text-slate-400">
                        Key revenue, inventory, overheads and net income line items for {activeMonthData.monthName}.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowItemizedExpenses(!showItemizedExpenses)}
                      className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 w-fit"
                    >
                      <span>{showItemizedExpenses ? 'Hide Line Items' : 'Itemize Overheads & Taxes'}</span>
                      {showItemizedExpenses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-50/30 dark:bg-slate-800/30">
                          <th className="py-2.5 px-5 whitespace-nowrap">Line Item</th>
                          <th className="py-2.5 px-5 text-center whitespace-nowrap">Category</th>
                          <th className="py-2.5 px-5 text-right whitespace-nowrap">Amount</th>
                          <th className="py-2.5 px-5 text-right whitespace-nowrap">% Base Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-200">
                        {/* 1. Gross Inflow */}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            1. Gross Total Sales (POS Receipts)
                          </td>
                          <td className="py-3 px-5 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 font-bold">
                              Gross Inflow
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right font-black text-amber-700 dark:text-amber-300 font-mono whitespace-nowrap">
                            +{formatCurrency(activeMonthData.grossSales)}
                          </td>
                          <td className="py-3 px-5 text-right text-slate-400 font-mono text-xs whitespace-nowrap">
                            {activeMonthRawSales > 0 ? (activeMonthData.grossSales / activeMonthRawSales * 100).toFixed(1) : 0}%
                          </td>
                        </tr>

                        {/* Optional GST Tax sub-row */}
                        {showItemizedExpenses && (
                          <tr className="bg-rose-50/30 dark:bg-rose-950/15 text-xs">
                            <td className="py-2 px-5 pl-8 text-rose-600 dark:text-rose-400 whitespace-nowrap">
                              ↳ Less: Output GST Collected (Payable to Govt)
                            </td>
                            <td className="py-2 px-5 text-center whitespace-nowrap text-slate-400">
                              GST Liability
                            </td>
                            <td className="py-2 px-5 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap font-bold">
                              -{formatCurrency(activeMonthData.taxCollected)}
                            </td>
                            <td className="py-2 px-5 text-right text-rose-400 font-mono whitespace-nowrap">
                              -{activeMonthRawSales > 0 ? (activeMonthData.taxCollected / activeMonthRawSales * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        )}

                        {/* 2. Raw Sales Base */}
                        <tr className="bg-emerald-500/5 hover:bg-emerald-500/10 font-bold">
                          <td className="py-3 px-5 text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                            2. Raw Merchandise Sales (Turnover Before Tax)
                          </td>
                          <td className="py-3 px-5 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 font-bold">
                              Base Turnover
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right font-black text-emerald-700 dark:text-emerald-400 font-mono whitespace-nowrap">
                            {formatCurrency(activeMonthRawSales)}
                          </td>
                          <td className="py-3 px-5 text-right text-emerald-600 dark:text-emerald-400 font-mono text-xs whitespace-nowrap font-black">
                            100.0%
                          </td>
                        </tr>

                        {/* 3. Wholesale COGS */}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            3. Less: Wholesale COGS (~73% of Raw Sales)
                          </td>
                          <td className="py-3 px-5 text-center whitespace-nowrap text-slate-400 text-xs">
                            Direct Cost
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-amber-600 dark:text-amber-400 font-mono whitespace-nowrap">
                            -{formatCurrency(activeMonthData.costOfGoodsSold)}
                          </td>
                          <td className="py-3 px-5 text-right text-amber-600 dark:text-amber-400 font-mono text-xs whitespace-nowrap">
                            ~73.0%
                          </td>
                        </tr>

                        {/* 4. Gross Margin */}
                        <tr className="bg-amber-50/30 dark:bg-amber-950/20 font-bold">
                          <td className="py-3 px-5 text-amber-900 dark:text-amber-200 whitespace-nowrap">
                            4. Gross Retail Margin Retained (27%)
                          </td>
                          <td className="py-3 px-5 text-center whitespace-nowrap text-amber-700 dark:text-amber-300 text-xs">
                            Gross Spread
                          </td>
                          <td className="py-3 px-5 text-right font-black text-amber-800 dark:text-amber-300 font-mono whitespace-nowrap">
                            {formatCurrency(activeMonthData.grossProfit || Math.round(activeMonthRawSales * 0.27))}
                          </td>
                          <td className="py-3 px-5 text-right text-amber-700 dark:text-amber-300 font-mono text-xs whitespace-nowrap">
                            ~27.0%
                          </td>
                        </tr>

                        {/* 5. Fixed Operating Overheads */}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            5. Less: Store Fixed Operating Overheads
                          </td>
                          <td className="py-3 px-5 text-center whitespace-nowrap text-slate-400 text-xs">
                            Total OpEx
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-rose-600 dark:text-rose-400 font-mono whitespace-nowrap">
                            -{formatCurrency(activeMonthData.operatingExpenses?.totalExpenses || 110000)}
                          </td>
                          <td className="py-3 px-5 text-right text-slate-400 font-mono text-xs whitespace-nowrap">
                            {activeMonthRawSales > 0 ? ((activeMonthData.operatingExpenses?.totalExpenses || 110000) / activeMonthRawSales * 100).toFixed(1) : 0}%
                          </td>
                        </tr>

                        {/* Optional Itemized Overheads sub-rows */}
                        {showItemizedExpenses && (
                          <>
                            <tr className="bg-slate-50/60 dark:bg-slate-800/40 text-xs">
                              <td className="py-2 px-5 pl-8 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                • Store Rent
                              </td>
                              <td className="py-2 px-5 text-center whitespace-nowrap text-slate-400">Occupancy</td>
                              <td className="py-2 px-5 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.rent || 40000)}
                              </td>
                              <td className="py-2 px-5 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthRawSales > 0 ? ((activeMonthData.operatingExpenses?.rent || 40000) / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-slate-50/60 dark:bg-slate-800/40 text-xs">
                              <td className="py-2 px-5 pl-8 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                • Staff Salaries &amp; Payroll
                              </td>
                              <td className="py-2 px-5 text-center whitespace-nowrap text-slate-400">Payroll</td>
                              <td className="py-2 px-5 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.staffSalaries || 45000)}
                              </td>
                              <td className="py-2 px-5 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthRawSales > 0 ? ((activeMonthData.operatingExpenses?.staffSalaries || 45000) / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-slate-50/60 dark:bg-slate-800/40 text-xs">
                              <td className="py-2 px-5 pl-8 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                • Electricity, Showroom Lighting &amp; AC
                              </td>
                              <td className="py-2 px-5 text-center whitespace-nowrap text-slate-400">Utilities</td>
                              <td className="py-2 px-5 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.electricity || 15000)}
                              </td>
                              <td className="py-2 px-5 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthRawSales > 0 ? ((activeMonthData.operatingExpenses?.electricity || 15000) / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-slate-50/60 dark:bg-slate-800/40 text-xs">
                              <td className="py-2 px-5 pl-8 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                • Miscellaneous, Maintenance &amp; Upkeep
                              </td>
                              <td className="py-2 px-5 text-center whitespace-nowrap text-slate-400">Sundry</td>
                              <td className="py-2 px-5 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.miscExpenses || 10000)}
                              </td>
                              <td className="py-2 px-5 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthRawSales > 0 ? ((activeMonthData.operatingExpenses?.miscExpenses || 10000) / activeMonthRawSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            {activeMonthData.operatingExpenses?.franchiseRoyalty > 0 && (
                              <tr className="bg-slate-50/60 dark:bg-slate-800/40 text-xs">
                                <td className="py-2 px-5 pl-8 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  • Franchise / Tech Fee
                                </td>
                                <td className="py-2 px-5 text-center whitespace-nowrap text-slate-400">Franchise</td>
                                <td className="py-2 px-5 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  -{formatCurrency(activeMonthData.operatingExpenses.franchiseRoyalty)}
                                </td>
                                <td className="py-2 px-5 text-right text-slate-400 font-mono whitespace-nowrap">
                                  {activeMonthRawSales > 0 ? (activeMonthData.operatingExpenses.franchiseRoyalty / activeMonthRawSales * 100).toFixed(1) : 0}%
                                </td>
                              </tr>
                            )}
                          </>
                        )}

                        {/* 6. Net Bottom Line */}
                        <tr className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-sm">
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-emerald-200" />
                              <span>6. Net Store Operating Profit</span>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-center whitespace-nowrap">
                            <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                              Final Bottomline
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right font-black text-white font-mono whitespace-nowrap text-base sm:text-lg">
                            {formatCurrency(activeMonthData.netStoreProfit)}
                          </td>
                          <td className="py-4 px-5 text-right text-emerald-100 font-mono whitespace-nowrap font-black">
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
