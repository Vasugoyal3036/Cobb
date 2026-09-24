import React from 'react';
import {
  Package, Search, Sparkles, Wand2, Send, ChevronLeft, ChevronRight, Tag, Layers, Barcode
} from 'lucide-react';

const InventoryTab = (props) => {
  const { 
    deadStock, 
    searchQuery, 
    setSearchQuery, 
    darkMode, 
    activeOutfitMatch, 
    setActiveOutfitMatch, 
    outfitPitch, 
    isGeneratingOutfit, 
    handleGenerateOutfitMatch 
  } = props;

  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 30;

  // Reset page to 1 whenever search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const rawList = Array.isArray(deadStock) ? deadStock : [];
  const filteredList = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rawList;
    return rawList.filter(i => 
      i.ArticleNo?.toLowerCase().includes(q) || 
      i.ItemName?.toLowerCase().includes(q)
    );
  }, [rawList, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedItems = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Handle Selection
  const [selectedItem, setSelectedItem] = React.useState(null);

  // If user clicks "Style Match", it triggers handleGenerateOutfitMatch.
  // Make sure we select the item too.
  const handleItemClick = (item) => {
    setSelectedItem(item);
    if (activeOutfitMatch !== item.ArticleNo) {
      setActiveOutfitMatch(null); // Clear previous pitch
    }
  };

  const handleGeneratePitch = (item) => {
    setSelectedItem(item);
    handleGenerateOutfitMatch(item);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-[1600px] mx-auto pb-6">
      
      {/* LAYER 2: Master List (Middle Pane) */}
      <div className={`w-full lg:w-[420px] shrink-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
        
        {/* Header */}
        <div className={`p-5 border-b ${darkMode ? 'border-[#232e47] bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg bg-blue-600 shadow-blue-600/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-lg font-black tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Inventory Explorer
              </h2>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{filteredList.length} total articles</p>
            </div>
          </div>

          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by SKU or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:border-blue-500 shadow-sm transition-colors ${darkMode ? 'bg-[#1a2333] border-[#232e47] text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
            />
          </div>
        </div>

        {/* List */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${darkMode ? 'bg-[#0f1115]/50' : 'bg-slate-50/30'}`}>
          <div className={`divide-y ${darkMode ? 'divide-[#232e47]' : 'divide-slate-100'}`}>
            {rawList.length === 0 ? (
              <div className={`p-8 text-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Loading inventory...</div>
            ) : paginatedItems.length > 0 ? (
              paginatedItems.map((item, idx) => (
                <button 
                  key={item.ArticleNo || idx} 
                  onClick={() => handleItemClick(item)} 
                  className={`w-full text-left p-4 transition-colors group flex items-start justify-between border-l-4 ${
                    selectedItem?.ArticleNo === item.ArticleNo 
                      ? (darkMode ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50/80 border-blue-500') 
                      : (darkMode ? 'border-transparent hover:bg-slate-800/50' : 'border-transparent hover:bg-blue-50/50')
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {item.ArticleNo}
                      </h4>
                      <p className={`text-[11px] mt-0.5 max-w-[200px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.ItemName}</p>
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                    <span className="font-black text-blue-500 text-sm">
                      {item.SkuCount} SKUs
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className={`p-8 text-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No items matched your search filter.</div>
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
                className={`p-1.5 rounded text-xs font-semibold flex items-center transition-colors ${
                  currentPage === 1 
                    ? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed')
                    : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={`p-1.5 rounded text-xs font-semibold flex items-center transition-colors ${
                  currentPage === totalPages 
                    ? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed')
                    : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LAYER 3: Detail View (Main Pane) */}
      <div className="flex-1 rounded-2xl relative h-full">
        {selectedItem ? (
          <div className={`w-full h-full p-0 overflow-hidden flex flex-col relative rounded-2xl border ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
            
            {/* Header */}
            <div className={`p-6 lg:p-8 border-b ${darkMode ? 'border-[#232e47] bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <span className="text-[10px] uppercase font-black text-blue-600 tracking-widest">Article Dossier</span>
              <div className="mt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className={`text-2xl lg:text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedItem.ArticleNo}</h3>
                  <p className={`mt-1 text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{selectedItem.ItemName}</p>
                </div>
                <button
                  onClick={() => handleGeneratePitch(selectedItem)}
                  disabled={isGeneratingOutfit && activeOutfitMatch === selectedItem.ArticleNo}
                  className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 rounded-xl font-bold text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingOutfit && activeOutfitMatch === selectedItem.ArticleNo ? 'Generating Pitch...' : <><Sparkles className="w-4 h-4 mr-2" /> AI Style Pitch</>}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-8">
              
              {/* AI Pitch Section */}
              {activeOutfitMatch === selectedItem.ArticleNo && outfitPitch && (
                <div className={`border p-6 rounded-2xl shadow-sm relative overflow-hidden animate-in zoom-in-95 duration-300 ${darkMode ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-white border-indigo-200'}`}>
                  <div className="absolute top-0 right-0 w-1.5 bg-indigo-500 h-full"></div>
                  <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mb-4 flex items-center">
                    <Wand2 className="w-4 h-4 mr-2" /> AI "Style of the Week" Pitch
                  </p>
                  <p className={`text-sm md:text-base whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-indigo-100' : 'text-slate-700'}`}>{outfitPitch}</p>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(outfitPitch)}`, '_blank')}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-green-500/30 transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4 mr-2" /> Share to WhatsApp Status
                    </button>
                  </div>
                </div>
              )}

              {/* SKU Details Table */}
              <div>
                <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Barcode className="w-4 h-4" /> Available Variations in Store
                </h4>
                {selectedItem.SkuDetails ? (
                  <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-[#232e47]' : 'border-slate-200'}`}>
                    <table className="min-w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b text-[10px] uppercase tracking-wider font-bold ${darkMode ? 'bg-slate-900/50 border-[#232e47] text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          <th className="px-4 py-3">Color</th>
                          <th className="px-4 py-3">Size</th>
                          <th className="px-4 py-3 font-mono">Barcode / SKU</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-[#232e47]' : 'divide-slate-100'}`}>
                        {selectedItem.SkuDetails.split(',').map((detail, dIdx) => {
                          const [sku, color, size] = detail.split('|');
                          return (
                            <tr key={dIdx} className={darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                              <td className={`px-4 py-3 text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{color || 'N/A'}</td>
                              <td className={`px-4 py-3 text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{size || 'N/A'}</td>
                              <td className={`px-4 py-3 text-xs font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{sku}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={`p-8 text-center rounded-xl border border-dashed ${darkMode ? 'bg-[#1a2333] border-[#232e47] text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    No detailed SKUs found for this article.
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center h-full text-center p-8 border rounded-2xl border-dashed ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-slate-50/50 border-slate-200'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-[#1a2333]' : 'bg-blue-50'}`}>
              <Package className={`w-10 h-10 ${darkMode ? 'text-blue-900/50' : 'text-blue-200'}`} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Select an Article</h3>
            <p className={`text-sm max-w-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Choose an article from the master list to view variations in stock and generate AI styling pitches.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default InventoryTab;
