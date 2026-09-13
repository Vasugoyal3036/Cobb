import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Network,
  Search,
  Send,
  MapPin,
  Phone,
  Store,
  Package,
  CheckCircle2,
  AlertTriangle,
  Loader,
  ChevronRight,
  MessageCircle,
  Zap,
  Copy,
  Check,
  Edit2
} from 'lucide-react';

const API_BASE = window.location.protocol === 'app:' || window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : window.location.origin;

export default function SaveTheSaleTab({ darkMode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [network, setNetwork] = useState([]);
  const [loadingNetwork, setLoadingNetwork] = useState(true);
  const [sending, setSending] = useState({});
  const [sent, setSent] = useState({});
  const [toast, setToast] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [customMsg, setCustomMsg] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    axios.get(`${API_BASE}/api/stores/network`)
      .then(res => setNetwork(res.data?.stores || []))
      .catch(() => setNetwork([]))
      .finally(() => setLoadingNetwork(false));
  }, []);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/api/inventory?q=${encodeURIComponent(q)}`);
      setSearchResults(Array.isArray(res.data) ? res.data.slice(0, 8) : []);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pickArticle = (item) => {
    setSelectedArticle(item);
    setSearchQuery(item.ItemName || item.ArticleName || '');
    setSearchResults([]);
    setSelectedSize(item.Size || item.para2_name || '');
    setCustomMsg('');
    setSent({});
  };

  const buildMessage = (store) => {
    const article = selectedArticle;
    const name = article?.ItemName || article?.ArticleName || searchQuery;
    const artNo = article?.ArticleNo || '';
    const size = selectedSize || 'your available size';
    const cust = customerName ? ` for ${customerName}` : '';

    return customMsg || `🚨 *URGENT SALE REQUEST — Cobb Pundri*\n\nHi ${store.managerName || 'Manager'},\n\nWe have a customer${cust} at Cobb Pundri ready to purchase:\n\n*Article:* ${name}${artNo ? ` (#${artNo})` : ''}\n*Size Required:* ${size}\n\nCould you please check if this is available with you and confirm? Customer is waiting at our counter.\n\nThank you! 🙏\n— *Parbhat Goyal, Cobb Pundri*`;
  };

  const handleSend = async (store) => {
    if (!store.managerPhone || store.managerPhone.includes('XXXXXXXXXX')) {
      showToast('Please update the store manager phone in stores_network.json', 'error');
      return;
    }
    setSending(s => ({ ...s, [store.id]: true }));
    const message = buildMessage(store);
    try {
      const res = await axios.post(`${API_BASE}/api/whatsapp/send`, {
        phone: store.managerPhone,
        message
      });
      if (res.data?.success) {
        setSent(s => ({ ...s, [store.id]: true }));
        showToast(`Transfer request sent to ${store.name}!`);
      } else {
        throw new Error('Failed');
      }
    } catch (e) {
      showToast(`Failed to send to ${store.name} — check WhatsApp Gateway`, 'error');
    } finally {
      setSending(s => ({ ...s, [store.id]: false }));
    }
  };

  const handleCopyMsg = (store) => {
    const msg = buildMessage(store);
    navigator.clipboard.writeText(msg);
    showToast('Message copied to clipboard!');
  };

  const inputClass = `w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${darkMode
    ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500'
    : 'bg-white border-slate-200 text-slate-800'}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl font-semibold text-sm flex items-center gap-2 transition-all ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
          <Network className="w-6 h-6 text-emerald-400" />
          Save-The-Sale Network
        </h2>
        <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          No stock in your size? Instantly request a garment transfer from a nearby Cobb store
        </p>
      </div>

      {/* Step 1 — Article Search */}
      <div className={`rounded-2xl border p-5 space-y-4 ${darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-black">1</span>
          Search for the article the customer wants
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Article search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search article name, SKU or barcode..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'}`}
            />
            {searching && (
              <Loader className="absolute right-3 top-3 w-4 h-4 text-slate-400 animate-spin" />
            )}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                {searchResults.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => pickArticle(item)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors flex items-center justify-between text-sm border-b border-slate-800 last:border-0"
                  >
                    <div>
                      <p className="text-slate-200 font-semibold">{item.ItemName || item.ArticleName}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{item.ArticleNo} · {item.section_name || ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.Size && <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-700 text-slate-300">Sz {item.Size}</span>}
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={`text-xs font-semibold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Size Needed</label>
            <input
              type="text"
              placeholder="e.g. 42, L, 32"
              value={selectedSize}
              onChange={e => setSelectedSize(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Customer Name (optional)</label>
            <input
              type="text"
              placeholder="e.g. Mr. Sharma"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Selected article preview */}
        {selectedArticle && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Package className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-emerald-300 text-sm">{selectedArticle.ItemName || selectedArticle.ArticleName}</p>
              <p className="text-xs text-slate-400">#{selectedArticle.ArticleNo} · Size {selectedSize || '—'}</p>
            </div>
            <span className="ml-auto text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Selected
            </span>
          </div>
        )}
      </div>

      {/* Step 2 — Partner stores */}
      <div className={`rounded-2xl border p-5 space-y-4 ${darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-black">2</span>
            Send transfer request to a nearby Cobb store
          </div>
        </div>

        {loadingNetwork ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-4 justify-center">
            <Loader className="w-4 h-4 animate-spin" /> Loading store network...
          </div>
        ) : network.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No partner stores configured.</p>
            <p className="text-xs mt-1">Edit <code className="text-amber-400">CobbDashboard/stores_network.json</code> to add stores.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {network.map(store => (
              <div key={store.id} className={`rounded-2xl border p-4 transition-all ${darkMode ? 'border-slate-700 bg-slate-800/40 hover:border-emerald-500/30' : 'border-slate-200 bg-slate-50 hover:border-emerald-300'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Store className="w-4 h-4 text-emerald-400" />
                      <span className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{store.name}</span>
                      {store.distanceKm && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> {store.distanceKm} km away
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      {store.managerName && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{store.managerName}</span>}
                      <span className="text-slate-600">{store.managerPhone}</span>
                      {store.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{store.city}</span>}
                    </div>

                    {/* Message preview / edit */}
                    <div className="mt-2">
                      {editingMsg === store.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={5}
                            value={customMsg || buildMessage(store)}
                            onChange={e => setCustomMsg(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono resize-none ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                          />
                          <button
                            onClick={() => setEditingMsg(null)}
                            className="text-xs text-slate-400 hover:text-white underline"
                          >
                            Done editing
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic line-clamp-2 mt-1">
                          "{buildMessage(store).slice(0, 120)}..."
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {sent[store.id] ? (
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
                        <Check className="w-3 h-3" /> Sent!
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSend(store)}
                        disabled={sending[store.id] || !selectedArticle}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                      >
                        {sending[store.id]
                          ? <Loader className="w-3 h-3 animate-spin" />
                          : <MessageCircle className="w-3 h-3" />}
                        📲 Send Request
                      </button>
                    )}
                    <button
                      onClick={() => setEditingMsg(editingMsg === store.id ? null : store.id)}
                      className="flex items-center gap-1 px-3 py-1 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Msg
                    </button>
                    <button
                      onClick={() => handleCopyMsg(store)}
                      className="flex items-center gap-1 px-3 py-1 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <p className="text-xs text-slate-600 text-center pt-1">
              💡 Add more stores by editing <code className="text-amber-400">CobbDashboard/stores_network.json</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
