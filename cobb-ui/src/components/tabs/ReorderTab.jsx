import React, { useState, useEffect } from 'react';
import { ClipboardList, AlertTriangle, FileText, CheckCircle2, Package, Search, Share2, Printer, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function ReorderTab(props) {
  const { API_BASE } = props;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [generating, setGenerating] = useState(false);
  const [indentResult, setIndentResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/inventory/reorder-suggestions`);
      setData(res.data || []);
      
      // Auto-select items with suggested reorder > 0
      const initialSelection = {};
      (res.data || []).forEach(item => {
        if (item.SuggestedReorder > 0) {
          initialSelection[`${item.ArticleNo}-${item.Size}`] = item.SuggestedReorder;
        }
      });
      setSelectedItems(initialSelection);
    } catch (err) {
      console.error('Failed to load reorder suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (id, val) => {
    const newVal = parseInt(val) || 0;
    setSelectedItems(prev => {
      const next = { ...prev };
      if (newVal > 0) {
        next[id] = newVal;
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const handleToggleSelect = (item) => {
    const id = `${item.ArticleNo}-${item.Size}`;
    if (selectedItems[id]) {
      setSelectedItems(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      handleQtyChange(id, item.SuggestedReorder > 0 ? item.SuggestedReorder : 5);
    }
  };

  const generateIndent = async () => {
    if (Object.keys(selectedItems).length === 0) return alert('No items selected!');
    setGenerating(true);
    try {
      const payload = data
        .filter(item => selectedItems[`${item.ArticleNo}-${item.Size}`])
        .map(item => ({
          articleNo: item.ArticleNo,
          articleName: item.ArticleName,
          size: item.Size,
          qty: selectedItems[`${item.ArticleNo}-${item.Size}`]
        }));
        
      const res = await axios.post(`${API_BASE}/api/inventory/generate-indent`, { items: payload });
      setIndentResult(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to generate indent');
    } finally {
      setGenerating(false);
    }
  };

  const filteredData = data.filter(d => 
    (d.ArticleNo?.toLowerCase() || '').includes(search.toLowerCase()) || 
    (d.ArticleName?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const selectedCount = Object.keys(selectedItems).length;
  const totalUnits = Object.values(selectedItems).reduce((sum, val) => sum + val, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            Smart Warehouse Reorder
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Cross-references sales velocity against current stock to auto-generate indents.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={fetchSuggestions} 
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          
          <button 
            onClick={generateIndent}
            disabled={selectedCount === 0 || generating}
            className="flex-1 md:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
          >
            {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            Generate Indent ({selectedCount})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Critical Stock</div>
                <div className="text-2xl font-black text-slate-800">
                  {data.filter(d => d.WeeksOfStock < 1).length} <span className="text-sm font-semibold text-slate-400">SKUs &lt; 1 Week</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Low Stock</div>
                <div className="text-2xl font-black text-slate-800">
                  {data.filter(d => d.WeeksOfStock >= 1 && d.WeeksOfStock < 3).length} <span className="text-sm font-semibold text-slate-400">SKUs &lt; 3 Weeks</span>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-600 p-6 rounded-2xl border border-blue-500 shadow-lg shadow-blue-500/20 text-white flex items-center gap-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
                <ClipboardList className="w-32 h-32" />
              </div>
              <div>
                <div className="text-sm font-bold text-blue-100 uppercase tracking-wider mb-1">Total Indent</div>
                <div className="text-3xl font-black">
                  {totalUnits} <span className="text-base font-medium text-blue-100">Units</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-lg font-bold text-slate-800">Suggested Restocks</h2>
              <div className="relative w-full sm:w-64">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search article..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                    <th className="p-4 w-12 text-center">Select</th>
                    <th className="p-4">Article</th>
                    <th className="p-4">Size</th>
                    <th className="p-4">Current Stock</th>
                    <th className="p-4">Sales/Wk</th>
                    <th className="p-4">Est. Runway</th>
                    <th className="p-4 text-right">Indent Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filteredData.length === 0 ? (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-500">No restock suggestions found.</td></tr>
                  ) : filteredData.map((item, i) => {
                    const id = `${item.ArticleNo}-${item.Size}`;
                    const isSelected = !!selectedItems[id];
                    const isCritical = item.WeeksOfStock < 1;
                    
                    return (
                      <tr key={id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item)}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{item.ArticleNo}</div>
                          <div className="text-xs text-slate-500">{item.ArticleName}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold">{item.Size}</span>
                        </td>
                        <td className="p-4 text-slate-600">{item.CurrentStock}</td>
                        <td className="p-4 text-slate-600">{item.AvgWeeklySales}/wk</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs ${isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isCritical && <AlertTriangle className="w-3.5 h-3.5" />}
                            {item.WeeksOfStock} Wks
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <input 
                            type="number"
                            min="0"
                            value={selectedItems[id] || ''}
                            onChange={e => handleQtyChange(id, e.target.value)}
                            disabled={!isSelected}
                            className={`w-20 text-right p-2 border rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSelected ? 'bg-white border-blue-300' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Indent Result Modal */}
      {indentResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600"/> Indent Generated
            </h3>
            <p className="text-sm text-slate-500 mb-4">You can now send this indent directly to the Head Office.</p>
            
            <textarea 
              readOnly 
              value={indentResult.text}
              className="w-full h-64 p-4 bg-slate-900 text-green-400 font-mono text-sm rounded-xl mb-6 focus:outline-none custom-scrollbar" 
            />
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIndentResult(null)} 
                className="px-5 py-2.5 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              
              <button 
                onClick={() => { 
                  navigator.clipboard.writeText(indentResult.text); 
                  setCopied(true); 
                  setTimeout(()=>setCopied(false), 2000); 
                }} 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
              >
                {copied ? <CheckCircle2 className="w-5 h-5"/> : <ClipboardList className="w-5 h-5"/>}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              
              <button 
                onClick={() => {
                  const url = `https://wa.me/?text=${encodeURIComponent(indentResult.text)}`;
                  window.open(url, '_blank');
                }}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 transition-all flex items-center gap-2"
              >
                <Share2 className="w-5 h-5"/>
                WhatsApp HO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
