import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, AlertTriangle, FileText, CheckCircle2, Package, 
  Search, Share2, Printer, RefreshCw, ChevronLeft, ChevronRight, 
  Send, Plus, Minus, Trash2, Zap, Flame, Layers, AlertCircle, ShoppingBag, ArrowRight
} from 'lucide-react';
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

  // --- BROKEN CURVES STATE ---
  const [activeMode, setActiveMode] = useState('broken'); // 'broken' | 'radar'
  const [brokenData, setBrokenData] = useState([]);
  const [brokenSummary, setBrokenSummary] = useState({ totalBrokenArticles: 0, totalLostRevenuePotential: 0, criticalHoles: 0, tailHeavy: 0 });
  const [brokenLoading, setBrokenLoading] = useState(false);
  const [brokenFilter, setBrokenFilter] = useState('all'); // 'all' | 'CRITICAL_HOLE' | 'TAIL_HEAVY' | 'Topwear' | 'Bottomwear'
  const [brokenPage, setBrokenPage] = useState(1);

  useEffect(() => {
    fetchSuggestions();
    fetchBrokenCurves();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setBrokenPage(1);
  }, [search, brokenFilter, activeMode]);

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

  const fetchBrokenCurves = async () => {
    setBrokenLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/inventory/broken-sizes`);
      if (res.data) {
        setBrokenData(res.data.items || []);
        setBrokenSummary(res.data.summary || {});
      }
    } catch (err) {
      console.warn('Failed to load broken size curves:', err.message);
    } finally {
      setBrokenLoading(false);
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

  // Add all missing core sizes of a broken-curve style to indent in 1 click
  const handleAddMissingCurveToIndent = (brokenItem) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      (brokenItem.missingCore || []).forEach(sz => {
        const id = `${brokenItem.articleNo}-${sz}`;
        next[id] = (next[id] || 0) + 4; // Add 4 pcs recommended replenishment
      });
      return next;
    });
  };

  const isCurveAddedToIndent = (brokenItem) => {
    return (brokenItem.missingCore || []).every(sz => !!selectedItems[`${brokenItem.articleNo}-${sz}`]);
  };

  // Cart item mapping across both regular suggestions and broken-size additions
  const cartItems = useMemo(() => {
    return Object.entries(selectedItems).map(([id, qty]) => {
      const [artNo, sz] = id.split('-');
      const existing = data.find(d => d.ArticleNo === artNo && d.Size === sz);
      const brokenExisting = brokenData.find(b => b.articleNo === artNo);
      return {
        id,
        ArticleNo: artNo,
        Size: sz,
        ArticleName: existing?.ArticleName || brokenExisting?.articleName || 'Apparel Item',
        Category: existing?.Category || brokenExisting?.category || 'Apparel',
        SuggestedReorder: existing?.SuggestedReorder || 4,
        Qty: qty
      };
    });
  }, [selectedItems, data, brokenData]);

  const generateIndent = async () => {
    if (cartItems.length === 0) return alert('No items selected in indent cart!');
    setGenerating(true);
    try {
      const payload = cartItems.map(item => ({
        articleNo: item.ArticleNo,
        articleName: item.ArticleName,
        size: item.Size,
        qty: item.Qty
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

  // Filtered radar data
  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return data.filter(d => 
      (d.ArticleNo?.toLowerCase() || '').includes(q) || 
      (d.ArticleName?.toLowerCase() || '').includes(q)
    );
  }, [data, search]);

  // Filtered broken curve data
  const filteredBroken = useMemo(() => {
    const q = search.toLowerCase().trim();
    return brokenData.filter(item => {
      const matchesSearch = !q || 
        (item.articleNo?.toLowerCase() || '').includes(q) || 
        (item.articleName?.toLowerCase() || '').includes(q) ||
        (item.color?.toLowerCase() || '').includes(q);
      if (!matchesSearch) return false;

      if (brokenFilter === 'CRITICAL_HOLE') return item.severity === 'CRITICAL_HOLE';
      if (brokenFilter === 'TAIL_HEAVY') return item.severity === 'TAIL_HEAVY';
      if (brokenFilter === 'Topwear') return item.type === 'Topwear';
      if (brokenFilter === 'Bottomwear') return item.type === 'Bottomwear';
      return true;
    });
  }, [brokenData, search, brokenFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedItems = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalBrokenPages = Math.max(1, Math.ceil(filteredBroken.length / pageSize));
  const paginatedBroken = filteredBroken.slice((brokenPage - 1) * pageSize, brokenPage * pageSize);

  const selectedCount = Object.keys(selectedItems).length;
  const totalUnits = Object.values(selectedItems).reduce((sum, val) => sum + val, 0);

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-[1600px] mx-auto pb-6">
      
      {/* LEFT PANE: Mode Switcher + Master List */}
      <div className={`w-full lg:w-[500px] shrink-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
        
        {/* Mode Switcher Tabs */}
        <div className={`p-3 border-b flex gap-1.5 ${darkMode ? 'border-[#232e47] bg-slate-900/80' : 'border-slate-100 bg-slate-100/70'}`}>
          <button
            onClick={() => setActiveMode('broken')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'broken'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Broken Curves ({brokenSummary.totalBrokenArticles || brokenData.length})</span>
          </button>

          <button
            onClick={() => setActiveMode('radar')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'radar'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>Low Stock Radar ({filteredData.length})</span>
          </button>
        </div>

        {/* MODE 1: BROKEN SIZE CURVES */}
        {activeMode === 'broken' && (
          <>
            {/* KPI Banner */}
            <div className={`p-4 border-b ${darkMode ? 'border-[#232e47] bg-rose-950/20' : 'border-rose-100 bg-rose-50/60'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-rose-400' : 'text-rose-700'}`}>
                    Core Size Imbalance Detected
                  </span>
                </div>
                <button 
                  onClick={fetchBrokenCurves} 
                  title="Re-scan Curves"
                  className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-2xs'}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${brokenLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`p-2 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-[#232e47]' : 'bg-white border-rose-100 shadow-2xs'}`}>
                  <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Est. Lost Sales</p>
                  <p className="text-sm font-black text-rose-500">₹{(brokenSummary.totalLostRevenuePotential || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className={`p-2 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-[#232e47]' : 'bg-white border-rose-100 shadow-2xs'}`}>
                  <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Critical Holes</p>
                  <p className="text-sm font-black text-amber-500">{brokenSummary.criticalHoles || 0} styles</p>
                </div>
                <div className={`p-2 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-[#232e47]' : 'bg-white border-rose-100 shadow-2xs'}`}>
                  <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tail Heavy</p>
                  <p className={`text-sm font-black ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{brokenSummary.tailHeavy || 0} styles</p>
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 mt-3 overflow-x-auto custom-scrollbar pb-1">
                {[
                  { id: 'all', label: 'All Broken' },
                  { id: 'CRITICAL_HOLE', label: '🔴 40 / 32 Out' },
                  { id: 'TAIL_HEAVY', label: '⚠️ Tail Heavy' },
                  { id: 'Topwear', label: '👕 Tops' },
                  { id: 'Bottomwear', label: '👖 Bottoms' }
                ].map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => setBrokenFilter(chip.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      brokenFilter === chip.id
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className={`p-3 border-b ${darkMode ? 'border-[#232e47]' : 'border-slate-100'}`}>
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter broken styles (article code, name)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-none focus:border-rose-500 shadow-2xs transition-colors ${darkMode ? 'bg-[#1a2333] border-[#232e47] text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
                />
              </div>
            </div>

            {/* Broken Curve List */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar ${darkMode ? 'bg-[#0f1115]/50' : 'bg-slate-50/40'}`}>
              {brokenLoading ? (
                <div className={`p-12 flex flex-col items-center justify-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <RefreshCw className="w-8 h-8 animate-spin mb-3 text-rose-500" /> Scanning size curves across inventory...
                </div>
              ) : filteredBroken.length === 0 ? (
                <div className={`p-12 text-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                  No broken curves found matching this filter!
                </div>
              ) : (
                <div className={`divide-y ${darkMode ? 'divide-[#232e47]' : 'divide-slate-100'}`}>
                  {paginatedBroken.map(item => {
                    const isAdded = isCurveAddedToIndent(item);
                    return (
                      <div 
                        key={item.articleNo}
                        className={`p-4 transition-colors border-l-4 ${
                          item.severity === 'CRITICAL_HOLE'
                            ? 'border-rose-500 bg-rose-500/5'
                            : item.severity === 'TAIL_HEAVY'
                            ? 'border-amber-500 bg-amber-500/5'
                            : 'border-blue-500/50'
                        } ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={`font-black text-sm tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {item.articleNo}
                              </h4>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                item.severity === 'CRITICAL_HOLE' 
                                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                  : item.severity === 'TAIL_HEAVY'
                                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                  : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {item.severity === 'CRITICAL_HOLE' ? 'Hole in Curve' : item.severity === 'TAIL_HEAVY' ? 'Tail Heavy' : 'Depleted'}
                              </span>
                            </div>
                            <p className={`text-[11px] font-medium truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {item.articleName} • {item.color}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 block">Total Stock</span>
                            <span className={`text-xs font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                              {item.totalStock} pcs
                            </span>
                          </div>
                        </div>

                        {/* Diagnostic reason */}
                        <p className={`text-[10px] mb-2.5 flex items-center gap-1 font-semibold ${darkMode ? 'text-rose-400/90' : 'text-rose-700'}`}>
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {item.reason}
                        </p>

                        {/* Size Spectrum Visualization */}
                        <div className="mb-3">
                          <span className={`text-[9px] font-black uppercase tracking-wider mb-1 block ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Size Curve Spectrum:
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {Object.entries(item.allSizes || {}).map(([sz, qty]) => {
                              const isMissing = qty === 0;
                              const isCore = (item.missingCore || []).includes(sz) || ['38','40','42','30','32','34'].includes(sz);

                              if (isMissing) {
                                return (
                                  <span 
                                    key={sz} 
                                    title={`Size ${sz} is completely out of stock`}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/15 text-rose-500 border border-rose-500/40 flex items-center gap-1 animate-pulse"
                                  >
                                    <span className="text-[8px]">Sz</span> {sz}: <strong className="underline">0 OUT</strong>
                                  </span>
                                );
                              }

                              return (
                                <span 
                                  key={sz}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    isCore 
                                      ? (darkMode ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                                      : (darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200')
                                  }`}
                                >
                                  <span className="text-[8px] opacity-70">Sz</span> {sz}: {qty}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* 1-Click Action Button */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <span className={`text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Loss: <strong className="text-rose-500">~₹{item.estimatedLoss.toLocaleString('en-IN')}</strong>
                          </span>

                          <button
                            onClick={() => handleAddMissingCurveToIndent(item)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs shadow-rose-600/30'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Added to Indent
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" /> Reorder Missing ({item.missingCore.join(', ')})
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Broken Pagination Controls */}
            {totalBrokenPages > 1 && (
              <div className={`p-3 border-t flex items-center justify-between shrink-0 ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {brokenPage} of {totalBrokenPages}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={brokenPage === 1}
                    onClick={() => setBrokenPage(p => Math.max(1, p - 1))}
                    className={`p-1.5 rounded text-xs font-semibold flex items-center transition-colors ${brokenPage === 1 ? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={brokenPage === totalBrokenPages}
                    onClick={() => setBrokenPage(p => Math.min(totalBrokenPages, p + 1))}
                    className={`p-1.5 rounded text-xs font-semibold flex items-center transition-colors ${brokenPage === totalBrokenPages ? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* MODE 2: REORDER RADAR (ORIGINAL RADAR) */}
        {activeMode === 'radar' && (
          <>
            <div className={`p-4 border-b ${darkMode ? 'border-[#232e47] bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg bg-indigo-600 shadow-indigo-600/30">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className={`text-base font-black tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Low Stock Thresholds
                    </h2>
                    <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{filteredData.length} items reaching low run-rate</p>
                  </div>
                </div>
                <button onClick={fetchSuggestions} className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-[#1a2333] hover:bg-slate-800 text-slate-400' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 shadow-xs'}`}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search catalog by article / name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 shadow-xs transition-colors ${darkMode ? 'bg-[#1a2333] border-[#232e47] text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
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
                  paginatedItems.map((item) => {
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
          </>
        )}
      </div>

      {/* RIGHT PANE: Unified Replenishment & Indent Cart */}
      <div className="flex-1 rounded-2xl relative h-full">
        <div className={`w-full h-full p-0 overflow-hidden flex flex-col relative rounded-2xl border ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
          
          {/* Header */}
          <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'border-[#232e47] bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
            <div>
              <span className="text-[10px] uppercase font-black text-indigo-600 tracking-widest">Replenishment Desk</span>
              <h3 className={`text-xl font-black mt-0.5 flex items-center ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                <ClipboardList className="w-5 h-5 mr-2.5 text-indigo-500" /> Warehouse Indent Cart
              </h3>
            </div>
            <div className="flex gap-4 items-center text-right">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Queued Sizes</p>
                <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedCount}</p>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-[#232e47]"></div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Units</p>
                <p className={`text-lg font-black text-indigo-500`}>{totalUnits}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            {cartItems.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center text-center border-2 border-dashed rounded-2xl p-8 ${darkMode ? 'border-[#232e47] bg-[#1a2333]' : 'border-slate-200 bg-slate-50'}`}>
                <ClipboardList className={`w-12 h-12 mb-3 opacity-40 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <h4 className={`text-base font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Indent Cart is Empty</h4>
                <p className={`text-xs max-w-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Select articles from <strong>Broken Curves</strong> ⚡ or <strong>Low Stock Radar</strong> 📦 on the left to queue missing sizes into your indent.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cartItems.map(item => {
                  const id = item.id;
                  const qty = item.Qty;
                  return (
                    <div key={id} className={`flex items-center justify-between p-3.5 rounded-xl border shadow-2xs ${darkMode ? 'bg-[#1a2333] border-[#232e47]' : 'bg-white border-slate-200'}`}>
                      <div>
                        <h5 className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {item.ArticleNo} <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded font-black ${darkMode ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>Sz: {item.Size}</span>
                        </h5>
                        <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{item.ArticleName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center border rounded-lg overflow-hidden ${darkMode ? 'border-[#232e47]' : 'border-slate-200'}`}>
                          <button onClick={() => handleQtyChange(id, qty - 1)} className={`p-1.5 transition-colors ${darkMode ? 'bg-[#121829] hover:bg-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input 
                            type="number" 
                            min="0"
                            value={qty} 
                            onChange={e => handleQtyChange(id, e.target.value)}
                            className={`w-12 text-center font-bold text-xs focus:outline-none ${darkMode ? 'bg-[#1a2333] text-white' : 'bg-white text-slate-800'}`}
                          />
                          <button onClick={() => handleQtyChange(id, qty + 1)} className={`p-1.5 transition-colors ${darkMode ? 'bg-[#121829] hover:bg-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button onClick={() => handleQtyChange(id, 0)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`p-4 border-t flex gap-2.5 ${darkMode ? 'border-[#232e47] bg-[#1a2333]' : 'border-slate-200 bg-white'}`}>
            <button
              onClick={generateIndent}
              disabled={selectedCount === 0 || generating}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:dark:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {generating ? 'Compiling Indent...' : `Generate Indent (${totalUnits} Pcs)`}
            </button>
          </div>

        </div>
      </div>

      {/* Indent Result Modal */}
      {indentResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className={`rounded-2xl p-6 w-full max-w-lg shadow-2xl border animate-in zoom-in-95 ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-xl font-black mb-1 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              <CheckCircle2 className="w-6 h-6 text-green-500"/> Indent Ready for Dispatch
            </h3>
            <p className={`text-xs mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Formatted for supplier / warehouse reorder with exact size breakups.
            </p>
            
            <textarea 
              readOnly 
              value={indentResult.text}
              className={`w-full h-64 p-4 font-mono text-xs rounded-xl mb-5 focus:outline-none custom-scrollbar ${darkMode ? 'bg-black text-green-400 border border-[#232e47]' : 'bg-slate-900 text-green-400'}`} 
            />
            
            <div className="flex justify-end gap-2.5">
              <button 
                onClick={() => setIndentResult(null)} 
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${darkMode ? 'text-slate-400 hover:bg-[#1a2333]' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Close
              </button>
              
              <button 
                onClick={() => { 
                  navigator.clipboard.writeText(indentResult.text); 
                  setCopied(true); 
                  setTimeout(()=>setCopied(false), 2000); 
                }} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-4 h-4"/> : <ClipboardList className="w-4 h-4"/>}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              
              <button 
                onClick={() => {
                  const url = `https://wa.me/?text=${encodeURIComponent(indentResult.text)}`;
                  window.open(url, '_blank');
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-md shadow-green-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-4 h-4"/>
                WhatsApp Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
