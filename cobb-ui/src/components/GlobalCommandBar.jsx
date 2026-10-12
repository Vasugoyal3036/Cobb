import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  Search,
  Package,
  Users,
  Receipt,
  ArrowRight,
  X,
  Sparkles,
  Zap,
  DollarSign,
  Trophy,
  Scissors,
  Wallet,
  Clock,
  Star,
  Loader2,
  Calendar,
  CheckCircle2,
  Tag
} from 'lucide-react';

export default function GlobalCommandBar({
  isOpen,
  onClose,
  darkMode = false,
  globalCustomers = [],
  liveBills = [],
  inventory = [],
  vips = [],
  dormant = [],
  setActiveTab,
  openCustomerCard,
  toggleBillExpansion,
  API_BASE = 'http://localhost:5000',
  initialQuery = '',
  setSearchQuery
}) {
  const [query, setQuery] = useState(initialQuery || '');
  const [activeCategory, setActiveCategory] = useState('ALL'); // 'ALL' | 'CUSTOMERS' | 'BILLS' | 'ITEMS' | 'ACTIONS'
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [remoteCustomers, setRemoteCustomers] = useState([]);
  const [remoteBills, setRemoteBills] = useState([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Sync with initialQuery when opened
  useEffect(() => {
    if (isOpen) {
      if (initialQuery) setQuery(initialQuery);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setRemoteCustomers([]);
      setRemoteBills([]);
    }
  }, [isOpen, initialQuery]);

  // Handle ESC and Arrow Keys
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced Remote Search for Customers & Bills (SQL database lookup)
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setRemoteCustomers([]);
      setRemoteBills([]);
      setIsLoadingRemote(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingRemote(true);

    const timer = setTimeout(async () => {
      try {
        const promises = [];

        // 1. Customer search
        promises.push(
          axios.get(`${API_BASE}/api/customers/search?q=${encodeURIComponent(trimmed)}`, { timeout: 4000 })
            .then(res => res.data || [])
            .catch(() => [])
        );

        // 2. Bill search (only if 3+ chars as required by bill lookup endpoint)
        if (trimmed.length >= 3) {
          promises.push(
            axios.get(`${API_BASE}/api/sales/bill-lookup/${encodeURIComponent(trimmed)}`, { timeout: 4000 })
              .then(res => (res.data?.bills || []))
              .catch(() => [])
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        const [custs, bills] = await Promise.all(promises);
        if (!isCancelled) {
          setRemoteCustomers(Array.isArray(custs) ? custs : []);
          setRemoteBills(Array.isArray(bills) ? bills : []);
        }
      } catch (err) {
        console.warn('Remote search error:', err);
      } finally {
        if (!isCancelled) setIsLoadingRemote(false);
      }
    }, 240);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen, API_BASE]);

  // Combined Results Engine
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = [];

    // System Navigation Shortcuts
    const appActions = [
      { id: 'speed_billing', title: '⚡ Speed Billing (F1-POS)', sub: 'Rapid barcode scan & thermal checkout', icon: Zap, tab: 'speed_billing', keywords: ['pos', 'bill', 'counter', 'checkout', 'sale', 'fast'] },
      { id: 'dashboard', title: '📊 Executive Command Center', sub: 'Floor race, sales pulse & operating KPIs', icon: Sparkles, tab: 'dashboard', keywords: ['home', 'race', 'heatmap', 'radar', 'overview'] },
      { id: 'live', title: '🧾 Live Transactions & Invoices', sub: 'Search bills, reprints & payment modes', icon: Receipt, tab: 'live', keywords: ['bills', 'receipt', 'invoice', 'payment', 'cash', 'upi'] },
      { id: 'staff_leaderboard', title: '🏆 Staff Floor Race & Incentives', sub: 'Sales commission ladder & leaderboards', icon: Trophy, tab: 'staff_leaderboard', keywords: ['staff', 'salesman', 'commission', 'target', 'incentive'] },
      { id: 'pnl', title: '💰 Store Sales & P&L Statement', sub: 'Revenue, OpEx, Gross Margin & EBITDA', icon: DollarSign, tab: 'pnl', keywords: ['profit', 'loss', 'expenses', 'margin', 'bep'] },
      { id: 'pocket_khata', title: '👛 Pocket Khata (Store Expenses)', sub: 'Daily tea, alterations, petty cash logs', icon: Wallet, tab: 'pocket_khata', keywords: ['expense', 'khata', 'cash', 'petty', 'spend'] },
      { id: 'alterations', title: '✂️ Alteration Desk', sub: 'Customer fit logs, tailor receipts & delivery', icon: Scissors, tab: 'alterations', keywords: ['alter', 'tailor', 'length', 'fitting', 'trouser'] },
      { id: 'depreciation_clock', title: '⏳ Dead Stock & Depreciation Clock', sub: 'Slow-moving inventory & markdown alerts', icon: Clock, tab: 'depreciation_clock', keywords: ['deadstock', 'ageing', 'discount', 'clearance'] },
      { id: 'ratings', title: '⭐ Customer Ratings & NPS Queue', sub: 'Feedback sentiment, reviews & CSAT', icon: Star, tab: 'ratings', keywords: ['nps', 'review', 'feedback', 'stars', 'satisfaction'] },
    ];

    if (!q) {
      // Empty query: Show recommended quick actions
      appActions.slice(0, 5).forEach(act => {
        matches.push({
          type: 'action',
          category: 'ACTIONS',
          title: act.title,
          sub: act.sub,
          icon: act.icon,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          action: () => {
            if (setActiveTab) setActiveTab(act.tab);
            onClose();
          }
        });
      });
      return matches;
    }

    // 1. Search Customers (Local VIPs + Dormant + Global + Remote)
    const allCustomers = [
      ...vips,
      ...dormant,
      ...globalCustomers,
      ...remoteCustomers
    ];
    const seenCustPhones = new Set();
    const matchedCusts = [];

    for (const c of allCustomers) {
      const phone = String(c.Phone || c.phone || c.CUSTOMER_CODE || c.CustomerCode || '').trim();
      if (!phone || seenCustPhones.has(phone)) continue;

      const fName = c.FirstName || c.customerName || c.CustomerName || c.Name || '';
      const lName = c.LastName || '';
      const fullName = `${fName} ${lName}`.trim() || 'Valued Customer';
      const spend = Number(c.LifetimeSpend || c.TotalSpend || 0);

      const isMatch =
        fullName.toLowerCase().includes(q) ||
        phone.includes(q) ||
        (c.Tier && String(c.Tier).toLowerCase().includes(q));

      if (isMatch) {
        seenCustPhones.add(phone);
        matchedCusts.push({
          type: 'customer',
          category: 'CUSTOMERS',
          title: fullName,
          sub: `📞 +91 ${phone} • ${c.TierLabel || c.Tier || 'VIP'} • Spend: ₹${spend.toLocaleString('en-IN')}`,
          icon: Users,
          color: 'text-purple-500',
          bg: 'bg-purple-500/10',
          badge: c.TierLabel || (spend > 25000 ? '👑 Elite VIP' : 'Customer'),
          action: () => {
            if (typeof openCustomerCard === 'function') {
              openCustomerCard(c);
            } else if (setActiveTab) {
              setActiveTab('vip');
            }
            if (setSearchQuery) setSearchQuery(phone);
            onClose();
          }
        });
        if (matchedCusts.length >= 6) break;
      }
    }
    matches.push(...matchedCusts);

    // 2. Search Bills / Invoices (Local Live Bills + Remote Bill Lookup)
    const allBills = [...liveBills, ...remoteBills];
    const seenBills = new Set();
    const matchedBills = [];

    for (const b of allBills) {
      const billNo = String(b.BillNo || b.BillNumber || b.CM_NO || b.id || b.billNo || '').trim();
      if (!billNo || seenBills.has(billNo)) continue;

      const custName = b.CustomerName || b.customerName || b.CUSTOMER_NAME || 'Walk-in Customer';
      const phone = String(b.Phone || b.phone || b.CUSTOMER_CODE || '');
      const amount = Number(b.NetPayable || b.NetAmount || b.totalAmount || b.NET_AMOUNT || 0);
      const date = b.BillDate || b.BillTime || 'Recent';

      const isMatch =
        billNo.toLowerCase().includes(q) ||
        custName.toLowerCase().includes(q) ||
        phone.includes(q) ||
        (q.startsWith('₹') && String(amount).includes(q.replace('₹', '')));

      if (isMatch) {
        seenBills.add(billNo);
        matchedBills.push({
          type: 'bill',
          category: 'BILLS',
          title: `Invoice #${billNo}`,
          sub: `₹${amount.toLocaleString('en-IN')} • ${custName} ${phone ? `(${phone})` : ''} • ${date.slice(0, 10)}`,
          icon: Receipt,
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
          badge: `₹${amount.toLocaleString('en-IN')}`,
          action: () => {
            if (setActiveTab) setActiveTab('live');
            if (typeof toggleBillExpansion === 'function') {
              toggleBillExpansion(b.BillId || b.id || billNo);
            }
            if (setSearchQuery) setSearchQuery(billNo);
            onClose();
          }
        });
        if (matchedBills.length >= 6) break;
      }
    }
    matches.push(...matchedBills);

    // 3. Search Inventory / Articles
    if (Array.isArray(inventory)) {
      const seenItems = new Set();
      const matchedItems = [];

      for (const i of inventory) {
        const artNo = String(i.ArticleNo || i.ItemCode || '').trim();
        const barcode = String(i.Barcode || '').trim();
        const key = artNo || barcode;
        if (!key || seenItems.has(key)) continue;

        const name = i.ArticleName || i.ItemName || i.ItemDesc || i.SubCategory || i.Category || artNo || 'Stock Item';
        const mrp = Number(i.MRP || i.mrp || 0);
        const qty = Number(i.CurrentStock || i.Quantity || i.Qty || 0);

        const isMatch =
          artNo.toLowerCase().includes(q) ||
          barcode.toLowerCase().includes(q) ||
          name.toLowerCase().includes(q) ||
          (i.Category && String(i.Category).toLowerCase().includes(q)) ||
          (i.SubCategory && String(i.SubCategory).toLowerCase().includes(q));

        if (isMatch) {
          seenItems.add(key);
          matchedItems.push({
            type: 'product',
            category: 'ITEMS',
            title: name,
            sub: `Art: ${artNo || 'N/A'} • Barcode: ${barcode || 'N/A'} • MRP: ₹${mrp} • Stock: ${qty} pcs`,
            icon: Package,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            badge: qty > 0 ? `${qty} in stock` : 'Out of stock',
            action: () => {
              if (setSearchQuery) setSearchQuery(artNo || barcode);
              if (setActiveTab) setActiveTab('inventory');
              onClose();
            }
          });
          if (matchedItems.length >= 6) break;
        }
      }
      matches.push(...matchedItems);
    }

    // 4. Match App Action Keywords
    appActions.forEach(act => {
      const matchAction =
        act.title.toLowerCase().includes(q) ||
        act.sub.toLowerCase().includes(q) ||
        act.keywords.some(k => k.includes(q) || q.includes(k));

      if (matchAction) {
        matches.push({
          type: 'action',
          category: 'ACTIONS',
          title: act.title,
          sub: act.sub,
          icon: act.icon,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          badge: 'Jump To Tab',
          action: () => {
            if (setActiveTab) setActiveTab(act.tab);
            onClose();
          }
        });
      }
    });

    return matches;
  }, [
    query,
    globalCustomers,
    remoteCustomers,
    liveBills,
    remoteBills,
    inventory,
    vips,
    dormant,
    setActiveTab,
    openCustomerCard,
    toggleBillExpansion,
    setSearchQuery,
    onClose
  ]);

  // Filtered by selected category pill
  const filteredResults = useMemo(() => {
    if (activeCategory === 'ALL') return results;
    return results.filter(r => r.category === activeCategory);
  }, [results, activeCategory]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length, activeCategory]);

  // Handle Keyboard Arrows & Enter
  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]?.action) {
        filteredResults[selectedIndex].action();
      } else if (query.trim()) {
        // Fallback: route query to inventory search
        if (setSearchQuery) setSearchQuery(query.trim());
        if (setActiveTab) setActiveTab('inventory');
        onClose();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Counts for pills
  const counts = useMemo(() => {
    const c = { CUSTOMERS: 0, BILLS: 0, ITEMS: 0, ACTIONS: 0 };
    results.forEach(r => {
      if (c[r.category] !== undefined) c[r.category]++;
    });
    return c;
  }, [results]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center pt-8 sm:pt-[10vh] px-3 sm:px-4 animate-fade-in pb-safe"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

      {/* Main Command Bar Modal */}
      <div
        className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border transition-all duration-200 animate-in zoom-in-95 flex flex-col max-h-[85vh] ${
          darkMode ? 'bg-[#0e1320] border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Search Input Row */}
        <div className={`flex items-center px-4 sm:px-5 py-3.5 sm:py-4 border-b gap-3 shrink-0 ${
          darkMode ? 'border-white/10 bg-[#121828]' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
            {isLoadingRemote ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Universal Search: Customer phone, Invoice #, Article, or Barcode..."
            className={`w-full bg-transparent border-none outline-none text-sm sm:text-base placeholder-slate-400 font-medium ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0`}
              title="Clear Search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            ESC
          </button>
        </div>

        {/* Category Filter Pills (When search active) */}
        {query.trim().length > 0 && (
          <div className={`flex items-center gap-1.5 px-4 py-2 border-b overflow-x-auto no-scrollbar shrink-0 text-xs font-bold ${
            darkMode ? 'bg-[#0a0d16] border-white/5' : 'bg-slate-100/60 border-slate-100'
          }`}>
            {[
              { id: 'ALL', label: `All (${results.length})` },
              { id: 'CUSTOMERS', label: `👥 Customers (${counts.CUSTOMERS})`, disabled: counts.CUSTOMERS === 0 },
              { id: 'BILLS', label: `🧾 Invoices (${counts.BILLS})`, disabled: counts.BILLS === 0 },
              { id: 'ITEMS', label: `📦 Products (${counts.ITEMS})`, disabled: counts.ITEMS === 0 },
              { id: 'ACTIONS', label: `⚡ Shortcuts (${counts.ACTIONS})`, disabled: counts.ACTIONS === 0 }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                disabled={tab.disabled}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${
                  activeCategory === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : darkMode
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Results List */}
        <div ref={listRef} className={`overflow-y-auto flex-1 p-2 sm:p-3 space-y-1.5 ${darkMode ? 'bg-[#0a0d17]' : 'bg-slate-50/50'}`}>
          {filteredResults.length > 0 ? (
            filteredResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === idx;

              return (
                <button
                  key={idx}
                  data-index={idx}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all text-left group cursor-pointer border ${
                    isSelected
                      ? darkMode
                        ? 'bg-blue-600/20 border-blue-500/50 shadow-md shadow-blue-950/40 text-white ring-1 ring-blue-500/40'
                        : 'bg-blue-50 border-blue-300 shadow-xs text-slate-950 ring-1 ring-blue-400'
                      : darkMode
                        ? 'bg-[#121828]/60 border-slate-800/80 hover:bg-[#161f33] hover:border-slate-700'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                  onClick={() => item.action && item.action()}
                >
                  {/* Category Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>

                  {/* Title & Sub details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-bold truncate ${
                        isSelected
                          ? darkMode ? 'text-white' : 'text-blue-950 font-black'
                          : darkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-800'
                      }`}>
                        {item.title}
                      </p>
                      {item.badge && (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                          darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${
                      isSelected
                        ? darkMode ? 'text-blue-200' : 'text-blue-700'
                        : 'text-slate-400'
                    }`}>
                      {item.sub}
                    </p>
                  </div>

                  {/* Right Action Hint */}
                  <div className="shrink-0 flex items-center gap-1 text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                      {item.type}
                    </span>
                    <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-1 text-blue-500' : 'opacity-40 group-hover:opacity-100'}`} />
                  </div>
                </button>
              );
            })
          ) : query.trim().length > 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 ${darkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                <Search className="w-6 h-6" />
              </div>
              <p className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                No matches found for "{query}"
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Press Enter to filter full inventory for this keyword, or check your spelling for invoice numbers or phone digits.
              </p>
            </div>
          ) : (
            <div className="px-4 py-8 text-center flex flex-col items-center justify-center">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${darkMode ? 'bg-white/5 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <Sparkles className="w-6 h-6" />
              </div>
              <p className={`text-sm font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Universal Retail Intelligence Search
              </p>
              <p className={`text-xs mt-1 max-w-md mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Type any customer phone number, past bill invoice, garment barcode, or article name to search across the entire store database live.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className={`px-4 py-3 border-t text-xs flex justify-between items-center shrink-0 ${
          darkMode ? 'border-white/10 bg-[#121828] text-slate-400' : 'border-slate-100 bg-white text-slate-500'
        }`}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono">
              <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${darkMode ? 'bg-white/10' : 'bg-slate-100 border'}`}>↑</kbd>
              <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${darkMode ? 'bg-white/10' : 'bg-slate-100 border'}`}>↓</kbd>
              <span className="text-[11px] ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1 font-mono">
              <kbd className={`px-1.5 py-0.5 rounded text-[10px] ${darkMode ? 'bg-white/10' : 'bg-slate-100 border'}`}>↵</kbd>
              <span className="text-[11px] ml-1">Open</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLoadingRemote && (
              <span className="text-[11px] text-blue-400 animate-pulse flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Checking Database...</span>
              </span>
            )}
            <span className="text-[11px] opacity-70">
              Cobb Retail Engine
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
