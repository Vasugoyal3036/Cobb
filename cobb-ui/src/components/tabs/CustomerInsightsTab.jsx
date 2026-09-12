import React from 'react';
import {
  LineChart,
  MessageCircle,
  Users,
  AlertCircle,
  MessageSquare,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Package,
  Terminal,
  Play,
  Square,
  Radio,
  Clock,
  Archive,
  Send,
  ChevronDown,
  ChevronUp,
  Layers,
  Tag,
  Calendar,
  BarChart3,
  Search,
  X,
  UserCheck,
  ShoppingBag,
  Sparkles,
  Wand2,
  TrendingDown,
  Activity,
  Megaphone,
  Target,
  Zap,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Star,
  Sun,
  Moon,
  Shirt,
  Scissors,
  Calculator,
  FileText,
  Grid,
  DollarSign,
  CheckCircle2,
  Menu,
  Barcode,
  Scan,
  Flame,
  Award,
  Trophy,
  RotateCcw,
  Map,
  Crown,
  ThumbsUp,
  Upload,
  Camera,
  Percent,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const CustomerInsightsTab = (props) => {
  const { totalMonthlyUnits, totalMonthlyRevenue, maxHourlyRevenue, averageOrderValue, DAILY_TARGET, targetProgress, API_BASE, vips, setVips, dormant, setDormant, darkMode, setDarkMode, overviewStats, setOverviewStats, returnsData, setReturnsData, smartCoordinate, setSmartCoordinate, showCoordinateModal, setShowCoordinateModal, vmImages, setVmImages, vmImageUrls, setVmImageUrls, vmAuditResult, setVmAuditResult, isAuditing, setIsAuditing, vmError, setVmError, bundles, setBundles, isLoadingBundles, setIsLoadingBundles, publishedBundles, setPublishedBundles, handleVmUpload, fetchTrendForecast, handleCompUpload, fetchBundles, globalCustomers, setGlobalCustomers, isSearchingCustomers, setIsSearchingCustomers, liveBills, setLiveBills, inventory, setInventory, deadStock, setDeadStock, hourlySales, setHourlySales, dailySales, setDailySales, monthlyProducts, setMonthlyProducts, gstSummary, setGstSummary, gstRateSlab, setGstRateSlab, gstCopied, setGstCopied, sizeMatrix, setSizeMatrix, wardrobeProfiles, setWardrobeProfiles, pnlData, setPnlData, retentionData, setRetentionData, reconData, setReconData, countedCashInput, setCountedCashInput, reconNotes, setReconNotes, showReconModal, setShowReconModal, showEodModal, setShowEodModal, eodSummaryText, setEodSummaryText, eodCopied, setEodCopied, isMobileMenuOpen, setIsMobileMenuOpen, matrixCategoryFilter, setMatrixCategoryFilter, isListenerRunning, setIsListenerRunning, isTogglingListener, setIsTogglingListener, listenerLogs, setListenerLogs, isGatewayRunning, setIsGatewayRunning, isTogglingGateway, setIsTogglingGateway, isGatewayReady, setIsGatewayReady, gatewayQr, setGatewayQr, gatewayLogs, setGatewayLogs, testPhone, setTestPhone, testMsg, setTestMsg, isSendingTestWa, setIsSendingTestWa, broadcastGroup, setBroadcastGroup, broadcastGroupCount, setBroadcastGroupCount, broadcastStatus, setBroadcastStatus, broadcastMsg, setBroadcastMsg, isStartingBroadcast, setIsStartingBroadcast, isSyncingGroup, setIsSyncingGroup, groupSearchQuery, setGroupSearchQuery, topMoversData, setTopMoversData, activeTab, setActiveTab, activeConsole, setActiveConsole, searchQuery, setSearchQuery, selectedCustomer, setSelectedCustomer, customerHistory, setCustomerHistory, loadingHistory, setLoadingHistory, customerPersona, setCustomerPersona, loadingPersona, setLoadingPersona, aiMessageType, setAiMessageType, generatedMsg, setGeneratedMsg, isGenerating, setIsGenerating, generateWhatsAppDraft, activeOutfitMatch, setActiveOutfitMatch, outfitPitch, setOutfitPitch, isGeneratingOutfit, setIsGeneratingOutfit, campaignEvent, setCampaignEvent, campaignAudience, setCampaignAudience, campaignDraft, setCampaignDraft, isGeneratingCampaign, setIsGeneratingCampaign, openProductType, setOpenProductType, openMonth, setOpenMonth, selectedCalendarDay, setSelectedCalendarDay, expandedBillId, setExpandedBillId, billItemsCache, setBillItemsCache, loadingBillItems, setLoadingBillItems, handleKeyDown, toggleBillExpansion, fetchAutomationStatus, toggleListener, toggleGateway, handleSendTestWhatsApp, handleSyncBroadcastGroup, handleStartBroadcast, handleStopBroadcast, handleExportGroupCsv, openCustomerCard, handleGenerateAI, handleGenerateOutfitMatch, handleGenerateCampaign, handleSaveReconciliation, handleGenerateEodReport, handleMasterRestock, formatCurrency, MASTER_CATEGORIES, classifySubCategory, handleGlobalSearch, renderLogLine, persona, handleGenerateSmartCoordinate, trendForecast, isForecasting, compImage, compImageUrl, compIntelResult, isAnalyzingComp, compError } = props;

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
    <>
      {(activeTab === 'vip' || activeTab === 'dormant') && (
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-6 mb-6 gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                {activeTab === 'vip' ? 'VIP Loyalty Clients' : 'Dormant Customers'} ({filteredCustomers.length} total)
              </h3>
              <p className="text-sm text-slate-500 mt-2">Click on any customer to open their wardrobe history and AI persona.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Name, Phone, or Amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 shadow-sm transition-colors"
              />
              {isSearchingCustomers && (
                <div className="absolute right-3 top-2.5">
                  <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bronze Tier</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">&lt; ₹5K</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center border border-orange-200/50 shadow-inner">
                <span className="text-lg font-black text-orange-600">{(vips || []).filter(c => c.LifetimeSpend < 5000 && c.TotalBills < 10).length}</span>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Silver Tier</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">₹5K - ₹20K</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-slate-300/50 shadow-inner">
                <span className="text-lg font-black text-slate-600">{(vips || []).filter(c => c.LifetimeSpend >= 5000 && c.LifetimeSpend < 20000 && c.TotalBills < 10).length}</span>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gold Tier</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">₹20K - ₹50K</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center border border-yellow-200/50 shadow-inner">
                <span className="text-lg font-black text-yellow-600">{(vips || []).filter(c => c.LifetimeSpend >= 20000 && c.LifetimeSpend < 50000 && c.TotalBills < 10).length}</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl border border-blue-500 shadow-[0_8px_30px_rgb(59,130,246,0.3)] flex items-center justify-between hover:shadow-[0_8px_30px_rgb(59,130,246,0.5)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Award className="w-24 h-24 text-white" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Diamond Tier</p>
                <p className="text-2xl font-black text-white tracking-tight">₹50K+ or 10+ Visits</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 relative z-10 shadow-inner">
                <span className="text-lg font-black text-white">{(vips || []).filter(c => (c.LifetimeSpend >= 50000) || (c.TotalBills >= 10)).length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg overflow-x-auto relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500"></div>
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Client Identity</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contact</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Lifetime Value</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targetList.length === 0 ? (
                  Array.from({ length: 6 }).map((_, sIdx) => (
                    <tr key={sIdx} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                    </tr>
                  ))
                ) : paginatedCustomers.length > 0 ? (
                  paginatedCustomers.map((customer, idx) => (
                    <tr key={customer.Phone || idx} onClick={() => openCustomerCard(customer)} className="hover:bg-blue-50/50 cursor-pointer transition-all group">
                      <td className="px-6 py-4 font-bold text-slate-800 flex items-center whitespace-nowrap">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-black text-xs">
                          {customer.FirstName?.charAt(0) || 'C'}
                        </div>
                        {customer.FirstName} {customer.LastName || ''}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-sm whitespace-nowrap">{customer.Phone}</td>
                      <td className="px-6 py-4 font-black text-green-600 whitespace-nowrap">
                        {formatCurrency(customer.LifetimeSpend)}
                        {customer.loyaltyTier && (
                          <div className="mt-1">
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1 w-max ${
                              customer.loyaltyTier === 'Platinum' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                              customer.loyaltyTier === 'Gold' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                              customer.loyaltyTier === 'Silver' ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                              'bg-orange-100 text-orange-700 border border-orange-200'
                            }`}>
                              <Crown className="w-3 h-3" /> {customer.loyaltyTier}
                            </span>
                            {customer.nextTier && (
                              <p className="text-[9px] text-slate-400 mt-0.5 font-normal">
                                ₹{formatCurrency(customer.spendToNextTier)} to {customer.nextTier}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activeTab === 'vip' 
                          ? <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg text-sm">{customer.TotalBills} Invoices</span>
                          : <span className="text-red-500 font-bold bg-red-50 px-3 py-1 rounded-lg text-sm border border-red-100">{customer.DaysSinceLastVisit} Days</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center text-xs text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 px-3 py-1.5 rounded-lg">
                          Open Profile &rarr;
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">No customer records found.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="text-xs text-slate-500 font-medium">
                  Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredCustomers.length)} of {filteredCustomers.length} clients
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                      currentPage === 1 
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <span className="text-xs font-semibold text-slate-600 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                      currentPage === totalPages 
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

{activeTab === 'returns' && (
              <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50">
              <div className="space-y-6">
                {/* RETURNS & EXCHANGES TRACKER */}
                <div className="border-b border-slate-200 pb-5">
                  <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                    <RotateCcw className="w-6 h-6 mr-3 text-amber-500" /> Returns & Exchange Tracker
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Track cancelled bills, return rates, and top returned product categories.</p>
                </div>

                {returnsData ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Returns</p>
                        <h4 className="text-3xl font-black text-amber-600 mt-2">{returnsData.today.ReturnCount}</h4>
                        <p className="text-xs text-slate-400 mt-1">Refund: <span className="font-bold text-slate-700">{formatCurrency(returnsData.today.RefundAmount)}</span></p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Returns</p>
                        <h4 className="text-3xl font-black text-rose-600 mt-2">{returnsData.monthly.ReturnCount}</h4>
                        <p className="text-xs text-slate-400 mt-1">Refund: <span className="font-bold text-slate-700">{formatCurrency(returnsData.monthly.RefundAmount)}</span></p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Return Rate</p>
                        <h4 className={`text-3xl font-black mt-2 ${returnsData.returnRatePct <= 3 ? 'text-green-600' : returnsData.returnRatePct <= 8 ? 'text-amber-600' : 'text-rose-600'}`}>{returnsData.returnRatePct}%</h4>
                        <p className="text-xs text-slate-400 mt-1">{returnsData.monthly.ReturnCount} of {returnsData.totalMonthlyBills} total bills</p>
                      </div>
                      <div className={`p-5 rounded-2xl shadow-sm border ${returnsData.returnRatePct <= 3 ? 'bg-green-50 border-green-200' : returnsData.returnRatePct <= 8 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Status</p>
                        <h4 className={`text-xl font-black mt-2 ${returnsData.returnRatePct <= 3 ? 'text-green-700' : returnsData.returnRatePct <= 8 ? 'text-amber-700' : 'text-rose-700'}`}>
                          {returnsData.returnRatePct <= 3 ? '✅ Excellent' : returnsData.returnRatePct <= 8 ? '⚠️ Watch' : '🚨 High'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">{returnsData.returnRatePct <= 3 ? 'Return rate is healthy and within normal range.' : returnsData.returnRatePct <= 8 ? 'Slightly elevated — review sizing and quality.' : 'Investigate product quality or sizing issues.'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Top Returned Categories */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center">
                            <Tag className="w-4 h-4 mr-2 text-amber-500" /> Top Returned Categories
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">Last 3 months</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {returnsData.topReturnedCategories.length > 0 ? returnsData.topReturnedCategories.map((cat, idx) => {
                            const maxUnits = returnsData.topReturnedCategories[0]?.ReturnedUnits || 1;
                            const barWidth = Math.max((cat.ReturnedUnits / maxUnits) * 100, 8);
                            return (
                              <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-sm font-bold text-slate-700">{cat.Category}</span>
                                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">{cat.ReturnedUnits} units</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                  <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${barWidth}%` }}></div>
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[10px] text-slate-400">{cat.ReturnBills} bills</span>
                                  <span className="text-[10px] text-slate-400">{formatCurrency(cat.RefundValue)}</span>
                                </div>
                              </div>
                            );
                          }) : (
                            <div className="p-8 text-center text-sm text-slate-400">No return category data available.</div>
                        )}
                        </div>
                      </div>

                      {/* Recent Returns List */}
                      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center">
                            <Receipt className="w-4 h-4 mr-2 text-rose-500" /> Recent Returned Bills
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{returnsData.recentReturns.length} Records</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Bill #</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Items</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Refund</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {returnsData.recentReturns.length > 0 ? returnsData.recentReturns.map((ret, idx) => (
                                <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                                  <td className="px-5 py-3.5 text-sm font-bold text-slate-700">{ret.BillNumber}</td>
                                  <td className="px-5 py-3.5">
                                    <span className="text-sm font-bold text-slate-800">{ret.CustomerName?.trim() || 'Guest'}</span>
                                    {ret.Phone && <p className="text-xs text-slate-400 font-mono mt-0.5">{ret.Phone}</p>}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <span className="text-sm font-bold text-slate-800">{ret.ItemCount} pcs</span>
                                    {ret.ArticleDetails && <p className="text-xs text-slate-400 mt-0.5">{ret.ArticleDetails}</p>}
                                  </td>
                                  <td className="px-5 py-3.5 text-sm font-black text-rose-600 text-right">{formatCurrency(ret.RefundAmount)}</td>
                                  <td className="px-5 py-3.5 text-xs text-slate-400 text-right">{ret.ReturnDate ? new Date(ret.ReturnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}</td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan="5" className="px-5 py-10 text-center text-sm text-slate-400">
                                    <RotateCcw className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                                    No returns found. Great news!
                                  </td>
                                </tr>
                          )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                    <RotateCcw className="w-8 h-8 mx-auto mb-3 text-slate-300 animate-spin" />
                    <p className="text-sm text-slate-400">Loading returns data...</p>
                  </div>
            )}
              </div>
              </div>


)}

{activeTab === 'trend_forecast' && (
            <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50 space-y-8 animate-in fade-in duration-500">
              {/* TREND FORECAST PAGE */}
              <div className="border-b border-slate-200 pb-5 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                    <LineChart className="w-6 h-6 mr-3 text-indigo-600" /> AI Fashion Trend Forecaster
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">Predict upcoming seasonal demands based on market analysis and past performance.</p>
                </div>
                <button onClick={fetchTrendForecast} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 shadow-sm flex items-center gap-2 hover:bg-slate-50 cursor-pointer">
                  <Sparkles className={`w-4 h-4 ${isForecasting ? 'animate-spin' : 'text-indigo-500'}`} /> {isForecasting ? 'Forecasting...' : 'Generate AI Forecast'}
                </button>
              </div>

              {isForecasting ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                  <LineChart className="w-10 h-10 animate-bounce mb-4 text-indigo-400" />
                  <p className="font-bold">Analyzing fashion trends and cross-referencing sales data...</p>
                </div>
              ) : trendForecast ? (
                <div className="space-y-6">
                  <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                    <h4 className="font-black text-lg">Forecast for: {trendForecast.season}</h4>
                    <span className="text-xs font-bold uppercase tracking-wider bg-white px-2 py-1 rounded text-indigo-600">High Confidence</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {trendForecast.trends.map((trend, idx) => (
                      <div key={idx} className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col justify-between group hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all">
                        
                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider bg-indigo-900/50 backdrop-blur-sm border border-indigo-700/50 px-3 py-1.5 rounded-full">{trend.category}</span>
                            <div className="bg-emerald-900/30 backdrop-blur-sm border border-emerald-800/50 px-4 py-2 rounded-2xl text-center shadow-sm">
                              <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Demand Surge</span>
                              <span className="block text-xl font-black text-emerald-400">{trend.predictedDemandSurge}</span>
                            </div>
                          </div>
                          
                          <h4 className="text-3xl font-black text-white tracking-tight">{trend.trendName}</h4>
                          
                          {/* Confidence Score Gauge */}
                          <div className="mt-5 mb-8">
                            <div className="flex justify-between items-end mb-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Confidence</span>
                              <span className="text-sm font-black text-indigo-400">{trend.confidenceScore}%</span>
                            </div>
                            <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                              <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-2 rounded-full" style={{ width: `${trend.confidenceScore}%` }}></div>
                            </div>
                          </div>
                          
                          <div className="p-5 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-sm">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                              <Tag className="w-3 h-3 mr-1.5 text-slate-400" /> High-Margin Catalog Matches
                            </span>
                            <ul className="space-y-4">
                              {trend.suggestedItems?.map((item, i) => (
                                <li key={i} className="flex justify-between items-center border-b border-slate-700/50 pb-3 last:border-0 last:pb-0">
                                  <div className="flex-1 pr-4">
                                    <p className="text-sm font-bold text-slate-200 leading-tight">{item.name}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-white">{item.suggestedPrice}</p>
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{item.estimatedMargin} Margin</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="mt-8">
                          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-colors text-sm flex justify-center items-center shadow-lg shadow-indigo-600/20">
                            Auto-Draft Purchase Order
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed py-16 text-center text-slate-400">
                  <LineChart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-bold text-slate-600">No Forecast Generated</p>
                  <p className="text-sm mt-1">Click "Generate AI Forecast" to view upcoming trends.</p>
                </div>
            )}
            </div>

)}

{activeTab === 'competitor_intel' && (
            <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50 space-y-8 animate-in fade-in duration-500">
              {/* COMPETITOR INTEL PAGE */}
              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                  <Target className="w-6 h-6 mr-3 text-red-600" /> Competitor Promotion Counter-Intelligence
                </h3>
                <p className="text-sm text-slate-500 mt-2">Upload a photo or screenshot of a competitor's offer, and AI will generate a counter-strategy to protect margins.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800">Upload Competitor Ad</h4>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-8 bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer relative">
                      <input type="file" accept="image/*" onChange={(e) => handleCompUpload(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <Target className="w-10 h-10 text-slate-400 mb-3" />
                      <span className="text-sm font-bold text-slate-600">Upload Flyer / Screenshot</span>
                    </div>
                    {compImageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 mt-4">
                        <img src={compImageUrl} alt="Competitor Intel" className="w-full h-48 object-cover" />
                      </div>
                )}
                  </div>
                </div>

                <div>
                  {isAnalyzingComp ? (
                    <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center min-h-[300px]">
                      <Target className="w-10 h-10 animate-ping text-red-500 mb-4" />
                      <h4 className="font-bold text-slate-800">Extracting Offer Logic...</h4>
                    </div>
                  ) : compIntelResult ? (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-in slide-in-from-bottom duration-300">
                      <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                        <span className="text-[10px] text-red-600 uppercase font-black">Detected Competitor Offer</span>
                        <p className="font-bold text-slate-800 mt-1">{compIntelResult.detectedCompetitorOffer}</p>
                      </div>
                      
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                        <span className="text-[10px] text-emerald-600 uppercase font-black flex items-center"><Sparkles className="w-3 h-3 mr-1" /> Cobb Counter-Strategy</span>
                        <p className="font-black text-slate-800 mt-1 text-lg">{compIntelResult.cobbCounterStrategy}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="border border-slate-100 p-3 rounded-xl bg-slate-50">
                          <span className="block text-[10px] text-slate-400 uppercase font-bold">Margin Impact</span>
                          <span className="text-sm font-bold text-emerald-600">{compIntelResult.marginImpact}</span>
                        </div>
                        <div className="border border-slate-100 p-3 rounded-xl bg-slate-50">
                          <span className="block text-[10px] text-slate-400 uppercase font-bold">Execution Difficulty</span>
                          <span className="text-sm font-bold text-amber-600">{compIntelResult.executionDifficulty}</span>
                        </div>
                      </div>
                    </div>
                  ) : compError ? (
                    <div className="bg-red-50 text-red-600 p-6 rounded-3xl">{compError}</div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-12 flex flex-col justify-center items-center text-center min-h-[300px] text-slate-400">
                      <Target className="w-12 h-12 mb-4 text-slate-300" />
                      <p className="font-bold">Awaiting Target Image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

)}
    </>
  );
};

export default CustomerInsightsTab;
