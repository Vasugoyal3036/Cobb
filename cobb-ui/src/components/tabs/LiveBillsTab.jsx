import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Receipt,
  Clock,
  Calendar,
  Search,
  RefreshCw,
  Package,
  Wand2,
  ChevronDown,
  Copy,
  Check,
  CreditCard,
  Smartphone,
  Banknote,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Send,
  Sparkles,
  ArrowUpDown,
  Filter,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Scissors,
  Printer,
  Barcode,
  Tag,
  Percent,
  ShieldCheck,
  User,
  Info
} from 'lucide-react';
import AlterationSlipModal from '../AlterationSlipModal';

export const resolvePaymentMode = (bill) => {
  const cash = Number(bill?.CashAmount || 0);
  const upi = Number(bill?.UpiAmount || 0);
  const card = Number(bill?.CardAmount || 0);

  if (upi > 0 && cash === 0 && card === 0) return 'UPI / Online';
  if (card > 0 && cash === 0 && upi === 0) return 'Debit / Credit Card';
  if ((cash > 0 && upi > 0) || (cash > 0 && card > 0) || (upi > 0 && card > 0)) return 'Split (Cash + Digital)';
  if (cash > 0 && upi === 0 && card === 0) return 'Cash';

  let mode = bill?.PaymentMode || bill?.paymentMode;
  if (mode) {
    const mLower = String(mode).toLowerCase();
    if (mLower.includes('upi') || mLower.includes('online')) return 'UPI / Online';
    if (mLower.includes('card') || mLower.includes('debit') || mLower.includes('credit')) return 'Debit / Credit Card';
    if (mLower.includes('split')) return 'Split (Cash + Digital)';
    if (mLower.includes('cash')) return 'Cash';
    return mode;
  }
  return 'Cash';
};

const LiveBillsTab = (props) => {
  const {
    API_BASE,
    darkMode,
    liveBills = [],
    setLiveBills,
    expandedBillId,
    setExpandedBillId,
    billItemsCache = {},
    setBillItemsCache,
    loadingBillItems,
    setLoadingBillItems,
    toggleBillExpansion,
    targetHighlightBill,
    setSmartCoordinate,
    setShowCoordinateModal,
    formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`
  } = props;

  // Timezone-safe local date string helper (YYYY-MM-DD)
  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getLocalDateString(0), []);
  const yesterdayStr = useMemo(() => getLocalDateString(-1), []);

  // Filter States
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'yesterday' | '7days' | 'custom'
  const [customDate, setCustomDate] = useState(yesterdayStr);
  const [searchQuery, setSearchQuery] = useState(props.searchQuery || '');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'Cash' | 'UPI / Online' | 'Debit / Credit Card' | 'Split'
  const dateInputRef = useRef(null);

  useEffect(() => {
    if (typeof props.searchQuery === 'string') {
      setSearchQuery(props.searchQuery);
    }
  }, [props.searchQuery]);
  
  // Data States
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedBillId, setCopiedBillId] = useState(null);
  const [copiedSummaryId, setCopiedSummaryId] = useState(null);
  const [copiedBarcode, setCopiedBarcode] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  
  const [showAlterationModal, setShowAlterationModal] = useState(false);
  const [alterationInitialData, setAlterationInitialData] = useState(null);

  // Helper to extract rich financial calculations per bill
  const getBillFinancials = useCallback((bill) => {
    const items = billItemsCache[bill.BillId] || bill.Items || [];
    const net = Number(bill.Amount || 0);
    
    // MRP resolution: bill.TotalMrp, or sum of items MRP, or fallback to net
    let mrp = Number(bill.TotalMrp || 0);
    if ((!mrp || mrp < net) && items.length > 0) {
      mrp = items.reduce((sum, it) => sum + (Number(it.MRP || it.Mrp || it.NetPrice || 0) * (Number(it.Quantity) || 1)), 0);
    }
    if (!mrp || mrp < net) mrp = net;

    let savings = Number(bill.TotalSavings || 0);
    if (!savings && mrp > net) {
      savings = mrp - net;
    }
    if (!savings && items.length > 0) {
      savings = items.reduce((sum, it) => sum + (Number(it.DiscountAmount || 0) * (Number(it.Quantity) || 1)), 0);
    }

    const discPct = mrp > 0 && savings > 0 
      ? Number(((savings / mrp) * 100).toFixed(1)) 
      : Number(bill.DiscountPercent || 0);

    let taxAmount = Number(bill.TaxAmount || 0);
    if (!taxAmount && items.length > 0) {
      taxAmount = items.reduce((s, i) => s + (Number(i.TotalTaxAmount || 0)), 0);
    }
    const taxableAmount = Number(bill.TaxableAmount || (net - taxAmount));
    const roundOff = Number(bill.RoundOff || 0);
    const cashier = bill.CashierCode && bill.CashierCode !== 'Cashier' 
      ? bill.CashierCode 
      : (bill.CashierCode || 'Cashier');

    const totalQty = items.length > 0 
      ? items.reduce((s, i) => s + (Number(i.Quantity) || 1), 0) 
      : Number(bill.TotalQty || 1);

    return {
      net,
      mrp,
      savings,
      discPct,
      taxAmount,
      taxableAmount,
      roundOff,
      cashier,
      totalQty
    };
  }, [billItemsCache]);

  // Helper to get category chips preview
  const getBillCategories = useCallback((bill) => {
    const items = billItemsCache[bill.BillId] || bill.Items || [];
    if (!items || items.length === 0) return [];
    const map = {};
    items.forEach(it => {
      const name = it.SubCategory || it.Category || 'Apparel';
      map[name] = (map[name] || 0) + (Number(it.Quantity) || 1);
    });
    return Object.entries(map).map(([name, qty]) => ({ name, qty }));
  }, [billItemsCache]);

  // Fetch transactions from backend
  const fetchBills = useCallback(async (filterType = dateFilter, selectedCustomDate = customDate) => {
    setIsLoading(true);
    setFetchError(null);
    let url = `${API_BASE}/api/sales/live`;
    const params = new URLSearchParams();

    if (filterType === 'today') {
      params.append('date', 'today');
    } else if (filterType === 'yesterday') {
      params.append('date', 'yesterday');
    } else if (filterType === '7days') {
      params.append('days', '7');
    } else if (filterType === 'custom') {
      params.append('date', selectedCustomDate || yesterdayStr);
    }
    params.append('refresh', 'true');

    try {
      let res = await axios.get(`${url}?${params.toString()}`);

      // Fallback for cloud/Firestore if custom date not found in live feed
      if (filterType === 'custom' && selectedCustomDate && res.data && Array.isArray(res.data)) {
        const hasDateMatch = res.data.some(b => {
          const bDate = (b.BillDate || (b.BillTime ? b.BillTime.slice(0, 10) : '')).trim();
          return bDate === selectedCustomDate;
        });
        if (!hasDateMatch) {
          try {
            const histRes = await axios.get(`${API_BASE}/api/sales/history?refresh=true`);
            if (histRes.data && Array.isArray(histRes.data) && histRes.data.length > 0) {
              res = histRes;
            }
          } catch (_) {
            // Ignore fallback error
          }
        }
      }

      if (res.data && Array.isArray(res.data)) {
        let filtered = res.data;
        if (filterType === 'today') {
          filtered = res.data.filter(b => {
            const bDate = (b.BillDate || (b.BillTime ? b.BillTime.slice(0, 10) : '')).trim();
            return !bDate || bDate === todayStr;
          });
        } else if (filterType === 'yesterday') {
          filtered = res.data.filter(b => {
            const bDate = (b.BillDate || (b.BillTime ? b.BillTime.slice(0, 10) : '')).trim();
            return !bDate || bDate === yesterdayStr;
          });
        } else if (filterType === 'custom' && selectedCustomDate) {
          filtered = res.data.filter(b => {
            const bDate = (b.BillDate || (b.BillTime ? b.BillTime.slice(0, 10) : '')).trim();
            return !bDate || bDate === selectedCustomDate;
          });
        }

        setBills(filtered);
        setLastFetchedAt(new Date());

        // Batch populate billItemsCache so bill details open with 0 latency
        const newItemsMap = {};
        filtered.forEach(bill => {
          if (bill.Items && bill.Items.length > 0) {
            newItemsMap[bill.BillId] = bill.Items;
          }
        });
        if (Object.keys(newItemsMap).length > 0 && typeof setBillItemsCache === 'function') {
          setBillItemsCache(prev => ({ ...prev, ...newItemsMap }));
        }

        // Sync back to liveBills in App.jsx if viewing today
        if (filterType === 'today' && typeof setLiveBills === 'function') {
          setLiveBills(filtered);
        }
      } else if (res.data && res.data.error) {
        setFetchError(`Could not load: ${res.data.error}`);
        setBills([]);
      }
    } catch (err) {
      console.warn('[TRANSACTIONS] API fetch failed:', err);
      setFetchError('Could not reach the store system. Showing cached data if available.');
      if (Array.isArray(liveBills) && liveBills.length > 0) {
        setBills(liveBills);
      } else {
        setBills([]);
      }
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, yesterdayStr, todayStr, setBillItemsCache, setLiveBills]);

  // Reload when date filter or custom date changes
  useEffect(() => {
    fetchBills(dateFilter, customDate);
  }, [dateFilter, customDate, fetchBills]);

  // Auto-refresh when viewing 'today' (every 25 seconds)
  useEffect(() => {
    if (dateFilter !== 'today') return;
    const interval = setInterval(() => {
      fetchBills('today');
    }, 25000);
    return () => clearInterval(interval);
  }, [dateFilter, fetchBills]);

  // Sync if today's liveBills updated from parent poll
  useEffect(() => {
    if (dateFilter === 'today' && Array.isArray(liveBills) && liveBills.length > 0) {
      setBills(liveBills);
    }
  }, [liveBills, dateFilter]);

  // Auto-scroll into view if arriving from a Push Notification tap
  useEffect(() => {
    if (targetHighlightBill) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`bill-row-${String(targetHighlightBill).trim()}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [targetHighlightBill, bills]);

  // Filter bills client-side (handles search, payment mode, barcodes, and date matching)
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      // Date filter matching
      if (dateFilter === 'today') {
        const bDate = (bill.BillDate || (bill.BillTime ? bill.BillTime.slice(0, 10) : '')).trim();
        if (bDate && bDate !== todayStr) return false;
      } else if (dateFilter === 'yesterday') {
        const bDate = (bill.BillDate || (bill.BillTime ? bill.BillTime.slice(0, 10) : '')).trim();
        if (bDate && bDate !== yesterdayStr) return false;
      } else if (dateFilter === 'custom' && customDate) {
        const bDate = (bill.BillDate || (bill.BillTime ? bill.BillTime.slice(0, 10) : '')).trim();
        if (bDate && bDate !== customDate.trim()) return false;
      }

      // Payment Mode filter
      if (paymentFilter !== 'all') {
        const mode = resolvePaymentMode(bill);
        if (paymentFilter === 'Split' && !mode.includes('Split')) return false;
        if (paymentFilter !== 'Split' && mode !== paymentFilter) return false;
      }

      // Search query (Supports Invoice #, Customer, Phone, Cashier, Barcode, Article No, SubCategory)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const billNoMatch = bill.BillNumber?.toLowerCase()?.includes(q);
        const customerMatch = bill.CustomerName?.toLowerCase()?.includes(q) || bill.FirstName?.toLowerCase()?.includes(q);
        const phoneMatch = bill.Phone?.toLowerCase()?.includes(q);
        const cashierMatch = bill.CashierCode?.toLowerCase()?.includes(q);
        const cachedItems = billItemsCache[bill.BillId] || bill.Items || [];
        const itemMatch = cachedItems.some(item => 
          item.ArticleName?.toLowerCase()?.includes(q) || 
          item.ArticleNo?.toLowerCase()?.includes(q) ||
          item.Barcode?.toLowerCase()?.includes(q) ||
          item.SubCategory?.toLowerCase()?.includes(q) ||
          item.Category?.toLowerCase()?.includes(q) ||
          item.HsnCode?.toLowerCase()?.includes(q) ||
          item.Color?.toLowerCase()?.includes(q) ||
          item.Size?.toLowerCase()?.includes(q)
        );
        if (!billNoMatch && !customerMatch && !phoneMatch && !cashierMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [bills, dateFilter, todayStr, yesterdayStr, customDate, paymentFilter, searchQuery, billItemsCache]);

  // Comprehensive KPI Calculations
  const summaryKpis = useMemo(() => {
    let totalRev = 0;
    let totalGrossMrp = 0;
    let totalSavings = 0;
    let totalTax = 0;
    let totalTaxable = 0;
    let totalQty = 0;
    let cashRev = 0;
    let upiRev = 0;
    let cardRev = 0;

    filteredBills.forEach(b => {
      const fin = getBillFinancials(b);
      totalRev += fin.net;
      totalGrossMrp += fin.mrp;
      totalSavings += fin.savings;
      totalTax += fin.taxAmount;
      totalTaxable += fin.taxableAmount;
      totalQty += fin.totalQty;
      
      let cash = Number(b.CashAmount || 0);
      let upi = Number(b.UpiAmount || 0);
      let card = Number(b.CardAmount > 0 ? b.CardAmount : 0);

      if (cash === 0 && upi === 0 && card === 0 && fin.net > 0) {
        const mode = resolvePaymentMode(b);
        if (mode === 'UPI / Online' || mode?.includes('UPI')) upi = fin.net;
        else if (mode === 'Debit / Credit Card' || mode?.includes('Card')) card = fin.net;
        else cash = fin.net;
      }

      cashRev += cash;
      upiRev += upi;
      cardRev += card;
    });

    const count = filteredBills.length;
    const aov = count > 0 ? Math.round(totalRev / count) : 0;
    const avgDiscountPct = totalGrossMrp > 0 && totalSavings > 0
      ? ((totalSavings / totalGrossMrp) * 100).toFixed(1)
      : 0;

    return {
      totalRev,
      totalGrossMrp,
      totalSavings,
      avgDiscountPct,
      totalTax,
      totalTaxable,
      count,
      totalQty,
      aov,
      cashRev,
      upiRev,
      cardRev
    };
  }, [filteredBills, getBillFinancials]);

  // Helper to copy text to clipboard
  const handleCopy = (text, id, type = 'bill') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'bill') {
      setCopiedBillId(id);
      setTimeout(() => setCopiedBillId(null), 2000);
    } else if (type === 'barcode') {
      setCopiedBarcode(id);
      setTimeout(() => setCopiedBarcode(null), 2000);
    } else {
      setCopiedSummaryId(id);
      setTimeout(() => setCopiedSummaryId(null), 2000);
    }
  };

  // Helper to format date & time nicely
  const formatBillDateTime = (timeStr, dateStr) => {
    if (!timeStr) return '-';
    try {
      const d = new Date(timeStr);
      const isToday = (dateStr || timeStr.slice(0, 10)) === todayStr;
      const isYesterday = (dateStr || timeStr.slice(0, 10)) === yesterdayStr;
      
      const timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (isToday) return `Today, ${timeFormatted}`;
      if (isYesterday) return `Yesterday, ${timeFormatted}`;
      return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${timeFormatted}`;
    } catch (e) {
      return timeStr;
    }
  };

  // Full detailed thermal/tax receipt printer
  const handlePrintBill = (bill) => {
    const items = billItemsCache[bill.BillId] || bill.Items || [];
    const fin = getBillFinancials(bill);
    const printWindow = window.open('', '_blank', 'width=420,height=650');
    
    const itemsHtml = items.map(i => {
      const unitMrp = Number(i.MRP || i.Mrp || i.NetPrice);
      const net = Number(i.NetPrice);
      const disc = unitMrp > net ? unitMrp - net : Number(i.DiscountAmount || 0);
      const discPct = unitMrp > 0 && disc > 0 ? ((disc / unitMrp) * 100).toFixed(0) : 0;
      return `
        <tr>
          <td style="padding: 5px 0; border-bottom: 1px dashed #bbb;">
            <div style="font-weight: bold;">${i.ArticleName}</div>
            <div style="font-size: 10px; color: #555;">
              ${i.Barcode ? `[${i.Barcode}] ` : ''}${i.ArticleNo} | Size: ${i.Size || 'Std'} | ${i.Color || ''}
              ${i.HsnCode ? ` | HSN: ${i.HsnCode}` : ''}
            </div>
            ${disc > 0 ? `<div style="font-size: 10px; color: #16a34a;">MRP ₹${unitMrp} (${discPct}% off)</div>` : ''}
          </td>
          <td style="padding: 5px 0; border-bottom: 1px dashed #bbb; text-align: center; font-weight: bold;">${i.Quantity || 1}</td>
          <td style="padding: 5px 0; border-bottom: 1px dashed #bbb; text-align: right; font-weight: bold;">₹${i.NetPrice}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <title>Invoice #${bill.BillNumber.trim()}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; padding: 16px; max-width: 320px; margin: 0 auto; color: #111; font-size: 12px; }
            h2 { text-align: center; margin-bottom: 2px; font-size: 18px; letter-spacing: 1px; }
            .subhead { text-align: center; margin-top: 0; font-size: 11px; color: #444; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
            th { text-align: left; border-bottom: 2px solid #000; padding-bottom: 4px; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
            .ledger-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; }
            .total-row { margin-top: 8px; text-align: right; font-weight: 900; font-size: 15px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px 0; display: flex; justify-content: space-between; }
            .footer { margin-top: 24px; text-align: center; font-size: 10px; border-top: 1px dashed #aaa; padding-top: 10px; color: #555; }
          </style>
        </head>
        <body>
          <h2>COBB APPARELS</h2>
          <div class="subhead">Retail Tax Invoice • Fatehpur Road, Pundri<br>GSTIN: 06AABCC1234F1Z5 • Tel: 9138122820</div>
          
          <div style="margin-top: 14px; border-top: 1px dashed #999; padding-top: 8px;">
            <div class="meta-row"><span>Bill No:</span><strong style="font-family: monospace;">#${bill.BillNumber.trim()}</strong></div>
            <div class="meta-row"><span>Date:</span><span>${formatBillDateTime(bill.BillTime, bill.BillDate)}</span></div>
            <div class="meta-row"><span>Cashier:</span><span>${fin.cashier}</span></div>
            <div class="meta-row"><span>Customer:</span><strong>${bill.CustomerName?.trim() || 'Guest Customer'}</strong></div>
            <div class="meta-row"><span>Mobile:</span><span>${bill.Phone || '-'}</span></div>
            <div class="meta-row"><span>Payment:</span><strong>${resolvePaymentMode(bill)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item &amp; Barcode</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Net</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 12px; border-top: 1px dashed #999; padding-top: 6px;">
            ${fin.mrp > fin.net ? `
              <div class="ledger-row"><span>Total Gross MRP:</span><span>₹${fin.mrp.toLocaleString('en-IN')}</span></div>
              <div class="ledger-row" style="color: #16a34a; font-weight: bold;">
                <span>Total Savings (${fin.discPct}% OFF):</span><span>- ₹${fin.savings.toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            <div class="ledger-row"><span>Taxable Value:</span><span>₹${fin.taxableAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
            <div class="ledger-row"><span>GST Amount:</span><span>₹${fin.taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
            ${fin.roundOff !== 0 ? `<div class="ledger-row"><span>Round Off:</span><span>₹${fin.roundOff}</span></div>` : ''}
          </div>

          <div class="total-row">
            <span>NET AMOUNT:</span>
            <span>₹${fin.net.toLocaleString('en-IN')}</span>
          </div>

          <div class="footer">
            Thank you for shopping at Cobb Apparels!<br>
            Goods once sold can be exchanged within 7 days with original bill &amp; tags.<br>
            Visit again!
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // WhatsApp bill with savings & item details
  const openWhatsAppBill = (bill) => {
    if (!bill.Phone) return;
    const items = billItemsCache[bill.BillId] || bill.Items || [];
    const fin = getBillFinancials(bill);

    let itemsText = items.map(i => {
      const disc = Number(i.DiscountPercent || 0);
      const discStr = disc > 0 ? ` (MRP ₹${i.MRP} -${disc}%)` : '';
      return `• ${i.ArticleName} [${i.Barcode || i.ArticleNo}] (${i.Size || 'Std'}, ${i.Color || 'Std'}) x${i.Quantity || 1} - ₹${i.NetPrice}${discStr}`;
    }).join('\n');
    
    const savingsStr = fin.mrp > fin.net 
      ? `\n*Total MRP:* ₹${fin.mrp.toLocaleString('en-IN')}\n*Customer Savings:* ₹${fin.savings.toLocaleString('en-IN')} (${fin.discPct}% OFF)` 
      : '';
    
    const text = `Hello ${bill.CustomerName?.trim() || 'Valued Customer'}, here are your invoice details from Cobb Apparels:\n\n*Invoice No:* ${bill.BillNumber.trim()}\n*Date:* ${formatBillDateTime(bill.BillTime, bill.BillDate)}\n*Billed By:* ${fin.cashier}\n*Net Amount:* ₹${bill.Amount}${savingsStr}\n*Payment Mode:* ${resolvePaymentMode(bill)}\n\n*Items Purchased:*\n${itemsText || 'Details on invoice'}\n\nThank you for shopping with Cobb!`;
    const cleanPhone = bill.Phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className={`space-y-6 transition-colors ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
      
      {/* Header Section */}
      <div className="glass-header-bar p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md mb-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-2xl mr-3.5 shadow-sm border ${darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Transaction History &amp; Bills
              </h2>
              {dateFilter === 'today' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live Feed
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm mt-1 text-slate-500 dark:text-slate-400">
              Complete financial breakdown with MRP, customer savings, GST taxes, barcodes, and digital receipts.
            </p>
          </div>
        </div>

        {/* Right Header Status / Refresh */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchBills(dateFilter, customDate)}
            disabled={isLoading}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-sm active:scale-95 ${
              darkMode 
                ? 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-slate-200 hover:text-white' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Refresh transaction data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
          
          <span className={`text-xs font-semibold px-3 py-2 rounded-xl border ${
            darkMode ? 'bg-black/30 border-white/[0.08] text-slate-400 font-mono' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            {filteredBills.length} {filteredBills.length === 1 ? 'Invoice' : 'Invoices'} Listed
          </span>
        </div>
      </div>

      {/* Date & Filter Control Bar */}
      <div className="glass-card-obsidian p-4 rounded-2xl mb-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Date Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Today Button */}
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              dateFilter === 'today'
                ? (darkMode ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-blue-600 text-white border-blue-600 shadow-sm')
                : (darkMode ? 'bg-[#161922] hover:bg-[#1f2330] text-slate-300 border-[#2e3342]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200')
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>⚡ Today</span>
          </button>

          {/* Yesterday Button */}
          <button
            onClick={() => setDateFilter('yesterday')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              dateFilter === 'yesterday'
                ? (darkMode ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-indigo-600 text-white border-indigo-600 shadow-sm')
                : (darkMode ? 'bg-[#161922] hover:bg-[#1f2330] text-slate-300 border-[#2e3342]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200')
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>⏪ Yesterday ({new Date(yesterdayStr).toLocaleDateString([], { day: '2-digit', month: 'short' })})</span>
          </button>

          {/* Last 7 Days Button */}
          <button
            onClick={() => setDateFilter('7days')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              dateFilter === '7days'
                ? (darkMode ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-purple-600 text-white border-purple-600 shadow-sm')
                : (darkMode ? 'bg-[#161922] hover:bg-[#1f2330] text-slate-300 border-[#2e3342]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200')
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Last 7 Days</span>
          </button>

          {/* Custom Date Picker */}
          <div className="flex items-center gap-1.5 pl-1">
            <button
              type="button"
              onClick={() => {
                setDateFilter('custom');
                try {
                  dateInputRef.current?.showPicker?.();
                  dateInputRef.current?.focus();
                } catch (_) {
                  dateInputRef.current?.focus();
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                dateFilter === 'custom'
                  ? (darkMode ? 'bg-amber-600 text-white border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.4)]' : 'bg-amber-600 text-white border-amber-600 shadow-sm')
                  : (darkMode ? 'bg-[#161922] hover:bg-[#1f2330] text-slate-300 border-[#2e3342]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200')
              }`}
              title="Click to pick a custom date from calendar"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {dateFilter === 'custom' && customDate
                  ? `📅 ${new Date(customDate + 'T00:00:00').toLocaleDateString([], { day: '2-digit', month: 'short' })}`
                  : '📅 Pick Date'}
              </span>
            </button>

            <input
              ref={dateInputRef}
              type="date"
              value={customDate || ''}
              onChange={(e) => {
                if (e.target.value) {
                  setCustomDate(e.target.value);
                  setDateFilter('custom');
                }
              }}
              onInput={(e) => {
                if (e.target.value) {
                  setCustomDate(e.target.value);
                  setDateFilter('custom');
                }
              }}
              onClick={(e) => {
                setDateFilter('custom');
                try { e.target.showPicker?.(); } catch(_) {}
              }}
              max={todayStr}
              style={{ colorScheme: darkMode ? 'dark' : 'light' }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition outline-none cursor-pointer ${
                dateFilter === 'custom'
                  ? (darkMode ? 'bg-amber-950/60 text-amber-200 border-amber-500 ring-1 ring-amber-500' : 'bg-amber-50 text-amber-800 border-amber-400 ring-1 ring-amber-400')
                  : (darkMode ? 'bg-[#161922] text-slate-300 border-[#2e3342]' : 'bg-slate-100 text-slate-700 border-slate-200')
              }`}
            />
          </div>
        </div>

        {/* Search & Payment Mode Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Enhanced Search Box */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="Search bill, phone, barcode, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8.5 pr-8 py-2 text-xs font-medium rounded-xl border outline-none transition ${
                darkMode 
                  ? 'bg-[#161922] border-[#2e3342] text-white placeholder-slate-500 focus:border-blue-500' 
                  : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Payment Mode Selector */}
          <div className="flex items-center">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition outline-none cursor-pointer ${
                darkMode ? 'bg-[#161922] border-[#2e3342] text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <option value="all">All Modes</option>
              <option value="Cash">💵 Cash Only</option>
              <option value="UPI / Online">⚡ UPI / Online</option>
              <option value="Debit / Credit Card">💳 Card Only</option>
              <option value="Split">🔀 Split Payment</option>
            </select>
          </div>
        </div>
      </div>

      {/* ENHANCED 5-CARD KPI METRICS SUMMARY BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
        
        {/* Card 1: Net Billed Sales */}
        <div className="glass-card-obsidian p-4 rounded-2xl transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Net Revenue
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {formatCurrency(summaryKpis.totalRev)}
          </div>
          <div className={`text-[10px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Across {summaryKpis.count} total {summaryKpis.count === 1 ? 'bill' : 'bills'}
          </div>
        </div>

        {/* Card 2: Total Gross MRP & Customer Savings */}
        <div className="glass-card-obsidian p-4 rounded-2xl transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Gross MRP &amp; Savings
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Tag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {formatCurrency(summaryKpis.totalGrossMrp)}
          </div>
          <div className="text-[10px] mt-1 font-bold flex items-center gap-1 text-rose-400">
            <span>Saved {formatCurrency(summaryKpis.totalSavings)}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500/15 border border-rose-500/30 font-black">
              {summaryKpis.avgDiscountPct}% OFF
            </span>
          </div>
        </div>

        {/* Card 3: Invoices & Items Sold */}
        <div className="glass-card-obsidian p-4 rounded-2xl transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Volume &amp; Units
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {summaryKpis.count} <span className="text-xs font-semibold text-slate-400">({summaryKpis.totalQty} units)</span>
          </div>
          <div className={`text-[10px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Avg. {(summaryKpis.count > 0 ? (summaryKpis.totalQty / summaryKpis.count).toFixed(1) : 0)} items / basket
          </div>
        </div>

        {/* Card 4: GST & Tax Transparency */}
        <div className="glass-card-obsidian p-4 rounded-2xl transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              GST &amp; Taxable
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
            {formatCurrency(summaryKpis.totalTax)}
          </div>
          <div className={`text-[10px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Taxable: {formatCurrency(summaryKpis.totalTaxable)}
          </div>
        </div>

        {/* Card 5: Payment Mode Split */}
        <div className="glass-card-obsidian p-4 rounded-2xl transition-all col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Payment Tender
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-bold pt-0.5 font-mono">
            <span className="text-emerald-400">💵 {formatCurrency(summaryKpis.cashRev)}</span>
            <span className="text-purple-400">⚡ {formatCurrency(summaryKpis.upiRev)}</span>
            <span className="text-blue-400">💳 {formatCurrency(summaryKpis.cardRev)}</span>
          </div>
          <div className={`text-[9px] mt-1 font-medium flex justify-between ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Cash</span>
            <span>UPI/QR</span>
            <span>Card</span>
          </div>
        </div>
      </div>

      {/* MOBILE BILLS CARD FEED (< md) */}
      <div className="md:hidden space-y-3 mb-6">
        {isLoading && (
          <div className="glass-card-obsidian p-8 rounded-2xl text-center">
            <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-2"></div>
            <span className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Loading transactions...
            </span>
          </div>
        )}

        {filteredBills.map((bill, idx) => {
          const isExpanded = expandedBillId === bill.BillId;
          const items = billItemsCache[bill.BillId] || bill.Items || [];
          const fin = getBillFinancials(bill);
          const mode = resolvePaymentMode(bill);
          const isCash = mode === 'Cash';
          const isUPI = mode === 'UPI / Online' || mode?.includes('UPI');
          const isCard = mode === 'Debit / Credit Card' || mode?.includes('Card');

          return (
            <div
              key={bill.BillId || idx}
              onClick={() => toggleBillExpansion(bill.BillId)}
              className="glass-card-obsidian p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer"
            >
              {/* Top row: Invoice #, Mode, Cashier, Time */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-sm text-blue-400">#{bill.BillNumber?.trim()}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isCash ? (darkMode ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                      : isUPI ? (darkMode ? 'bg-purple-950/50 text-purple-300 border-purple-800/60' : 'bg-purple-50 text-purple-700 border-purple-200')
                      : isCard ? (darkMode ? 'bg-blue-950/50 text-blue-300 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200')
                      : (darkMode ? 'bg-amber-950/50 text-amber-300 border-amber-800/60' : 'bg-amber-50 text-amber-700 border-amber-200')
                    }`}>
                      {isCash ? '💵 Cash' : isUPI ? '⚡ UPI' : isCard ? '💳 Card' : '🔀 Split'}
                    </span>
                    {fin.cashier && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${
                        darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        👤 {fin.cashier}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatBillDateTime(bill.BillTime, bill.BillDate)}</span>
                  </p>
                </div>

                {/* Price Block with MRP & Savings */}
                <div className="text-right shrink-0">
                  {fin.mrp > fin.net && (
                    <div className="text-[10px] text-slate-400 line-through font-mono">
                      {formatCurrency(fin.mrp)}
                    </div>
                  )}
                  <div className={`text-base font-black font-mono ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {formatCurrency(fin.net)}
                  </div>
                  {fin.discPct > 0 && (
                    <span className="text-[9px] font-black text-rose-400 px-1 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
                      -{fin.discPct}%
                    </span>
                  )}
                </div>
              </div>

              {/* Customer Row */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">
                    {bill.CustomerName?.trim() || bill.FirstName?.trim() || 'Guest Customer'}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                    {bill.Phone && <span>{bill.Phone}</span>}
                    <span>•</span>
                    <span>{fin.totalQty} {fin.totalQty === 1 ? 'item' : 'items'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(bill.BillNumber?.trim(), bill.BillId, 'bill');
                    }}
                    className={`p-1.5 rounded-lg border text-xs font-bold ${
                      darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                    title="Copy bill #"
                  >
                    {copiedBillId === bill.BillId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <div className={`p-1 rounded-lg ${isExpanded ? 'text-blue-400' : 'text-slate-400'}`}>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Mobile Expanded Items & Financial Breakdown */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/[0.08] space-y-3" onClick={(e) => e.stopPropagation()}>
                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Item Breakdown</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {props.openThermalModal && (
                        <button
                          onClick={() => props.openThermalModal({ receiptType: 'bill', billData: { ...bill, Items: items } })}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" /> Slip
                        </button>
                      )}
                      <button
                        onClick={() => handlePrintBill(bill)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1"
                      >
                        <Receipt className="w-3 h-3" /> Print
                      </button>
                      {bill.Phone && (
                        <button
                          onClick={() => openWhatsAppBill(bill)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> WhatsApp
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setAlterationInitialData({ billNo: bill.BillNumber?.trim(), customerName: bill.CustomerName?.trim(), phone: bill.Phone?.trim(), items: items });
                          setShowAlterationModal(true);
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1"
                      >
                        <Scissors className="w-3 h-3" /> Alter
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  {items.map((item, i) => {
                    const unitMrp = Number(item.MRP || item.Mrp || item.NetPrice);
                    const net = Number(item.NetPrice);
                    const disc = unitMrp > net ? unitMrp - net : Number(item.DiscountAmount || 0);
                    const discPct = unitMrp > 0 && disc > 0 ? ((disc / unitMrp) * 100).toFixed(0) : 0;
                    return (
                      <div key={i} className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                        darkMode ? 'bg-[#151924] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold truncate text-slate-100 dark:text-white">{item.ArticleName}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5 flex-wrap">
                              {item.Barcode && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold inline-flex items-center gap-1">
                                  <Barcode className="w-2.5 h-2.5" />
                                  {item.Barcode}
                                  <button
                                    onClick={() => handleCopy(item.Barcode, item.Barcode, 'barcode')}
                                    className="hover:text-white"
                                  >
                                    {copiedBarcode === item.Barcode ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </span>
                              )}
                              <span>{item.ArticleNo}</span>
                              {item.HsnCode && <span>• HSN: {item.HsnCode}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {unitMrp > net && (
                              <p className="text-[10px] text-slate-400 line-through font-mono">{formatCurrency(unitMrp)}</p>
                            )}
                            <p className="font-black text-emerald-400 font-mono text-sm">{formatCurrency(net)}</p>
                          </div>
                        </div>

                        {/* Badges: Category, Color, Size, Discount */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[10px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {item.SubCategory || item.Category || 'Apparel'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                              Size: {item.Size || 'Std'}
                            </span>
                            {item.Color && item.Color !== 'Standard' && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                {item.Color}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {disc > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-black">
                                -{discPct}% (-{formatCurrency(disc)})
                              </span>
                            )}
                            <span className="font-bold text-slate-300">Qty: {item.Quantity}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Mobile Financial Reconciliation Ledger Card */}
                  <div className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                    darkMode ? 'bg-[#0f1117] border-[#2e3342] text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}>
                    <div className="flex justify-between text-[11px] font-bold pb-1 border-b border-white/[0.08]">
                      <span>Financial Ledger</span>
                      <span className="text-emerald-400 font-mono font-black">{formatCurrency(fin.net)}</span>
                    </div>
                    {fin.mrp > fin.net && (
                      <>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">Total Gross MRP:</span>
                          <span className="font-mono">{formatCurrency(fin.mrp)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-rose-400 font-bold">
                          <span>Total Savings ({fin.discPct}%):</span>
                          <span className="font-mono">- {formatCurrency(fin.savings)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Taxable Value:</span>
                      <span className="font-mono">{formatCurrency(fin.taxableAmount)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Total GST Tax:</span>
                      <span className="font-mono">{formatCurrency(fin.taxAmount)}</span>
                    </div>
                    {fin.roundOff !== 0 && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Round Off:</span>
                        <span className="font-mono">{formatCurrency(fin.roundOff)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredBills.length === 0 && !isLoading && (
          <div className={`p-8 rounded-2xl border text-center ${darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200'}`}>
            <Receipt className={`w-10 h-10 mb-2 mx-auto ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className="font-bold text-sm">No Transactions Found</p>
            <p className="text-xs text-slate-400 mt-0.5">No invoices match the selected filter</p>
          </div>
        )}
      </div>

      {/* TRANSACTION TABLE (DESKTOP >= md) */}
      <div className={`hidden md:block rounded-2xl border shadow-xl overflow-hidden transition-all duration-300 ${
        darkMode ? 'glass-card-obsidian' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-xs font-bold uppercase tracking-wider ${
                darkMode ? 'bg-slate-900/70 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="px-5 py-4 whitespace-nowrap">Date &amp; Staff</th>
                <th className="px-5 py-4 whitespace-nowrap">Invoice No.</th>
                <th className="px-5 py-4 whitespace-nowrap">Customer</th>
                <th className="px-5 py-4 text-center whitespace-nowrap">Payment Mode</th>
                <th className="px-5 py-4 whitespace-nowrap">Items &amp; Categories</th>
                <th className="px-5 py-4 text-right whitespace-nowrap">Financial Breakdown</th>
                <th className="px-3 py-4 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
              {isLoading && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                      <span className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Loading transactions for {dateFilter === 'today' ? 'today' : dateFilter === 'yesterday' ? 'yesterday' : customDate ? `date ${customDate}` : 'selected date'}...
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              {filteredBills.map((bill, idx) => {
                const isExpanded = expandedBillId === bill.BillId;
                const items = billItemsCache[bill.BillId] || bill.Items || [];
                const fin = getBillFinancials(bill);
                const categories = getBillCategories(bill);

                const isTargetHighlight = Boolean(
                  targetHighlightBill && (
                    String(bill.BillNumber || '').trim().toLowerCase() === String(targetHighlightBill).trim().toLowerCase() ||
                    String(bill.BillId || '').trim().toLowerCase() === String(targetHighlightBill).trim().toLowerCase()
                  )
                );

                return (
                  <React.Fragment key={bill.BillId || idx}>
                    <tr
                      id={`bill-row-${String(bill.BillNumber || bill.BillId || '').trim()}`}
                      onClick={() => toggleBillExpansion(bill.BillId)}
                      className={`transition-all duration-300 cursor-pointer ${
                        isTargetHighlight
                          ? darkMode
                            ? 'bg-emerald-500/20 ring-2 ring-emerald-500/80 shadow-lg shadow-emerald-500/20'
                            : 'bg-emerald-50 ring-2 ring-emerald-500 shadow-md shadow-emerald-500/20'
                          : isExpanded
                            ? (darkMode ? 'bg-blue-950/20' : 'bg-blue-50/40')
                            : (darkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/70')
                      }`}
                    >
                      {/* Date, Time & Cashier */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                            <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              {formatBillDateTime(bill.BillTime, bill.BillDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                              darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}>
                              👤 {fin.cashier}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Invoice No with Copy */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            #{bill.BillNumber?.trim()}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(bill.BillNumber?.trim(), bill.BillId, 'bill');
                            }}
                            className={`p-1 rounded hover:bg-slate-200/50 transition cursor-pointer ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                            title="Copy invoice number"
                          >
                            {copiedBillId === bill.BillId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Customer Details & Wardrobe Passport */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                              {bill.CustomerName?.trim() || bill.FirstName?.trim() || 'Guest Customer'}
                            </span>
                            {bill.Phone && (props.openWardrobePassport || props.onOpenWardrobePassport) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const fn = props.openWardrobePassport || props.onOpenWardrobePassport;
                                  fn(bill.Phone, bill.CustomerName);
                                }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition cursor-pointer"
                                title="View Customer Digital Wardrobe Passport"
                              >
                                👔 Wardrobe
                              </button>
                            )}
                          </div>
                          {bill.Phone && (
                            <span className="text-xs text-slate-400 font-mono mt-0.5 inline-flex items-center gap-1">
                              {bill.Phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Payment Mode */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {(() => {
                          const mode = resolvePaymentMode(bill);
                          const isCash = mode === 'Cash';
                          const isUPI = mode === 'UPI / Online' || mode?.includes('UPI');
                          const isCard = mode === 'Debit / Credit Card' || mode?.includes('Card');

                          const badgeClass = isCash
                            ? (darkMode ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                            : isUPI
                            ? (darkMode ? 'bg-purple-950/40 text-purple-300 border-purple-800/60' : 'bg-purple-50 text-purple-700 border-purple-200')
                            : isCard
                            ? (darkMode ? 'bg-blue-950/40 text-blue-300 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200')
                            : (darkMode ? 'bg-amber-950/40 text-amber-300 border-amber-800/60' : 'bg-amber-50 text-amber-700 border-amber-200');

                          return (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1 ${badgeClass}`}>
                                {isCash ? '💵 Cash' :
                                  isUPI ? '⚡ UPI / QR' :
                                  isCard ? '💳 Card' :
                                  '🔀 Split'}
                              </span>
                              {mode.includes('Split') && (
                                <div className="text-[10px] text-slate-400 font-mono flex gap-1">
                                  {bill.CashAmount > 0 && <span>C:{formatCurrency(bill.CashAmount)}</span>}
                                  {bill.UpiAmount > 0 && <span>U:{formatCurrency(bill.UpiAmount)}</span>}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Items & Categories Preview */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                              darkMode ? 'bg-[#181b24] border-[#2e3342] text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}>
                              {fin.totalQty} {fin.totalQty === 1 ? 'unit' : 'units'}
                            </span>
                            {categories.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {categories.slice(0, 2).map((cat, i) => (
                                  <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                    darkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                                  }`}>
                                    {cat.name} ({cat.qty})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Financial Breakdown (Gross MRP, Net, Savings, GST) */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          {fin.mrp > fin.net && (
                            <div className="text-xs text-slate-400 line-through font-mono">
                              {formatCurrency(fin.mrp)}
                            </div>
                          )}
                          <div className={`text-base font-black font-mono ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {formatCurrency(fin.net)}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {fin.discPct > 0 && (
                              <span className="text-[10px] font-black text-rose-400 px-1.5 py-0.2 rounded-md bg-rose-500/10 border border-rose-500/20">
                                -{fin.discPct}% (Saved {formatCurrency(fin.savings)})
                              </span>
                            )}
                            {fin.taxAmount > 0 && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Tax: {formatCurrency(fin.taxAmount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Chevron Arrow */}
                      <td className="px-3 py-4 text-center">
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} />
                      </td>
                    </tr>

                    {/* EXPANDED BILL DETAILS DRAWER */}
                    {isExpanded && (
                      <tr className={`border-b ${darkMode ? 'bg-[#12151e] border-[#2e3342]' : 'bg-slate-50/80 border-slate-200'}`}>
                        <td colSpan="7" className="p-0">
                          <div className="px-6 py-5 animate-in slide-in-from-top-2 duration-200 space-y-4" onClick={(e) => e.stopPropagation()}>
                            
                            {/* Drawer Header Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                              <div className="flex items-center gap-2.5">
                                <Package className="w-5 h-5 text-blue-500" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className={`text-base font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                      Itemized Tax Invoice
                                    </h4>
                                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold">
                                      #{bill.BillNumber?.trim()}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                                    <span>Billed: {formatBillDateTime(bill.BillTime, bill.BillDate)}</span>
                                    <span>•</span>
                                    <span className="text-slate-300 font-semibold">Cashier: 👤 {fin.cashier}</span>
                                    <span>•</span>
                                    <span className="text-emerald-400 font-bold">Payment: {resolvePaymentMode(bill)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Thermal Slip Print */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currItems = billItemsCache[bill.BillId] || bill.Items || [];
                                    if (props.openThermalModal) {
                                      props.openThermalModal({
                                        receiptType: 'bill',
                                        billData: {
                                          ...bill,
                                          Items: currItems
                                        }
                                      });
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                                    darkMode
                                      ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border-blue-500/30'
                                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                  }`}
                                  title="Print ESC/POS Thermal Slip (80mm/58mm)"
                                >
                                  <Printer className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Thermal Slip</span>
                                </button>

                                {/* Print Invoice */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrintBill(bill);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                                    darkMode
                                      ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30'
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>Print Bill</span>
                                </button>

                                {/* WhatsApp Details */}
                                {bill.Phone && (
                                  <button
                                    onClick={() => openWhatsAppBill(bill)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                                      darkMode
                                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                    }`}
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>WhatsApp Bill</span>
                                  </button>
                                )}

                                {/* AI Stylist */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentItems = billItemsCache[bill.BillId] || bill.Items || [];
                                    if (currentItems.length === 0) return;
                                    setSmartCoordinate({ loading: true, data: null, itemText: '' });
                                    setShowCoordinateModal(true);
                                    const itemNames = currentItems.map(i => i.ArticleName);
                                    axios.post(`${API_BASE}/api/ai/smart-coordinate`, {
                                      items: itemNames,
                                      customerName: bill.CustomerName
                                    }).then(res => {
                                      setSmartCoordinate({ loading: false, data: res.data.message, itemText: itemNames.join(', ') });
                                    }).catch(() => {
                                      setSmartCoordinate({ loading: false, data: "Error generating recommendation.", itemText: '' });
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                                    darkMode 
                                      ? 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30' 
                                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                  }`}
                                >
                                  <Wand2 className="w-3.5 h-3.5" />
                                  <span>AI Stylist</span>
                                </button>

                                {/* Alteration Slip */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentItems = billItemsCache[bill.BillId] || bill.Items || [];
                                    const mainItem = currentItems.length > 0 ? currentItems[0] : null;
                                    setAlterationInitialData({
                                      CustomerName: bill.CustomerName,
                                      Phone: bill.Phone,
                                      Category: mainItem?.Category || 'Trouser',
                                      Quantity: '1'
                                    });
                                    setShowAlterationModal(true);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                                    darkMode
                                      ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  <Scissors className="w-3.5 h-3.5" />
                                  <span>Alteration Slip</span>
                                </button>

                                {/* Copy Summary */}
                                <button
                                  onClick={() => {
                                    const currItems = billItemsCache[bill.BillId] || bill.Items || [];
                                    const text = `Invoice: ${bill.BillNumber?.trim()} | Customer: ${bill.CustomerName?.trim()} | Net: ₹${bill.Amount} | MRP: ₹${fin.mrp} | Saved: ₹${fin.savings} (${fin.discPct}%) | Items: ${currItems.map(i => `${i.ArticleName} [${i.Barcode || i.ArticleNo}] (${i.Quantity})`).join(', ')}`;
                                    handleCopy(text, bill.BillId, 'summary');
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                                    darkMode ? 'bg-[#181b24] hover:bg-[#202532] text-slate-300 border-[#2e3342]' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {copiedSummaryId === bill.BillId ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy Bill</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* ITEM SPECIFICATIONS TABLE */}
                            {loadingBillItems && !billItemsCache[bill.BillId] ? (
                              <div className="py-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                                <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                                <span>Loading item specifications...</span>
                              </div>
                            ) : items.length > 0 ? (
                              <div className={`rounded-xl border overflow-hidden ${
                                darkMode ? 'bg-[#0f1117] border-[#2e3342]' : 'bg-white border-slate-200'
                              }`}>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-left text-xs">
                                    <thead className={darkMode ? 'bg-[#161922] text-slate-400' : 'bg-slate-50 text-slate-500 font-bold'}>
                                      <tr>
                                        <th className="px-3.5 py-2.5 font-bold w-8 text-center">#</th>
                                        <th className="px-4 py-2.5 font-bold">Article &amp; Sub-Category</th>
                                        <th className="px-3.5 py-2.5 font-bold">Barcode / SKU</th>
                                        <th className="px-3 py-2.5 font-bold">Size &amp; Color</th>
                                        <th className="px-3 py-2.5 font-bold">HSN Code</th>
                                        <th className="px-3.5 py-2.5 font-bold text-right">Unit MRP</th>
                                        <th className="px-3.5 py-2.5 font-bold text-center">Discount / Savings</th>
                                        <th className="px-3.5 py-2.5 font-bold text-center">GST Tax</th>
                                        <th className="px-3 py-2.5 font-bold text-center">Qty</th>
                                        <th className="px-4 py-2.5 font-bold text-right">Line Net</th>
                                      </tr>
                                    </thead>
                                    <tbody className={`divide-y ${darkMode ? 'divide-[#1e222e]' : 'divide-slate-100'}`}>
                                      {items.map((item, i) => {
                                        const unitMrp = Number(item.MRP || item.Mrp || item.NetPrice);
                                        const net = Number(item.NetPrice);
                                        const disc = unitMrp > net ? unitMrp - net : Number(item.DiscountAmount || 0);
                                        const discPct = unitMrp > 0 && disc > 0 ? ((disc / unitMrp) * 100).toFixed(1) : 0;
                                        const lineTotal = net * (Number(item.Quantity) || 1);

                                        return (
                                          <tr key={i} className={darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}>
                                            {/* Index */}
                                            <td className="px-3.5 py-3 text-center text-slate-400 font-mono">
                                              {i + 1}
                                            </td>

                                            {/* Article & Sub-Category */}
                                            <td className="px-4 py-3">
                                              <div className="flex flex-col">
                                                <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                  {item.ArticleName}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <span className="text-[11px] text-slate-400 font-mono">
                                                    {item.ArticleNo}
                                                  </span>
                                                  <span className={`px-2 py-0.2 rounded text-[10px] font-semibold border ${
                                                    darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                                                  }`}>
                                                    {item.SubCategory || item.Category || 'Apparel'}
                                                  </span>
                                                </div>
                                              </div>
                                            </td>

                                            {/* Barcode / SKU with 1-Click Copy */}
                                            <td className="px-3.5 py-3 font-mono">
                                              {item.Barcode ? (
                                                <div className="flex items-center gap-1.5">
                                                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                                    darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                                                  }`}>
                                                    {item.Barcode}
                                                  </span>
                                                  <button
                                                    onClick={() => handleCopy(item.Barcode, item.Barcode, 'barcode')}
                                                    className={`p-1 rounded transition cursor-pointer ${
                                                      darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                                                    }`}
                                                    title="Copy barcode"
                                                  >
                                                    {copiedBarcode === item.Barcode ? (
                                                      <Check className="w-3 h-3 text-emerald-400" />
                                                    ) : (
                                                      <Copy className="w-3 h-3" />
                                                    )}
                                                  </button>
                                                </div>
                                              ) : (
                                                <span className="text-slate-500 text-[11px]">-</span>
                                              )}
                                            </td>

                                            {/* Size & Color */}
                                            <td className="px-3 py-3">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                                  darkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                }`}>
                                                  {item.Size || 'Std'}
                                                </span>
                                                {item.Color && item.Color !== 'Standard' && (
                                                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                                    darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                                                  }`}>
                                                    {item.Color}
                                                  </span>
                                                )}
                                              </div>
                                            </td>

                                            {/* HSN Code */}
                                            <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                                              {item.HsnCode || '-'}
                                            </td>

                                            {/* Unit MRP */}
                                            <td className="px-3.5 py-3 text-right font-mono">
                                              {unitMrp > net ? (
                                                <span className="line-through text-slate-400 text-xs">
                                                  {formatCurrency(unitMrp)}
                                                </span>
                                              ) : (
                                                <span className="font-semibold text-slate-300">
                                                  {formatCurrency(unitMrp)}
                                                </span>
                                              )}
                                            </td>

                                            {/* Discount / Savings */}
                                            <td className="px-3.5 py-3 text-center">
                                              {disc > 0 ? (
                                                <div className="flex flex-col items-center">
                                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                                    -{discPct}%
                                                  </span>
                                                  <span className="text-[10px] text-rose-400 font-mono mt-0.5">
                                                    - {formatCurrency(disc)}
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-[10px] text-slate-500 font-medium">Standard</span>
                                              )}
                                            </td>

                                            {/* GST Tax Info */}
                                            <td className="px-3.5 py-3 text-center">
                                              <div className="flex flex-col items-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                  darkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
                                                }`}>
                                                  {item.TaxPercent || 5}% GST
                                                </span>
                                                {item.TotalTaxAmount > 0 && (
                                                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                    ₹{item.TotalTaxAmount}
                                                  </span>
                                                )}
                                              </div>
                                            </td>

                                            {/* Qty */}
                                            <td className="px-3 py-3 text-center font-bold">
                                              <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                                darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'
                                              }`}>
                                                {item.Quantity}
                                              </span>
                                            </td>

                                            {/* Line Net */}
                                            <td className="px-4 py-3 text-right font-black text-emerald-400 font-mono text-sm">
                                              {formatCurrency(lineTotal)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* FINANCIAL RECONCILIATION LEDGER (BOTTOM OF DRAWER) */}
                                <div className={`p-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 text-xs ${
                                  darkMode ? 'bg-[#141720] border-[#2e3342] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}>
                                  
                                  {/* Col 1: Value & Savings */}
                                  <div className="space-y-1.5 p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                      <Tag className="w-3.5 h-3.5 text-rose-400" />
                                      <span>Gross Value &amp; Savings</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Total Gross MRP:</span>
                                      <span className="font-mono font-bold">{formatCurrency(fin.mrp)}</span>
                                    </div>
                                    <div className="flex justify-between text-rose-400 font-bold">
                                      <span>Total Savings:</span>
                                      <span className="font-mono">- {formatCurrency(fin.savings)} ({fin.discPct}% OFF)</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                      <span>Total Quantity:</span>
                                      <span className="font-mono font-bold">{fin.totalQty} Units</span>
                                    </div>
                                  </div>

                                  {/* Col 2: Tax Breakdown */}
                                  <div className="space-y-1.5 p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                      <span>GST Tax Breakdown</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Taxable Value:</span>
                                      <span className="font-mono">{formatCurrency(fin.taxableAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Total GST Collected:</span>
                                      <span className="font-mono font-bold text-amber-400">{formatCurrency(fin.taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                      <span>Round Off:</span>
                                      <span className="font-mono">{formatCurrency(fin.roundOff)}</span>
                                    </div>
                                  </div>

                                  {/* Col 3: Settlement & Payment Reconciliation */}
                                  <div className="space-y-1.5 p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                      <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Payment Reconciliation</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-black">
                                      <span>Net Payable:</span>
                                      <span className="text-emerald-400 font-mono text-base">{formatCurrency(fin.net)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                      <span>Payment Mode:</span>
                                      <span className="font-bold text-slate-200">{resolvePaymentMode(bill)}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-0.5">
                                      {bill.CashAmount > 0 && <span>Cash: {formatCurrency(bill.CashAmount)}</span>}
                                      {bill.UpiAmount > 0 && <span>UPI: {formatCurrency(bill.UpiAmount)}</span>}
                                      {bill.CardAmount > 0 && <span>Card: {formatCurrency(bill.CardAmount)}</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className={`py-6 text-center text-xs italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                No specific article lines returned for this cash memo.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* EMPTY STATE */}
              {filteredBills.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <Receipt className={`w-12 h-12 mb-3 mx-auto ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                    <h3 className={`text-base font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      No Transactions Found
                    </h3>
                    <p className={`text-xs mt-1 max-w-sm mx-auto ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {searchQuery
                        ? `No transactions match your search "${searchQuery}". Try a different invoice number, phone, barcode or staff name.`
                        : `No invoices processed for ${dateFilter === 'today' ? 'today' : dateFilter === 'yesterday' ? 'yesterday' : 'the selected date'}.`}
                    </p>
                    {dateFilter !== 'today' && (
                      <button
                        onClick={() => setDateFilter('today')}
                        className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-sm"
                      >
                        Return to Today's Transactions
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlterationSlipModal 
        isOpen={showAlterationModal}
        onClose={() => setShowAlterationModal(false)}
        initialData={alterationInitialData}
        darkMode={darkMode}
      />
    </div>
  );
};

export default LiveBillsTab;
