import React from 'react';
import {
  Users, Search, RefreshCw, Sparkles, Award, Crown, ChevronLeft, ChevronRight, Target
} from 'lucide-react';
import CustomerProfileModal from '../CustomerProfileModal';

const CustomerInsightsTab = (props) => {
  const { 
    activeTab, 
    searchQuery, 
    setSearchQuery, 
    globalCustomers, 
    vips, 
    dormant, 
    isSearchingCustomers, 
    openCustomerCard,
    selectedCustomer,
    formatCurrency,
    darkMode
  } = props;

  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 25;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const targetList = (searchQuery.trim() !== '' ? globalCustomers : (activeTab === 'vip' ? (vips || []) : (dormant || []))) || [];
  const filteredCustomers = React.useMemo(() => {
    const sq = searchQuery.trim().toLowerCase();
    if (!sq) return targetList;
    return targetList.filter(c => 
      `${c.FirstName || ''} ${c.LastName || ''}`.trim().toLowerCase().includes(sq) || 
      c.Phone?.includes(sq) || 
      (!isNaN(parseFloat(sq)) && Math.round(c.LifetimeSpend) === Math.round(parseFloat(sq)))
    );
  }, [targetList, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const paginatedCustomers = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-[1600px] mx-auto pb-6">
      
      {/* LAYER 2: Master List (Middle Pane) */}
      <div className={`w-full lg:w-[420px] shrink-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-white border-slate-200'}`}>
        
        {/* Header */}
        <div className={`p-5 border-b ${darkMode ? 'border-[#232e47] bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${activeTab === 'vip' ? 'bg-blue-600 shadow-blue-600/30' : 'bg-rose-500 shadow-rose-500/30'}`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-lg font-black tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {activeTab === 'vip' ? 'VIP Loyalty Clients' : 'Dormant Customers'}
              </h2>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{filteredCustomers.length} total profiles</p>
            </div>
          </div>

          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:border-blue-500 shadow-sm transition-colors ${darkMode ? 'bg-[#1a2333] border-[#232e47] text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
            />
            {isSearchingCustomers && (
              <div className="absolute right-3 top-2.5">
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* List */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${darkMode ? 'bg-[#0f1115]/50' : 'bg-slate-50/30'}`}>
          <div className={`divide-y ${darkMode ? 'divide-[#232e47]' : 'divide-slate-100'}`}>
            {targetList.length === 0 ? (
              <div className={`p-8 text-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Loading customers...</div>
            ) : paginatedCustomers.length > 0 ? (
              paginatedCustomers.map((customer, idx) => (
                <button 
                  key={customer.Phone || idx} 
                  onClick={() => openCustomerCard(customer)} 
                  className={`w-full text-left p-4 transition-colors group flex items-start justify-between border-l-4 ${
                    selectedCustomer?.Phone === customer.Phone 
                      ? (darkMode ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50/80 border-blue-500') 
                      : (darkMode ? 'border-transparent hover:bg-slate-800/50' : 'border-transparent hover:bg-blue-50/50')
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                      {customer.FirstName?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {customer.FirstName} {customer.LastName || ''}
                      </h4>
                      <p className={`font-mono text-[11px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{customer.Phone}</p>
                      
                      {customer.loyaltyTier && (
                        <span className={`mt-1.5 inline-flex text-[9px] uppercase font-bold px-1.5 py-0.5 rounded items-center gap-1 w-max border ${
                          customer.loyaltyTier === 'Platinum' ? (darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-500/30' : 'bg-blue-100 text-blue-700 border-blue-200') :
                          customer.loyaltyTier === 'Gold' ? (darkMode ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border-yellow-200') :
                          customer.loyaltyTier === 'Silver' ? (darkMode ? 'bg-slate-800 text-slate-300 border-slate-600' : 'bg-slate-200 text-slate-700 border-slate-300') :
                          (darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-500/30' : 'bg-orange-100 text-orange-700 border-orange-200')
                        }`}>
                          <Crown className="w-3 h-3" /> {customer.loyaltyTier}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                    <span className="font-black text-emerald-500 text-sm">
                      {formatCurrency(customer.LifetimeSpend)}
                    </span>
                    {activeTab === 'vip' 
                      ? <span className={`text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded ${darkMode ? 'bg-[#1a2333] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{customer.TotalBills} Bills</span>
                      : <span className={`text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded border ${darkMode ? 'bg-red-900/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-500 border-red-100'}`}>{customer.DaysSinceLastVisit}d ago</span>
                    }
                  </div>
                </button>
              ))
            ) : (
              <div className={`p-8 text-center font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No customer records found.</div>
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
        {selectedCustomer ? (
          <CustomerProfileModal inline={true} {...props} />
        ) : (
          <div className={`flex flex-col items-center justify-center h-full text-center p-8 border rounded-2xl border-dashed ${darkMode ? 'bg-[#121829] border-[#232e47]' : 'bg-slate-50/50 border-slate-200'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-[#1a2333]' : 'bg-blue-50'}`}>
              <Users className={`w-10 h-10 ${darkMode ? 'text-blue-900/50' : 'text-blue-200'}`} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Select a Client Profile</h3>
            <p className={`text-sm max-w-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Choose a customer from the master list to view their deep wardrobe history, AI-generated persona, and start a 1-on-1 engagement.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default CustomerInsightsTab;
