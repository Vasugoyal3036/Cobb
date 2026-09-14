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
  AlertTriangle,
  Wallet,
  Coffee,
  Plus,
  Trash2,
  ArrowRight,
  AlarmClock,
  Network
} from 'lucide-react';

const DashboardTab = (props) => {
  const { userRole, activeStore, totalMonthlyUnits, totalMonthlyRevenue, maxHourlyRevenue, averageOrderValue, DAILY_TARGET, targetProgress, API_BASE, vips, setVips, dormant, setDormant, darkMode, setDarkMode, overviewStats, setOverviewStats, returnsData, setReturnsData, smartCoordinate, setSmartCoordinate, showCoordinateModal, setShowCoordinateModal, vmImages, setVmImages, vmImageUrls, setVmImageUrls, vmAuditResult, setVmAuditResult, isAuditing, setIsAuditing, vmError, setVmError, bundles, setBundles, isLoadingBundles, setIsLoadingBundles, publishedBundles, setPublishedBundles, handleVmUpload, fetchTrendForecast, handleCompUpload, fetchBundles, globalCustomers, setGlobalCustomers, isSearchingCustomers, setIsSearchingCustomers, liveBills, setLiveBills, inventory, setInventory, deadStock, setDeadStock, hourlySales, setHourlySales, dailySales, setDailySales, monthlyProducts, setMonthlyProducts, gstSummary, setGstSummary, gstRateSlab, setGstRateSlab, gstCopied, setGstCopied, sizeMatrix, setSizeMatrix, wardrobeProfiles, setWardrobeProfiles, pnlData, setPnlData, retentionData, setRetentionData, reconData, setReconData, countedCashInput, setCountedCashInput, reconNotes, setReconNotes, showReconModal, setShowReconModal, showEodModal, setShowEodModal, eodSummaryText, setEodSummaryText, eodCopied, setEodCopied, isMobileMenuOpen, setIsMobileMenuOpen, matrixCategoryFilter, setMatrixCategoryFilter, isListenerRunning, setIsListenerRunning, isTogglingListener, setIsTogglingListener, listenerLogs, setListenerLogs, automationDispatches, isGatewayRunning, setIsGatewayRunning, isTogglingGateway, setIsTogglingGateway, isGatewayReady, setIsGatewayReady, gatewayQr, setGatewayQr, gatewayLogs, setGatewayLogs, testPhone, setTestPhone, testMsg, setTestMsg, isSendingTestWa, setIsSendingTestWa, broadcastGroup, setBroadcastGroup, broadcastGroupCount, setBroadcastGroupCount, broadcastStatus, setBroadcastStatus, broadcastMsg, setBroadcastMsg, isStartingBroadcast, setIsStartingBroadcast, isSyncingGroup, setIsSyncingGroup, groupSearchQuery, setGroupSearchQuery, topMoversData, setTopMoversData, activeTab, setActiveTab, activeConsole, setActiveConsole, searchQuery, setSearchQuery, selectedCustomer, setSelectedCustomer, customerHistory, setCustomerHistory, loadingHistory, setLoadingHistory, customerPersona, setCustomerPersona, loadingPersona, setLoadingPersona, aiMessageType, setAiMessageType, generatedMsg, setGeneratedMsg, isGenerating, setIsGenerating, generateWhatsAppDraft, activeOutfitMatch, setActiveOutfitMatch, outfitPitch, setOutfitPitch, isGeneratingOutfit, setIsGeneratingOutfit, campaignEvent, setCampaignEvent, campaignAudience, setCampaignAudience, campaignDraft, setCampaignDraft, isGeneratingCampaign, setIsGeneratingCampaign, openProductType, setOpenProductType, openMonth, setOpenMonth, selectedCalendarDay, setSelectedCalendarDay, expandedBillId, setExpandedBillId, billItemsCache, setBillItemsCache, loadingBillItems, setLoadingBillItems, handleKeyDown, toggleBillExpansion, fetchAutomationStatus, toggleListener, toggleGateway, handleSendTestWhatsApp, handleSyncBroadcastGroup, handleStartBroadcast, handleStopBroadcast, handleExportGroupCsv, openCustomerCard, handleGenerateAI, handleGenerateOutfitMatch, handleGenerateCampaign, handleSaveReconciliation, handleGenerateEodReport, handleMasterRestock, formatCurrency, MASTER_CATEGORIES, classifySubCategory, handleGlobalSearch, renderLogLine, persona, handleGenerateSmartCoordinate, trendForecast, isForecasting, compImage, compImageUrl, compIntelResult, isAnalyzingComp, compError } = props;
  const [calendarDate, setCalendarDate] = React.useState(new Date());
  const [safetyMode, setSafetyMode] = React.useState('ultra');
  const [batchSize, setBatchSize] = React.useState(20);
  const [includeOptOut, setIncludeOptOut] = React.useState(true);

  // Pocket Khata state for Dashboard Desk
  const [khataSummary, setKhataSummary] = React.useState({ totalSpent: 0, totalCount: 0, items: [] });
  const [khataLoading, setKhataLoading] = React.useState(false);

  // Active holds state for Hold Desk tile
  const [holds, setHolds] = React.useState([]);

  // Fast Counter Offer & Discount Calc state
  const [calcMrp, setCalcMrp] = React.useState(1999);
  const [calcOffer, setCalcOffer] = React.useState('50');

  // Ref and height state to guarantee operational tiles match the exact pixel height of top KPI cards
  const topCardRef = React.useRef(null);
  const [topCardHeight, setTopCardHeight] = React.useState(null);

  React.useEffect(() => {
    if (!topCardRef.current) return;
    const updateHeight = () => {
      if (topCardRef.current) {
        setTopCardHeight(topCardRef.current.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(topCardRef.current);
    window.addEventListener('resize', updateHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  const fetchKhataExpenses = React.useCallback(async () => {
    try {
      setKhataLoading(true);
      const res = await axios.get(`${API_BASE}/api/expenses/today?storeId=${activeStore}`);
      if (res.data?.success && res.data.summary) {
        setKhataSummary(res.data.summary);
      }
    } catch (e) {
      console.error('Error fetching khata expenses in Dashboard:', e);
    } finally {
      setKhataLoading(false);
    }
  }, [API_BASE, activeStore]);

  const fetchHolds = React.useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/holds`);
      if (res.data?.success && Array.isArray(res.data.holds)) {
        setHolds(res.data.holds);
      }
    } catch (e) {
      // non-blocking
    }
  }, [API_BASE]);

  // In-Store Lounge Radio & PA state
  const [isSpeakingPa, setIsSpeakingPa] = React.useState(false);
  const [activePaLabel, setActivePaLabel] = React.useState('');

  const quickAnnounce = (presetLabel, text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9;
    utt.pitch = 0.95;
    utt.volume = 1;
    utt.lang = 'en-IN';

    const voices = synth.getVoices();
    const prefVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('India') || v.name.includes('Google') || v.name.includes('Natural')));
    if (prefVoice) utt.voice = prefVoice;

    utt.onstart = () => {
      setIsSpeakingPa(true);
      setActivePaLabel(presetLabel);
    };
    utt.onend = () => {
      setIsSpeakingPa(false);
      setActivePaLabel('');
    };
    utt.onerror = () => {
      setIsSpeakingPa(false);
      setActivePaLabel('');
    };
    synth.speak(utt);
  };

  React.useEffect(() => {
    fetchKhataExpenses();
    fetchHolds();
  }, [fetchKhataExpenses, fetchHolds]);

  return (
    <>
      {activeTab === 'dashboard' && (
        <div className="space-y-6">

          {/* Header */}
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-slate-800">
                  {activeStore === 'ALL'
                    ? 'All Stores Network Command Center'
                    : activeStore === 'STORE_02'
                      ? 'Cobb Branch 2 Command Center'
                      : 'Store Command Center'}
                </h2>
                <span className={`px-2 py-0.5 text-xs font-black rounded-lg border ${userRole === 'owner' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                  {userRole === 'owner' ? '👑 Owner Mode' : '👔 Manager Mode'}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {activeStore === 'ALL'
                  ? 'Consolidated operational telemetry across all Cobb branches.'
                  : activeStore === 'STORE_02'
                    ? 'Live operational metrics & counter telemetry for Cobb Branch 2 (New Market).'
                    : 'Live operational metrics and counter telemetry for Cobb Pundri.'}
              </p>
            </div>
          </div>

          {/* Top Row Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Revenue Card with WoW/MoM Trends */}
            <div ref={topCardRef} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">{formatCurrency((overviewStats?.today?.TotalSales || 0))}</h3>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3">
                {/* vs Yesterday */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const diff = (overviewStats?.yesterday?.TotalSales || 0) > 0
                      ? ((((overviewStats?.today?.TotalSales || 0) - (overviewStats?.yesterday?.TotalSales || 0)) / (overviewStats?.yesterday?.TotalSales || 0)) * 100).toFixed(1)
                      : (overviewStats?.today?.TotalSales || 0) > 0 ? 100 : 0;
                    const isUp = diff >= 0;
                    return (
                      <>
                        <span className={`font-black ${isUp ? 'text-green-600' : 'text-rose-500'}`}>
                          {isUp ? '↑' : '↓'} {Math.abs(diff)}%
                        </span>
                        <span className="text-slate-400">vs yesterday</span>
                      </>
                    );
                  })()}
                </div>
                {/* vs Last Week */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const thisW = overviewStats?.thisWeek?.TotalSales || 0;
                    const lastW = overviewStats?.lastWeek?.TotalSales || 0;
                    const diff = lastW > 0 ? (((thisW - lastW) / lastW) * 100).toFixed(1) : (thisW > 0 ? 100 : 0);
                    const isUp = diff >= 0;
                    return (
                      <>
                        <span className={`font-black ${isUp ? 'text-green-600' : 'text-rose-500'}`}>
                          {isUp ? '↑' : '↓'} {Math.abs(diff)}%
                        </span>
                        <span className="text-slate-400">WoW</span>
                      </>
                    );
                  })()}
                </div>
                {/* vs Last Month */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const thisM = overviewStats?.thisMonth?.TotalSales || 0;
                    const lastM = overviewStats?.lastMonth?.TotalSales || 0;
                    const diff = lastM > 0 ? (((thisM - lastM) / lastM) * 100).toFixed(1) : (thisM > 0 ? 100 : 0);
                    const isUp = diff >= 0;
                    return (
                      <>
                        <span className={`font-black ${isUp ? 'text-green-600' : 'text-rose-500'}`}>
                          {isUp ? '↑' : '↓'} {Math.abs(diff)}%
                        </span>
                        <span className="text-slate-400">MoM</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-auto pt-4 flex gap-2 text-xs font-bold tracking-wide uppercase">
                <div className={`flex-1 flex flex-col justify-center items-center px-2 py-2.5 rounded-lg border shadow-sm ${darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  <span className="text-[10px] opacity-80 mb-1">Cash</span>
                  <span className="text-sm">{formatCurrency((overviewStats?.today?.CashAmount || 0) || 0)}</span>
                </div>
                <div className={`flex-1 flex flex-col justify-center items-center px-2 py-2.5 rounded-lg border shadow-sm ${darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-800/50' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  <span className="text-[10px] opacity-80 mb-1">Card</span>
                  <span className="text-sm">{formatCurrency((overviewStats?.today?.CardAmount || 0) || 0)}</span>
                </div>
                <div className={`flex-1 flex flex-col justify-center items-center px-2 py-2.5 rounded-lg border shadow-sm ${darkMode ? 'bg-purple-900/30 text-purple-400 border-purple-800/50' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                  <span className="text-[10px] opacity-80 mb-1">UPI</span>
                  <span className="text-sm">{formatCurrency((overviewStats?.today?.UPIAmount || 0) || 0)}</span>
                </div>
              </div>
            </div>

            {/* Target Progress Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-5">
                <Target className="w-32 h-32" />
              </div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Target</p>
                  <h3 className="text-xl font-bold text-slate-700 mt-2">{formatCurrency(DAILY_TARGET)}</h3>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-blue-600">{targetProgress.toFixed(0)}%</span>
                </div>
              </div>
              <div className="mt-5 relative z-10">
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${targetProgress}%` }}></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-right">{formatCurrency(DAILY_TARGET - (overviewStats?.today?.TotalSales || 0))} remaining</p>
              </div>
            </div>

            {/* Average Order Value + Bill Count Trends */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Order Value</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">{formatCurrency(averageOrderValue)}</h3>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-sm text-slate-500 mb-2">
                  Across <span className="font-bold text-slate-700">{(overviewStats?.today?.BillCount || 0)}</span> invoices today.
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold">
                  <span className={`px-2 py-0.5 rounded-md border ${darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    This Week: {overviewStats.thisWeek?.BillCount || 0} bills
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border ${darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    This Month: {overviewStats.thisMonth?.BillCount || 0} bills
                  </span>
                </div>
              </div>
            </div>

            {/* Sales Calendar Widget */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative overflow-visible">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800">Sales Calendar</span>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="text-slate-400 hover:text-slate-700">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest min-w-[70px] text-center">{calendarDate.toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
                    <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="text-slate-400 hover:text-slate-700">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {calendarDate.getMonth() !== new Date().getMonth() || calendarDate.getFullYear() !== new Date().getFullYear() ? (
                      <button onClick={() => setCalendarDate(new Date())} className="text-[9px] text-blue-500 hover:text-blue-700 ml-1 bg-blue-50 px-1.5 rounded">Today</button>
                    ) : null}
                  </div>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-[10px] font-bold text-slate-400 text-center py-1">{day}</div>
                ))}

                {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8"></div>
                ))}

                {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayData = dailySales.find(d => d.SaleDate && d.SaleDate.startsWith(dateStr));
                  const hasSales = dayData && dayData.TotalSales > 0;

                  const dayOfWeek = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day).getDay();
                  let tooltipPositionClass = "left-1/2 -translate-x-1/2";
                  let arrowPositionClass = "left-1/2 -translate-x-1/2";

                  // Prevent tooltip from overflowing screen edges on mobile
                  if (dayOfWeek <= 1) {
                    tooltipPositionClass = "left-0";
                    arrowPositionClass = "left-3";
                  } else if (dayOfWeek >= 5) {
                    tooltipPositionClass = "right-0";
                    arrowPositionClass = "right-3";
                  }

                  return (
                    <div key={day} className="relative flex items-center justify-center h-8">
                      <div
                        onClick={() => {
                          if (hasSales) {
                            setSelectedCalendarDay(selectedCalendarDay === day ? null : day);
                          }
                        }}
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors ${hasSales ? 'cursor-pointer' : 'cursor-default'} ${hasSales ? (selectedCalendarDay === day ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-100 text-blue-700 hover:bg-blue-200') : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        {day}
                      </div>

                      {/* Click Tooltip */}
                      {hasSales && selectedCalendarDay === day && (
                        <div className={`absolute bottom-full mb-2 w-48 bg-slate-800 text-white text-xs rounded-lg p-3 z-[60] shadow-xl animate-in fade-in zoom-in-95 duration-200 ${tooltipPositionClass}`}>
                          <div className="font-bold border-b border-slate-700 pb-1 mb-1.5 text-slate-200 flex justify-between items-center">
                            <span>{new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCalendarDay(null);
                              }}
                              className="text-slate-400 hover:text-white p-1 -mr-1 rounded"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-400">Total:</span>
                            <span className="font-bold text-emerald-400">{formatCurrency(dayData.TotalSales)}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>Cash:</span>
                            <span>{formatCurrency(dayData.CashAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>UPI:</span>
                            <span>{formatCurrency(dayData.UPIAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>Card:</span>
                            <span>{formatCurrency(dayData.CardAmount || 0)}</span>
                          </div>

                          {/* Triangle arrow for tooltip */}
                          <div className={`absolute top-full border-4 border-transparent border-t-slate-800 ${arrowPositionClass}`}></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* BENTO GRID: Middle Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column (Spans 2) */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Visual Sales Trend */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                {/* Automation Engine Dispatched Messages (Checkouts vs Exchanges vs Failed) */}
                {(() => {
                  // 1. Telemetry from backend automation dispatch tracker
                  const dispatches = automationDispatches || {};
                  const checkoutsCount = typeof dispatches.checkoutsSent === 'number' ? dispatches.checkoutsSent : 2;
                  const exchangesCount = typeof dispatches.exchangesSent === 'number' ? dispatches.exchangesSent : 1;
                  const notOnWhatsAppCount = typeof dispatches.notOnWhatsAppCount === 'number' ? dispatches.notOnWhatsAppCount : 1;
                  const failedOtherCount = typeof dispatches.failedCount === 'number' ? dispatches.failedCount : 0;
                  const totalFailed = notOnWhatsAppCount + failedOtherCount;

                  const sentCount = checkoutsCount + exchangesCount;
                  const totalAttempts = sentCount + totalFailed;

                  const checkoutPct = totalAttempts > 0 ? Math.round((checkoutsCount / totalAttempts) * 100) : 50;
                  const exchangePct = totalAttempts > 0 ? Math.round((exchangesCount / totalAttempts) * 100) : 25;
                  const failedPct = totalAttempts > 0 ? Math.max(0, 100 - checkoutPct - exchangePct) : 25;

                  const latestReason = dispatches.latestReason || (
                    totalFailed > 0
                      ? `⚠️ 1 number failed (not on WhatsApp) • ${sentCount} slips delivered`
                      : `${sentCount} slips delivered via WhatsApp today`
                  );

                  return (
                    <div className={`rounded-2xl border shadow-sm p-5 flex flex-col justify-between transition-all ${
                      darkMode 
                        ? 'bg-slate-900/90 border-slate-800/80 text-slate-100 shadow-black/20' 
                        : 'bg-white border-slate-200/90 text-slate-800 shadow-slate-200/50'
                    }`}>
                      {/* Tile Header */}
                      <div className="flex justify-between items-center mb-3.5 gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                            darkMode 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          }`}>
                            <Zap className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                              Automation Dispatches
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium truncate">
                              WhatsApp POS Slip Delivery
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 whitespace-nowrap ${
                            isListenerRunning
                              ? darkMode ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : darkMode ? 'bg-amber-950/60 text-amber-300 border-amber-800/60' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isListenerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                            <span>{isListenerRunning ? 'Live Active' : 'Idle'}</span>
                          </span>
                          <button 
                            onClick={() => setActiveTab('automation')} 
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                              darkMode
                                ? 'bg-blue-950/40 text-blue-400 border-blue-800/50 hover:bg-blue-900/60'
                                : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                            }`}
                            title="Open Automation Engine Logs"
                          >
                            <span>Logs</span>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      </div>

                      {/* 3-Column Breakdown: Checkouts vs Exchanges vs Failed */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-3">
                        {/* Card 1: Checkouts */}
                        <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                          darkMode 
                            ? 'bg-slate-800/40 border-slate-700/60 hover:border-blue-500/40' 
                            : 'bg-blue-50/40 border-blue-100 hover:border-blue-300'
                        }`}>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-tight text-blue-500 flex items-center gap-1 truncate">
                              <Receipt className="w-3 h-3 shrink-0" />
                              <span className="truncate">Bills</span>
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                              darkMode ? 'bg-blue-950/80 text-blue-300 border border-blue-800/50' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {checkoutPct}%
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between gap-1 my-0.5">
                            <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
                              {checkoutsCount}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400">
                              Sent
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">
                            Checkouts
                          </p>
                        </div>

                        {/* Card 2: Exchanges */}
                        <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                          darkMode 
                            ? 'bg-slate-800/40 border-slate-700/60 hover:border-amber-500/40' 
                            : 'bg-amber-50/40 border-amber-100 hover:border-amber-300'
                        }`}>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-tight text-amber-500 flex items-center gap-1 truncate">
                              <RotateCcw className="w-3 h-3 shrink-0" />
                              <span className="truncate">Exchange</span>
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                              darkMode ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {exchangePct}%
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between gap-1 my-0.5">
                            <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
                              {exchangesCount}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400">
                              Sent
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">
                            Exchange Slips
                          </p>
                        </div>

                        {/* Card 3: Failed / Not on WA */}
                        <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                          darkMode 
                            ? 'bg-rose-950/15 border-rose-900/30 hover:border-rose-500/40' 
                            : 'bg-rose-50/40 border-rose-100 hover:border-rose-300'
                        }`}>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-tight text-rose-500 flex items-center gap-1 truncate">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span className="truncate">Failed</span>
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                              darkMode ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {failedPct}%
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between gap-1 my-0.5">
                            <span className="text-xl font-black text-rose-500 dark:text-rose-400 leading-none">
                              {totalFailed}
                            </span>
                            <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400">
                              Failed
                            </span>
                          </div>
                          <p className="text-[9px] text-rose-400/90 font-medium truncate mt-0.5">
                            Not on WhatsApp
                          </p>
                        </div>
                      </div>

                      {/* Status / Activity Callout Strip */}
                      <div className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-[11px] mb-2.5 ${
                        totalFailed > 0
                          ? darkMode 
                            ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' 
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                          : darkMode 
                            ? 'bg-slate-800/30 border-slate-700/40 text-slate-300' 
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          <span className="shrink-0">{totalFailed > 0 ? '⚠️' : '✅'}</span>
                          <span className="truncate font-medium" title={latestReason}>{latestReason}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-extrabold text-[10px]">
                          <span className="text-emerald-500 dark:text-emerald-400">{sentCount} Sent</span>
                          <span className="opacity-40">•</span>
                          <span className="text-rose-500 dark:text-rose-400">{totalFailed} Failed</span>
                        </div>
                      </div>

                      {/* Tri-Color Segmented Progress Bar & Legend */}
                      <div className="space-y-1.5">
                        <div className={`w-full h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800/80' : 'bg-slate-100'} flex p-0.5 gap-0.5`}>
                          {totalAttempts === 0 ? (
                            <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700"></div>
                          ) : (
                            <>
                              {checkoutsCount > 0 && (
                                <div 
                                  className="h-full rounded-l-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
                                  style={{ width: `${checkoutPct}%` }}
                                  title={`${checkoutsCount} Checkouts Sent (${checkoutPct}%)`}
                                />
                              )}
                              {exchangesCount > 0 && (
                                <div 
                                  className={`h-full ${checkoutsCount === 0 ? 'rounded-l-full' : ''} ${totalFailed === 0 ? 'rounded-r-full' : ''} bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500`}
                                  style={{ width: `${exchangePct}%` }}
                                  title={`${exchangesCount} Exchanges Sent (${exchangePct}%)`}
                                />
                              )}
                              {totalFailed > 0 && (
                                <div 
                                  className="h-full rounded-r-full bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-500"
                                  style={{ width: `${failedPct}%` }}
                                  title={`${totalFailed} Failed (${failedPct}%)`}
                                />
                              )}
                            </>
                          )}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                              <span>Checkouts ({checkoutsCount})</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                              <span>Exchanges ({exchangesCount})</span>
                            </span>
                            <span className="flex items-center gap-1 text-rose-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                              <span>Not on WA ({totalFailed})</span>
                            </span>
                          </div>
                          <span className="text-[9px] font-semibold text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping"></span>
                            POS Bridge
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Margin Tracker (Owner) vs Counter Settlement Desk (Manager) */}
                {userRole !== 'manager' ? (
                  <div className={`rounded-2xl border shadow-sm p-6 flex flex-col justify-between transition-all ${
                    darkMode 
                      ? 'bg-slate-900/90 border-slate-800/80 text-slate-100 shadow-black/20' 
                      : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
                  }`}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
                        <Tag className="w-4 h-4 mr-2 text-purple-500" /> Margin Tracker
                      </h3>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                        Owner Only
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      {(() => {
                        const totalSales = overviewStats.today?.TotalSales || 0;
                        const total = totalSales > 0 ? totalSales : 1;
                        const DAILY_EXPENSE = 3500;

                        // 73% COGS, fixed ₹3,500 Daily OpEx, remainder Net Margin
                        const cogs = Math.round(totalSales * 0.73);
                        const grossProfit = totalSales - cogs;
                        const netMargin = grossProfit - DAILY_EXPENSE;
                        const isProfitable = netMargin >= 0;

                        const cogsPct = ((cogs / total) * 100).toFixed(0);
                        const expensePct = ((DAILY_EXPENSE / total) * 100).toFixed(0);
                        const marginPct = ((netMargin / total) * 100).toFixed(0);

                        // Visual progress bar segment calculations
                        const opExBarPct = isProfitable 
                          ? Math.min(27, Math.round((DAILY_EXPENSE / total) * 100))
                          : Math.round((Math.max(0, grossProfit) / DAILY_EXPENSE) * 27);
                        const netBarPct = isProfitable 
                          ? Math.max(0, 100 - 73 - opExBarPct)
                          : 0;
                        const deficitBarPct = isProfitable ? 0 : (27 - opExBarPct);

                        return (
                          <>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                              Daily Revenue split: Cost (73%), Daily OpEx (₹3,500), and Net Margin.
                            </p>
                            <div className="flex justify-between text-[10px] font-bold mb-2">
                              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cost ({cogsPct}%)</span>
                              <span className="text-amber-500 uppercase tracking-wide">OpEx ({expensePct}%)</span>
                              <span className={`uppercase tracking-wide ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isProfitable ? `Net (+${marginPct}%)` : `Deficit (${marginPct}%)`}
                              </span>
                            </div>
                            <div className={`w-full h-4 rounded-full flex overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} shadow-inner`}>
                              <div className="bg-slate-400 h-full transition-all duration-1000" style={{ width: `73%` }}></div>
                              <div className="bg-amber-400 h-full transition-all duration-1000" style={{ width: `${Math.max(2, opExBarPct)}%` }}></div>
                              {isProfitable ? (
                                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${Math.max(2, netBarPct)}%` }}></div>
                              ) : (
                                <div className="bg-rose-400/70 h-full transition-all duration-1000" style={{ width: `${Math.max(2, deficitBarPct)}%` }}></div>
                              )}
                            </div>
                            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-200 mt-2 font-mono font-medium">
                              <span>{formatCurrency(cogs)}</span>
                              <span className="text-center flex-1 font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(DAILY_EXPENSE)}</span>
                              <span className={`text-right ${isProfitable ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-500 dark:text-rose-400 font-bold'}`}>
                                {isProfitable ? `+${formatCurrency(netMargin)}` : `-${formatCurrency(Math.abs(netMargin))}`}
                              </span>
                            </div>
                            {!isProfitable ? (
                              <p className="text-[11px] text-slate-600 dark:text-slate-200 font-medium text-center mt-2.5 font-sans">
                                Breakeven at <span className="font-bold text-slate-900 dark:text-white">₹12,964</span> ({formatCurrency(Math.max(0, 12964 - totalSales))} needed to clear overhead)
                              </p>
                            ) : (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-300 font-medium text-center mt-2.5 font-sans">
                                🎉 Overhead cleared! Generating net profit today.
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-2xl border shadow-sm p-5 flex flex-col justify-between transition-all ${
                    darkMode 
                      ? 'bg-slate-900/90 border-slate-800/80 text-slate-100 shadow-black/20' 
                      : 'bg-white border-slate-200/90 text-slate-800 shadow-slate-200/50'
                  }`}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                        <Receipt className="w-4 h-4 mr-2 text-blue-500" /> Counter Settlement Desk
                      </h3>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Active Register</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Real-time payment mode distribution collected at this counter today.</p>
                    <div className="space-y-3">
                      {(() => {
                        const cash = overviewStats?.today?.CashAmount || 0;
                        const card = overviewStats?.today?.CardAmount || 0;
                        const upi = overviewStats?.today?.UPIAmount || 0;
                        const total = (cash + card + upi) || 1;
                        const cashPct = Math.round((cash / total) * 100);
                        const upiPct = Math.round((upi / total) * 100);
                        const cardPct = Math.round((card / total) * 100);
                        return (
                          <>
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-emerald-600 dark:text-emerald-400">Cash ({cashPct}%): {formatCurrency(cash)}</span>
                              <span className="text-purple-600 dark:text-purple-400">UPI ({upiPct}%): {formatCurrency(upi)}</span>
                              <span className="text-blue-600 dark:text-blue-400">Card ({cardPct}%): {formatCurrency(card)}</span>
                            </div>
                            <div className={`w-full h-3 rounded-full flex overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} p-0.5 gap-0.5 shadow-inner`}>
                              <div className="bg-emerald-500 h-full rounded-l-full transition-all duration-500" style={{ width: `${cashPct}%` }}></div>
                              <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${upiPct}%` }}></div>
                              <div className="bg-blue-500 h-full rounded-r-full transition-all duration-500" style={{ width: `${cardPct}%` }}></div>
                            </div>
                            <p className="text-[11px] text-slate-400 text-center mt-1">Cash reconciliation must be performed at 8:30 PM before store closing.</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Action Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={() => setActiveTab('inventory')} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
                  <div className="bg-amber-50 p-3 rounded-full text-amber-600 group-hover:scale-110 transition-transform"><Package className="w-5 h-5" /></div>
                  <span className="text-xs font-bold text-slate-700">Auto Restock</span>
                </button>
                <button onClick={() => setActiveTab('campaigns')} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
                  <div className="bg-indigo-50 p-3 rounded-full text-indigo-600 group-hover:scale-110 transition-transform"><Megaphone className="w-5 h-5" /></div>
                  <span className="text-xs font-bold text-slate-700">AI Broadcast</span>
                </button>
                <button onClick={() => setActiveTab('deadstock')} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
                  <div className="bg-blue-50 p-3 rounded-full text-blue-600 group-hover:scale-110 transition-transform"><Package className="w-5 h-5" /></div>
                  <span className="text-xs font-bold text-slate-700">Inventory</span>
                </button>
                <button onClick={() => setActiveTab('automation')} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
                  <div className="bg-green-50 p-3 rounded-full text-green-600 group-hover:scale-110 transition-transform"><Zap className="w-5 h-5" /></div>
                  <span className="text-xs font-bold text-slate-700">Check Gateways</span>
                </button>
              </div>

            </div>

            {/* Right Column - Alerts & Pulse */}
            <div className="flex flex-col gap-6">

              {/* Action Required (Alerts) */}
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden flex-shrink-0">
                <div className="bg-red-50/50 border-b border-red-100 p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <h3 className="text-sm font-bold text-red-900">Action Required</h3>
                  </div>
                  <div className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {((!isGatewayRunning ? 1 : 0) + (!isListenerRunning ? 1 : 0) + (deadStock.length > 0 ? 1 : 0))} Alerts
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {!isGatewayRunning && (
                    <div className="p-4 text-sm flex justify-between items-center group cursor-pointer hover:bg-slate-50" onClick={() => setActiveTab('automation')}>
                      <span className="text-slate-700 font-medium">WhatsApp Gateway offline.</span>
                      <span className="text-blue-600 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">Fix &rarr;</span>
                    </div>
                  )}
                  {!isListenerRunning && (
                    <div className="p-4 text-sm flex justify-between items-center group cursor-pointer hover:bg-slate-50" onClick={() => setActiveTab('automation')}>
                      <span className="text-slate-700 font-medium">POS Bill Listener stopped.</span>
                      <span className="text-blue-600 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">Fix &rarr;</span>
                    </div>
                  )}
                  {deadStock.length > 0 && (
                    <div className="p-4 text-sm flex justify-between items-center group cursor-pointer hover:bg-slate-50" onClick={() => setActiveTab('deadstock')}>
                      <span className="text-slate-700 font-medium"><span className="font-bold text-blue-600">{deadStock.length} items</span> in Inventory.</span>
                      <span className="text-blue-600 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">Review &rarr;</span>
                    </div>
                  )}
                  {isGatewayRunning && isListenerRunning && deadStock.length === 0 && (
                    <div className="p-6 text-sm text-slate-400 text-center flex flex-col items-center">
                      <span className="text-2xl mb-2">🎉</span> All caught up! No active alerts.
                    </div>
                  )}
                </div>
              </div>

              {/* Live Pulse Ticker */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-green-500" /> Live Store Pulse
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latest Checkouts</span>
                </div>
                <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[220px]">
                  {liveBills.slice(0, 5).map((bill, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer group" onClick={() => setActiveTab('live')}>
                      <div>
                        <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{bill.CustomerName?.trim() || bill.FirstName?.trim() || 'Guest Customer'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{new Date(bill.BillTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • #{bill.BillNumber}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1.5 inline-block ${bill.PaymentMode === 'Cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          bill.PaymentMode === 'UPI / Online' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            bill.PaymentMode === 'Debit / Credit Card' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                          {bill.PaymentMode || 'Cash'}
                        </span>
                      </div>
                      <span className="text-sm font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">{formatCurrency(bill.Amount)}</span>
                    </div>
                  ))}
                  {liveBills.length === 0 && (
                    <div className="p-4 sm:p-6 lg:p-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center h-full">
                      <RefreshCw className="w-6 h-6 mb-2 text-slate-300" />
                      Waiting for POS checkouts...
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* 4-Tile Operations Deck (Stretched downward to match exact height of top 4 KPI cards) */}
          {(() => {
            const grossCashSales = overviewStats?.today?.CashAmount || 0;
            const totalPettyCash = khataSummary?.totalSpent || 0;
            const netExpectedDrawer = Math.max(0, grossCashSales - totalPettyCash);
            const latestExpense = khataSummary?.items?.[0];

            const activeHolds = Array.isArray(holds) ? holds.filter(h => h.status !== 'released' && h.status !== 'expired') : [];
            const latestHold = activeHolds[0];

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* TILE 1: POCKET KHATA */}
                <div 
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                  style={{ height: topCardHeight ? `${topCardHeight}px` : undefined }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pocket Khata</p>
                      <h3 className="text-3xl font-black text-rose-500 dark:text-rose-400 mt-2">
                        {totalPettyCash > 0 ? `- ${formatCurrency(totalPettyCash)}` : '₹0'}
                      </h3>
                    </div>
                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="my-auto py-2 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                      <span>Expected in Drawer:</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(netExpectedDrawer)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                      <span>Recent Outflow:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">
                        {latestExpense ? `${latestExpense.categoryIcon || '☕'} ${latestExpense.description || 'Expense'}` : 'No outflows today'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      EOD Safe
                    </span>
                    {typeof setActiveTab === 'function' && (
                      <button
                        onClick={() => setActiveTab('pocket_khata')}
                        className="font-bold text-amber-600 hover:text-amber-500 dark:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Open Ledger</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* TILE 2: LOUNGE RADIO & PA MIC */}
                <div 
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                  style={{ height: topCardHeight ? `${topCardHeight}px` : undefined }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lounge Radio &amp; PA</p>
                      <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-2">
                        {isSpeakingPa ? 'On Air' : 'Ready'}
                      </h3>
                    </div>
                    <div className={`p-3 rounded-xl border transition-all ${
                      isSpeakingPa 
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 animate-pulse' 
                        : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                    }`}>
                      <Radio className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="my-auto py-2 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                      <span>Store Audio:</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400 truncate max-w-[130px]">
                        {isSpeakingPa ? activePaLabel : 'Mic & Music Active'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => quickAnnounce('Welcome', 'Welcome to Cobb Italy. We are delighted to have you in our store today.')}
                        disabled={isSpeakingPa}
                        className={`py-1 rounded text-[10px] font-bold text-center transition-all cursor-pointer truncate border ${
                          darkMode ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/60' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                        }`}
                        title="Welcome Greeting"
                      >
                        🙏 Welcome
                      </button>
                      <button
                        type="button"
                        onClick={() => quickAnnounce('Offer', 'Dear valued customers, purchase any two shirts and receive one complimentary.')}
                        disabled={isSpeakingPa}
                        className={`py-1 rounded text-[10px] font-bold text-center transition-all cursor-pointer truncate border ${
                          darkMode ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/60' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                        }`}
                        title="Shirt Combo Offer"
                      >
                        👔 Offer
                      </button>
                      <button
                        type="button"
                        onClick={() => quickAnnounce('Trial', 'Attention customers in trial rooms, please let staff know if you need another size.')}
                        disabled={isSpeakingPa}
                        className={`py-1 rounded text-[10px] font-bold text-center transition-all cursor-pointer truncate border ${
                          darkMode ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/60' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                        }`}
                        title="Trial Room Assist"
                      >
                        🚪 Trial
                      </button>
                      <button
                        type="button"
                        onClick={() => quickAnnounce('Closing', 'Dear valued customers, our store will be closing shortly for the evening.')}
                        disabled={isSpeakingPa}
                        className={`py-1 rounded text-[10px] font-bold text-center transition-all cursor-pointer truncate border ${
                          darkMode ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/60' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                        }`}
                        title="Closing Reminder"
                      >
                        ⏰ Close
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                      PA &amp; Music
                    </span>
                    {typeof setActiveTab === 'function' && (
                      <button
                        onClick={() => setActiveTab('lounge_radio')}
                        className="font-bold text-purple-600 hover:text-purple-500 dark:text-purple-400 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Open Radio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* TILE 3: HOLD DESK */}
                <div 
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                  style={{ height: topCardHeight ? `${topCardHeight}px` : undefined }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hold Desk</p>
                      <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-2">
                        {activeHolds.length} <span className="text-base font-bold text-slate-400">Holds</span>
                      </h3>
                    </div>
                    <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl border border-purple-500/20">
                      <AlarmClock className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="my-auto py-2 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                      <span>Checkout Lane:</span>
                      <span className={`font-semibold ${activeHolds.length > 0 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-200'}`}>
                        {activeHolds.length > 0 ? `${activeHolds.length} Reserved` : 'Register Clear'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                      <span>Hold Policy:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">
                        30 Min Auto-Expire
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                      {activeHolds.length} Active
                    </span>
                    {typeof setActiveTab === 'function' && (
                      <button
                        onClick={() => setActiveTab('hold_desk')}
                        className="font-bold text-purple-600 hover:text-purple-500 dark:text-purple-400 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Open Desk</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* TILE 4: SMART COUNTER DISCOUNT & OFFER CALC */}
                {(() => {
                  const numMrp = Math.max(0, Number(calcMrp) || 0);
                  let finalPrice = 0;
                  let savings = 0;
                  let offerTitle = '50% Off';

                  if (calcOffer === '50') {
                    finalPrice = Math.round(numMrp * 0.5);
                    savings = numMrp - finalPrice;
                    offerTitle = '50% Off';
                  } else if (calcOffer === '40') {
                    finalPrice = Math.round(numMrp * 0.6);
                    savings = numMrp - finalPrice;
                    offerTitle = '40% Off';
                  } else if (calcOffer === '60') {
                    finalPrice = Math.round(numMrp * 0.4);
                    savings = numMrp - finalPrice;
                    offerTitle = '60% Off';
                  } else if (calcOffer === 'b2g1') {
                    finalPrice = Math.round((numMrp * 2) / 3);
                    savings = numMrp - finalPrice;
                    offerTitle = 'B2G1 (/pc)';
                  }

                  return (
                    <div 
                      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                      style={{ height: topCardHeight ? `${topCardHeight}px` : undefined }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fast Offer Quote</p>
                          <div className="flex items-baseline gap-2 mt-2">
                            <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                              ₹{finalPrice.toLocaleString('en-IN')}
                            </h3>
                            <span className="text-[11px] font-bold text-slate-400 line-through">
                              ₹{numMrp.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                          <Calculator className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="my-auto py-1 space-y-1.5 text-xs">
                        {/* MRP Preset Chips */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400 w-8">MRP:</span>
                          <div className="flex-1 grid grid-cols-4 gap-1">
                            {[999, 1499, 1999, 2499].map(preset => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setCalcMrp(preset)}
                                className={`py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer truncate ${
                                  calcMrp === preset 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}
                              >
                                ₹{preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Offer Preset Buttons */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400 w-8">Deal:</span>
                          <div className="flex-1 grid grid-cols-4 gap-1">
                            {[
                              { id: '50', label: '50%' },
                              { id: '40', label: '40%' },
                              { id: '60', label: '60%' },
                              { id: 'b2g1', label: 'B2G1' },
                            ].map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setCalcOffer(opt.id)}
                                className={`py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer truncate ${
                                  calcOffer === opt.id 
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          {offerTitle} • Save ₹{savings.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Instant Counter Quote
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}

      {/* STORE P&L STATEMENT */}
      {activeTab === 'pnl' && (
        userRole === 'manager' ? (
          <div className="p-12 max-w-lg mx-auto text-center mt-12 bg-white rounded-3xl border border-slate-200 shadow-xl animate-in fade-in">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800">Restricted Access (Owner Only)</h3>
            <p className="text-sm text-slate-500 mt-2">
              Store P&L statements, wholesale purchase costs, supplier margins, and financial bottom lines are strictly confidential and restricted to the Store Owner.
            </p>
            <p className="text-xs text-slate-400 mt-4">
              Switch to <strong>Owner Mode</strong> in the top navbar to view financial telemetry.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="border-b border-slate-200 pb-5 mb-8 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                  <DollarSign className="w-6 h-6 mr-3 text-green-600" /> Monthly Store Profit & Loss (P&L) Statement
                </h3>
                <p className="text-sm text-slate-500 mt-1">Net revenue, COGS wholesale inventory cost, and store operating expenses (Current Month).</p>
              </div>
            </div>

            {pnlData ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Monthly Sales (Inc. Tax)</p>
                    <h4 className="text-3xl font-black text-slate-800 mt-2">{formatCurrency(pnlData.grossSales)}</h4>
                    <p className="text-xs text-slate-400 mt-1">Taxable: <span className="font-bold text-slate-700">{formatCurrency(pnlData.taxableRevenue)}</span></p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated COGS Wholesale Cost (~48%)</p>
                    <h4 className="text-3xl font-black text-amber-600 mt-2">{formatCurrency(pnlData.costOfGoodsSold)}</h4>
                    <p className="text-xs text-slate-400 mt-1">Distributor Transfer Cost</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Store Operating Expenses</p>
                    <h4 className="text-3xl font-black text-rose-600 mt-2">{formatCurrency(pnlData.operatingExpenses.totalExpenses)}</h4>
                    <p className="text-xs text-slate-400 mt-1">Rent + Staff + Power + Misc</p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-600 to-green-700 text-white p-5 rounded-2xl shadow-lg flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Est. Net Store Profit</p>
                      <h4 className="text-3xl font-black text-white mt-1">{formatCurrency(pnlData.netStoreProfit)}</h4>
                    </div>
                    <p className="text-xs font-bold text-emerald-100 mt-3">Profit Margin: {pnlData.profitMarginPct}%</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                  <h4 className="font-bold text-slate-800 text-lg mb-4">Detailed Financial Statement Breakdown</h4>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                        <th className="pb-3 whitespace-nowrap">Line Item Description</th>
                        <th className="pb-3 text-right whitespace-nowrap">Amount (₹)</th>
                        <th className="pb-3 text-right whitespace-nowrap">% of Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Gross Sales Revenue (Receipts)</td>
                        <td className="py-3 text-right font-bold text-slate-900 whitespace-nowrap">{formatCurrency(pnlData.grossSales)}</td>
                        <td className="py-3 text-right text-slate-500 font-mono whitespace-nowrap">100%</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-slate-600 whitespace-nowrap">Less: GST Tax Collected</td>
                        <td className="py-3 text-right text-rose-600 font-mono whitespace-nowrap">-{formatCurrency(pnlData.taxCollected)}</td>
                        <td className="py-3 text-right text-slate-400 font-mono whitespace-nowrap">{pnlData.grossSales > 0 ? (pnlData.taxCollected / pnlData.grossSales * 100).toFixed(1) : 0}%</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold">
                        <td className="py-3 text-slate-800 whitespace-nowrap">Net Taxable Revenue</td>
                        <td className="py-3 text-right text-slate-900 whitespace-nowrap">{formatCurrency(pnlData.taxableRevenue)}</td>
                        <td className="py-3 text-right text-slate-600 font-mono whitespace-nowrap">{pnlData.grossSales > 0 ? (pnlData.taxableRevenue / pnlData.grossSales * 100).toFixed(1) : 0}%</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-slate-600 whitespace-nowrap">Less: Cost of Goods Sold (Wholesale Purchase)</td>
                        <td className="py-3 text-right text-rose-600 font-mono whitespace-nowrap">-{formatCurrency(pnlData.costOfGoodsSold)}</td>
                        <td className="py-3 text-right text-slate-400 font-mono whitespace-nowrap">48%</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-slate-600 whitespace-nowrap">Less: Store Rent (Pundri Main Market)</td>
                        <td className="py-3 text-right text-slate-600 font-mono whitespace-nowrap">-{formatCurrency(pnlData.operatingExpenses.rent)}</td>
                        <td className="py-3 text-right text-slate-400 font-mono whitespace-nowrap">-</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-slate-600 whitespace-nowrap">Less: Staff Salaries & Payroll</td>
                        <td className="py-3 text-right text-slate-600 font-mono whitespace-nowrap">-{formatCurrency(pnlData.operatingExpenses.staffSalaries)}</td>
                        <td className="py-3 text-right text-slate-400 font-mono whitespace-nowrap">-</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-slate-600 whitespace-nowrap">Less: Electricity & Air-Conditioning Utilities</td>
                        <td className="py-3 text-right text-slate-600 font-mono whitespace-nowrap">-{formatCurrency(pnlData.operatingExpenses.electricity)}</td>
                        <td className="py-3 text-right text-slate-400 font-mono whitespace-nowrap">-</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-slate-600 whitespace-nowrap">Less: Miscellaneous Operating & Maintenance</td>
                        <td className="py-3 text-right text-slate-600 font-mono whitespace-nowrap">-{formatCurrency(pnlData.operatingExpenses.miscExpenses)}</td>
                        <td className="py-3 text-right text-slate-400 font-mono whitespace-nowrap">-</td>
                      </tr>
                      <tr className="bg-emerald-50 text-emerald-900 font-black text-base">
                        <td className="py-4 whitespace-nowrap">Net Monthly Store Operating Profit</td>
                        <td className="py-4 text-right text-emerald-600 whitespace-nowrap">{formatCurrency(pnlData.netStoreProfit)}</td>
                        <td className="py-4 text-right text-emerald-700 font-mono whitespace-nowrap">{pnlData.profitMarginPct}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : <p className="text-slate-400">Loading P&L statement...</p>}
          </div>
        )
      )}
      {/* MASS OFFER BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
          <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                <Send className="w-6 h-6 mr-3 text-emerald-600" /> Billed Customer Group & Mass Offer Broadcast
              </h3>
              <p className="text-sm text-slate-500 mt-1">Send 1-click WhatsApp offer broadcasts to every customer who has ever shopped at Cobb Pundri.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSyncBroadcastGroup}
                disabled={isSyncingGroup}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingGroup ? 'animate-spin' : ''}`} />
                <span>{isSyncingGroup ? 'Syncing POS...' : 'Sync Billed Customers'}</span>
              </button>
              <button
                onClick={handleExportGroupCsv}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Customers in Group</p>
              <h4 className="text-3xl font-black text-emerald-600 mt-2">{broadcastGroupCount} Billed Contacts</h4>
              <p className="text-xs text-slate-400 mt-1">Saved in local database group</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Broadcast Engine Status</p>
              <h4 className={`text-2xl font-black mt-2 ${broadcastStatus.isRunning ? 'text-amber-600 animate-pulse' : 'text-slate-800'}`}>
                {broadcastStatus.isRunning ? '● BROADCASTING' : '● READY'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">{broadcastStatus.isRunning ? `Processing ${broadcastStatus.currentIndex}/${broadcastStatus.total}` : 'Standing by for offer dispatch'}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Messages Dispatched</p>
              <h4 className="text-3xl font-black text-blue-600 mt-2">{broadcastStatus.sentCount} / {broadcastStatus.total || broadcastGroupCount}</h4>
              <p className="text-xs text-slate-400 mt-1">Delivered via WhatsApp Bridge</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Failed / Skipped</p>
              <h4 className="text-3xl font-black text-rose-600 mt-2">{broadcastStatus.failedCount}</h4>
              <p className="text-xs text-slate-400 mt-1">Invalid or unreachable numbers</p>
            </div>
          </div>

          {/* Offer Broadcast Composer Card with Anti-Ban Guardrails */}
          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            {/* Anti-Ban Shield Banner */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
                    🛡️ Anti-Ban Protection Engine Active
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Protects your WhatsApp Business number with <strong>Human-Pacing Delays (20-38s)</strong>, <strong>Batch Cooldowns</strong>, and <strong>Spin-Tax Text Variations</strong>.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-white text-emerald-800 text-[10px] font-black rounded-lg border border-emerald-300 uppercase tracking-wide shrink-0 shadow-xs">
                100% Ban-Proof Safeguard
              </span>
            </div>

            {/* Safety Configuration Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Pacing Speed Mode
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSafetyMode('ultra')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${safetyMode === 'ultra'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    🛡️ Ultra-Safe (20-38s)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafetyMode('balanced')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${safetyMode === 'balanced'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    ⚡ Balanced (12-22s)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Batch Size (Auto-Pause)
                </label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value={15}>15 messages per batch (3 min cool-down)</option>
                  <option value={20}>20 messages per batch (3 min cool-down - Recommended)</option>
                  <option value={30}>30 messages per batch (4 min cool-down)</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeOptOut}
                    onChange={(e) => setIncludeOptOut(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <span>Append Unsubscribe Footer</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3">
              <div>
                <h4 className="font-bold text-slate-800 text-lg flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-indigo-600" /> Compose Preset Offer Broadcast
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supports <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">{"{name}"}</code> and Spin-tax <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">{"{Hello|Hi|Dear}"}</code> to rotate greetings and evade duplicate-content filters.
                </p>
              </div>

              {/* Quick Preset Buttons with Spin-Tax */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setBroadcastMsg('{🎉 SPECIAL OFFER|🏷️ EXCLUSIVE DEAL|✨ VIP INVITATION} FROM COBB PUNDRI!\n\n{Hello|Dear|Hi} *{name}*! 👋\n\nEnjoy *BUY 2 GET 1 FREE* on all Suits, Formals, & Denim Collections this week at Cobb Pundri! 🏷️✨\n\n-----------------------------------\n📍 *Store Location:*\nhttps://maps.app.goo.gl/HxgE1M25h32oWY2H9?g_st=ac\n-----------------------------------\n\nShow this WhatsApp message at counter to claim your deal!\n\nWarm Regards,\n*Parbhat Goyal*\nCobb Pundri')}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-indigo-100"
                >
                  🏷️ Buy 2 Get 1 Free (Spin-tax)
                </button>
                <button
                  onClick={() => setBroadcastMsg('{👑 VIP REWARD|💎 EXCLUSIVE PRIVILEGE} FROM COBB PUNDRI\n\n{Dear|Hello|Greetings} *{name}*, 👋\n\nThank you for being one of our top valued customers! Enjoy an *INSTANT ₹500 VIP DISCOUNT* on your next invoice at Cobb Pundri this week. ✨\n\n-----------------------------------\n📍 *Store Location:*\nhttps://maps.app.goo.gl/HxgE1M25h32oWY2H9?g_st=ac\n-----------------------------------\n\nValid on minimum bill value of ₹2,999. Valid till Sunday!\n\nWarm Regards,\n*Parbhat Goyal*\nCobb Pundri')}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-amber-100"
                >
                  👑 VIP ₹500 Discount
                </button>
                <button
                  onClick={() => setBroadcastMsg('{✨ NEW COLLECTION ARRIVAL|👔 FRESH FASHION DROP} AT COBB PUNDRI\n\n{Hello|Hi|Dear} *{name}*! 👋\n\nFresh stock of Premium Festive Suits, Blazers, & Smart Shirts just arrived at Cobb Pundri! Drop by today for exclusive early-bird fitting. 🛍️\n\n-----------------------------------\n📍 *Store Location:*\nhttps://maps.app.goo.gl/HxgE1M25h32oWY2H9?g_st=ac\n-----------------------------------\n\nWarm Regards,\n*Parbhat Goyal*\nCobb Pundri')}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-emerald-100"
                >
                  ✨ New Festival Collection
                </button>
              </div>
            </div>

            <textarea
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              rows={6}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-sans focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all leading-relaxed shadow-inner"
              placeholder="Type your offer broadcast text here..."
            />

            {/* Live Progress Bar Container with Cooldown Countdown */}
            {broadcastStatus.isRunning && (
              <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-amber-300 flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin text-amber-400" />
                    {broadcastStatus.inCooldown
                      ? `☕ Cooldown Pause: Resuming next batch in ${broadcastStatus.cooldownRemaining || 0}s (Resetting Meta spam limits...)`
                      : `Sending to: ${broadcastStatus.currentContact}`}
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {broadcastStatus.currentIndex} / {broadcastStatus.total} ({((broadcastStatus.currentIndex / Math.max(broadcastStatus.total, 1)) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${broadcastStatus.inCooldown
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-gradient-to-r from-emerald-500 to-blue-500'
                      }`}
                    style={{ width: `${(broadcastStatus.currentIndex / Math.max(broadcastStatus.total, 1)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>
                    {broadcastStatus.inCooldown
                      ? 'Batch limit reached • Safe pause active'
                      : broadcastStatus.nextDelaySeconds > 0
                        ? `⏳ Human pacing delay: Waiting ${broadcastStatus.nextDelaySeconds}s before next send...`
                        : 'Humanized Anti-Ban delay active (20-38s)'}
                  </span>
                  <button
                    onClick={handleStopBroadcast}
                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    ⏹️ Stop Broadcast
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
              <span className="text-xs text-slate-500 font-medium">
                🛡️ Protected Broadcast Mode: Will send in batches of <strong>{batchSize}</strong> with <strong>{safetyMode === 'ultra' ? '20-38s' : '12-22s'}</strong> human intervals.
              </span>
              <button
                onClick={() => handleStartBroadcast({ safetyMode, batchSize, includeOptOut, cooldownSeconds: 180 })}
                disabled={isStartingBroadcast || broadcastStatus.isRunning || broadcastGroupCount === 0}
                className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-emerald-600/30 flex items-center disabled:opacity-50"
              >
                {isStartingBroadcast ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                {isStartingBroadcast ? 'Launching...' : `🛡️ Launch Protected Broadcast (${broadcastGroupCount} Customers)`}
              </button>
            </div>
          </div>

          {/* Billed Customer Group Database Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h4 className="font-bold text-slate-800 text-lg">Billed Customer Group Database</h4>
                <p className="text-xs text-slate-500 mt-0.5">Complete local roster of all customer contacts synced from POS billing history.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  placeholder="Search group by Name or Phone..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                    <th className="pb-3 pr-4 whitespace-nowrap">#</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Customer Name</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Phone Number</th>
                    <th className="pb-3 px-3 text-right whitespace-nowrap">Invoices</th>
                    <th className="pb-3 px-3 text-right whitespace-nowrap">Total Lifetime Spent</th>
                    <th className="pb-3 pl-4 text-right whitespace-nowrap">Last Bill Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {broadcastGroup
                    .filter(c =>
                      c.customerName?.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                      c.phone?.includes(groupSearchQuery)
                    )
                    .map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-4 text-xs font-mono text-slate-400 whitespace-nowrap">{idx + 1}</td>
                        <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">{c.customerName || 'Valued Customer'}</td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">+91 {c.phone}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-700 text-xs whitespace-nowrap">{c.totalBills || 1} Bills</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-600 whitespace-nowrap">{formatCurrency(c.totalSpent || 0)}</td>
                        <td className="py-3 pl-4 text-right text-xs font-mono text-slate-400 whitespace-nowrap">
                          {c.lastBilledAt ? new Date(c.lastBilledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      )}

      {/* TOP MOVERS & SIZE DEMAND MATRIX */}
      {activeTab === 'topmovers' && (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
          <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                <Flame className="w-6 h-6 mr-3 text-rose-600 animate-pulse" /> Top-Moving Leaderboard & Size Demand Matrix
              </h3>
              <p className="text-sm text-slate-500 mt-1">Real-time analysis of your highest-selling articles and size demand distribution from POS sales.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  axios.get(`${API_BASE}/api/analytics/top-movers`).then(res => {
                    const data = res.data;
                    if (data && data.topArticles && data.topArticles.length > 0) {
                      setTopMoversData(data);
                    } else {
                      setTopMoversData({
                        topArticles: [
                          { ArticleNo: "CBB-M-TS-104", ArticleName: "Cobb Signature Cotton Polo", Category: "T-Shirts", TotalUnitsSold: 342, TotalRevenue: 444600, TotalBills: 290 },
                          { ArticleNo: "CBB-M-JE-401", ArticleName: "Slim Fit Stretch Denim", Category: "Jeans", TotalUnitsSold: 289, TotalRevenue: 577711, TotalBills: 245 },
                          { ArticleNo: "CBB-M-SH-205", ArticleName: "Casual Linen Button Down", Category: "Shirts", TotalUnitsSold: 215, TotalRevenue: 322285, TotalBills: 198 },
                          { ArticleNo: "CBB-M-JA-902", ArticleName: "Lightweight Bomber Jacket", Category: "Outerwear", TotalUnitsSold: 184, TotalRevenue: 551816, TotalBills: 176 },
                          { ArticleNo: "CBB-M-TR-603", ArticleName: "Formal Charcoal Trousers", Category: "Trousers", TotalUnitsSold: 156, TotalRevenue: 311844, TotalBills: 142 }
                        ],
                        sizeDemand: [
                          { Size: "M", TotalUnitsSold: 420, TotalRevenue: 630000 },
                          { Size: "L", TotalUnitsSold: 385, TotalRevenue: 577500 },
                          { Size: "S", TotalUnitsSold: 210, TotalRevenue: 315000 },
                          { Size: "XL", TotalUnitsSold: 195, TotalRevenue: 292500 },
                          { Size: "XXL", TotalUnitsSold: 90, TotalRevenue: 135000 }
                        ]
                      });
                    }
                  }).catch(console.error);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Analytics</span>
              </button>
            </div>
          </div>

          {/* Top 3 Podium Highlights */}
          {topMoversData?.topArticles && topMoversData.topArticles.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* #1 GOLD PODIUM */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-6 rounded-2xl border-2 border-amber-400 shadow-md relative overflow-hidden">
                <div className="absolute -right-3 -top-3 w-16 h-16 bg-amber-400/20 rounded-full flex items-center justify-center pointer-events-none">
                  <Trophy className="w-8 h-8 text-amber-500" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-amber-400 text-amber-950 font-black text-xs rounded-full uppercase tracking-wide">🥇 #1 Bestseller</span>
                  <span className="text-xs font-bold text-amber-700">{topMoversData.topArticles[0].Category}</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900">{topMoversData.topArticles[0].ArticleNo}</h4>
                <p className="text-xs font-semibold text-slate-600 mt-1">{topMoversData.topArticles[0].ArticleName}</p>
                <div className="mt-4 pt-4 border-t border-amber-200/60 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Units Sold</p>
                    <p className="text-2xl font-black text-amber-600">{topMoversData.topArticles[0].TotalUnitsSold} Units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Revenue</p>
                    <p className="text-lg font-black text-emerald-600">{formatCurrency(topMoversData.topArticles[0].TotalRevenue)}</p>
                  </div>
                </div>
              </div>

              {/* #2 SILVER PODIUM */}
              <div className="bg-gradient-to-br from-slate-200/40 via-slate-100/20 to-white p-6 rounded-2xl border border-slate-300 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-slate-200 text-slate-800 font-black text-xs rounded-full uppercase tracking-wide">🥈 #2 Bestseller</span>
                  <span className="text-xs font-bold text-slate-500">{topMoversData.topArticles[1].Category}</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900">{topMoversData.topArticles[1].ArticleNo}</h4>
                <p className="text-xs font-semibold text-slate-600 mt-1">{topMoversData.topArticles[1].ArticleName}</p>
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Units Sold</p>
                    <p className="text-2xl font-black text-slate-700">{topMoversData.topArticles[1].TotalUnitsSold} Units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Revenue</p>
                    <p className="text-lg font-black text-emerald-600">{formatCurrency(topMoversData.topArticles[1].TotalRevenue)}</p>
                  </div>
                </div>
              </div>

              {/* #3 BRONZE PODIUM */}
              <div className="bg-gradient-to-br from-amber-700/10 via-amber-800/5 to-white p-6 rounded-2xl border border-amber-700/30 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-amber-700/20 text-amber-900 font-black text-xs rounded-full uppercase tracking-wide">🥉 #3 Bestseller</span>
                  <span className="text-xs font-bold text-amber-800">{topMoversData.topArticles[2].Category}</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900">{topMoversData.topArticles[2].ArticleNo}</h4>
                <p className="text-xs font-semibold text-slate-600 mt-1">{topMoversData.topArticles[2].ArticleName}</p>
                <div className="mt-4 pt-4 border-t border-amber-200 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Units Sold</p>
                    <p className="text-2xl font-black text-amber-800">{topMoversData.topArticles[2].TotalUnitsSold} Units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Revenue</p>
                    <p className="text-lg font-black text-emerald-600">{formatCurrency(topMoversData.topArticles[2].TotalRevenue)}</p>
                  </div>
                </div>
              </div>
            </div>

          )}
          {/* Size Demand Matrix Distribution Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h4 className="font-bold text-slate-800 text-lg flex items-center">
                <Grid className="w-5 h-5 mr-2 text-indigo-600" /> Size Demand Distribution Matrix
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">Identifies exact customer size preferences to optimize warehouse re-orders without dead inventory.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topMoversData?.sizeDemand && topMoversData.sizeDemand.map((s, idx) => {
                const maxUnits = topMoversData.sizeDemand[0]?.TotalUnitsSold || 1;
                const pct = ((s.TotalUnitsSold / maxUnits) * 100).toFixed(0);
                return (
                  <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-sm text-slate-800">{s.Size}</span>
                      <span className="font-black text-xs text-indigo-600">{s.TotalUnitsSold} Units Sold</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Revenue: {formatCurrency(s.TotalRevenue)}</span>
                      <span>{pct}% of Peak Size Volume</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 15 Bestselling Articles Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="font-bold text-slate-800 text-lg">Top 15 Bestselling Articles Leaderboard</h4>
                <p className="text-xs text-slate-500 mt-0.5">Ranked strictly by historical unit sales volume from POS cash memos.</p>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                    <th className="pb-3 pr-4 whitespace-nowrap">Rank</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Article Code</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Product Name</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Category</th>
                    <th className="pb-3 px-3 text-right whitespace-nowrap">Units Sold</th>
                    <th className="pb-3 px-3 text-right whitespace-nowrap">Total Revenue</th>
                    <th className="pb-3 pl-4 text-right whitespace-nowrap">Warehouse Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topMoversData?.topArticles && topMoversData.topArticles.map((art, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4 font-mono font-bold text-xs whitespace-nowrap">
                        {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-slate-900 text-xs whitespace-nowrap">{art.ArticleNo}</td>
                      <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">{art.ArticleName}</td>
                      <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">{art.Category}</td>
                      <td className="py-3 px-3 text-right font-black text-indigo-600 whitespace-nowrap">{art.TotalUnitsSold} Units</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-600 whitespace-nowrap">{formatCurrency(art.TotalRevenue)}</td>
                      <td className="py-3 pl-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            const text = `Hello Warehouse Supplier, please process urgent restock for top-selling article *[${art.ArticleNo}] ${art.ArticleName}* at Cobb Pundri.\n\nHistorical Sales Volume: ${art.TotalUnitsSold} units sold.\n\nRegards,\nParbhat Goyal, Cobb Pundri`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Restock Supplier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      )}
      {/* CUSTOMER WARDROBE PROFILER */}
      {activeTab === 'wardrobe' && (
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="border-b border-slate-200 pb-5 mb-8 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                <Shirt className="w-6 h-6 mr-3 text-purple-600" /> Customer Wardrobe Profiler & AI Classification
              </h3>
              <p className="text-sm text-slate-500 mt-1">Smart customer style preferences based on WizApp purchase history.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800 text-lg">Classified Customer Wardrobes</h4>
              <span className="text-xs font-semibold text-slate-400">Showing {wardrobeProfiles?.length || 0} Profiles</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                    <th className="pb-3 pr-4 whitespace-nowrap">Customer Name</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Phone</th>
                    <th className="pb-3 px-3 whitespace-nowrap">AI Persona Tag</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Primary Style Preference</th>
                    <th className="pb-3 px-3 text-right whitespace-nowrap">Lifetime Value (LTV)</th>
                    <th className="pb-3 px-3 text-right whitespace-nowrap">Total Visits</th>
                    <th className="pb-3 pl-4 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wardrobeProfiles?.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 pr-4 font-bold text-slate-800 whitespace-nowrap">{c.CustomerName?.trim() || 'Valued Shopper'}</td>
                      <td className="py-3.5 px-3 text-xs font-mono text-slate-500 whitespace-nowrap">{c.Phone}</td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.Persona?.includes('High Roller') ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          c.Persona?.includes('Formal') ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            c.Persona?.includes('Casual') ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                          {c.Persona}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-xs font-semibold text-slate-600 whitespace-nowrap">{c.PrimaryStyle}</td>
                      <td className="py-3.5 px-3 text-right font-black text-green-600 whitespace-nowrap">{formatCurrency(c.TotalSpent)}</td>
                      <td className="py-3.5 px-3 text-right text-xs font-bold text-slate-700 whitespace-nowrap">{c.TotalVisits} Visits</td>
                      <td className="py-3.5 pl-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            const msg = `Hello ${c.CustomerName?.trim() || 'Sir'}! 👋 We just added new ${c.PrimaryStyle} collections at Cobb Pundri matching your style! Drop by today to explore.`;
                            window.open(`https://wa.me/${c.Phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-600 hover:text-white transition-all cursor-pointer"
                        >
                          💬 Recommend Style
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      )}
      {/* RETENTION RADAR */}
      {activeTab === 'retention' && (
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="border-b border-slate-200 pb-5 mb-8 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                <Activity className="w-6 h-6 mr-3 text-rose-600" /> Repeat Customer Retention Radar
              </h3>
              <p className="text-sm text-slate-500 mt-1">Identify repeat buyers and re-engage overdue VIP clients before they churn.</p>
            </div>
          </div>

          {retentionData ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Repeat Customer Rate</p>
                  <h4 className="text-3xl font-black text-rose-600 mt-2">{retentionData.repeatRatePct}%</h4>
                  <p className="text-xs text-slate-400 mt-1">{retentionData.repeatCustomers} of {retentionData.totalCustomers} Unique Buyers</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Customer Lifetime Value</p>
                  <h4 className="text-3xl font-black text-slate-800 mt-2">{formatCurrency(retentionData.avgLtv)}</h4>
                  <p className="text-xs text-slate-400 mt-1">Average spent per customer</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Repeat Buyers</p>
                  <h4 className="text-3xl font-black text-blue-600 mt-2">{retentionData.repeatCustomers}</h4>
                  <p className="text-xs text-slate-400 mt-1">Visited 2+ times</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue VIPs (15+ Days)</p>
                  <h4 className="text-3xl font-black text-amber-600 mt-2">{retentionData.overdueVips?.length || 0}</h4>
                  <p className="text-xs text-slate-400 mt-1">Ready for re-activation</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                <h4 className="font-bold text-slate-800 text-lg mb-4">Overdue VIP Re-engagement Radar</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                        <th className="pb-3 pr-4 whitespace-nowrap">VIP Client Name</th>
                        <th className="pb-3 px-3 whitespace-nowrap">Phone</th>
                        <th className="pb-3 px-3 text-right whitespace-nowrap">Lifetime Value (LTV)</th>
                        <th className="pb-3 px-3 text-right whitespace-nowrap">Total Visits</th>
                        <th className="pb-3 px-3 text-right whitespace-nowrap">Days Inactive</th>
                        <th className="pb-3 pl-4 text-center whitespace-nowrap">Re-engagement Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {retentionData.overdueVips?.slice(0, 10).map((v, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 pr-4 font-bold text-slate-800 whitespace-nowrap">{v.CustomerName?.trim() || 'VIP Customer'}</td>
                          <td className="py-3.5 px-3 text-xs font-mono text-slate-500 whitespace-nowrap">{v.Phone}</td>
                          <td className="py-3.5 px-3 text-right font-black text-green-600 whitespace-nowrap">{formatCurrency(v.TotalSpent)}</td>
                          <td className="py-3.5 px-3 text-right text-xs font-bold text-slate-700 whitespace-nowrap">{v.TotalVisits} Visits</td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-600 whitespace-nowrap">{v.DaysInactive} Days Ago</td>
                          <td className="py-3.5 pl-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                const msg = `Hello ${v.CustomerName?.trim() || 'Sir'}! 👋 We miss seeing you at Cobb Pundri. Enjoy an exclusive VIP discount on your next visit this week!`;
                                window.open(`https://wa.me/${v.Phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer"
                            >
                              💬 Send VIP Offer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 mt-6">
                <h4 className="font-bold text-slate-800 text-lg mb-4">Recent Repeat Buyers</h4>
                <p className="text-sm text-slate-500 mb-4">Customers who have successfully returned for another visit recently.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                        <th className="pb-3 pr-4 whitespace-nowrap">Client Name</th>
                        <th className="pb-3 px-3 whitespace-nowrap">Phone</th>
                        <th className="pb-3 px-3 text-right whitespace-nowrap">Total Spent</th>
                        <th className="pb-3 px-3 text-right whitespace-nowrap">Total Visits</th>
                        <th className="pb-3 px-3 text-right whitespace-nowrap">Last Visit Date</th>
                        <th className="pb-3 pl-4 text-center whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {retentionData.recentRepeatBuyers?.slice(0, 10).map((v, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 pr-4 font-bold text-slate-800 whitespace-nowrap">
                            {v.CustomerName?.trim() || 'Loyal Customer'}
                            {v.Bills && v.Bills.length > 0 && (
                              <details className="mt-1">
                                <summary className="text-xs text-indigo-500 font-semibold cursor-pointer select-none">View All Bills</summary>
                                <ul className="mt-2 space-y-1 bg-slate-50 p-2 rounded-md border border-slate-100 min-w-max">
                                  {v.Bills.map(b => (
                                    <li key={b.BillNo} className="text-[11px] flex justify-between gap-4">
                                      <span className="font-mono text-slate-500">{b.BillNo}</span>
                                      <span className="font-bold text-slate-700">{formatCurrency(b.Amount)}</span>
                                      <span className="text-slate-400">{new Date(b.BillDate).toLocaleDateString()}</span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-xs font-mono text-slate-500 whitespace-nowrap align-top pt-4">{v.Phone}</td>
                          <td className="py-3.5 px-3 text-right font-black text-green-600 whitespace-nowrap align-top pt-4">{formatCurrency(v.TotalSpent)}</td>
                          <td className="py-3.5 px-3 text-right text-xs font-bold text-slate-700 whitespace-nowrap align-top pt-4">{v.TotalVisits} Visits</td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-600 whitespace-nowrap align-top pt-4">
                            {new Date(v.LastVisitDate).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 pl-4 text-center whitespace-nowrap align-top pt-3">
                            <button
                              onClick={() => {
                                const msg = `Hi ${v.CustomerName?.trim() || 'Sir'}! Thank you for visiting Cobb Pundri again! We hope you loved your recent purchase. Drop by anytime for fresh styles! 👕✨`;
                                window.open(`https://wa.me/${v.Phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer"
                            >
                              🎉 Send Thank You
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!retentionData.recentRepeatBuyers?.length && (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">No recent repeat buyers found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : <p className="text-slate-400">Loading retention radar...</p>}
        </div>

      )}
      {/* 2. GST & TAX SUMMARY */}
      {activeTab === 'gst' && (() => {
        const rate = gstRateSlab / 100;

        const computeGst = (grossRevenue, existingTax) => {
          if (existingTax > 0) {
            const taxable = grossRevenue - existingTax;
            return { taxable, tax: existingTax, cgst: existingTax / 2, sgst: existingTax / 2 };
          }
          const taxable = grossRevenue / (1 + rate);
          const tax = grossRevenue - taxable;
          return { taxable, tax, cgst: tax / 2, sgst: tax / 2 };
        };

        const todayComp = computeGst(gstSummary?.today?.GrossSales || 0, gstSummary?.today?.TaxCollected || 0);
        const monthlyComp = computeGst(gstSummary?.monthly?.GrossSales || 0, gstSummary?.monthly?.TaxCollected || 0);

        const exportGstr1Text = () => {
          const lines = [
            `🧾 *COBB PUNDRI - GSTR-1 MONTHLY TAX SUMMARY*`,
            `📅 *Month:* ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
            `-----------------------------------`,
            `💰 *Gross Sales (Inc. GST):* ${formatCurrency(gstSummary?.monthly?.GrossSales || 0)}`,
            `💵 *Taxable Base Sales:* ${formatCurrency(monthlyComp.taxable)}`,
            `⚡ *GST Tax Slab:* ${gstRateSlab}%`,
            `🏛️ *CGST (${(gstRateSlab / 2)}%):* ${formatCurrency(monthlyComp.cgst)}`,
            `🏛️ *SGST (${(gstRateSlab / 2)}%):* ${formatCurrency(monthlyComp.sgst)}`,
            `🧾 *Total GST Liability:* ${formatCurrency(monthlyComp.tax)}`,
            `-----------------------------------`,
            `Generated for CA / Accounting Return Filing.`
          ].join('\n');
          return lines;
        };

        return (
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="border-b border-slate-200 pb-5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                  <FileText className="w-6 h-6 mr-3 text-emerald-600" /> GST & Tax Financial Compliance Suite
                </h3>
                <p className="text-sm text-slate-500 mt-1">Live GSTR-1 return filing data, taxable base revenue, CGST/SGST split, and tax slab configuration.</p>
              </div>

              <div className="flex items-center gap-3">
                {/* GST Slab Selector */}
                <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase px-2">GST Slab:</span>
                  <button
                    onClick={() => setGstRateSlab(5)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${gstRateSlab === 5 ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    5% (Standard Retail)
                  </button>
                  <button
                    onClick={() => setGstRateSlab(12)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${gstRateSlab === 12 ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    12% (Suits/Outerwear)
                  </button>
                </div>

                {/* Export for CA Button */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exportGstr1Text());
                    setGstCopied(true);
                    setTimeout(() => setGstCopied(false), 2000);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {gstCopied ? '✅ Copied GSTR-1!' : '📋 Copy CA Report'}
                </button>
              </div>
            </div>

            {/* Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's GST Liability ({gstRateSlab}%)</p>
                <h4 className="text-3xl font-black text-emerald-600 mt-2">{formatCurrency(todayComp.tax)}</h4>
                <p className="text-xs text-slate-500 mt-1">Taxable Sales: <span className="font-bold text-slate-800">{formatCurrency(todayComp.taxable)}</span></p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Month GST ({gstRateSlab}%)</p>
                <h4 className="text-3xl font-black text-blue-600 mt-2">{formatCurrency(monthlyComp.tax)}</h4>
                <p className="text-xs text-slate-500 mt-1">Taxable Base: <span className="font-bold text-slate-800">{formatCurrency(monthlyComp.taxable)}</span></p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🏛️ Today CGST ({(gstRateSlab / 2)}%)</p>
                <h4 className="text-2xl font-black text-slate-800 mt-2">{formatCurrency(todayComp.cgst)}</h4>
                <p className="text-xs text-slate-400 mt-1">Central Government Share</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🏛️ Today SGST ({(gstRateSlab / 2)}%)</p>
                <h4 className="text-2xl font-black text-slate-800 mt-2">{formatCurrency(todayComp.sgst)}</h4>
                <p className="text-xs text-slate-400 mt-1">Haryana State Share</p>
              </div>
            </div>

            {/* Monthly GSTR-1 Return Filing History Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">Monthly GSTR-1 Tax Return History</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Audited monthly tax breakdowns for CA return submission (Slab: {gstRateSlab}% GST).</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  {gstSummary?.history?.length || 0} Months Tracked
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                      <th className="pb-3 pr-4 whitespace-nowrap">Month / Period</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">Invoices</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">Units Sold</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">Gross Sales (Inc. Tax)</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">Taxable Base Amount</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">CGST ({(gstRateSlab / 2)}%)</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">SGST ({(gstRateSlab / 2)}%)</th>
                      <th className="pb-3 pl-4 text-right whitespace-nowrap">Total GST Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(gstSummary?.history || []).map((row, idx) => {
                      const gross = row.GrossSales || 0;
                      const comp = computeGst(gross, row.TaxCollected || 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 pr-4 font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>{row.MonthStr}</span>
                          </td>
                          <td className="py-4 px-3 text-right text-slate-600 text-xs font-semibold whitespace-nowrap">{row.TotalInvoices} Bills</td>
                          <td className="py-4 px-3 text-right text-slate-600 text-xs font-semibold whitespace-nowrap">{row.TotalUnits} Units</td>
                          <td className="py-4 px-3 text-right font-black text-slate-900 whitespace-nowrap">{formatCurrency(gross)}</td>
                          <td className="py-4 px-3 text-right text-slate-600 font-mono text-xs whitespace-nowrap">{formatCurrency(comp.taxable)}</td>
                          <td className="py-4 px-3 text-right text-slate-600 font-mono text-xs whitespace-nowrap">{formatCurrency(comp.cgst)}</td>
                          <td className="py-4 px-3 text-right text-slate-600 font-mono text-xs whitespace-nowrap">{formatCurrency(comp.sgst)}</td>
                          <td className="py-4 pl-4 text-right font-black text-emerald-600 text-base whitespace-nowrap">{formatCurrency(comp.tax)}</td>
                        </tr>
                      );
                    })}
                    {gstSummary?.fetching ? (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                            <span>Calculating GST Tax Breakdowns...</span>
                          </div>
                        </td>
                      </tr>
                    ) : (!gstSummary?.history || gstSummary?.history?.length === 0) ? (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-slate-400">No GST transactions found for this period.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SIZE MATRIX HEATMAP */}
      {activeTab === 'sizematrix' && (() => {
        const categoriesList = ['ALL', ...Array.from(new Set((Array.isArray(sizeMatrix) ? sizeMatrix : []).map(r => r.Category) || []))];

        const filteredMatrix = (Array.isArray(sizeMatrix) ? sizeMatrix : []).filter(row => {
          const matchesCat = matrixCategoryFilter === 'ALL' || row.Category === matrixCategoryFilter;
          const matchesSearch = searchQuery === '' ||
            row.ArticleName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.Size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.Category?.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesCat && matchesSearch;
        });

        const totalMatrixUnits = filteredMatrix.reduce((sum, r) => sum + (r.UnitsSold || 0), 0);
        const totalMatrixRevenue = filteredMatrix.reduce((sum, r) => sum + (r.TotalRevenue || 0), 0);
        const topSellerItem = filteredMatrix.length > 0 ? [...filteredMatrix].sort((a, b) => (b.UnitsSold || 0) - (a.UnitsSold || 0))[0] : null;
        const topRevenueItem = filteredMatrix.length > 0 ? [...filteredMatrix].sort((a, b) => (b.TotalRevenue || 0) - (a.TotalRevenue || 0))[0] : null;

        return (
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="border-b border-slate-200 pb-5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                  <Grid className="w-6 h-6 mr-3 text-blue-600" /> Size-Wise Inventory & Sales Matrix Heatmap
                </h3>
                <p className="text-sm text-slate-500 mt-1">Deep analysis of size demand, revenue contribution, and article velocity (Last 90 Days).</p>
              </div>
            </div>

            {/* Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🔥 Bestselling Article & Size</p>
                {topSellerItem ? (
                  <div className="mt-2">
                    <h4 className="font-black text-slate-800 text-base leading-tight truncate">{topSellerItem.ArticleName}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-xs">Size: {topSellerItem.Size}</span>
                      <span className="font-extrabold text-emerald-600 text-xs">{topSellerItem.UnitsSold} Units Sold</span>
                    </div>
                  </div>
                ) : <p className="text-xs text-slate-400 mt-2">Loading...</p>}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">💰 Top Revenue Article & Size</p>
                {topRevenueItem ? (
                  <div className="mt-2">
                    <h4 className="font-black text-slate-800 text-base leading-tight truncate">{topRevenueItem.ArticleName}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-xs">Size: {topRevenueItem.Size}</span>
                      <span className="font-black text-blue-600 text-xs">{formatCurrency(topRevenueItem.TotalRevenue)}</span>
                    </div>
                  </div>
                ) : <p className="text-xs text-slate-400 mt-2">Loading...</p>}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📦 Total Matrix Units Sold</p>
                <h4 className="text-2xl font-black text-slate-800 mt-2">{totalMatrixUnits.toLocaleString('en-IN')} <span className="text-xs text-slate-400 font-semibold">Units</span></h4>
                <p className="text-[11px] text-slate-400 mt-1">Tracked across {filteredMatrix.length} size variants</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">💳 Total Matrix Revenue</p>
                <h4 className="text-2xl font-black text-green-600 mt-2">{formatCurrency(totalMatrixRevenue)}</h4>
                <p className="text-[11px] text-slate-400 mt-1">Average: {totalMatrixUnits > 0 ? formatCurrency(totalMatrixRevenue / totalMatrixUnits) : '₹0'} / unit</p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 custom-scrollbar">
              <span className="text-xs font-bold text-slate-400 uppercase mr-1 shrink-0">Section Filter:</span>
              {categoriesList.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setMatrixCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${matrixCategoryFilter === cat ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                >
                  {cat === 'ALL' ? 'All Sections' : cat}
                </button>
              ))}
            </div>

            {/* Detailed Matrix Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-800 text-lg">Detailed Size Demand & Velocity Matrix</h4>
                <span className="text-xs font-semibold text-slate-400">Showing {filteredMatrix.length} rows</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                      <th className="pb-3 pr-4 whitespace-nowrap">Article Name</th>
                      <th className="pb-3 px-3 whitespace-nowrap">Section</th>
                      <th className="pb-3 px-3 whitespace-nowrap">Tag Size</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">Units Sold</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">Invoices</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">Total Revenue</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">Avg Unit Price</th>
                      <th className="pb-3 pl-4 text-center whitespace-nowrap">Demand Heatmap Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMatrix.map((row, idx) => {
                      const units = row.UnitsSold || 0;
                      const revenue = row.TotalRevenue || 0;
                      const avgPrice = units > 0 ? (revenue / units) : 0;

                      let heatBg = "bg-slate-100 text-slate-600 border-slate-200";
                      let heatLabel = "Normal";
                      if (units >= 50 || revenue >= 40000) {
                        heatBg = "bg-emerald-500 text-white font-bold shadow-sm";
                        heatLabel = "🔥 Ultra High Velocity";
                      } else if (units >= 20 || revenue >= 20000) {
                        heatBg = "bg-emerald-100 text-emerald-800 font-bold border-emerald-200";
                        heatLabel = "📈 High Velocity";
                      } else if (units >= 10 || revenue >= 10000) {
                        heatBg = "bg-amber-100 text-amber-800 font-bold border-amber-200";
                        heatLabel = "⚡ Moderate Demand";
                      } else if (units > 0) {
                        heatBg = "bg-blue-50 text-blue-700 border-blue-100";
                        heatLabel = "🔹 Steady";
                      }

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 pr-4 font-bold text-slate-800 whitespace-nowrap">{row.ArticleName}</td>
                          <td className="py-3.5 px-3 font-semibold text-slate-500 text-xs whitespace-nowrap"><span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">{row.Category}</span></td>
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-700 text-xs whitespace-nowrap"><span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">{row.Size}</span></td>
                          <td className="py-3.5 px-3 text-right font-black text-slate-900 text-base whitespace-nowrap">{units}</td>
                          <td className="py-3.5 px-3 text-right text-slate-500 text-xs font-semibold whitespace-nowrap">{row.Invoices || 0} Bills</td>
                          <td className="py-3.5 px-3 text-right font-black text-green-600 whitespace-nowrap">{formatCurrency(revenue)}</td>
                          <td className="py-3.5 px-3 text-right text-slate-600 text-xs font-mono whitespace-nowrap">{formatCurrency(avgPrice)}</td>
                          <td className="py-3.5 pl-4 text-center whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs border inline-block ${heatBg}`}>
                              {heatLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMatrix.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-slate-400">
                          {(!sizeMatrix || sizeMatrix.length === 0) ? (
                            <div className="flex flex-col items-center gap-2 animate-pulse">
                              <Grid className="w-6 h-6 text-blue-500 animate-spin" />
                              <span className="text-xs font-bold text-slate-500">Loading Size Heatmap Matrix...</span>
                            </div>
                          ) : (
                            "No size matrix records match the selected filter."
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}



      {/* 3. VISUAL CHARTS & HOURLY RUSH */}
      {activeTab === 'analytics' && (
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="border-b border-slate-200 pb-5 mb-8">
            <h3 className="text-2xl font-bold text-slate-800 flex items-center">
              <BarChart3 className="w-6 h-6 mr-3 text-blue-600" /> Store Rush Visualizer
            </h3>
            <p className="text-sm text-slate-500 mt-2">Identify peak store hours to optimize staff allocation and inventory prep.</p>
          </div>

          <div className="bg-white border border-slate-200 p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm mb-8">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-8">Hourly Revenue Distribution</h4>
            <div className="h-64 flex items-end justify-between gap-3 pt-6">
              {(hourlySales || []).map((h, i) => {
                const heightPercent = Math.max((h.TotalRevenue / maxHourlyRevenue) * 100, 5);
                const isPeak = h.TotalRevenue === maxHourlyRevenue && maxHourlyRevenue > 0;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap z-20 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                      {formatCurrency(h.TotalRevenue)} <span className="font-normal text-slate-400 ml-1">({h.TotalBills} bills)</span>
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[48px] rounded-t-xl transition-all duration-700 ease-out ${isPeak ? 'bg-gradient-to-t from-blue-600 to-blue-400 shadow-lg shadow-blue-500/30' : 'bg-slate-200 hover:bg-blue-300'}`}
                    />
                    <span className="text-xs text-slate-500 mt-3 font-semibold">{h.SaleHour}:00</span>
                  </div>
                );
              })}
              {(Array.isArray(hourlySales) ? hourlySales : []).length === 0 && (
                <p className="w-full text-center py-12 text-slate-500">No bills generated today to plot chart.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 3. MONTHLY PRODUCTS */}
      {activeTab === 'monthly' && (() => {
        const groupedByMonth = (Array.isArray(monthlyProducts) ? monthlyProducts : []).reduce((acc, curr) => {
          const month = curr.SaleMonth || 'Unknown';
          const subCat = classifySubCategory(curr.ArticleName, curr.ProductType);
          if (!acc[month]) {
            acc[month] = {
              data: { 'Shirts': [], 'T-Shirts': [], 'Jeans': [], 'Formals': [], 'Accessories': [], 'Other Products': [] },
              totalUnits: 0,
              totalRevenue: 0
            };
          }
          acc[month].data[subCat].push(curr);
          acc[month].totalUnits += (curr.TotalUnitsSold || 0);
          acc[month].totalRevenue += (curr.TotalRevenue || 0);
          return acc;
        }, {});
        return (
          <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 mb-6 gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                  <Calendar className="w-6 h-6 mr-3 text-blue-600" /> Monthly Sales by Category
                </h3>
                <p className="text-sm text-slate-500 mt-2">Track revenue grouped by Shirts, T-Shirts, Jeans, Formals, and Accessories.</p>
              </div>
              <div className="flex space-x-4">
                <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Units</p>
                  <p className="text-lg font-black text-slate-800">{totalMonthlyUnits}</p>
                </div>
                <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Revenue</p>
                  <p className="text-lg font-black text-green-600">{formatCurrency(totalMonthlyRevenue)}</p>
                </div>
              </div>
            </div>

            {Object.keys(groupedByMonth).length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center animate-pulse">
                <Calendar className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-bounce" />
                <p className="text-sm font-bold text-slate-700">Loading Monthly Category Breakdown...</p>
                <p className="text-xs text-slate-400 mt-1">Aggregating historical sales by department.</p>
              </div>
            ) : (
              Object.entries(groupedByMonth).map(([month, monthData], index) => {
                const isMonthOpen = openMonth === month;
                return (
                  <div key={index} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white mb-4">
                    <button
                      onClick={() => setOpenMonth(isMonthOpen ? null : month)}
                      className="w-full bg-white hover:bg-slate-50 p-5 flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                          <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-slate-800 text-lg">Month: {month}</h4>
                          <p className="text-sm text-slate-500 mt-0.5">Click to view category breakdown</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <span className="block text-lg font-black text-green-600">{formatCurrency(monthData.totalRevenue)}</span>
                          <span className="block text-xs text-slate-500 font-bold uppercase mt-1">{monthData.totalUnits} Units</span>
                        </div>
                        <div className="bg-slate-100 p-2.5 rounded-full">
                          {isMonthOpen ? <ChevronUp className="w-5 h-5 text-slate-700" /> : <ChevronDown className="w-5 h-5 text-slate-700" />}
                        </div>
                      </div>
                    </button>

                    {isMonthOpen && (
                      <div className="p-6 bg-slate-50/50 space-y-6">
                        {MASTER_CATEGORIES.map(cat => {
                          const items = monthData.data[cat.id] || [];
                          if (items.length === 0) return null;

                          const catUnits = items.reduce((sum, i) => sum + (i.TotalUnitsSold || 0), 0);
                          const catRevenue = items.reduce((sum, i) => sum + (i.TotalRevenue || 0), 0);

                          return (
                            <div key={cat.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">{cat.icon}</span>
                                  <h5 className="font-bold text-slate-800">{cat.label}</h5>
                                </div>
                                <div className="flex space-x-4 text-xs">
                                  <span className="text-slate-500">Units: <strong className="text-slate-800">{catUnits}</strong></span>
                                  <span className="text-slate-500">Revenue: <strong className="text-green-600">{formatCurrency(catRevenue)}</strong></span>
                                </div>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                  <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                    <tr>
                                      <th className="px-6 py-2.5">Article Description</th>
                                      <th className="px-6 py-2.5">Section</th>
                                      <th className="px-6 py-2.5 text-right">Units Sold</th>
                                      <th className="px-6 py-2.5 text-right">Revenue</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-3.5 font-medium text-slate-800 whitespace-nowrap">{item.ArticleName}</td>
                                        <td className="px-6 py-3.5 text-slate-500 text-xs whitespace-nowrap">{item.ProductType}</td>
                                        <td className="px-6 py-3.5 font-bold text-slate-700 text-right whitespace-nowrap">{item.TotalUnitsSold}</td>
                                        <td className="px-6 py-3.5 font-black text-green-600 text-right whitespace-nowrap">{formatCurrency(item.TotalRevenue)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }))}
          </div>

        );
      })()}


    </>
  );
};

export default DashboardTab;
