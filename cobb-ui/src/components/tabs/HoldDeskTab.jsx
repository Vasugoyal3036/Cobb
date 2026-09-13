import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Clock,
  Tag,
  Plus,
  Trash2,
  RefreshCw,
  AlarmClock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  User,
  Package,
  Layers,
  X,
  ChevronRight,
  Timer
} from 'lucide-react';

const API_BASE = window.location.protocol === 'app:' || window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : window.location.origin;

const WINDOW_OPTIONS = [
  { label: '1 Hour', value: 1 },
  { label: '2 Hours', value: 2 },
  { label: '4 Hours', value: 4 },
  { label: 'End of Day (~8h)', value: 8 },
  { label: '24 Hours', value: 24 },
];

function formatCountdown(ms) {
  if (ms <= 0) return 'EXPIRED';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getUrgency(minLeft, status) {
  if (status === 'expired' || status === 'released') return 'expired';
  if (minLeft <= 15) return 'critical';
  if (minLeft <= 45) return 'warning';
  return 'ok';
}

const urgencyStyles = {
  ok: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    card: 'border-slate-800 bg-slate-900/60',
    glow: '',
  },
  warning: {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    card: 'border-amber-500/30 bg-amber-950/10',
    glow: 'shadow-amber-500/10',
  },
  critical: {
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse',
    card: 'border-rose-500/30 bg-rose-950/10',
    glow: 'shadow-rose-500/10',
  },
  expired: {
    badge: 'bg-slate-700 text-slate-400 border-slate-600',
    card: 'border-slate-800 bg-slate-900/30 opacity-60',
    glow: '',
  },
};

export default function HoldDeskTab({ darkMode }) {
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    articleNo: '',
    articleName: '',
    size: '',
    category: '',
    windowHours: 2,
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [extending, setExtending] = useState(null);
  const [releasing, setReleasing] = useState(null);
  const [searchInv, setSearchInv] = useState('');
  const [invResults, setInvResults] = useState([]);
  const [loadingInv, setLoadingInv] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchHolds = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/holds`);
      if (res.data?.success) setHolds(res.data.holds);
    } catch (e) {
      console.error('HoldDesk fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHolds();
    const interval = setInterval(fetchHolds, 30000);
    return () => clearInterval(interval);
  }, [fetchHolds]);

  // Live countdown ticker (every 30s)
  useEffect(() => {
    const ticker = setInterval(() => {
      setHolds(prev => prev.map(h => {
        const msLeft = Math.max(0, new Date(h.expiresAt) - Date.now());
        const minLeft = Math.floor(msLeft / 60000);
        return { ...h, msLeft, minLeft, isExpired: h.status === 'expired' || msLeft === 0 };
      }));
    }, 30000);
    return () => clearInterval(ticker);
  }, []);

  const searchInventory = async (q) => {
    setSearchInv(q);
    if (q.length < 2) { setInvResults([]); return; }
    setLoadingInv(true);
    try {
      const res = await axios.get(`${API_BASE}/api/inventory?q=${encodeURIComponent(q)}`);
      const items = Array.isArray(res.data) ? res.data : [];
      setInvResults(items.slice(0, 6));
    } catch (e) {
      setInvResults([]);
    } finally {
      setLoadingInv(false);
    }
  };

  const pickArticle = (item) => {
    setForm(f => ({
      ...f,
      articleNo: item.ArticleNo || item.article_no || '',
      articleName: item.ItemName || item.article_name || item.ArticleName || '',
      size: item.Size || item.size || item.para2_name || '',
      category: item.Category || item.section_name || '',
    }));
    setSearchInv('');
    setInvResults([]);
  };

  const handleAddHold = async (e) => {
    e.preventDefault();
    if (!form.articleName.trim()) { showToast('Please enter the article name', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/api/holds/add`, form);
      if (res.data?.success) {
        showToast(`Hold created for ${form.articleName} (${form.windowHours}h)`);
        setShowForm(false);
        setForm({ customerName: '', customerPhone: '', articleNo: '', articleName: '', size: '', category: '', windowHours: 2 });
        await fetchHolds();
      }
    } catch (e) {
      showToast('Failed to create hold', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtend = async (id) => {
    setExtending(id);
    try {
      await axios.post(`${API_BASE}/api/holds/${id}/extend`, { hours: 1 });
      showToast('Hold extended by 1 hour');
      await fetchHolds();
    } catch (e) {
      showToast('Failed to extend hold', 'error');
    } finally {
      setExtending(null);
    }
  };

  const handleRelease = async (id, name) => {
    if (!window.confirm(`Release hold for ${name}? This will return the garment to the rack.`)) return;
    setReleasing(id);
    try {
      await axios.delete(`${API_BASE}/api/holds/${id}`);
      showToast(`Hold released — return ${name} to rack`);
      await fetchHolds();
    } catch (e) {
      showToast('Failed to release hold', 'error');
    } finally {
      setReleasing(null);
    }
  };

  const activeHolds = holds.filter(h => h.status === 'active');
  const expiringHolds = activeHolds.filter(h => h.minLeft <= 30);
  const expiredHolds = holds.filter(h => h.status === 'expired');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl font-semibold text-sm flex items-center gap-2 transition-all ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            <AlarmClock className="w-6 h-6 text-amber-400" />
            Hold & Reserve Desk
          </h2>
          <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Digital garment hold slips — automatic WhatsApp reminder before expiry
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchHolds()}
            className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            New Hold
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Holds', value: activeHolds.length, icon: Tag, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Expiring < 30 min', value: expiringHolds.length, icon: Clock, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
          { label: 'Pending Release', value: expiredHolds.length, icon: AlertTriangle, color: 'text-slate-400', bg: 'bg-slate-800/50 border-slate-700/50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-4 ${bg}`}>
            <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-1 ${color}`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
            <div className={`text-3xl font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* New Hold Form */}
      {showForm && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create New Garment Hold
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAddHold} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Article search */}
            <div className="md:col-span-2 relative">
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Article / Garment *</label>
              <input
                type="text"
                placeholder="Type article name or scan barcode to search inventory..."
                value={searchInv || form.articleName}
                onChange={e => {
                  searchInventory(e.target.value);
                  setForm(f => ({ ...f, articleName: e.target.value }));
                }}
                className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500 ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'}`}
              />
              {invResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                  {invResults.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickArticle(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-800 transition-colors flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-200 font-medium">{item.ItemName || item.ArticleName}</span>
                      <span className="text-slate-500 text-xs">{item.ArticleNo} · {item.Size || item.para2_name || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              {[
                { key: 'articleNo', label: 'Article No.', placeholder: 'e.g. ART-2041' },
                { key: 'size', label: 'Size', placeholder: 'e.g. 42, L, 32' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500 ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'}`}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Customer Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Mr. Sharma (optional)"
                  value={form.customerName}
                  onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500 ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'}`}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Customer WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="9812345678 (for auto ping)"
                  value={form.customerPhone}
                  onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500 ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'}`}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-400 mb-2 block">Hold Window</label>
              <div className="flex gap-2 flex-wrap">
                {WINDOW_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, windowHours: opt.value }))}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${form.windowHours === opt.value
                      ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'border-slate-700 text-slate-400 hover:border-amber-500 hover:text-amber-400'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all"
              >
                {submitting ? 'Creating Hold...' : '🏷️ Create Hold Slip'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-sm font-bold">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Holds List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading holds...
        </div>
      ) : holds.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-3">
          <AlarmClock className="w-10 h-10 opacity-30" />
          <p className="text-sm">No holds created yet. Tap <strong>New Hold</strong> to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active and Expired Holds */}
          {['active', 'expired', 'released'].map(statusGroup => {
            const groupHolds = holds.filter(h => h.status === statusGroup);
            if (groupHolds.length === 0) return null;
            const groupLabel = statusGroup === 'active' ? '🟢 Active Holds' : statusGroup === 'expired' ? '🔴 Expired — Return to Rack' : '✅ Released';
            return (
              <div key={statusGroup}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">{groupLabel}</p>
                <div className="space-y-2">
                  {groupHolds.map(hold => {
                    const msLeft = Math.max(0, new Date(hold.expiresAt) - Date.now());
                    const minLeft = Math.floor(msLeft / 60000);
                    const urgency = getUrgency(minLeft, hold.status);
                    const styles = urgencyStyles[urgency];

                    return (
                      <div key={hold.id} className={`rounded-2xl border p-4 flex items-center gap-4 transition-all shadow-lg ${styles.card} ${styles.glow}`}>
                        {/* Countdown badge */}
                        <div className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-14 rounded-xl border font-black text-sm ${styles.badge}`}>
                          <Timer className="w-3.5 h-3.5 mb-0.5" />
                          {hold.status === 'released' ? '✓ Done' : hold.status === 'expired' ? 'EXPIRED' : formatCountdown(msLeft)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold text-sm truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{hold.articleName}</span>
                            {hold.size && <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-semibold">Size {hold.size}</span>}
                            {hold.articleNo && <span className="text-xs text-slate-500">#{hold.articleNo}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                            {hold.customerName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{hold.customerName}</span>}
                            {hold.customerPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{hold.customerPhone}</span>}
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                              Expires {new Date(hold.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {hold.reminderSent && <span className="text-amber-400 font-semibold">📲 Ping Sent</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        {(hold.status === 'active' || hold.status === 'expired') && (
                          <div className="flex gap-2 flex-shrink-0">
                            {hold.status === 'active' && (
                              <button
                                onClick={() => handleExtend(hold.id)}
                                disabled={extending === hold.id}
                                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <RefreshCw className={`w-3 h-3 ${extending === hold.id ? 'animate-spin' : ''}`} />
                                +1h
                              </button>
                            )}
                            <button
                              onClick={() => handleRelease(hold.id, hold.articleName)}
                              disabled={releasing === hold.id}
                              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Release
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
