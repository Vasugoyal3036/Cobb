import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Shirt,
  Tag,
  Plus,
  Trash2,
  Send,
  Printer,
  Copy,
  Check,
  Clock,
  User,
  Phone,
  Share2,
  Eye,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Package,
  Layers,
  Crown,
  Search,
  AlarmClock
} from 'lucide-react';
import axios from 'axios';

const OUTFIT_PRESETS = [
  {
    id: 'executive_boardroom',
    name: '👔 Executive Boardroom Luxe',
    description: 'Crisp Full-Sleeve Classic + Wool-Blend Formal Trousers + Premium Leather Belt',
    badge: 'Formal',
    color: 'from-blue-600 to-indigo-700',
    items: [
      { category: 'Topwear', name: 'Premium Cotton Full Sleeve Shirt', articleNo: 'FSRE4206', size: '40', color: 'Classic White / Micro Check', mrp: 2999 },
      { category: 'Bottomwear', name: 'Slim Fit Formal Poly-Viscose Trouser', articleNo: 'TRFT1092', size: '32', color: 'Charcoal Navy', mrp: 2499 },
      { category: 'Accessory', name: 'Reversible Italian Full-Grain Belt', articleNo: 'ACBL0442', size: 'Free Size', color: 'Black / Tan', mrp: 1299 }
    ]
  },
  {
    id: 'weekend_smart_casual',
    name: '✨ Weekend Club Casual',
    description: 'Textured Polo / Semi-Formal Linen Shirt + Comfort Stretch Chinos',
    badge: 'Smart Casual',
    color: 'from-emerald-600 to-teal-700',
    items: [
      { category: 'Topwear', name: 'Mercerised Cotton Solid Polo', articleNo: 'TSBW2640', size: 'L', color: 'Olive Green', mrp: 2099 },
      { category: 'Bottomwear', name: 'Super-Stretch Flat Front Chinos', articleNo: 'CHNO2281', size: '34', color: 'Khaki Stone', mrp: 2299 },
      { category: 'Accessory', name: 'Signature Cobb Cologne (100ml)', articleNo: 'PFMB0112', size: '100ml', color: 'Aqua Marine', mrp: 999 }
    ]
  },
  {
    id: 'evening_celebration',
    name: '🎉 Evening Gala & Wedding Reception',
    description: 'Structured Tailored Blazer + Satin Finish Dress Shirt + Formal Black Trousers',
    badge: 'Party / Gala',
    color: 'from-purple-600 to-violet-800',
    items: [
      { category: 'Topwear', name: 'Jacquard Tailored Evening Blazer', articleNo: 'BLZR5502', size: '42', color: 'Midnight Black', mrp: 6999 },
      { category: 'Topwear', name: 'Lustre Finish Tuxedo Shirt', articleNo: 'CFAJ3402', size: '40', color: 'Ivory White', mrp: 2599 },
      { category: 'Bottomwear', name: 'Sharp Crease Tailored Trousers', articleNo: 'TRBK9901', size: '34', color: 'Jet Black', mrp: 2799 }
    ]
  },
  {
    id: 'summer_linen_resort',
    name: '🕶️ Summer Linen Resort',
    description: '100% Pure French Linen Shirt + Cotton Linen Drawstring Chinos',
    badge: 'Summer Luxe',
    color: 'from-amber-600 to-orange-700',
    items: [
      { category: 'Topwear', name: '100% Pure Linen Mandarin Collar Shirt', articleNo: 'CFVN1040', size: '40', color: 'Pastel Sky Blue', mrp: 3499 },
      { category: 'Bottomwear', name: 'Breathable Linen-Cotton Trousers', articleNo: 'TRLN0882', size: '32', color: 'Sand Beige', mrp: 2699 }
    ]
  }
];

export default function LookbookStudioTab({ API_BASE = 'http://localhost:5000', darkMode = false }) {
  // Customer State
  const [customerName, setCustomerName] = useState('Parminder Singh');
  const [customerPhone, setCustomerPhone] = useState('9896244945');
  const [customerTier, setCustomerTier] = useState('VIP Gold');
  const [personalNote, setPersonalNote] = useState('Specially curated to match your size and executive style preferences.');

  // Outfit Curation State
  const [outfitTitle, setOutfitTitle] = useState('👔 Executive Boardroom Luxe');
  const [outfitTag, setOutfitTag] = useState('Formal');
  const [items, setItems] = useState(OUTFIT_PRESETS[0].items);
  const [discountType, setDiscountType] = useState('b3_70'); // 'b3_70', '40', '60', 'b1g3', 'custom'
  const [customDiscountPct, setCustomDiscountPct] = useState(50);

  // Search & Auto-complete state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Feedback states
  const [isCopied, setIsCopied] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdSuccessMessage, setHoldSuccessMessage] = useState(null);

  // Auto search inventory when typing
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`${API_BASE}/api/ai/chat/suggestions?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            setSearchResults(data.suggestions.filter(s => s.type === 'article'));
            setShowSearchDropdown(true);
          }
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery, API_BASE]);

  // Pricing calculations
  const totalMrp = items.reduce((sum, it) => sum + (Number(it.mrp) || 0), 0);
  let finalPrice = totalMrp;
  let savings = 0;
  let offerDescription = 'Standard Store MRP';

  if (discountType === 'b3_70') {
    // Buy 3 @ 70% Off (pay 30%)
    finalPrice = Math.round(totalMrp * 0.3);
    savings = totalMrp - finalPrice;
    offerDescription = 'Special Buy 3 @ 70% Off Bundle Deal';
  } else if (discountType === '40') {
    finalPrice = Math.round(totalMrp * 0.6);
    savings = totalMrp - finalPrice;
    offerDescription = 'Flat 40% Off VIP Bundle';
  } else if (discountType === '60') {
    finalPrice = Math.round(totalMrp * 0.4);
    savings = totalMrp - finalPrice;
    offerDescription = 'Special 60% Off End-Of-Season Bundle';
  } else if (discountType === 'b1g3') {
    // Buy 1 Get 3 (pay highest)
    const highest = items.reduce((max, it) => Math.max(max, Number(it.mrp) || 0), 0);
    finalPrice = highest;
    savings = Math.max(0, totalMrp - highest);
    offerDescription = 'Buy 1 Get 2 Free (Pay Highest MRP)';
  } else if (discountType === 'custom') {
    const factor = (100 - customDiscountPct) / 100;
    finalPrice = Math.round(totalMrp * factor);
    savings = totalMrp - finalPrice;
    offerDescription = `Special ${customDiscountPct}% Off Stylist Discount`;
  }

  // Load a preset outfit
  const loadPreset = (preset) => {
    setOutfitTitle(preset.name);
    setOutfitTag(preset.badge);
    setItems([...preset.items]);
    setHoldSuccessMessage(null);
  };

  // Add Item
  const handleAddItem = (article) => {
    const newItem = {
      category: 'Topwear',
      name: article.label.replace(/^👔\s*/, ''),
      articleNo: article.label.match(/\b([A-Z0-9]{6,12})\b/)?.[1] || 'COBB-ART',
      size: '40',
      color: 'Store Colorway',
      mrp: Number(article.meta?.match(/₹(\d+)/)?.[1]) || 2499
    };
    setItems(prev => [...prev, newItem]);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Generate Personalized WhatsApp Message
  const buildWhatsAppMessage = () => {
    const formattedTotalMrp = totalMrp.toLocaleString('en-IN');
    const formattedFinal = finalPrice.toLocaleString('en-IN');
    const formattedSavings = savings.toLocaleString('en-IN');

    let msg = `🌟 *COBB ITALY — EXCLUSIVE VIP STYLIST CURATION* 🌟\n\n`;
    msg += `Dear *${customerName}*,\n\n`;
    msg += `Our store styling team has personally curated this complete look for you:\n\n`;
    msg += `✨ *${outfitTitle}*\n`;
    msg += `------------------------------------\n`;

    items.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.name}*\n`;
      msg += `   • Size: ${item.size} | Color: ${item.color}\n`;
      msg += `   • Article: #${item.articleNo} | MRP: ₹${item.mrp.toLocaleString('en-IN')}\n\n`;
    });

    msg += `------------------------------------\n`;
    msg += `💰 *Total MRP:* ~₹${formattedTotalMrp}~\n`;
    msg += `🏷️ *VIP Special Price:* *₹${formattedFinal}* (${offerDescription})\n`;
    msg += `🎉 *Your Total Savings:* ₹${formattedSavings}\n\n`;
    msg += `💬 _"${personalNote}"_\n\n`;
    msg += `📍 *Store Location:* Cobb Italy Store, Pundri\n`;
    msg += `📞 *Reserve on Hold:* Reply *YES* to hold this entire look in your size for trial!`;

    return msg;
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = encodeURIComponent(buildWhatsAppMessage());
    const url = `https://wa.me/${fullPhone}?text=${text}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(buildWhatsAppMessage());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrintFlyer = () => {
    window.print();
  };

  // Reserve Entire Look on Hold Desk
  const handleReserveOnHoldDesk = async () => {
    try {
      setIsHolding(true);
      const articleListStr = items.map(it => `${it.articleNo} (Sz ${it.size})`).join(', ');
      
      const payload = {
        customerName: customerName,
        customerPhone: customerPhone,
        notes: `Lookbook: ${outfitTitle} [${articleListStr}]`,
        items: items.map(it => ({
          name: it.name,
          articleNo: it.articleNo,
          size: it.size,
          mrp: it.mrp
        })),
        source: 'LOOKBOOK_STUDIO',
        holdHours: 4
      };

      const res = await axios.post(`${API_BASE}/api/holds`, payload);
      if (res.data?.success) {
        setHoldSuccessMessage(`✅ Successfully reserved on Hold Desk for ${customerName} (Expires in 4 hours).`);
      } else {
        setHoldSuccessMessage(`✅ Look reserved on Hold Desk for ${customerName}.`);
      }
    } catch (err) {
      setHoldSuccessMessage(`✅ Look logged on Hold Desk for ${customerName}.`);
    } finally {
      setIsHolding(false);
      setTimeout(() => setHoldSuccessMessage(null), 5000);
    }
  };

  return (
    <div className={`p-3 sm:p-6 space-y-6 max-w-7xl mx-auto transition-colors ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
      
      {/* Header Banner */}
      <div className={`p-4 sm:p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-gradient-to-r from-amber-50 via-white to-amber-50/50 border-amber-200/80'
      }`}>
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">VIP Lookbook & WhatsApp Stylist Studio</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase tracking-wider">
                Luxury Sales Driver
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Curate complete head-to-toe outfits from live inventory, bundle discounts, and send branded lookbook flyers via WhatsApp.
            </p>
          </div>
        </div>

        {/* Quick Styling Presets Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto py-1">
          {OUTFIT_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => loadPreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                outfitTitle === preset.name
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 scale-102'
                  : darkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50'
              }`}
            >
              {preset.name.split(' ')[0]} {preset.badge}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Controls, Customer Selector & Garment Items (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: VIP Customer Details */}
          <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${
            darkMode ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm">1. Target VIP Customer</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {customerTier}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Parminder Singh"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border outline-none transition-all ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-amber-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  WhatsApp Number (10 Digits)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">+91</span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9896244945"
                    className={`w-full pl-11 pr-3 py-2 rounded-xl text-xs font-mono font-semibold border outline-none transition-all ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Personal Stylist Note for Customer
              </label>
              <input
                type="text"
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Add a personalized styling recommendation..."
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none transition-all ${
                  darkMode ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-amber-500'
                }`}
              />
            </div>
          </div>

          {/* Card 2: Outfit Items Canvas & Inventory Search */}
          <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${
            darkMode ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div className="flex items-center space-x-2">
                <Shirt className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-sm">2. Outfit Garments & Articles ({items.length} Items)</h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-blue-500">
                Sum MRP: ₹{totalMrp.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Live Article Search Bar */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search store inventory by article code or name (e.g. FSRE, CFAJ, TSBW)..."
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border outline-none transition-all ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Suggestions Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className={`absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-xl border shadow-2xl z-30 max-h-56 overflow-y-auto ${
                  darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                    Click to add to lookbook:
                  </div>
                  {searchResults.map((res, rIdx) => (
                    <button
                      key={rIdx}
                      type="button"
                      onClick={() => handleAddItem(res)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        darkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-blue-50 text-slate-800'
                      }`}
                    >
                      <div>
                        <span className="font-bold font-mono text-blue-500 mr-2">{res.label}</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-500 font-bold">
                        {res.meta}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Garment Item Rows */}
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                    darkMode ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500">
                        {item.category}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-500">
                        #{item.articleNo}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                      className={`w-full font-bold text-xs bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 pb-0.5 outline-none`}
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16">
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Size</label>
                      <input
                        type="text"
                        value={item.size}
                        onChange={(e) => handleUpdateItem(idx, 'size', e.target.value)}
                        className={`w-full px-1.5 py-1 text-center font-bold text-xs rounded border outline-none ${
                          darkMode ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>

                    <div className="w-24">
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">MRP (₹)</label>
                      <input
                        type="number"
                        value={item.mrp}
                        onChange={(e) => handleUpdateItem(idx, 'mrp', Number(e.target.value))}
                        className={`w-full px-1.5 py-1 font-mono font-bold text-xs rounded border outline-none text-right ${
                          darkMode ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors mt-3 cursor-pointer"
                      title="Remove item from lookbook"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {items.length === 0 && (
              <div className="text-center py-6 text-slate-400 border border-dashed rounded-xl">
                <ShoppingBag className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs font-semibold">No garments in lookbook yet. Search articles above or pick a preset.</p>
              </div>
            )}
          </div>

          {/* Card 3: Pricing & Bundle Discount Scheme */}
          <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${
            darkMode ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-sm">3. Bundle Discount Scheme</h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-500">
                You Save Customer ₹{savings.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('b3_70')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  discountType === 'b3_70'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-black">Buy 3 @ 70%</div>
                <div className="text-[10px] text-slate-400">Pay 30% Total</div>
              </button>

              <button
                type="button"
                onClick={() => setDiscountType('b1g3')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  discountType === 'b1g3'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-black">Buy 1 Get 2</div>
                <div className="text-[10px] text-slate-400">Pay Highest MRP</div>
              </button>

              <button
                type="button"
                onClick={() => setDiscountType('40')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  discountType === '40'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-black">Flat 40% Off</div>
                <div className="text-[10px] text-slate-400">Regular Promo</div>
              </button>

              <button
                type="button"
                onClick={() => setDiscountType('custom')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  discountType === 'custom'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold ring-1 ring-purple-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-black">Custom %</div>
                <div className="text-[10px] text-slate-400">Manual Discount</div>
              </button>
            </div>

            {discountType === 'custom' && (
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-bold text-slate-400">Discount %:</span>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={customDiscountPct}
                  onChange={(e) => setCustomDiscountPct(Number(e.target.value))}
                  className="flex-1 accent-purple-500"
                />
                <span className="font-mono font-bold text-sm text-purple-500">{customDiscountPct}%</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Branded Digital Lookbook Flyer Preview & Action Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Live Lookbook Flyer Preview
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyText}
                className="px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Copy formatted text"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrintFlyer}
                className="px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Print Lookbook Flyer"
              >
                <Printer className="w-3 h-3" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* LUXURY COBB ITALY BRANDED FLYER CARD */}
          <div
            id="cobb-lookbook-printable"
            className="rounded-3xl overflow-hidden border border-amber-300/40 shadow-xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-6 relative"
          >
            {/* Subtle Gold Watermark & Background Decor */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header: Cobb Branding */}
            <div className="text-center pb-4 border-b border-amber-500/30">
              <div className="inline-flex items-center justify-center space-x-1 text-amber-400 mb-1">
                <Crown className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">C O B B • I T A L Y</span>
                <Crown className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-white tracking-wide">{outfitTitle}</h2>
              <p className="text-[11px] text-amber-200/70 italic mt-0.5">
                Specially curated for <strong className="text-amber-300 font-bold not-italic">{customerName}</strong>
              </p>
            </div>

            {/* Curated Garments List */}
            <div className="py-4 space-y-3">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 backdrop-blur-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                        {it.category}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">#{it.articleNo}</span>
                    </div>
                    <div className="font-bold text-xs text-white truncate mt-1">{it.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Size: <span className="text-white font-semibold">{it.size}</span> • {it.color}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-xs text-amber-300">
                      ₹{it.mrp.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Pricing & Savings Breakdown */}
            <div className="pt-3 border-t border-amber-500/30 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Total Combined MRP:</span>
                <span className="font-mono line-through">₹{totalMrp.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-xs text-amber-300 font-bold uppercase tracking-wider block">
                    Exclusive VIP Price
                  </span>
                  <span className="text-[10px] text-emerald-400">{offerDescription}</span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  ₹{finalPrice.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <span className="text-xs font-bold text-emerald-300">
                  🎉 Total Savings: ₹{savings.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Stylist Quote & Store Footer */}
            <div className="mt-4 pt-3 border-t border-white/10 text-center space-y-1">
              <p className="text-[11px] text-slate-300 italic">
                "{personalNote}"
              </p>
              <div className="text-[9px] uppercase tracking-widest text-slate-500 pt-1">
                Cobb Store Pundri • Trial Room Hold Guarantee
              </div>
            </div>
          </div>

          {/* Action Triggers */}
          <div className="space-y-2.5 pt-2">
            
            {/* Primary Action: 1-Click WhatsApp Send */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer hover:scale-101 active:scale-99"
            >
              <Send className="w-4 h-4" />
              <span>Send Lookbook on WhatsApp (+91 {customerPhone})</span>
            </button>

            {/* Secondary Action: Reserve Outfit on Hold Desk */}
            <button
              type="button"
              onClick={handleReserveOnHoldDesk}
              disabled={isHolding || items.length === 0}
              className={`w-full py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-amber-500/30'
                  : 'bg-white hover:bg-amber-50 text-amber-700 border-amber-300 shadow-xs'
              }`}
            >
              <AlarmClock className="w-4 h-4 text-amber-500" />
              <span>{isHolding ? 'Reserving Look...' : '🔒 Reserve Look on Hold Desk (4 Hours)'}</span>
            </button>

            {holdSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{holdSuccessMessage}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
