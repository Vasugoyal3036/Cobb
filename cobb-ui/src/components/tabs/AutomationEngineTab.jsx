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
  Percent,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const AutomationEngineTab = (props) => {
  const { totalMonthlyUnits, totalMonthlyRevenue, maxHourlyRevenue, averageOrderValue, DAILY_TARGET, targetProgress, API_BASE, vips, setVips, dormant, setDormant, darkMode, setDarkMode, overviewStats, setOverviewStats, returnsData, setReturnsData, smartCoordinate, setSmartCoordinate, showCoordinateModal, setShowCoordinateModal, bundles, setBundles, isLoadingBundles, setIsLoadingBundles, publishedBundles, setPublishedBundles, fetchBundles, globalCustomers, setGlobalCustomers, isSearchingCustomers, setIsSearchingCustomers, liveBills, setLiveBills, inventory, setInventory, deadStock, setDeadStock, hourlySales, setHourlySales, dailySales, setDailySales, monthlyProducts, setMonthlyProducts, gstSummary, setGstSummary, gstRateSlab, setGstRateSlab, gstCopied, setGstCopied, sizeMatrix, setSizeMatrix, wardrobeProfiles, setWardrobeProfiles, pnlData, setPnlData, retentionData, setRetentionData, reconData, setReconData, countedCashInput, setCountedCashInput, reconNotes, setReconNotes, showReconModal, setShowReconModal, showEodModal, setShowEodModal, eodSummaryText, setEodSummaryText, eodCopied, setEodCopied, isMobileMenuOpen, setIsMobileMenuOpen, matrixCategoryFilter, setMatrixCategoryFilter, isListenerRunning, setIsListenerRunning, isTogglingListener, setIsTogglingListener, listenerLogs, setListenerLogs, isGatewayRunning, setIsGatewayRunning, isTogglingGateway, setIsTogglingGateway, isGatewayReady, setIsGatewayReady, gatewayQr, setGatewayQr, gatewayLogs, setGatewayLogs, testPhone, setTestPhone, testMsg, setTestMsg, isSendingTestWa, setIsSendingTestWa, broadcastGroup, setBroadcastGroup, broadcastGroupCount, setBroadcastGroupCount, broadcastStatus, setBroadcastStatus, broadcastMsg, setBroadcastMsg, isStartingBroadcast, setIsStartingBroadcast, isSyncingGroup, setIsSyncingGroup, groupSearchQuery, setGroupSearchQuery, topMoversData, setTopMoversData, activeTab, setActiveTab, activeConsole, setActiveConsole, searchQuery, setSearchQuery, selectedCustomer, setSelectedCustomer, customerHistory, setCustomerHistory, loadingHistory, setLoadingHistory, customerPersona, setCustomerPersona, loadingPersona, setLoadingPersona, aiMessageType, setAiMessageType, generatedMsg, setGeneratedMsg, isGenerating, setIsGenerating, generateWhatsAppDraft, activeOutfitMatch, setActiveOutfitMatch, outfitPitch, setOutfitPitch, isGeneratingOutfit, setIsGeneratingOutfit, campaignEvent, setCampaignEvent, campaignAudience, setCampaignAudience, campaignDraft, setCampaignDraft, isGeneratingCampaign, setIsGeneratingCampaign, openProductType, setOpenProductType, openMonth, setOpenMonth, selectedCalendarDay, setSelectedCalendarDay, expandedBillId, setExpandedBillId, billItemsCache, setBillItemsCache, loadingBillItems, setLoadingBillItems, handleKeyDown, toggleBillExpansion, fetchAutomationStatus, toggleListener, toggleGateway, handleSendTestWhatsApp, handleSyncBroadcastGroup, handleStartBroadcast, handleStopBroadcast, handleExportGroupCsv, openCustomerCard, handleGenerateAI, handleGenerateOutfitMatch, handleGenerateCampaign, handleSaveReconciliation, handleGenerateEodReport, handleMasterRestock, formatCurrency, MASTER_CATEGORIES, classifySubCategory, handleGlobalSearch, renderLogLine, persona, handleGenerateSmartCoordinate } = props;

  

  return (
    <>
                    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <div className="border-b border-slate-200 pb-5 mb-2">
                  <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                    <Terminal className="w-6 h-6 mr-3 text-slate-600" /> Automation Engine
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">Manage background scripts for POS tracking and WhatsApp Gateway pairing.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* WhatsApp Gateway Card with Live Embedded QR */}
                  <div className="bg-slate-900 text-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">Step 1: Sender Gateway</span>
                        <span className={`text-xs font-bold ${isGatewayReady ? 'text-green-400' : isGatewayRunning ? 'text-amber-400' : 'text-red-400'}`}>
                          {isGatewayReady ? '● AUTHENTICATED' : isGatewayRunning ? '● WAITING FOR SCAN' : '● OFFLINE'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold">WhatsApp Device Bridge</h3>
                      <p className="text-xs text-slate-400 mt-1">Persistent session linked via LocalAuth (Port 3000)</p>

                      <div className="mt-5 p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[220px]">
                        {isGatewayReady ? (
                          <div className="text-center py-6">
                            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto mb-3 border border-green-500/20 text-lg font-bold">
                              ✓
                            </div>
                            <p className="text-sm font-bold text-slate-200">Device Linked & Ready</p>
                            <p className="text-xs text-slate-500 mt-1">Automatic POS messaging is active.</p>
                          </div>
                        ) : gatewayQr ? (
                          <div className="text-center">
                            <p className="text-xs font-bold text-amber-300 mb-3">Scan with WhatsApp &rarr; Linked Devices</p>
                            <img src={gatewayQr} alt="WhatsApp QR Code" className="w-48 h-48 rounded-lg bg-white p-2 shadow-lg mx-auto" />
                          </div>
                        ) : isGatewayRunning ? (
                          <div className="text-center py-8">
                            <RefreshCw className="w-8 h-8 animate-spin text-slate-500 mx-auto mb-3" />
                            <p className="text-xs text-slate-400">Initializing WhatsApp Web Engine...</p>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-xs text-slate-500">Gateway is stopped. Click Start below.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap gap-2 justify-between items-center">
                      <div className="flex gap-2">
                        <button onClick={() => setActiveConsole('gateway')} className={`text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer ${activeConsole === 'gateway' ? 'bg-blue-900/50 text-blue-300' : 'text-slate-400 hover:text-white'}`}>
                          Console Logs
                        </button>
                        {props.resetGateway && (
                          <button
                            onClick={props.resetGateway}
                            disabled={isTogglingGateway}
                            title="Force clears corrupted locks/tokens and generates a fresh QR code"
                            className="text-xs px-3 py-1.5 rounded-lg font-bold text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset & Re-Pair
                          </button>
                        )}
                      </div>
                      <button
                        onClick={toggleGateway}
                        disabled={isTogglingGateway}
                        className={`flex items-center px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${isGatewayRunning ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-green-500 hover:bg-green-400 text-slate-900'}`}
                      >
                        {isTogglingGateway ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : isGatewayRunning ? <Square className="w-3.5 h-3.5 mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                        {isTogglingGateway ? 'Processing...' : isGatewayRunning ? 'Stop Gateway' : 'Start Gateway'}
                      </button>
                    </div>
                  </div>

                  {/* POS Listener Card */}
                  <div className="bg-slate-900 text-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-black tracking-widest text-purple-400">Step 2: Bill Detector</span>
                        <div className="relative flex h-3 w-3">
                          {isListenerRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${isListenerRunning ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mt-1">POS SQL Listener</h3>
                      <p className="text-sm text-slate-400 mt-2">Python Watchdog</p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center">
                      <button onClick={() => setActiveConsole('listener')} className={`text-xs px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer ${activeConsole === 'listener' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        View Console Logs
                      </button>
                      <button
                        onClick={toggleListener}
                        disabled={isTogglingListener}
                        className={`flex items-center px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer active:scale-95 disabled:opacity-50 shadow-lg transition-all ${isListenerRunning ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-green-500 hover:bg-green-400 text-slate-900 shadow-green-500/20'}`}
                      >
                        {isTogglingListener ? (
                          <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                        ) : isListenerRunning ? (
                          <Square className="w-4 h-4 mr-2" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        {isTogglingListener ? 'Processing...' : isListenerRunning ? 'Stop Listener' : 'Start Listener'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/80 backdrop-blur text-slate-300 font-mono text-sm p-6 rounded-2xl border border-slate-800 shadow-inner h-80 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                  <div className="text-slate-500 border-b border-slate-900 pb-3 mb-3 flex justify-between items-center sticky top-0 bg-slate-950/90 py-1 z-10">
                    <span className="font-bold text-slate-400 tracking-widest text-[10px] uppercase flex items-center">
                      <Terminal className="w-3.5 h-3.5 mr-2 text-indigo-400" /> CONSOLE: {activeConsole === 'gateway' ? 'WHATSAPP GATEWAY' : 'POS LISTENER'}
                    </span>
                    <div className="space-x-2">
                      <button onClick={() => setActiveConsole('gateway')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${activeConsole === 'gateway' ? 'bg-indigo-650/30 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}>Gateway Logs</button>
                      <button onClick={() => setActiveConsole('listener')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${activeConsole === 'listener' ? 'bg-indigo-650/30 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}>Listener Logs</button>
                    </div>
                  </div>

                  {((activeConsole === 'gateway' ? gatewayLogs : listenerLogs).length === 0) ? (
                    <p className="text-slate-600 italic py-4 text-center text-xs">No output recorded yet. Start a service to view logs.</p>
                  ) : (
                    ((activeConsole === 'gateway' ? gatewayLogs : listenerLogs) || []).map((log, index) => (
                      renderLogLine(log, index)
                    ))
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-800 dark:text-white text-base flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" /> Send Instant Test WhatsApp Message
                    </h4>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                      Local Gateway API (Port 3000)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Target Phone Number</label>
                      <input
                        type="text"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="e.g. 9812423377"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Test Message Body (Optional)</label>
                      <input
                        type="text"
                        value={testMsg}
                        onChange={(e) => setTestMsg(e.target.value)}
                        placeholder="Leave blank for default test note..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <button
                        onClick={handleSendTestWhatsApp}
                        disabled={isSendingTestWa || !testPhone}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {isSendingTestWa ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        {isSendingTestWa ? 'Sending...' : '🚀 Send WhatsApp Message'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2-Way Interactive Bot & 30-Min NPS Engine Card */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                          Active Inbound Flow
                        </span>
                        <span className="text-xs text-slate-400">• Webhook Listener Enabled</span>
                      </div>
                      <h4 className="text-xl font-black tracking-tight">Interactive 2-Way WhatsApp & NPS Engine</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Automated customer self-service, 30-minute post-checkout feedback survey, and Google Reviews booster.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-300">
                        ⚡ WhatsApp LocalAuth
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Bot Flow 1: Self-Service Concierge */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/30">
                          🤖
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-slate-200">2-Way Self-Service</h5>
                          <p className="text-[10px] text-slate-400">Automated reply triggers</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                          <strong className="text-amber-400">Reply 1:</strong> Loyalty Points & VIP Balance
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                          <strong className="text-blue-400">Reply 2:</strong> Live Alteration Status ✂️
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                          <strong className="text-emerald-400">Reply 3:</strong> Trending Catalog & Top Movers 🛍️
                        </div>
                      </div>
                    </div>

                    {/* Bot Flow 2: Click & Collect */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm border border-purple-500/30">
                          🛍️
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-slate-200">Click & Collect</h5>
                          <p className="text-[10px] text-slate-400">WhatsApp Reservation</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                        <p className="text-slate-300 leading-relaxed">
                          Customers reply <code className="text-purple-300 bg-purple-950/60 px-1 py-0.5 rounded font-mono font-bold">RESERVE &lt;Code&gt;</code> to hold items for 24h.
                        </p>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Syncs directly to <strong>Hold Desk</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Bot Flow 3: 30-Min NPS Feedback */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/30">
                          ⭐
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-slate-200">30-Min NPS Engine</h5>
                          <p className="text-[10px] text-slate-400">Post-Checkout Feedback</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                        <p className="text-slate-300 leading-relaxed">
                          Auto-schedules a 5-star survey <strong>30 minutes</strong> after bill checkout.
                        </p>
                        <div className="text-[11px] space-y-1 text-slate-400 pt-1">
                          <div>⭐ <strong>5 Stars:</strong> Direct Google Review Link</div>
                          <div>⚠️ <strong>1-3 Stars:</strong> Instant Manager Alert</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            
    </>
  );
};

export default AutomationEngineTab;
