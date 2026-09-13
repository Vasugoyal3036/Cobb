import React, { useState } from 'react';
import {
  Tag,
  Printer,
  Sparkles,
  Search,
  CheckCircle2,
  QrCode,
  Layers,
  ShoppingBag,
  Sliders,
  Palette,
  Maximize2,
  Shirt,
  RotateCcw,
  Percent,
  Flame,
  Award
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function ShelfTalkerStudioTab(props) {
  const {
    inventory = [],
    darkMode,
    formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`,
  } = props;

  const { showToast } = useToast?.() || { showToast: (msg) => alert(msg) };

  // Designer State
  const [theme, setTheme] = useState('noir_gold'); // 'noir_gold' | 'savile_navy' | 'flash_deal' | 'linen_cotton'
  const [format, setFormat] = useState('tent_4x6'); // 'tent_4x6' | 'shelf_strip' | 'pedestal_a5'

  const [articleName, setArticleName] = useState('Italian Structured Oxford Shirt');
  const [articleCode, setArticleCode] = useState('ART #CB-9942');
  const [category, setCategory] = useState('Luxury Cotton Line');
  const [mrp, setMrp] = useState(2999);
  const [offerPrice, setOfferPrice] = useState(1799);
  const [badgeText, setBadgeText] = useState('BUY 2 GET 1 FREE');
  const [feature1, setFeature1] = useState('100% Giza Long-Staple Cotton');
  const [feature2, setFeature2] = useState('Wrinkle-Resistant Silk Touch Finish');
  const [qrCallToAction, setQrCallToAction] = useState('Scan for Complete Lookbook & Styling');
  const [qrUrl, setQrUrl] = useState('https://cobbitaly.com/collection/menswear');

  const ALL_SIZES = ['38 (S)', '39 (M)', '40 (M)', '42 (L)', '44 (XL)', '46 (XXL)'];
  const [selectedSizes, setSelectedSizes] = useState(['38 (S)', '40 (M)', '42 (L)', '44 (XL)']);

  const [searchFilter, setSearchFilter] = useState('');

  // Quick Promo Badges
  const PROMO_PRESETS = [
    'BUY 2 GET 1 FREE',
    'FLAT 40% OFF',
    'SPECIAL COUNTER OFFER',
    'NEW ARRIVAL - 2026',
    'PRESTIGE COLLECTION',
    'BUY 1 GET 50% OFF SECOND',
    'LIMITED EDITION DROP'
  ];

  // Pick from store inventory
  const handleSelectInventoryItem = (item) => {
    setArticleName(item.ItemName || item.ArticleName || 'Premium Cobb Apparel');
    setArticleCode(item.SKU || item.ArticleNo ? `ART #${item.SKU || item.ArticleNo}` : 'COBB EXCLUSIVE');
    setCategory(item.Category || item.SubCategory || 'Gentlemen Apparel');
    if (item.MRP) setMrp(item.MRP);
    if (item.SalePrice || item.NetPrice) {
      setOfferPrice(item.SalePrice || item.NetPrice);
    } else if (item.MRP) {
      setOfferPrice(Math.round(item.MRP * 0.6)); // 40% off default
    }
    showToast?.(`Loaded ${item.ItemName || item.ArticleName}`, 'info');
  };

  const toggleSize = (size) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter(s => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // QR Code URL helper
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&color=${
    theme === 'noir_gold' ? 'd4af37' : theme === 'savile_navy' ? '0ea5e9' : theme === 'flash_deal' ? 'dc2626' : '1e293b'
  }&bgcolor=${theme === 'linen_cotton' ? 'f8f7f4' : '0f172a'}`;

  // Theme Styles
  const THEME_STYLES = {
    noir_gold: {
      id: 'noir_gold',
      name: 'Noir & Gold (Luxury Flagship)',
      cardBg: 'bg-[#0a0a0f]',
      cardBorder: 'border-[#c5a059]/60',
      innerBorder: 'border-[#c5a059]/30',
      brandText: 'text-[#d4af37]',
      accentBg: 'bg-gradient-to-r from-[#c5a059] to-[#dfba73]',
      accentText: 'text-[#0a0a0f]',
      headerFont: 'font-serif',
      titleText: 'text-amber-100',
      subText: 'text-slate-400',
      badgeBg: 'bg-[#c5a059]/20 text-[#e9c783] border-[#c5a059]/50',
      sizeActive: 'bg-[#c5a059] text-slate-950 font-black',
      sizeInactive: 'border-slate-800 text-slate-600',
      mrpText: 'text-slate-500 line-through',
      offerPriceText: 'text-[#e9c783]',
      qrBg: 'bg-[#050508] border-[#c5a059]/40'
    },
    savile_navy: {
      id: 'savile_navy',
      name: 'Savile Row Navy & Ice Silver',
      cardBg: 'bg-[#071328]',
      cardBorder: 'border-sky-500/50',
      innerBorder: 'border-sky-500/20',
      brandText: 'text-sky-400',
      accentBg: 'bg-gradient-to-r from-sky-500 to-blue-600',
      accentText: 'text-white',
      headerFont: 'font-sans',
      titleText: 'text-slate-100',
      subText: 'text-sky-200/70',
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      sizeActive: 'bg-sky-400 text-slate-950 font-black',
      sizeInactive: 'border-slate-800 text-slate-600',
      mrpText: 'text-slate-400 line-through',
      offerPriceText: 'text-white',
      qrBg: 'bg-[#040b17] border-sky-500/30'
    },
    flash_deal: {
      id: 'flash_deal',
      name: 'Crimson Promo / Clearance Drop',
      cardBg: 'bg-[#180404]',
      cardBorder: 'border-rose-600/60',
      innerBorder: 'border-rose-600/30',
      brandText: 'text-rose-400',
      accentBg: 'bg-gradient-to-r from-rose-600 to-amber-500',
      accentText: 'text-white',
      headerFont: 'font-sans',
      titleText: 'text-white',
      subText: 'text-rose-200/70',
      badgeBg: 'bg-rose-600 text-white border-rose-500',
      sizeActive: 'bg-rose-500 text-white font-black',
      sizeInactive: 'border-slate-800 text-slate-600',
      mrpText: 'text-slate-400 line-through',
      offerPriceText: 'text-amber-300',
      qrBg: 'bg-[#0f0202] border-rose-600/40'
    },
    linen_cotton: {
      id: 'linen_cotton',
      name: 'Boutique Minimalist Linen',
      cardBg: 'bg-[#faf8f5]',
      cardBorder: 'border-[#d4cebe]',
      innerBorder: 'border-[#e4dfd3]',
      brandText: 'text-slate-800',
      accentBg: 'bg-slate-900',
      accentText: 'text-white',
      headerFont: 'font-serif',
      titleText: 'text-slate-900',
      subText: 'text-slate-600',
      badgeBg: 'bg-slate-900 text-amber-300 border-slate-900',
      sizeActive: 'bg-slate-900 text-white font-black',
      sizeInactive: 'border-slate-300 text-slate-400',
      mrpText: 'text-slate-400 line-through',
      offerPriceText: 'text-slate-950',
      qrBg: 'bg-white border-slate-200'
    }
  };

  const currentTheme = THEME_STYLES[theme] || THEME_STYLES.noir_gold;

  const filteredInventory = inventory.filter(item => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      (item.ItemName && item.ItemName.toLowerCase().includes(q)) ||
      (item.ArticleNo && item.ArticleNo.toLowerCase().includes(q)) ||
      (item.Category && item.Category.toLowerCase().includes(q))
    );
  }).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Print Stylesheet injected into DOM */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #shelf-talker-print-area, #shelf-talker-print-area * {
            visibility: visible;
          }
          #shelf-talker-print-area {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-width: 1px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Shelf Talker Studio
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-black rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Retail Signage & Acrylic Stand Designer
            </span>
          </div>
          <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Generate luxury acrylic table tent cards, shelf talker strips, and promotional rack signage ready for immediate counter printing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Shelf Card</span>
          </button>
        </div>
      </div>

      {/* Workspace: Left Controls (5 cols), Right Live Canvas (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Customization Controls */}
        <div className={`lg:col-span-6 p-6 rounded-2xl border shadow-sm space-y-5 no-print ${
          darkMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>

          {/* Theme & Format Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              1. Visual Aesthetic Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(THEME_STYLES).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    theme === t.id
                      ? 'border-purple-500 bg-purple-500/10 text-purple-300 font-bold shadow-sm'
                      : darkMode
                        ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Inventory Article Search */}
          {inventory?.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Pick Live From Store Stock</span>
                <span className="text-[10px] text-purple-400 font-normal">Auto-fills price & title</span>
              </label>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search shirt, blazer, SKU..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {searchFilter && (
                <div className="space-y-1">
                  {filteredInventory.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectInventoryItem(item)}
                      className="p-2 rounded-lg bg-slate-900/80 hover:bg-purple-950/40 border border-slate-800 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-200">{item.ItemName || item.ArticleName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.SKU || item.ArticleNo} • {item.Category}</p>
                      </div>
                      <span className="font-bold text-amber-400">{formatCurrency(item.MRP || item.SalePrice)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Typography & Pricing Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Product Title / Fabric Line
              </label>
              <input
                type="text"
                value={articleName}
                onChange={e => setArticleName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Article Code
                </label>
                <input
                  type="text"
                  value={articleCode}
                  onChange={e => setArticleCode(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Category Tag
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Original MRP (₹)
                </label>
                <input
                  type="number"
                  value={mrp}
                  onChange={e => setMrp(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl text-sm font-black border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-1">
                  Special Offer Price (₹)
                </label>
                <input
                  type="number"
                  value={offerPrice}
                  onChange={e => setOfferPrice(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl text-sm font-black border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-600'
                  }`}
                />
              </div>
            </div>

            {/* Promo Badges */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Promotional Badge
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PROMO_PRESETS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setBadgeText(p)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                      badgeText === p
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={badgeText}
                onChange={e => setBadgeText(e.target.value)}
                className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {/* Bullet Highlights */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Highlight 1
                </label>
                <input
                  type="text"
                  value={feature1}
                  onChange={e => setFeature1(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Highlight 2
                </label>
                <input
                  type="text"
                  value={feature2}
                  onChange={e => setFeature2(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Size availability badges */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Available Sizes on This Rack
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_SIZES.map(s => {
                  const isActive = selectedSizes.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                          : 'bg-slate-800/60 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Floor Scannable QR Code Config */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Floor QR Code Call-To-Action
              </label>
              <input
                type="text"
                value={qrCallToAction}
                onChange={e => setQrCallToAction(e.target.value)}
                className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
              <input
                type="url"
                value={qrUrl}
                onChange={e => setQrUrl(e.target.value)}
                placeholder="https://..."
                className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live WYSIWYG Acrylic Stand Preview & Print Area */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          
          <div className="mb-3 flex items-center justify-between w-full max-w-sm px-2 text-xs text-slate-400 no-print">
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-purple-400" /> Standard 4" x 6" Acrylic Tent Card
            </span>
            <span className="font-mono text-[10px] text-slate-500">102mm × 152mm</span>
          </div>

          {/* Physical Stand Simulated Canvas */}
          <div
            id="shelf-talker-print-area"
            className={`w-[360px] min-h-[500px] rounded-3xl p-6 border-2 shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${currentTheme.cardBg} ${currentTheme.cardBorder}`}
          >
            {/* Gloss reflection overlay simulating acrylic */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>

            {/* Inner Gold / Accent Frame Border */}
            <div className={`absolute inset-2.5 rounded-2xl border pointer-events-none ${currentTheme.innerBorder}`}></div>

            {/* Top Brand Header */}
            <div className="relative z-10 text-center pt-2">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className={`text-xs font-black tracking-[0.25em] uppercase ${currentTheme.brandText}`}>
                  COBB ITALY
                </span>
              </div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-medium">
                EST. 2007 • MILANO
              </p>
              
              {/* Category Pill */}
              <div className="mt-3 inline-block">
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentTheme.badgeBg}`}>
                  {badgeText || 'SPECIAL OFFER'}
                </span>
              </div>
            </div>

            {/* Middle: Article Title & Features */}
            <div className="relative z-10 my-4 text-center px-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
                {articleCode} • {category}
              </span>
              <h3 className={`text-xl font-bold leading-tight mb-3 ${currentTheme.headerFont} ${currentTheme.titleText}`}>
                {articleName}
              </h3>

              {/* Price Block */}
              <div className="flex items-baseline justify-center gap-3 my-3">
                {mrp && mrp > offerPrice && (
                  <span className={`text-sm font-bold ${currentTheme.mrpText}`}>
                    {formatCurrency(mrp)}
                  </span>
                )}
                <span className={`text-3xl font-black font-mono tracking-tight ${currentTheme.offerPriceText}`}>
                  {formatCurrency(offerPrice)}
                </span>
              </div>

              {/* Bullet Features */}
              <div className="space-y-1 my-3 text-[11px] font-medium text-slate-300">
                {feature1 && <p className="flex items-center justify-center gap-1.5"><span>✦</span> {feature1}</p>}
                {feature2 && <p className="flex items-center justify-center gap-1.5"><span>✦</span> {feature2}</p>}
              </div>

              {/* Available Sizes Matrix */}
              <div className="mt-4 pt-3 border-t border-slate-800/60">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Available Sizes on Display
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {ALL_SIZES.map(s => {
                    const isAvailable = selectedSizes.includes(s);
                    return (
                      <span
                        key={s}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                          isAvailable
                            ? currentTheme.sizeActive
                            : currentTheme.sizeInactive
                        }`}
                      >
                        {s.split(' ')[0]}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom: Floor Scannable QR Code */}
            <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 px-1">
              <div className="flex-1 text-left">
                <p className="text-[10px] font-bold text-slate-200 leading-tight">
                  {qrCallToAction}
                </p>
                <p className="text-[8px] text-slate-400 mt-0.5">
                  Point phone camera for styling tips
                </p>
              </div>

              <div className={`p-1.5 rounded-xl border shrink-0 ${currentTheme.qrBg}`}>
                <img
                  src={qrImageSrc}
                  alt="Styling QR Code"
                  className="w-12 h-12 rounded object-contain"
                  onError={(e) => {
                    // Fallback to offline SVG placeholder if no internet
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden w-12 h-12 items-center justify-center text-slate-400">
                  <QrCode className="w-8 h-8" />
                </div>
              </div>
            </div>

          </div>

          <div className="mt-4 text-center no-print">
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 mx-auto cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print This Card</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
