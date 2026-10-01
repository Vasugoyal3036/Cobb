import React, { useState, useEffect } from 'react';
import { X, Banknote, Calculator, CheckCircle2, AlertTriangle, ArrowRight, Printer, Share2, History, RefreshCw, Send } from 'lucide-react';
import axios from 'axios';
import { triggerThermalPrint } from '../utils/thermalReceipt';

export default function DenominationModal({ isOpen, onClose, API_BASE = 'http://localhost:5000' }) {
  const [activeTab, setActiveTab] = useState('count'); // 'count' | 'history'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Financial figures
  const [openingCash, setOpeningCash] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [pettyCashExpenses, setPettyCashExpenses] = useState(0);
  const [billCount, setBillCount] = useState(0);

  // Denominations count
  const [denominations, setDenominations] = useState({
    '2000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    'coins': 0
  });

  const [notes, setNotes] = useState('');
  const [managerName, setManagerName] = useState('Store Manager');
  const [historyRecords, setHistoryRecords] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchDenominationData();
      fetchHistory();
    }
  }, [isOpen]);

  const fetchDenominationData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/reconciliation/denomination-data`, { timeout: 8000 });
      if (res.data) {
        setCashSales(Number(res.data.cashAmount || 0));
        setOpeningCash(Number(res.data.openingCash || 0));
        setBillCount(Number(res.data.billCount || 0));
      }
    } catch (e) {
      console.warn('[DenominationModal] Failed to fetch live data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/reconciliation/denomination-history`, { timeout: 8000 });
      if (Array.isArray(res.data)) {
        setHistoryRecords(res.data);
      }
    } catch (e) {}
  };

  const handleDenominationChange = (key, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setDenominations(prev => ({ ...prev, [key]: num }));
  };

  // Calculations
  const calcRowTotal = (note, count) => (parseInt(note) || 0) * (parseInt(count) || 0);

  const physicalCashTotal =
    calcRowTotal('2000', denominations['2000']) +
    calcRowTotal('500', denominations['500']) +
    calcRowTotal('200', denominations['200']) +
    calcRowTotal('100', denominations['100']) +
    calcRowTotal('50', denominations['50']) +
    calcRowTotal('20', denominations['20']) +
    calcRowTotal('10', denominations['10']) +
    (parseFloat(denominations['coins']) || 0);

  const expectedCashInDrawer = openingCash + cashSales - pettyCashExpenses;
  const variance = physicalCashTotal - expectedCashInDrawer;

  const handleSaveAndReport = async (sendWhatsApp = true) => {
    setSaving(true);
    try {
      const payload = {
        denominations,
        notes,
        managerName,
        openingCash,
        expectedCash: expectedCashInDrawer,
        sendWhatsApp
      };

      const res = await axios.post(`${API_BASE}/api/reconciliation/denomination-save`, payload);
      if (res.data && res.data.success) {
        setSaveSuccess(true);
        fetchHistory();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert('Error saving denomination tally: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Cash Drawer &amp; Denomination Counter</h3>
              <p className="text-xs text-slate-500">Quick shift reconciliation &amp; physical cash tally</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/20 px-6 py-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('count')}
            className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'count' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            Count Today's Shift
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${activeTab === 'history' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Past Shift Closings ({historyRecords.length})</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'count' ? (
            <>
              {/* Drawer Financial Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening Float</p>
                  <p className="text-lg font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    ₹{openingCash.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-slate-400">Previous day balance</span>
                </div>
                <div className="p-3.5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Today's Cash Sales</p>
                  <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ₹{cashSales.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-emerald-500/80">{billCount} bills processed</span>
                </div>
                <div className="p-3.5 bg-blue-500/5 rounded-2xl border border-blue-500/20">
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Expected in Drawer</p>
                  <p className="text-lg font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    ₹{expectedCashInDrawer.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-blue-500/80">Opening + Cash Sales</span>
                </div>
              </div>

              {/* Note Count Input Grid */}
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700/50 text-xs font-bold text-slate-500">
                  <span>Currency Denomination</span>
                  <span>Number of Notes</span>
                  <span className="text-right">Subtotal</span>
                </div>

                {[
                  { key: '2000', label: '₹2,000 Note', color: 'text-purple-600 dark:text-purple-400' },
                  { key: '500', label: '₹500 Note', color: 'text-amber-600 dark:text-amber-400' },
                  { key: '200', label: '₹200 Note', color: 'text-orange-600 dark:text-orange-400' },
                  { key: '100', label: '₹100 Note', color: 'text-blue-600 dark:text-blue-400' },
                  { key: '50', label: '₹50 Note', color: 'text-teal-600 dark:text-teal-400' },
                  { key: '20', label: '₹20 Note', color: 'text-emerald-600 dark:text-emerald-400' },
                  { key: '10', label: '₹10 Note', color: 'text-slate-600 dark:text-slate-400' }
                ].map(({ key, label, color }) => (
                  <div key={key} className="flex items-center justify-between text-xs py-1">
                    <span className={`font-bold font-mono w-28 ${color}`}>{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">×</span>
                      <input
                        type="number"
                        min="0"
                        value={denominations[key] === 0 ? '' : denominations[key]}
                        onChange={(e) => handleDenominationChange(key, e.target.value)}
                        placeholder="0"
                        className="w-20 text-center py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-28 text-right">
                      ₹{calcRowTotal(key, denominations[key]).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}

                {/* Coins Row */}
                <div className="flex items-center justify-between text-xs py-1 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                  <span className="font-bold text-slate-500 w-28">Coins &amp; Loose Cash</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[10px]">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations['coins'] === 0 ? '' : denominations['coins']}
                      onChange={(e) => handleDenominationChange('coins', e.target.value)}
                      placeholder="0"
                      className="w-20 text-center py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-28 text-right">
                    ₹{(parseFloat(denominations['coins']) || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Physical Total vs Variance Result */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">Physical Cash Counted</span>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    ₹{physicalCashTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-bold block">Drawer Variance</span>
                  <div className="flex items-center gap-1.5 justify-end">
                    {variance === 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Exact Match (₹0)
                      </span>
                    ) : variance > 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        Excess (+₹{variance.toLocaleString('en-IN')})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Shortage (-₹{Math.abs(variance).toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes & Verified By */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Closing Notes / Discrepancy Reason</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. All matched, deposited in safe"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Cashier / Verified By</label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Manager Name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              {historyRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No previous shift closing records found.
                </div>
              ) : (
                historyRecords.map(rec => (
                  <div key={rec.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{rec.dateFormatted || rec.date?.split('T')[0]}</p>
                      <p className="text-slate-400">Verified by: {rec.managerName}</p>
                      {rec.notes && <p className="text-slate-500 italic mt-0.5">"{rec.notes}"</p>}
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-slate-900 dark:text-white">Counted: ₹{rec.physicalCash?.toLocaleString('en-IN')}</p>
                      <span className={`text-[10px] font-bold ${rec.variance === 0 ? 'text-emerald-500' : rec.variance > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                        {rec.variance === 0 ? 'Exact Match' : rec.variance > 0 ? `+₹${rec.variance} Excess` : `-₹${Math.abs(rec.variance)} Short`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {activeTab === 'count' && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
            <button
              onClick={fetchDenominationData}
              disabled={loading}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Sales</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveAndReport(false)}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Save Locally
              </button>
              <button
                onClick={() => handleSaveAndReport(true)}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{saveSuccess ? 'Dispatched to Owners!' : saving ? 'Saving...' : 'Save & WhatsApp Owners'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
