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

const InventoryTab = (props) => {
  const { totalMonthlyUnits, totalMonthlyRevenue, maxHourlyRevenue, averageOrderValue, DAILY_TARGET, targetProgress, API_BASE, vips, setVips, dormant, setDormant, darkMode, setDarkMode, overviewStats, setOverviewStats, returnsData, setReturnsData, smartCoordinate, setSmartCoordinate, showCoordinateModal, setShowCoordinateModal, vmImages, setVmImages, vmImageUrls, setVmImageUrls, vmAuditResult, setVmAuditResult, isAuditing, setIsAuditing, vmError, setVmError, bundles, setBundles, isLoadingBundles, setIsLoadingBundles, publishedBundles, setPublishedBundles, handleVmUpload, fetchTrendForecast, handleCompUpload, fetchBundles, globalCustomers, setGlobalCustomers, isSearchingCustomers, setIsSearchingCustomers, liveBills, setLiveBills, inventory, setInventory, deadStock, setDeadStock, hourlySales, setHourlySales, dailySales, setDailySales, monthlyProducts, setMonthlyProducts, gstSummary, setGstSummary, gstRateSlab, setGstRateSlab, gstCopied, setGstCopied, sizeMatrix, setSizeMatrix, wardrobeProfiles, setWardrobeProfiles, pnlData, setPnlData, retentionData, setRetentionData, reconData, setReconData, countedCashInput, setCountedCashInput, reconNotes, setReconNotes, showReconModal, setShowReconModal, showEodModal, setShowEodModal, eodSummaryText, setEodSummaryText, eodCopied, setEodCopied, isMobileMenuOpen, setIsMobileMenuOpen, matrixCategoryFilter, setMatrixCategoryFilter, isListenerRunning, setIsListenerRunning, isTogglingListener, setIsTogglingListener, listenerLogs, setListenerLogs, isGatewayRunning, setIsGatewayRunning, isTogglingGateway, setIsTogglingGateway, isGatewayReady, setIsGatewayReady, gatewayQr, setGatewayQr, gatewayLogs, setGatewayLogs, testPhone, setTestPhone, testMsg, setTestMsg, isSendingTestWa, setIsSendingTestWa, broadcastGroup, setBroadcastGroup, broadcastGroupCount, setBroadcastGroupCount, broadcastStatus, setBroadcastStatus, broadcastMsg, setBroadcastMsg, isStartingBroadcast, setIsStartingBroadcast, isSyncingGroup, setIsSyncingGroup, groupSearchQuery, setGroupSearchQuery, topMoversData, setTopMoversData, activeTab, setActiveTab, activeConsole, setActiveConsole, searchQuery, setSearchQuery, selectedCustomer, setSelectedCustomer, customerHistory, setCustomerHistory, loadingHistory, setLoadingHistory, customerPersona, setCustomerPersona, loadingPersona, setLoadingPersona, aiMessageType, setAiMessageType, generatedMsg, setGeneratedMsg, isGenerating, setIsGenerating, generateWhatsAppDraft, activeOutfitMatch, setActiveOutfitMatch, outfitPitch, setOutfitPitch, isGeneratingOutfit, setIsGeneratingOutfit, campaignEvent, setCampaignEvent, campaignAudience, setCampaignAudience, campaignDraft, setCampaignDraft, isGeneratingCampaign, setIsGeneratingCampaign, openProductType, setOpenProductType, openMonth, setOpenMonth, selectedCalendarDay, setSelectedCalendarDay, expandedBillId, setExpandedBillId, billItemsCache, setBillItemsCache, loadingBillItems, setLoadingBillItems, handleKeyDown, toggleBillExpansion, fetchAutomationStatus, toggleListener, toggleGateway, handleSendTestWhatsApp, handleSyncBroadcastGroup, handleStartBroadcast, handleStopBroadcast, handleExportGroupCsv, openCustomerCard, handleGenerateAI, handleGenerateOutfitMatch, handleGenerateCampaign, handleSaveReconciliation, handleGenerateEodReport, handleMasterRestock, formatCurrency, MASTER_CATEGORIES, classifySubCategory, handleGlobalSearch, renderLogLine, persona, handleGenerateSmartCoordinate, trendForecast, isForecasting, compImage, compImageUrl, compIntelResult, isAnalyzingComp, compError } = props;

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="border-b border-slate-200 pb-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 flex items-center">
            <Package className="w-6 h-6 mr-3 text-blue-500" /> Inventory
          </h3>
          <p className="text-sm text-slate-500 mt-2">Full store inventory ({filteredList.length} total articles). Use AI to generate fresh styling pitches for any item.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter Inventory by SKU or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Article Number</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Article Description</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">AI Styling Pitch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rawList.length === 0 ? (
              // Fast skeleton rows while loading
              Array.from({ length: 6 }).map((_, sIdx) => (
                <tr key={sIdx} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                  <td className="px-6 py-4 text-right"><div className="h-8 bg-slate-100 rounded w-24 ml-auto"></div></td>
                </tr>
              ))
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No articles matched your search filter "{searchQuery}".
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, idx) => (
                <React.Fragment key={item.ArticleNo || idx}>
                  <tr className={`hover:bg-slate-50 transition-colors ${activeOutfitMatch === item.ArticleNo ? 'bg-indigo-50/50' : ''}`}>
                    <td className="px-6 py-4 font-bold text-slate-700 text-sm whitespace-nowrap">
                      <div>{item.ArticleNo}</div>
                      {item.SkuDetails && (
                        <select className="mt-2 text-xs bg-white border border-slate-200 rounded p-1 w-full max-w-[200px] focus:outline-none focus:border-blue-500">
                          <option value="">View Colors / Sizes</option>
                          {item.SkuDetails.split(',').map((detail, dIdx) => {
                            const [sku, color, size] = detail.split('|');
                            return (
                              <option key={dIdx} value={sku}>
                                {color || 'N/A'} - {size || 'N/A'} ({sku})
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm whitespace-nowrap">{item.ItemName}</td>
                    <td className="px-6 py-4 font-black text-blue-600 whitespace-nowrap">
                      <span className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{item.SkuCount} SKUs in Stock</span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleGenerateOutfitMatch(item)}
                        disabled={isGeneratingOutfit && activeOutfitMatch === item.ArticleNo}
                        className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 hover:shadow-sm rounded-lg font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingOutfit && activeOutfitMatch === item.ArticleNo ? 'Thinking...' : <><Sparkles className="w-3 h-3 mr-1.5" /> Style Match</>}
                      </button>
                    </td>
                  </tr>
                  {activeOutfitMatch === item.ArticleNo && outfitPitch && (
                    <tr className="bg-indigo-50/30 border-b border-indigo-100">
                      <td colSpan="4" className="px-6 py-6">
                        <div className="border border-indigo-200 bg-white p-5 rounded-xl shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-1 bg-indigo-500 h-full"></div>
                          <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mb-3 flex items-center">
                            <Wand2 className="w-3 h-3 mr-2" /> AI "Style of the Week" Pitch
                          </p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{outfitPitch}</p>
                          <div className="mt-4 flex justify-end">
                            <button
                              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(outfitPitch)}`, '_blank')}
                              className="text-xs bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center shadow-md transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 mr-2" /> Share to WhatsApp Status
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {filteredList.length > pageSize && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs text-slate-500">
              Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, filteredList.length)}</span> of{' '}
              <span className="font-bold text-slate-800">{filteredList.length}</span> articles
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryTab;
