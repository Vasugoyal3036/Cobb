import React, { useState, useEffect } from 'react';
import { ClipboardList, AlertTriangle, FileText, CheckCircle2, Package, Search, Share2, Printer, RefreshCw, ChevronLeft, ChevronRight, Send, Plus, Minus, Trash2 } from 'lucide-react';
import axios from 'axios';

export default function ReorderTab(props) {
  const { API_BASE, darkMode } = props;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [generating, setGenerating] = useState(false);
  const [indentResult, setIndentResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  useEffect(() => {
    fetchSuggestions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/inventory/reorder-suggestions`);
      setData(res.data || []);
      
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

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedItems = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedCount = Object.keys(selectedItems).length;
  const totalUnits = Object.values(selectedItems).reduce((sum, val) => sum + val, 0);
  const cartItems = data.filter(item => selectedItems[`${item.ArticleNo}-${item.Size}`]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-[1600px] mx-auto pb-6">
      
      {/* LAYER 2: Master List (Suggestions) */}
      <div className={`w-full lg:w-[460px] shrink-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
        {/* Header */}
        <div className={`p-5 border-b ${darkMode ? 'border-[#232e47] bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg bg-indigo-600 shadow-indigo-600/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-lg font-black tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Reorder Radar
                </h2>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{filteredData.length} critical items</p>
              </div>
            </div>
            <button onClick={fetchSuggestions} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-[#1a2333] hover:bg-slate-800 text-slate-400' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 shadow-sm'}`}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search catalog..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:border-indigo-500 shadow-sm transition-colors ${darkMode ? 'bg-[#1a2333] border-[#232e47] text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
            />
          </div>
        </div>

        {/* List */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${darkMode ? 'bg-[#0f1115]/50' : 'bg-slate-50/30'}`}>
          <div className={`divide-y ${darkMode ? 'divide-[#232e47]' : 'divide-slate-100'}`}>
            {loading ? (
              <div className={`p-12 flex flex-col items-center justify-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <RefreshCw className="w-8 h-8 animate-spin mb-3 opacity-50" /> Loading...
              </div>
            ) : filteredData.length === 0 ? (
              <div className={`p-8 text-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No items found.</div>
            ) : (
              paginatedItems.map((item, idx) => {
                const id = `${item.ArticleNo}-${item.Size}`;
                const isSelected = !!selectedItems[id];
                const isCritical = item.WeeksOfStock < 1;

                return (
                  <div key={id} className={`w-full text-left p-4 transition-colors flex items-center justify-between border-l-4 ${isSelected ? (darkMode ? 'bg-indigo-900/20 border-indigo-500' : 'bg-indigo-50/80 border-indigo-500') : (darkMode ? 'border-transparent hover:bg-slate-800/50' : 'border-transparent hover:bg-indigo-50/50')}`}>
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item)}
                        className={`w-5 h-5 rounded cursor-pointer shrink-0 ${darkMode ? 'bg-[#1a2333] border-[#232e47]' : 'border-slate-300'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className={`font-bold text-sm truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {item.ArticleNo}
                          </h4>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 shrink-0 ${darkMode ? 'bg-[#1a2333] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Sz: {item.Size}</span>
                        </div>
                        <p className={`text-[11px] mt-0.5 truncate ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{item.ArticleName}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[9px] font-bold uppercase ${isCritical ? 'text-red-500 flex items-center' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                            {isCritical && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {item.WeeksOfStock} Wks Stock
                          </span>
                          <span className={`text-[9px] font-bold uppercase ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>• {item.AvgWeeklySales}/wk sales</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className={`p-3 border-t flex items-center justify-between shrink-0 ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={`p-1.5 rounded text-xs font-semibold flex items-center transition-colors ${currentPage === 1 ? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={`p-1.5 rounded text-xs font-semibold flex items-center transition-colors ${currentPage === totalPages ? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LAYER 3: Indent Cart / Action View (Main Pane) */}
      <div className="flex-1 rounded-2xl relative h-full">
        <div className={`w-full h-full p-0 overflow-hidden flex flex-col relative rounded-2xl border ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
          
          {/* Header */}
          <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-[#232e47] bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
            <div>
              <span className="text-[10px] uppercase font-black text-indigo-600 tracking-widest">Active Draft</span>
              <h3 className={`text-2xl font-black mt-1 flex items-center ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                <ClipboardList className="w-6 h-6 mr-3 text-indigo-500" /> Indent Cart
              </h3>
            </div>
            <div className="flex gap-4 items-center text-right">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Unique SKUs</p>
                <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedCount}</p>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-[#232e47]"></div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Units</p>
                <p className={`text-xl font-black ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{totalUnits}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {cartItems.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center text-center border-2 border-dashed rounded-2xl p-8 ${darkMode ? 'border-[#232e47] bg-[#1a2333]' : 'border-slate-200 bg-slate-50'}`}>
                <ClipboardList className={`w-12 h-12 mb-4 opacity-50 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <h4 className={`text-lg font-bold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Cart is Empty</h4>
                <p className={`text-sm max-w-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Select items from the radar list on the left to add them to your reorder indent.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map(item => {
                  const id = `${item.ArticleNo}-${item.Size}`;
                  const qty = selectedItems[id];
                  return (
                    <div key={id} className={`flex items-center justify-between p-4 rounded-xl border shadow-sm ${darkMode ? 'bg-[#1a2333] border-[#232e47]' : 'bg-white border-slate-200'}`}>
                      <div>
                        <h5 className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.ArticleNo} <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded ${darkMode ? 'bg-[#121829] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Sz: {item.Size}</span></h5>
                        <p className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{item.ArticleName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center border rounded-lg overflow-hidden ${darkMode ? 'border-[#232e47]' : 'border-slate-200'}`}>
                          <button onClick={() => handleQtyChange(id, qty - 1)} className={`p-2 transition-colors ${darkMode ? 'bg-[#121829] hover:bg-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                            <Minus className="w-4 h-4" />
                          </button>
                          <input 
                            type="number" 
                            min="0"
                            value={qty} 
                            onChange={e => handleQtyChange(id, e.target.value)}
                            className={`w-14 text-center font-bold text-sm focus:outline-none ${darkMode ? 'bg-[#1a2333] text-white' : 'bg-white text-slate-800'}`}
                          />
                          <button onClick={() => handleQtyChange(id, qty + 1)} className={`p-2 transition-colors ${darkMode ? 'bg-[#121829] hover:bg-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button onClick={() => handleToggleSelect(item)} className={`p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}>
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`p-6 border-t ${darkMode ? 'border-[#232e47] bg-[#1a2333]' : 'border-slate-200 bg-white'}`}>
            <button
              onClick={generateIndent}
              disabled={selectedCount === 0 || generating}
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:dark:bg-slate-800 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/30"
            >
              {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {generating ? 'Processing Indent...' : 'Dispatch Indent to HO'}
            </button>
          </div>

        </div>
      </div>

      {/* Indent Result Modal */}
      {indentResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className={`rounded-2xl p-6 w-full max-w-lg shadow-2xl border animate-in zoom-in-95 ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-xl font-black mb-2 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              <CheckCircle2 className="w-6 h-6 text-green-500"/> Indent Generated
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>You can now send this indent directly to the Head Office.</p>
            
            <textarea 
              readOnly 
              value={indentResult.text}
              className={`w-full h-64 p-4 font-mono text-sm rounded-xl mb-6 focus:outline-none custom-scrollbar ${darkMode ? 'bg-black text-green-400 border border-[#232e47]' : 'bg-slate-900 text-green-400'}`} 
            />
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIndentResult(null)} 
                className={`px-5 py-2.5 font-bold rounded-xl transition-colors ${darkMode ? 'text-slate-400 hover:bg-[#1a2333]' : 'text-slate-500 hover:bg-slate-100'}`}
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
                {copied ? 'Copied!' : 'Copy'}
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
