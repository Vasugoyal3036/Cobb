import React from 'react';
import axios from 'axios';
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

const LiveBillsTab = (props) => {
  const { totalMonthlyUnits, totalMonthlyRevenue, maxHourlyRevenue, averageOrderValue, DAILY_TARGET, targetProgress, API_BASE, vips, setVips, dormant, setDormant, darkMode, setDarkMode, overviewStats, setOverviewStats, returnsData, setReturnsData, smartCoordinate, setSmartCoordinate, showCoordinateModal, setShowCoordinateModal, vmImages, setVmImages, vmImageUrls, setVmImageUrls, vmAuditResult, setVmAuditResult, isAuditing, setIsAuditing, vmError, setVmError, bundles, setBundles, isLoadingBundles, setIsLoadingBundles, publishedBundles, setPublishedBundles, handleVmUpload, fetchTrendForecast, handleCompUpload, fetchBundles, globalCustomers, setGlobalCustomers, isSearchingCustomers, setIsSearchingCustomers, liveBills, setLiveBills, inventory, setInventory, deadStock, setDeadStock, hourlySales, setHourlySales, dailySales, setDailySales, monthlyProducts, setMonthlyProducts, gstSummary, setGstSummary, gstRateSlab, setGstRateSlab, gstCopied, setGstCopied, sizeMatrix, setSizeMatrix, wardrobeProfiles, setWardrobeProfiles, pnlData, setPnlData, retentionData, setRetentionData, reconData, setReconData, countedCashInput, setCountedCashInput, reconNotes, setReconNotes, showReconModal, setShowReconModal, showEodModal, setShowEodModal, eodSummaryText, setEodSummaryText, eodCopied, setEodCopied, isMobileMenuOpen, setIsMobileMenuOpen, matrixCategoryFilter, setMatrixCategoryFilter, isListenerRunning, setIsListenerRunning, isTogglingListener, setIsTogglingListener, listenerLogs, setListenerLogs, isGatewayRunning, setIsGatewayRunning, isTogglingGateway, setIsTogglingGateway, isGatewayReady, setIsGatewayReady, gatewayQr, setGatewayQr, gatewayLogs, setGatewayLogs, testPhone, setTestPhone, testMsg, setTestMsg, isSendingTestWa, setIsSendingTestWa, broadcastGroup, setBroadcastGroup, broadcastGroupCount, setBroadcastGroupCount, broadcastStatus, setBroadcastStatus, broadcastMsg, setBroadcastMsg, isStartingBroadcast, setIsStartingBroadcast, isSyncingGroup, setIsSyncingGroup, groupSearchQuery, setGroupSearchQuery, topMoversData, setTopMoversData, activeTab, setActiveTab, activeConsole, setActiveConsole, searchQuery, setSearchQuery, selectedCustomer, setSelectedCustomer, customerHistory, setCustomerHistory, loadingHistory, setLoadingHistory, customerPersona, setCustomerPersona, loadingPersona, setLoadingPersona, aiMessageType, setAiMessageType, generatedMsg, setGeneratedMsg, isGenerating, setIsGenerating, generateWhatsAppDraft, activeOutfitMatch, setActiveOutfitMatch, outfitPitch, setOutfitPitch, isGeneratingOutfit, setIsGeneratingOutfit, campaignEvent, setCampaignEvent, campaignAudience, setCampaignAudience, campaignDraft, setCampaignDraft, isGeneratingCampaign, setIsGeneratingCampaign, openProductType, setOpenProductType, openMonth, setOpenMonth, selectedCalendarDay, setSelectedCalendarDay, expandedBillId, setExpandedBillId, billItemsCache, setBillItemsCache, loadingBillItems, setLoadingBillItems, handleKeyDown, toggleBillExpansion, fetchAutomationStatus, toggleListener, toggleGateway, handleSendTestWhatsApp, handleSyncBroadcastGroup, handleStartBroadcast, handleStopBroadcast, handleExportGroupCsv, openCustomerCard, handleGenerateAI, handleGenerateOutfitMatch, handleGenerateCampaign, handleSaveReconciliation, handleGenerateEodReport, handleMasterRestock, formatCurrency, MASTER_CATEGORIES, classifySubCategory, handleGlobalSearch, renderLogLine, persona, handleGenerateSmartCoordinate, trendForecast, isForecasting, compImage, compImageUrl, compIntelResult, isAnalyzingComp, compError } = props;

  

  return (
    <>
                    <div className="p-4 sm:p-6 lg:p-8">
                <div className="border-b border-slate-200 pb-5 mb-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <Receipt className="w-6 h-6 mr-3 text-slate-700" />
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800">Live POS Checkouts Feed</h3>
                      <p className="text-sm text-slate-500 mt-1">Real-time checkout feed showing customer identity, payment modes, and amounts.</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    {liveBills.length} Checkouts Today
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Time</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Invoice No.</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Customer Name & Contact</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">Mode of Payment</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Invoice Amount</th>
                        <th className="px-4 py-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(Array.isArray(liveBills) ? liveBills : []).map((bill, idx) => (
                        <React.Fragment key={idx}>
                          <tr className="hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => toggleBillExpansion(bill.BillId)}>
                            <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap whitespace-nowrap">
                              {new Date(bill.BillTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">{bill.BillNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-bold text-slate-800 text-base">{bill.CustomerName?.trim() || bill.FirstName?.trim() || 'Guest Customer'}</span>
                              <br /><span className="text-xs text-slate-400 font-mono mt-0.5 inline-block">{bill.Phone}</span>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${bill.PaymentMode === 'Cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                bill.PaymentMode === 'UPI / Online' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  bill.PaymentMode === 'Debit / Credit Card' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                {bill.PaymentMode === 'Cash' ? '💵 Cash' :
                                  bill.PaymentMode === 'UPI / Online' ? '⚡ UPI / Online' :
                                    bill.PaymentMode === 'Debit / Credit Card' ? '💳 Card' :
                                      '🔀 Split (Cash + Digital)'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-lg font-black text-green-600 text-right whitespace-nowrap">{formatCurrency(bill.Amount)}</td>

                            <td className="px-4 py-4 text-right">
                              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedBillId === bill.BillId ? 'rotate-180' : ''}`} />
                            </td>
                          </tr>
                          {expandedBillId === bill.BillId && (
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <td colSpan="6" className="p-0">
                                <div className="px-6 py-4 animate-in slide-in-from-top-2 duration-200">
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-slate-700 flex items-center">
                                      <Package className="w-4 h-4 mr-2 text-indigo-500" />
                                      Purchased Items
                                    </h4>
                                    <button 
                                      onClick={() => {
                                        if(!billItemsCache[bill.BillId]) return;
                                        setSmartCoordinate({ loading: true, data: null, itemText: '' });
                                        setShowCoordinateModal(true);
                                        const itemNames = billItemsCache[bill.BillId].map(i => i.ArticleName);
                                        axios.post(`${API_BASE}/api/ai/smart-coordinate`, {
                                          items: itemNames,
                                          customerName: bill.CustomerName
                                        }).then(res => {
                                          setSmartCoordinate({ loading: false, data: res.data.message, itemText: itemNames.join(', ') });
                                        }).catch(err => {
                                          setSmartCoordinate({ loading: false, data: "Error generating recommendation.", itemText: '' });
                                        });
                                      }}
                                      className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 border border-indigo-200 cursor-pointer shadow-sm"
                                    >
                                      <Wand2 className="w-3.5 h-3.5" /> AI Stylist Suggestion
                                    </button>
                                  </div>
                                  {loadingBillItems && !billItemsCache[bill.BillId] ? (
                                    <div className="text-sm text-slate-500 flex items-center gap-2">
                                      <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                                      Loading items...
                                    </div>
                                  ) : billItemsCache[bill.BillId]?.length > 0 ? (
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                                      <table className="min-w-full text-left text-sm">
                                        <thead className="bg-slate-50/50">
                                          <tr>
                                            <th className="px-4 py-2 text-xs font-bold text-slate-500 whitespace-nowrap">Item</th>
                                            <th className="px-4 py-2 text-xs font-bold text-slate-500 whitespace-nowrap">Color</th>
                                            <th className="px-4 py-2 text-xs font-bold text-slate-500 whitespace-nowrap">Size</th>
                                            <th className="px-4 py-2 text-xs font-bold text-slate-500 text-right whitespace-nowrap">Qty</th>
                                            <th className="px-4 py-2 text-xs font-bold text-slate-500 text-right whitespace-nowrap">Price</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {billItemsCache[bill.BillId].map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                              <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                  <span>{item.ArticleName}</span>
                                                  <span className="text-xs text-slate-400 font-mono">{item.ArticleNo}</span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{item.Color}</td>
                                              <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{item.Size}</td>
                                              <td className="px-4 py-2.5 text-slate-700 font-bold text-right whitespace-nowrap">{item.Quantity}</td>
                                              <td className="px-4 py-2.5 text-slate-700 text-right whitespace-nowrap">{formatCurrency(item.NetPrice)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-slate-500 italic">No item details available.</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      {liveBills.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-16 text-center text-slate-400 font-medium">
                            <Receipt className="w-10 h-10 mb-3 text-slate-300 mx-auto" />
                            No invoices processed today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

    </>
  );
};

export default LiveBillsTab;
