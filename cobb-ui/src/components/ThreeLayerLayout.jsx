import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const ThreeLayerLayout = ({
  darkMode,
  title,
  description,
  icon: Icon,
  iconColorClass = "bg-blue-600 shadow-blue-600/30",
  items = [],
  searchQuery,
  setSearchQuery,
  searchPlaceholder = "Search...",
  renderMasterItem,
  onItemClick,
  selectedItem,
  isSelected, // (item) => boolean
  renderDetail,
  emptyMasterText = "No items found.",
  emptyDetailTitle = "Select an Item",
  emptyDetailText = "Choose an item from the list to view details.",
  emptyDetailIcon: EmptyIcon = Search,
  pageSize = 30
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-[1600px] mx-auto pb-6">
      
      {/* LAYER 2: Master List (Middle Pane) */}
      <div className={`w-full lg:w-[420px] shrink-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
        
        {/* Header */}
        <div className={`p-5 border-b ${darkMode ? 'border-[#232e47] bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${iconColorClass}`}>
              {Icon && <Icon className="w-5 h-5" />}
            </div>
            <div>
              <h2 className={`text-lg font-black tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </h2>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{items.length} total items</p>
            </div>
          </div>

          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:border-blue-500 shadow-sm transition-colors ${darkMode ? 'bg-[#1a2333] border-[#232e47] text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
            />
          </div>
        </div>

        {/* List */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${darkMode ? 'bg-[#0f1115]/50' : 'bg-slate-50/30'}`}>
          <div className={`divide-y ${darkMode ? 'divide-[#232e47]' : 'divide-slate-100'}`}>
            {items.length === 0 ? (
              <div className={`p-8 text-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{emptyMasterText}</div>
            ) : (
              paginatedItems.map((item, idx) => {
                const active = isSelected ? isSelected(item) : selectedItem === item;
                return (
                  <button 
                    key={idx} 
                    onClick={() => onItemClick(item)} 
                    className={`w-full text-left p-4 transition-colors group flex items-start justify-between border-l-4 ${
                      active 
                        ? (darkMode ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50/80 border-blue-500') 
                        : (darkMode ? 'border-transparent hover:bg-slate-800/50' : 'border-transparent hover:bg-blue-50/50')
                    }`}
                  >
                    {renderMasterItem(item, active)}
                  </button>
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
            {renderDetail(selectedItem)}
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center h-full text-center p-8 border rounded-2xl border-dashed ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-slate-50/50 border-slate-200'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-[#1a2333]' : 'bg-blue-50'}`}>
              <EmptyIcon className={`w-10 h-10 ${darkMode ? 'text-blue-900/50' : 'text-blue-200'}`} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{emptyDetailTitle}</h3>
            <p className={`text-sm max-w-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{emptyDetailText}</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ThreeLayerLayout;
