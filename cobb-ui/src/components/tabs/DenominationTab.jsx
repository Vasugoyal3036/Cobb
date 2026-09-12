import React, { useState, useEffect } from 'react';
import { Wallet, Calculator, Send, CheckCircle2, AlertTriangle, FileText, IndianRupee, Clock, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_BASE = window.location.origin.includes('localhost:5173') ? 'http://localhost:5000' : window.location.origin;

export default function DenominationTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ 
    billCount: 0, grossSales: 0, netSales: 0, taxCollected: 0, 
    cashAmount: 0, cardAmount: 0, upiAmount: 0, openingCash: 0 
  });
  
  const [denominations, setDenominations] = useState({
    '2000': '', '500': '', '200': '', '100': '', '50': '', '20': '', '10': '', 'coins': ''
  });
  
  const [notes, setNotes] = useState('');
  const [managerName, setManagerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchData();
    fetchHistory();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/reconciliation/denomination-data`);
      setData(res.data || {});
    } catch (err) {
      console.error('Failed to load denomination data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/reconciliation/denomination-history`);
      setHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleDenomChange = (val, key) => {
    setDenominations(prev => ({ ...prev, [key]: val }));
  };

  // Calculate totals
  const physicalCash = 
    (parseInt(denominations['2000']) || 0) * 2000 +
    (parseInt(denominations['500']) || 0) * 500 +
    (parseInt(denominations['200']) || 0) * 200 +
    (parseInt(denominations['100']) || 0) * 100 +
    (parseInt(denominations['50']) || 0) * 50 +
    (parseInt(denominations['20']) || 0) * 20 +
    (parseInt(denominations['10']) || 0) * 10 +
    (parseFloat(denominations['coins']) || 0);

  const expectedCash = (data.openingCash || 0) + (data.cashAmount || 0);
  const variance = physicalCash - expectedCash;

  const handleSubmit = async () => {
    if (!managerName.trim()) {
      return alert('Please enter manager name to sign off the closing sheet.');
    }
    
    setSaving(true);
    try {
      const payload = {
        denominations,
        notes,
        managerName,
        openingCash: data.openingCash,
        expectedCash
      };
      
      const res = await axios.post(`${API_BASE}/api/reconciliation/denomination-save`, payload);
      setReportResult(res.data.reportText);
      fetchHistory();
      
      // Reset form
      setDenominations({'2000': '', '500': '', '200': '', '100': '', '50': '', '20': '', '10': '', 'coins': ''});
      setNotes('');
      setManagerName('');
      
    } catch (err) {
      console.error(err);
      alert('Failed to save night closing sheet');
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsApp = async () => {
    try {
      // Could send to owner's number here, for now just open WhatsApp Web
      const url = `https://wa.me/?text=${encodeURIComponent(reportResult)}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Wallet className="w-8 h-8 text-emerald-600" />
            Night Closing Denomination
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Reconcile physical cash drawer with system expected cash and generate EOD report.</p>
        </div>
        
        <button 
          onClick={fetchData} 
          className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: System Summary & Expected */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Today's System Sales
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Gross Sales</span>
                <span className="font-bold text-slate-800">₹{data.grossSales.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Total Bills</span>
                <span className="font-bold text-slate-800">{data.billCount}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-slate-600 font-medium text-emerald-600 flex items-center gap-2"><IndianRupee className="w-4 h-4"/> Cash Received</span>
                <span className="font-black text-emerald-600">₹{(data.cashAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Card</span>
                <span className="font-bold text-slate-800">₹{(data.cardAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-slate-600 font-medium">UPI / Wallet</span>
                <span className="font-bold text-slate-800">₹{(data.upiAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
              <Wallet className="w-32 h-32" />
            </div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Cash Drawer Expectation</h2>
            <div className="space-y-2 mb-6 relative z-10">
              <div className="flex justify-between text-slate-300">
                <span>Opening Cash:</span>
                <span>₹{(data.openingCash || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Today's Cash Sales:</span>
                <span>+ ₹{(data.cashAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-700 relative z-10">
              <div className="text-sm text-slate-400 mb-1">Total Expected in Drawer</div>
              <div className="text-4xl font-black text-emerald-400">₹{expectedCash.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        {/* Right Column: Physical Count & Submit */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Enter Physical Note Count</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[2000, 500, 200, 100, 50, 20, 10].map(val => (
                <div key={val} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-500 mb-2">₹{val} Notes</div>
                  <input 
                    type="number"
                    min="0"
                    placeholder="0"
                    value={denominations[val]}
                    onChange={e => handleDenomChange(e.target.value, val)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="mt-2 text-right text-xs font-semibold text-emerald-600">
                    = ₹{((parseInt(denominations[val]) || 0) * val).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-500 mb-2">Coins (Total ₹)</div>
                  <input 
                    type="number"
                    min="0"
                    placeholder="0"
                    value={denominations['coins']}
                    onChange={e => handleDenomChange(e.target.value, 'coins')}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="mt-2 text-right text-xs font-semibold text-emerald-600">
                    = ₹{parseFloat(denominations['coins']) || 0}
                  </div>
                </div>
            </div>

            <div className="p-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
              <div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Physical Cash Total</div>
                <div className="text-3xl font-black text-slate-800">₹{physicalCash.toLocaleString('en-IN')}</div>
              </div>
              
              <div className={`px-6 py-4 rounded-xl border flex items-center gap-4 ${
                variance === 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : variance > 0 
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {variance === 0 ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider opacity-80">Variance</div>
                  <div className="text-xl font-black">
                    {variance > 0 ? '+' : ''}{variance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Manager / Cashier Name *</label>
                <input 
                  type="text"
                  value={managerName}
                  onChange={e => setManagerName(e.target.value)}
                  placeholder="Who is signing off this closing?"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes & Remarks (Optional)</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Explain any variance or leave notes for tomorrow..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 h-24 font-medium"
                />
              </div>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={saving || loading || !managerName.trim()}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-lg rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
              Generate Closing Report
            </button>
          </div>
        </div>
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Past Closings
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                  <th className="p-4">Date</th>
                  <th className="p-4">Manager</th>
                  <th className="p-4">Expected</th>
                  <th className="p-4">Physical Count</th>
                  <th className="p-4">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-800">{new Date(record.date).toLocaleString()}</td>
                    <td className="p-4 text-slate-600">{record.managerName}</td>
                    <td className="p-4 text-slate-600">₹{(record.expectedCash || 0).toLocaleString('en-IN')}</td>
                    <td className="p-4 font-bold text-slate-800">₹{(record.physicalCash || 0).toLocaleString('en-IN')}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                        record.variance === 0 ? 'bg-emerald-100 text-emerald-700' : 
                        record.variance > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {record.variance > 0 ? '+' : ''}{(record.variance || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600"/> Closing Slip Saved
            </h3>
            <p className="text-sm text-slate-500 mb-4">You can now send the EOD summary to the store owner.</p>
            
            <textarea 
              readOnly 
              value={reportResult}
              className="w-full h-80 p-4 bg-slate-900 text-emerald-400 font-mono text-sm rounded-xl mb-6 focus:outline-none custom-scrollbar" 
            />
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setReportResult(null)} 
                className="px-5 py-2.5 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              
              <button 
                onClick={() => { 
                  navigator.clipboard.writeText(reportResult); 
                  setCopied(true); 
                  setTimeout(()=>setCopied(false), 2000); 
                }} 
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/30 transition-all flex items-center gap-2"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              
              <button 
                onClick={sendWhatsApp}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2"
              >
                <Send className="w-5 h-5"/>
                WhatsApp Owner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
