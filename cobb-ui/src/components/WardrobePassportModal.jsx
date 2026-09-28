import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  X,
  Shirt,
  Search,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  Send,
  Printer,
  Calendar,
  Tag,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  ExternalLink,
  Crown,
  Ruler,
  Palette,
  Eye,
  RefreshCw
} from 'lucide-react';

const COLOR_MAP = {
  'WHITE': '#FFFFFF',
  'BLACK': '#1E293B',
  'NAVY BLUE': '#1E3A8A',
  'NAVY': '#1E3A8A',
  'BLUE': '#2563EB',
  'SKY BLUE': '#38BDF8',
  'CHARCOAL': '#334155',
  'GREY': '#64748B',
  'GRAY': '#64748B',
  'OLIVE GREEN': '#4D7C0F',
  'OLIVE': '#4D7C0F',
  'GREEN': '#16A34A',
  'BEIGE': '#D4D4D8',
  'KHAKI': '#CA8A04',
  'BROWN': '#78350F',
  'WINE': '#881337',
  'MAROON': '#831843',
  'INDIGO': '#312E81',
  'PINK': '#F472B6',
  'PEACH': '#FB923C'
};

const WardrobePassportModal = ({
  isOpen,
  onClose,
  initialPhone = '',
  initialCustomerName = '',
  API_BASE = 'http://localhost:5000',
  darkMode = true
}) => {
  const [phoneQuery, setPhoneQuery] = useState(initialPhone || '');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const target = initialPhone || phoneQuery || '9812044810';
      setPhoneQuery(target);
      fetchPassport(target);
    }
  }, [isOpen, initialPhone]);

  const fetchPassport = async (phone) => {
    setLoading(true);
    setError(null);
    try {
      const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
      const res = await axios.get(`${API_BASE}/api/customers/wardrobe-passport?phone=${cleanPhone}`);
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.warn('Error fetching wardrobe passport:', err.message);
      // Backend includes mock fallback so this is rare, but handle cleanly
      setError('Unable to fetch live wardrobe. Using local profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (phoneQuery.trim()) {
      fetchPassport(phoneQuery.trim());
    }
  };

  const handleCopyWhatsApp = () => {
    if (!data?.whatsappShareText) return;
    navigator.clipboard.writeText(data.whatsappShareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    if (!data?.whatsappShareText) return;
    const phone = (data.customer?.phone || phoneQuery).replace(/[^0-9]/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(data.whatsappShareText)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  const customer = data?.customer || {};
  const fitProfile = data?.fitProfile || {};
  const colorSpectrum = data?.colorSpectrum || [];
  const antiDuplicateAlerts = data?.antiDuplicateAlerts || [];
  const items = data?.wardrobeItems || [];

  const categories = ['ALL', ...new Set(items.map(i => i.category).filter(Boolean))];
  const filteredItems = activeCategory === 'ALL'
    ? items
    : items.filter(i => (i.category || '').toUpperCase() === activeCategory.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
          darkMode
            ? 'bg-[#0f1117] border-[#2e3342] text-slate-100 shadow-purple-950/20'
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-6 border-b flex flex-wrap items-center justify-between gap-4 ${
          darkMode ? 'border-[#222736] bg-slate-900/60' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Shirt className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Digital Wardrobe Passport
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  VIP Verified
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Garment history, size preferences & anti-duplicate shopping advisor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Phone search form */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-slate-400" />
              <input
                type="text"
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                placeholder="Lookup Phone (e.g. 98120...)"
                className={`pl-9 pr-20 py-2 rounded-xl text-xs font-mono border focus:outline-none transition ${
                  darkMode
                    ? 'bg-[#171b26] border-[#2e3342] text-white focus:border-purple-500'
                    : 'bg-white border-slate-200 text-slate-900 focus:border-purple-600'
                }`}
              />
              <button
                type="submit"
                className="absolute right-1.5 px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-bold hover:bg-purple-700 transition"
              >
                Search
              </button>
            </form>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                darkMode
                  ? 'border-[#2e3342] hover:bg-slate-800 text-slate-400 hover:text-white'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-400">Loading Wardrobe Passport & Closet History...</p>
            </div>
          ) : (
            <>
              {/* Top Banner: Customer Identity & Inferred Sizes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* VIP Customer Profile Card */}
                <div
                  className={`p-5 rounded-2xl border relative overflow-hidden ${
                    darkMode
                      ? 'bg-gradient-to-br from-[#131622] to-[#1c2033] border-[#2e3342]'
                      : 'bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Shopper Identity
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Crown className="w-3 h-3" /> {customer.tier || 'VIP Gold'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight">{customer.name || 'Valued Shopper'}</h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">📞 {customer.phone || phoneQuery}</p>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-500/15">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Lifetime Value</span>
                      <p className="text-lg font-black text-emerald-400">
                        ₹{(customer.totalSpent || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Store Visits</span>
                      <p className="text-lg font-black text-blue-400">
                        {customer.totalVisits || 1} {customer.totalVisits === 1 ? 'Visit' : 'Visits'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inferred Size & Fit ID Card */}
                <div
                  className={`p-5 rounded-2xl border relative overflow-hidden ${
                    darkMode
                      ? 'bg-gradient-to-br from-[#131622] to-[#1e1b2e] border-purple-900/40'
                      : 'bg-gradient-to-br from-purple-50/50 to-white border-purple-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" /> Verified Sizing ID
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Based on past purchases</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border ${darkMode ? 'bg-black/30 border-purple-800/30' : 'bg-purple-50/60 border-purple-100'}`}>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Shirt / Collar</span>
                      <p className="text-2xl font-black text-purple-400 mt-0.5">
                        {fitProfile.inferredShirtSize || '40'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl border ${darkMode ? 'bg-black/30 border-purple-800/30' : 'bg-purple-50/60 border-purple-100'}`}>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Trouser / Waist</span>
                      <p className="text-2xl font-black text-indigo-400 mt-0.5">
                        {fitProfile.inferredWaistSize || '32'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Preferred Fit:</span>
                    <span className="font-bold text-slate-200">{fitProfile.preferredFit || 'Tailored Slim'}</span>
                  </div>
                </div>

                {/* Color Spectrum Breakdown */}
                <div
                  className={`p-5 rounded-2xl border ${
                    darkMode ? 'bg-[#131622] border-[#2e3342]' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5" /> Closet Color Spectrum
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{colorSpectrum.length} Shades</span>
                  </div>

                  <div className="space-y-2">
                    {colorSpectrum.slice(0, 4).map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-slate-600 shadow-sm"
                            style={{ backgroundColor: COLOR_MAP[c.color] || '#94A3B8' }}
                          />
                          <span className="font-bold text-slate-300">{c.color}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${c.percentage}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
                            {c.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ANTI-DUPLICATE WARNINGS & ADVISOR BANNER */}
              {antiDuplicateAlerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Anti-Duplicate Shopping Advisor (For Cashier / Stylist)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {antiDuplicateAlerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border flex items-start gap-3 transition ${
                          alert.type === 'warning'
                            ? (darkMode ? 'bg-amber-950/30 border-amber-700/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900')
                            : alert.type === 'cross_sell'
                            ? (darkMode ? 'bg-purple-950/30 border-purple-700/50 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900')
                            : (darkMode ? 'bg-blue-950/30 border-blue-700/50 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900')
                        }`}
                      >
                        <div className="mt-0.5">
                          {alert.type === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs uppercase tracking-wide mb-0.5">
                            {alert.badge}
                          </div>
                          <p className="text-xs leading-relaxed">{alert.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DIGITAL CLOSET SECTION */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h4 className="font-bold text-base tracking-tight flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-purple-400" /> Registered Garment Closet ({items.length} Pieces)
                    </h4>
                    <p className="text-xs text-slate-400">Exact garments purchased over the past 24 months</p>
                  </div>

                  {/* Category Pills Filter */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                          activeCategory === cat
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                            : darkMode
                            ? 'bg-[#171b26] text-slate-400 hover:text-white border border-[#2e3342]'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Closet Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.01] ${
                        darkMode
                          ? 'bg-[#131622] border-[#2e3342] hover:border-purple-500/40'
                          : 'bg-white border-slate-200 shadow-sm hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          {item.articleNo}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.purchaseDate).toLocaleDateString('en-IN', {
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <h5 className="font-bold text-sm tracking-tight line-clamp-1 mb-2">
                        {item.articleName}
                      </h5>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-slate-500"
                            style={{ backgroundColor: COLOR_MAP[item.color] || '#94A3B8' }}
                          />
                          <span className="text-slate-400">Color:</span>
                          <span className="font-bold text-slate-200">{item.color}</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-slate-400">Size:</span>
                          <span className="font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {item.size}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-500/15 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">{item.billNo}</span>
                        <div className="flex items-center gap-1.5">
                          {item.discountAmount > 0 && (
                            <span className="line-through text-slate-500 text-[10px]">
                              ₹{item.mrp}
                            </span>
                          )}
                          <span className="font-black text-emerald-400">
                            ₹{item.paidPrice}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-3 ${
          darkMode ? 'border-[#222736] bg-slate-900/80' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                darkMode
                  ? 'border-[#2e3342] hover:bg-slate-800 text-slate-300'
                  : 'border-slate-300 hover:bg-white text-slate-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" /> Copied Text
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" /> Copy WhatsApp Summary
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <Send className="w-4 h-4" /> Share Wardrobe Card via WhatsApp
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WardrobePassportModal;
