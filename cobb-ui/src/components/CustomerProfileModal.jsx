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

const CustomerProfileModal = (props) => {
  const { API_BASE, vips, setVips, dormant, setDormant, darkMode, setDarkMode, overviewStats, setOverviewStats, returnsData, setReturnsData, smartCoordinate, setSmartCoordinate, showCoordinateModal, setShowCoordinateModal, vmImages, setVmImages, vmImageUrls, setVmImageUrls, vmAuditResult, setVmAuditResult, isAuditing, setIsAuditing, vmError, setVmError, bundles, setBundles, isLoadingBundles, setIsLoadingBundles, publishedBundles, setPublishedBundles, handleVmUpload, fetchTrendForecast, handleCompUpload, fetchBundles, globalCustomers, setGlobalCustomers, isSearchingCustomers, setIsSearchingCustomers, liveBills, setLiveBills, inventory, setInventory, deadStock, setDeadStock, hourlySales, setHourlySales, dailySales, setDailySales, monthlyProducts, setMonthlyProducts, gstSummary, setGstSummary, gstRateSlab, setGstRateSlab, gstCopied, setGstCopied, sizeMatrix, setSizeMatrix, wardrobeProfiles, setWardrobeProfiles, pnlData, setPnlData, retentionData, setRetentionData, reconData, setReconData, countedCashInput, setCountedCashInput, reconNotes, setReconNotes, showReconModal, setShowReconModal, showEodModal, setShowEodModal, eodSummaryText, setEodSummaryText, eodCopied, setEodCopied, isMobileMenuOpen, setIsMobileMenuOpen, matrixCategoryFilter, setMatrixCategoryFilter, isListenerRunning, setIsListenerRunning, isTogglingListener, setIsTogglingListener, listenerLogs, setListenerLogs, isGatewayRunning, setIsGatewayRunning, isTogglingGateway, setIsTogglingGateway, isGatewayReady, setIsGatewayReady, gatewayQr, setGatewayQr, gatewayLogs, setGatewayLogs, testPhone, setTestPhone, testMsg, setTestMsg, isSendingTestWa, setIsSendingTestWa, broadcastGroup, setBroadcastGroup, broadcastGroupCount, setBroadcastGroupCount, broadcastStatus, setBroadcastStatus, broadcastMsg, setBroadcastMsg, isStartingBroadcast, setIsStartingBroadcast, isSyncingGroup, setIsSyncingGroup, groupSearchQuery, setGroupSearchQuery, topMoversData, setTopMoversData, activeTab, setActiveTab, activeConsole, setActiveConsole, searchQuery, setSearchQuery, selectedCustomer, setSelectedCustomer, customerHistory, setCustomerHistory, loadingHistory, setLoadingHistory, customerPersona, setCustomerPersona, loadingPersona, setLoadingPersona, aiMessageType, setAiMessageType, generatedMsg, setGeneratedMsg, isGenerating, setIsGenerating, generateWhatsAppDraft, activeOutfitMatch, setActiveOutfitMatch, outfitPitch, setOutfitPitch, isGeneratingOutfit, setIsGeneratingOutfit, campaignEvent, setCampaignEvent, campaignAudience, setCampaignAudience, campaignDraft, setCampaignDraft, isGeneratingCampaign, setIsGeneratingCampaign, openProductType, setOpenProductType, openMonth, setOpenMonth, selectedCalendarDay, setSelectedCalendarDay, expandedBillId, setExpandedBillId, billItemsCache, setBillItemsCache, loadingBillItems, setLoadingBillItems, handleKeyDown, toggleBillExpansion, fetchAutomationStatus, toggleListener, toggleGateway, handleSendTestWhatsApp, handleSyncBroadcastGroup, handleStartBroadcast, handleStopBroadcast, handleExportGroupCsv, openCustomerCard, handleGenerateAI, handleGenerateOutfitMatch, handleGenerateCampaign, handleSaveReconciliation, handleGenerateEodReport, handleMasterRestock, formatCurrency, MASTER_CATEGORIES, classifySubCategory, handleGlobalSearch, renderLogLine, persona, handleGenerateSmartCoordinate, trendForecast, isForecasting, compImage, compImageUrl, compIntelResult, isAnalyzingComp, compError } = props;

  

  if (!selectedCustomer) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-end z-50 transition-opacity">
            <div className="bg-white w-full sm:max-w-xl h-full shadow-2xl p-0 overflow-hidden flex flex-col relative">

              {/* Modal Header */}
              <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-100 bg-slate-50">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-black text-blue-600 tracking-widest">Client Dossier</span>
                    <div className="flex items-center mt-2">
                      <h3 className="text-3xl font-black text-slate-800">{selectedCustomer.FirstName} {selectedCustomer.LastName || ''}</h3>
                    </div>
                    <div className="flex items-center mt-3 gap-3">
                      <p className="text-sm text-slate-500 font-mono bg-white px-3 py-1 rounded-lg border border-slate-200">{selectedCustomer.Phone}</p>
                      {loadingPersona ? (
                        <span className="px-3 py-1 bg-slate-200 text-slate-500 rounded-lg text-xs font-bold animate-pulse">Analyzing Style...</span>
                      ) : customerPersona ? (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold flex items-center shadow-sm">
                          <Sparkles className="w-3 h-3 mr-1.5 text-indigo-500" /> {customerPersona}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-2.5 bg-white shadow-sm border border-slate-200 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lifetime Value</p>
                    <p className="text-2xl font-black text-green-600 mt-1">{formatCurrency(selectedCustomer.LifetimeSpend)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Invoices</p>
                    <p className="text-2xl font-black text-blue-600 mt-1">{selectedCustomer.TotalBills || customerHistory.length} <span className="text-sm font-semibold text-slate-400 ml-1">Visits</span></p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">

                {/* AI Assistant Section */}
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-6 rounded-2xl shadow-lg mb-8 text-white border border-indigo-800/50 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none">
                    <Wand2 className="w-32 h-32" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center text-indigo-300">
                      <Sparkles className="w-4 h-4 mr-2" /> Gemini AI Messenger
                    </h4>
                    <p className="text-sm text-indigo-100/70 mb-5 leading-relaxed">Generate a tailored, franchise-safe message based on their actual wardrobe history.</p>

                    <div className="flex flex-col gap-4">
                      <select
                        value={aiMessageType}
                        onChange={(e) => setAiMessageType(e.target.value)}
                        className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-400 focus:bg-slate-900 transition-colors cursor-pointer"
                      >
                        <option value="cross-sell">👗 Style Cross-Sell (Suggest matching items)</option>
                        <option value="size-alert">📏 Size Restock Alert (Specific to their fits)</option>
                        <option value="dormant">👋 Re-engagement (Warm 'We miss you' message)</option>
                        <option value="vip">✨ VIP Appreciation (White-glove thank you)</option>
                      </select>

                      <button
                        onClick={handleGenerateAI}
                        disabled={isGenerating || loadingHistory}
                        className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-500/20"
                      >
                        {isGenerating ? 'Analyzing Wardrobe...' : <><Wand2 className="w-4 h-4 mr-2" /> Generate AI Draft</>}
                      </button>
                    </div>

                    {generatedMsg && (
                      <div className="mt-6 pt-5 border-t border-indigo-800/50">
                        <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest mb-3">Review & Edit</p>
                        <textarea
                          value={generatedMsg}
                          onChange={(e) => setGeneratedMsg(e.target.value)}
                          className="w-full h-32 bg-slate-900/50 border border-indigo-500/30 rounded-xl p-4 text-sm leading-relaxed text-slate-100 focus:outline-none focus:border-indigo-400 resize-none shadow-inner"
                        />
                        <button
                          onClick={() => {
                            window.open(`https://wa.me/91${selectedCustomer.Phone}?text=${encodeURIComponent(generatedMsg)}`, '_blank');
                          }}
                          className="w-full mt-4 bg-green-500 hover:bg-green-400 text-slate-900 font-black py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center shadow-lg shadow-green-500/20 cursor-pointer"
                        >
                          <MessageSquare className="w-5 h-5 mr-2" /> Dispatch via WhatsApp
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purchase History */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center">
                    <ShoppingBag className="w-5 h-5 mr-2 text-slate-400" /> Itemized Wardrobe History
                  </h4>

                  {loadingHistory ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                      <RefreshCw className="w-8 h-8 mb-4 animate-spin text-slate-300" />
                      <p className="text-sm font-medium">Loading line items...</p>
                    </div>
                  ) : customerHistory.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed py-12 text-center text-slate-400">
                      <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No individual line items found.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm bg-white">
                      {customerHistory.map((item, idx) => (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                          <div>
                            <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{item.ArticleName}</p>
                            <div className="flex gap-2 mt-1.5">
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">Size: {item.Size}</span>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">Color: {item.Color}</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                              {new Date(item.BillDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • {item.Category}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-black text-slate-800">{formatCurrency(item.NetPrice)}</p>
                            <p className="text-xs font-bold text-slate-400 mt-1 bg-slate-50 px-2 py-1 rounded inline-block">{item.Quantity} Unit(s)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        {/* EOD CASH RECONCILIATION MODAL */}
        {showReconModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full sm:max-w-lg p-4 sm:p-6 lg:p-8 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-600" /> EOD Cash Register Reconciliation
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Verify physical drawer cash against system log.</p>
                </div>
                <button onClick={() => setShowReconModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase">System Recorded Cash</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(overviewStats.today.CashAmount || 0)}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Physical Cash Counted in Drawer (₹)</label>
                  <input
                    type="number"
                    value={countedCashInput}
                    onChange={(e) => setCountedCashInput(e.target.value)}
                    placeholder="Enter total physical cash counted..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {countedCashInput && (
                  <div className={`p-4 rounded-xl border ${parseFloat(countedCashInput) - (overviewStats.today.CashAmount || 0) === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase">Cash Discrepancy (Variance)</span>
                      <span className="text-lg font-black">
                        {formatCurrency(parseFloat(countedCashInput) - (overviewStats.today.CashAmount || 0))}
                      </span>
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      {parseFloat(countedCashInput) - (overviewStats.today.CashAmount || 0) === 0 ? '✅ Cash register balances perfectly!' : '⚠️ Discrepancy detected. Add a note below explaining the reason.'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Manager Notes / Reason (Optional)</label>
                  <textarea
                    value={reconNotes}
                    onChange={(e) => setReconNotes(e.target.value)}
                    placeholder="e.g. Petty cash withdrawn ₹200 for store tea/cleaning..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowReconModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveReconciliation}
                    disabled={!countedCashInput}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save EOD Closing
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EOD WHATSAPP REPORT MODAL */}
        {showEodModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full sm:max-w-lg p-4 sm:p-6 lg:p-8 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-600" /> Daily EOD Report to Owner
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Formatted WhatsApp summary ready to dispatch.</p>
                </div>
                <button onClick={() => setShowEodModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <textarea
                  value={eodSummaryText}
                  onChange={(e) => setEodSummaryText(e.target.value)}
                  className="w-full h-56 p-4 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed rounded-2xl border border-slate-800 focus:outline-none resize-none shadow-inner"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(eodSummaryText);
                      setEodCopied(true);
                      setTimeout(() => setEodCopied(false), 2000);
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {eodCopied ? '✅ Copied!' : '📋 Copy Summary'}
                  </button>
                  <button
                    onClick={() => {
                      window.open(`https://wa.me/?text=${encodeURIComponent(eodSummaryText)}`, '_blank');
                    }}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" /> Send via WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toast Notifications Container moved to ToastProvider */}

        {/* Smart Coordinate Modal */}
        {showCoordinateModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-indigo-500" /> AI Style Coordinate Maker
                </h3>
                <button onClick={() => setShowCoordinateModal(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-lg border border-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Purchased Items</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-sm font-medium text-slate-700">
                  {smartCoordinate.itemText}
                </div>
                
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">AI Coordinate Match</p>
                <div className="min-h-32 flex flex-col justify-center">
                  {smartCoordinate.loading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
                      <p className="text-sm font-medium text-slate-500 animate-pulse">Generating the perfect styling combination...</p>
                    </div>
                  ) : (
                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-inner">
                      <p className="text-indigo-900 whitespace-pre-wrap text-sm leading-relaxed font-medium">
                        {smartCoordinate.data}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setShowCoordinateModal(false)} className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-colors cursor-pointer text-sm">
                  Close
                </button>
                <button 
                  disabled={smartCoordinate.loading}
                  onClick={() => {
                    const phone = "919876543210"; // Placeholder for demo since we didn't pass phone
                    const text = encodeURIComponent(smartCoordinate.data);
                    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
                  }} 
                  className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> Send WhatsApp Pitch
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
};

export default CustomerProfileModal;
