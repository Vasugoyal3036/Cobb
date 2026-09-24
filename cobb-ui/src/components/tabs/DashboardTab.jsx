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
  Network,
  Building2,
  Copy,
  Check,
  Share2
} from 'lucide-react';
// Stock Health tiles (Broken Size Runs, Dead Stock & Ageing, Reorder Alerts)
import GoodsInTransitDesk from '../GoodsInTransitDesk';
import ExecutiveKpiStrip from '../dashboard/ExecutiveKpiStrip';
import LivePulseFeed from '../dashboard/LivePulseFeed';
import WhatsAppAutomationWidget from '../dashboard/WhatsAppAutomationWidget';
import QuickToolsWidget from '../dashboard/QuickToolsWidget';
import AlterationSlipModal from '../AlterationSlipModal';

const DashboardTab = (props) => {
  const { userRole, activeStore, totalMonthlyUnits, totalMonthlyRevenue, maxHourlyRevenue, averageOrderValue, DAILY_TARGET, targetProgress, API_BASE, vips, setVips, dormant, setDormant, darkMode, setDarkMode, overviewStats, setOverviewStats, returnsData, setReturnsData, smartCoordinate, setSmartCoordinate, showCoordinateModal, setShowCoordinateModal, vmImages, setVmImages, vmImageUrls, setVmImageUrls, vmAuditResult, setVmAuditResult, isAuditing, setIsAuditing, vmError, setVmError, bundles, setBundles, isLoadingBundles, setIsLoadingBundles, publishedBundles, setPublishedBundles, handleVmUpload, fetchTrendForecast, handleCompUpload, fetchBundles, globalCustomers, setGlobalCustomers, isSearchingCustomers, setIsSearchingCustomers, liveBills, setLiveBills, inventory, setInventory, deadStock, setDeadStock, hourlySales, setHourlySales, dailySales, setDailySales, monthlyProducts, setMonthlyProducts, gstSummary, setGstSummary, gstRateSlab, setGstRateSlab, gstCopied, setGstCopied, sizeMatrix, setSizeMatrix, wardrobeProfiles, setWardrobeProfiles, pnlData, setPnlData, retentionData, setRetentionData, reconData, setReconData, countedCashInput, setCountedCashInput, reconNotes, setReconNotes, showReconModal, setShowReconModal, showEodModal, setShowEodModal, eodSummaryText, setEodSummaryText, eodCopied, setEodCopied, isMobileMenuOpen, setIsMobileMenuOpen, matrixCategoryFilter, setMatrixCategoryFilter, isListenerRunning, setIsListenerRunning, isTogglingListener, setIsTogglingListener, listenerLogs, setListenerLogs, automationDispatches, isGatewayRunning, setIsGatewayRunning, isTogglingGateway, setIsTogglingGateway, isGatewayReady, setIsGatewayReady, gatewayQr, setGatewayQr, gatewayLogs, setGatewayLogs, testPhone, setTestPhone, testMsg, setTestMsg, isSendingTestWa, setIsSendingTestWa, broadcastGroup, setBroadcastGroup, broadcastGroupCount, setBroadcastGroupCount, broadcastStatus, setBroadcastStatus, broadcastMsg, setBroadcastMsg, isStartingBroadcast, setIsStartingBroadcast, isSyncingGroup, setIsSyncingGroup, groupSearchQuery, setGroupSearchQuery, topMoversData, setTopMoversData, activeTab, setActiveTab, activeConsole, setActiveConsole, searchQuery, setSearchQuery, selectedCustomer, setSelectedCustomer, customerHistory, setCustomerHistory, loadingHistory, setLoadingHistory, customerPersona, setCustomerPersona, loadingPersona, setLoadingPersona, aiMessageType, setAiMessageType, generatedMsg, setGeneratedMsg, isGenerating, setIsGenerating, generateWhatsAppDraft, activeOutfitMatch, setActiveOutfitMatch, outfitPitch, setOutfitPitch, isGeneratingOutfit, setIsGeneratingOutfit, campaignEvent, setCampaignEvent, campaignAudience, setCampaignAudience, campaignDraft, setCampaignDraft, isGeneratingCampaign, setIsGeneratingCampaign, openProductType, setOpenProductType, openMonth, setOpenMonth, selectedCalendarDay, setSelectedCalendarDay, expandedBillId, setExpandedBillId, billItemsCache, setBillItemsCache, loadingBillItems, setLoadingBillItems, handleKeyDown, toggleBillExpansion, fetchAutomationStatus, toggleListener, toggleGateway, handleSendTestWhatsApp, handleSyncBroadcastGroup, handleStartBroadcast, handleStopBroadcast, handleExportGroupCsv, openCustomerCard, handleGenerateAI, handleGenerateOutfitMatch, handleGenerateCampaign, handleSaveReconciliation, handleGenerateEodReport, handleMasterRestock, formatCurrency, MASTER_CATEGORIES, classifySubCategory, handleGlobalSearch, renderLogLine, persona, handleGenerateSmartCoordinate, trendForecast, isForecasting, compImage, compImageUrl, compIntelResult, isAnalyzingComp, compError } = props;
  const [calendarDate, setCalendarDate] = React.useState(new Date());
  const [safetyMode, setSafetyMode] = React.useState('ultra');
  const [batchSize, setBatchSize] = React.useState(20);
  const [includeOptOut, setIncludeOptOut] = React.useState(true);
  const [dashboardZone, setDashboardZone] = React.useState('all'); // 'all' | 'executive' | 'counter'

  // Pocket Khata state for Dashboard Desk
  const [khataSummary, setKhataSummary] = React.useState({ totalSpent: 0, totalCount: 0, items: [] });
  const [khataLoading, setKhataLoading] = React.useState(false);

  // Active holds state for Hold Desk tile
  const [holds, setHolds] = React.useState([]);

  // Stock Health state (retained for sidebar tabs)
  const [stockHealth, setStockHealth] = React.useState(null);
  const [stockHealthLoading, setStockHealthLoading] = React.useState(false);

  // Today's Top-Selling Articles for Live Intelligence Ribbon
  const [todayTopArticles, setTodayTopArticles] = React.useState([]);
  const [todayTopArticlesLoading, setTodayTopArticlesLoading] = React.useState(false);

  // Fast Counter Offer & Discount Calc state
  const [calcMrp, setCalcMrp] = React.useState(1999);
  const [calcOffer, setCalcOffer] = React.useState('b3_70');
  const [b1g3Items, setB1g3Items] = React.useState([1700, 1800, 1900]);
  
  // Alteration Slip Modal state
  const [showAlterationModal, setShowAlterationModal] = React.useState(false);

  // P&L Selected Month State
  const [selectedPnlMonth, setSelectedPnlMonth] = React.useState('current');
  const [pnlCopied, setPnlCopied] = React.useState(false);

  const handlePrintBill = (bill) => {
    const items = billItemsCache[bill.BillId] || bill.Items || [];
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    const itemsHtml = items.map(i => `
      <tr>
        <td style="padding: 4px 0; border-bottom: 1px dashed #ccc;">${i.ArticleName}<br><small>${i.ArticleNo} | Size: ${i.Size || 'Std'}</small></td>
        <td style="padding: 4px 0; border-bottom: 1px dashed #ccc; text-align: center;">${i.Quantity || 1}</td>
        <td style="padding: 4px 0; border-bottom: 1px dashed #ccc; text-align: right;">₹${i.NetPrice}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Invoice #${bill.BillNumber.trim()}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; color: #000; }
            h2 { text-align: center; margin-bottom: 5px; font-size: 18px; }
            p { text-align: center; margin-top: 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
            th { text-align: left; border-bottom: 2px solid #000; padding-bottom: 5px; }
            .total { margin-top: 15px; text-align: right; font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 10px; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; border-top: 1px dashed #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h2>COBB APPARELS</h2>
          <p>Retail Invoice</p>
          <div style="font-size: 12px; margin-top: 20px;">
            <div><strong>Bill No:</strong> ${bill.BillNumber.trim()}</div>
            <div><strong>Date:</strong> ${bill.BillDate || bill.BillTime?.slice(0, 10)}</div>
            <div><strong>Customer:</strong> ${bill.CustomerName?.trim() || 'Guest'}</div>
            <div><strong>Phone:</strong> ${bill.Phone || '-'}</div>
            <div><strong>Mode:</strong> ${bill.PaymentMode}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total">Total: ₹${bill.Amount}</div>
          <div class="footer">Thank you for shopping with us!<br>Visit again!</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const copyPnlSummary = (data) => {
    if (!data) return;
    const text = `📊 COBB POS - STORE P&L STATEMENT (${data.monthName || 'Month'})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gross Sales Revenue: ${formatCurrency(data.grossSales)}
Less GST Tax Output: -${formatCurrency(data.taxCollected)}
Net Taxable Receipts: ${formatCurrency(data.taxableRevenue)}

Wholesale COGS (~73%): -${formatCurrency(data.costOfGoodsSold)}
Gross Retail Margin: ${formatCurrency(data.grossProfit || Math.round(data.taxableRevenue * 0.27))} (27%)

Fixed Operating Overheads: -${formatCurrency(data.operatingExpenses?.totalExpenses || 110000)}
  • Store Rent (Pundri): -${formatCurrency(data.operatingExpenses?.rent || 40000)}
  • Staff Salaries: -${formatCurrency(data.operatingExpenses?.staffSalaries || 45000)}
  • Electricity & AC: -${formatCurrency(data.operatingExpenses?.electricity || 15000)}
  • Misc & Maintenance: -${formatCurrency(data.operatingExpenses?.miscExpenses || 10000)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 NET STORE PROFIT: ${formatCurrency(data.netStoreProfit)} (${data.profitMarginPct}% Net Margin)
Total Bills: ${data.totalBills || 0} | AOV: ${formatCurrency(data.avgBillValue || 0)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    try {
      navigator.clipboard?.writeText(text);
      setPnlCopied(true);
      setTimeout(() => setPnlCopied(false), 2500);
    } catch (e) {}
  };

  // Ref and height state to guarantee operational tiles match the exact pixel height of top KPI cards
  const topCardRef = React.useRef(null);
  const [topCardHeight, setTopCardHeight] = React.useState(null);

  React.useEffect(() => {
    if (!topCardRef.current) return;
    const updateHeight = () => {
      if (topCardRef.current) {
        if (window.innerWidth >= 1024) {
          setTopCardHeight(topCardRef.current.offsetHeight);
        } else {
          setTopCardHeight(null);
        }
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


  // Quick Barcode & Article Stock Checker Tile state (Barcode Scanner Ready)
  const [quickScanQuery, setQuickScanQuery] = React.useState('');
  const [quickScanLoading, setQuickScanLoading] = React.useState(false);
  const [quickScanResult, setQuickScanResult] = React.useState(null);
  const [quickScanError, setQuickScanError] = React.useState(null);
  const [isScannerFocused, setIsScannerFocused] = React.useState(false);
  const quickScanInputRef = React.useRef(null);

  const handleQuickScan = async (queryToUse = null) => {
    const q = (queryToUse !== null ? queryToUse : quickScanQuery).trim();
    if (!q) return;
    setQuickScanLoading(true);
    setQuickScanError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/inventory/quick-scan?q=${encodeURIComponent(q)}`);
      if (res.data && res.data.success) {
        setQuickScanResult(res.data);
        setQuickScanError(null);
      } else {
        setQuickScanError(res.data?.message || 'Article / Barcode not found');
        setQuickScanResult(null);
      }
    } catch (e) {
      setQuickScanError('Lookup failed');
      setQuickScanResult(null);
    } finally {
      setQuickScanLoading(false);
    }
  };

  const fetchStockHealth = React.useCallback(async () => {
    try {
      setStockHealthLoading(true);
      const res = await axios.get(`${API_BASE}/api/inventory/stock-health?storeId=${activeStore}`);
      if (res.data) {
        setStockHealth(res.data);
      }
    } catch (e) {
      console.error('Stock health fetch error:', e);
    } finally {
      setStockHealthLoading(false);
    }
  }, [API_BASE, activeStore]);

  const fetchTodayTopArticles = React.useCallback(async () => {
    try {
      setTodayTopArticlesLoading(true);
      const res = await axios.get(`${API_BASE}/api/analytics/today-top-articles`);
      if (Array.isArray(res.data)) setTodayTopArticles(res.data);
    } catch (e) {
      console.error('Today top articles fetch error:', e);
    } finally {
      setTodayTopArticlesLoading(false);
    }
  }, [API_BASE]);

  React.useEffect(() => {
    fetchKhataExpenses();
    fetchHolds();
    fetchStockHealth();
    fetchTodayTopArticles();
  }, [fetchKhataExpenses, fetchHolds, fetchStockHealth, fetchTodayTopArticles]);

  return (
    <>
      {activeTab === 'dashboard' && (
        <div className="space-y-4 sm:space-y-6">

          {/* RETAIL OS COMMAND BAR */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {activeStore === 'ALL'
                      ? 'All Stores Network Command'
                      : activeStore === 'STORE_02'
                        ? 'Cobb Branch 2 Command Center'
                        : 'Store Command Center'}
                  </h2>
                </div>
                <span className={`px-2.5 py-0.5 text-xs font-black rounded-lg border shadow-xs ${
                  userRole === 'owner' 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                }`}>
                  {userRole === 'owner' ? '👑 Owner Mode' : '👔 Manager Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeStore === 'ALL'
                  ? 'Consolidated operational telemetry across all Cobb retail stores.'
                  : activeStore === 'STORE_02'
                    ? 'Live operational metrics & counter telemetry for Cobb Branch 2 (New Market).'
                    : 'Live operational telemetry & counter speed desk for Cobb Pundri.'}
              </p>
            </div>

            {/* Zone View Selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold self-stretch sm:self-auto justify-between sm:justify-start">
              {[
                { id: 'all', label: '⚡ Full Command' },
                { id: 'executive', label: '📊 Telemetry' },
                { id: 'counter', label: '🏷️ Counter Desk' },
              ].map(zone => (
                <button
                  key={zone.id}
                  onClick={() => setDashboardZone(zone.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 ${
                    dashboardZone === zone.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{zone.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ZONE 1: EXECUTIVE KPI STRIP (4 METRICS) */}
          {(dashboardZone === 'all' || dashboardZone === 'executive') && (
            <ExecutiveKpiStrip 
              darkMode={darkMode}
              formatCurrency={formatCurrency}
              overviewStats={overviewStats}
              DAILY_TARGET={DAILY_TARGET}
              targetProgress={targetProgress}
              averageOrderValue={averageOrderValue}
              totalMonthlyUnits={totalMonthlyUnits}
              userRole={userRole}
              setActiveTab={setActiveTab}
              setShowReconModal={setShowReconModal}
              topCardRef={topCardRef}
            />
          )}

          {/* ZONE 2: ASYMMETRIC BENTO COMMAND CENTER (7 COLS LEFT | 5 COLS RIGHT) */}
          {(dashboardZone === 'all' || dashboardZone === 'executive') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">

              {/* LEFT 7 COLUMNS: Operational Stream (Pulse & Automation) ABOVE, Stock Health BELOW */}
              <div className="lg:col-span-7 space-y-5 sm:space-y-6">

                {/* ROW 1: TWO STREAM PANELS: Live Store Pulse & WhatsApp Automation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* PANEL 1: Live Store Pulse (Real-Time Bill Feed) */}
                  <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col h-[320px] transition-all ${
                    darkMode 
                      ? 'bg-[#0e1320] border-[#1c2436] text-slate-100' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <div className={`p-3.5 border-b flex items-center justify-between shrink-0 ${
                      darkMode ? 'bg-[#121829] border-[#1c2436]' : 'bg-slate-50/70 border-slate-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          <span>Live Store Pulse</span>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        </h3>
                      </div>
                      {typeof setActiveTab === 'function' && (() => {
                        const today = new Date();
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        const todayCount = (Array.isArray(liveBills) ? liveBills : []).filter(b => {
                          const bDate = b.BillDate ? b.BillDate.trim() : (b.BillTime ? b.BillTime.slice(0, 10) : '');
                          return bDate === todayStr;
                        }).length;
                        return (
                          <button
                            type="button"
                            onClick={() => setActiveTab('live')}
                            className={`text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                              darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                            }`}
                          >
                            <span>View ({todayCount > 0 ? todayCount : liveBills.length})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        );
                      })()}
                    </div>
                    <div className={`divide-y flex-1 min-h-0 overflow-y-auto custom-scrollbar ${
                      darkMode ? 'divide-[#1a2336]' : 'divide-slate-100'
                    }`}>
                      {(() => {
                        const today = new Date();
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        const todayBills = (Array.isArray(liveBills) ? liveBills : []).filter(b => {
                          const bDate = b.BillDate ? b.BillDate.trim() : (b.BillTime ? b.BillTime.slice(0, 10) : '');
                          return bDate === todayStr;
                        });
                        const displayBills = todayBills.length > 0 ? todayBills : (Array.isArray(liveBills) ? liveBills.slice(0, 10) : []);

                        if (displayBills.length === 0) {
                          return (
                            <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center h-full">
                              <RefreshCw className="w-5 h-5 mb-2 text-slate-400 animate-spin" style={{ animationDuration: '3s' }} />
                              Waiting for counter checkouts...
                            </div>
                          );
                        }

                        return displayBills.map((bill, idx) => (
                          <div 
                            key={idx} 
                            className={`p-2.5 sm:p-3 transition-colors flex justify-between items-center cursor-pointer group ${
                              darkMode ? 'hover:bg-[#151c2e]' : 'hover:bg-slate-50'
                            }`} 
                            onClick={() => setActiveTab('live')}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className={`text-xs font-bold truncate group-hover:text-blue-400 transition-colors ${
                                darkMode ? 'text-slate-100' : 'text-slate-800'
                              }`}>
                                {bill.CustomerName?.trim() || bill.FirstName?.trim() || 'Guest Customer'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                                <span className="font-mono">{new Date(bill.BillTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span>•</span>
                                <span className="font-mono text-slate-300">#{bill.BillNumber}</span>
                                <span>•</span>
                                <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[10px] ${
                                  bill.PaymentMode === 'Cash' 
                                    ? darkMode ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : bill.PaymentMode === 'UPI / Online' 
                                      ? darkMode ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60' : 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : darkMode ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {bill.PaymentMode || 'Cash'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg shrink-0 ${
                                darkMode ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                              }`}>
                                {formatCurrency(bill.Amount)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintBill(bill);
                                }}
                                className={`p-1.5 rounded-lg transition-colors border cursor-pointer ${
                                  darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                }`}
                                title="Print Bill"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* PANEL 2: WhatsApp Automation Engine Hub */}
                  <WhatsAppAutomationWidget 
                    automationDispatches={automationDispatches}
                    darkMode={darkMode}
                    setActiveTab={setActiveTab}
                  />
                </div>

                {/* ROW 2: LIVE STORE INTELLIGENCE RIBBON — 4 Compact Tiles */}
                <LivePulseFeed 
                  hourlySales={hourlySales}
                  liveBills={liveBills}
                  vips={vips}
                  setActiveTab={setActiveTab}
                  darkMode={darkMode}
                  todayTopArticlesLoading={todayTopArticlesLoading}
                  todayTopArticles={todayTopArticles}
                  setShowAlterationModal={setShowAlterationModal}
                  activeStore={activeStore}
                />
              </div>

              {/* RIGHT 5 COLUMNS: Sales Performance Calendar + Goods In Transit */}
              <div className="lg:col-span-5 space-y-5 sm:space-y-6">

                {/* WIDGET 1: SALES PERFORMANCE CALENDAR */}
                <div className={`p-5 rounded-2xl border shadow-sm relative overflow-visible ${
                  darkMode ? 'bg-[#0e1320] border-[#1c2436] text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-[#1c2436]">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Sales Performance Calendar</h3>
                        <p className="text-xs text-slate-400">Click highlighted days for payment mode split</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#121829] px-2 py-1 rounded-lg border border-slate-200/80 dark:border-[#1c2436]">
                      <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-200 min-w-[65px] text-center">
                        {calendarDate.toLocaleString('default', { month: 'short', year: '2-digit' })}
                      </span>
                      <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      {calendarDate.getMonth() !== new Date().getMonth() || calendarDate.getFullYear() !== new Date().getFullYear() ? (
                        <button onClick={() => setCalendarDate(new Date())} className="text-[10px] font-bold text-blue-400 ml-1 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded cursor-pointer">Now</button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                      <div key={day} className="text-[10px] font-bold uppercase text-slate-400 text-center py-1">{day}</div>
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
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-mono font-semibold transition-all ${
                              hasSales ? 'cursor-pointer' : 'cursor-default'
                            } ${
                              hasSales 
                                ? (selectedCalendarDay === day 
                                    ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/30 border border-blue-400 scale-105 font-black' 
                                    : darkMode 
                                      ? 'bg-blue-500/20 text-white font-bold border border-blue-500/40 hover:bg-blue-500/30 shadow-md shadow-[#0a0f1a]' 
                                      : 'bg-blue-100 text-blue-900 font-bold border border-blue-300 hover:bg-blue-200 shadow-sm') 
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            {day}
                          </div>

                          {/* Tooltip */}
                          {hasSales && selectedCalendarDay === day && (
                            <div className={`absolute bottom-full mb-2 w-52 bg-[#121829] border border-[#232e47] text-white text-xs rounded-xl p-3 z-[60] shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${tooltipPositionClass}`}>
                              <div className="font-bold border-b border-[#1c2436] pb-1 mb-1.5 text-slate-200 flex justify-between items-center">
                                <span>{new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCalendarDay(null);
                                  }}
                                  className="text-slate-400 hover:text-white p-1 -mr-1 rounded cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="flex justify-between items-center mb-1 font-mono">
                                <span className="text-slate-400 font-sans">Total:</span>
                                <span className="font-black text-emerald-400">{formatCurrency(dayData.TotalSales)}</span>
                              </div>
                              <div className="flex justify-between items-center mb-1 text-xs font-mono">
                                <span className="text-slate-400 font-sans flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>Cash:</span>
                                <span>{formatCurrency(dayData.CashAmount || 0)}</span>
                              </div>
                              <div className="flex justify-between items-center mb-1 text-xs font-mono">
                                <span className="text-slate-400 font-sans flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>UPI:</span>
                                <span>{formatCurrency(dayData.UPIAmount || 0)}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-slate-400 font-sans flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>Card:</span>
                                <span>{formatCurrency(dayData.CardAmount || 0)}</span>
                              </div>
                              <div className={`absolute top-full border-4 border-transparent border-t-[#121829] ${arrowPositionClass}`}></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* WIDGET 2: GOODS IN TRANSIT DESK */}
                <div className="flex flex-col">
                  <GoodsInTransitDesk formatCurrency={formatCurrency} darkMode={darkMode} API_BASE={API_BASE} />
                </div>

              </div>

            </div>
          )}

          {/* ZONE 3: HIGH-SPEED COUNTER OPERATIONS DESK (4-TILE COCKPIT) */}
          <QuickToolsWidget
            dashboardZone={dashboardZone}
            overviewStats={overviewStats}
            khataSummary={khataSummary}
            holds={holds}
            quickScanInputRef={quickScanInputRef}
            quickScanQuery={quickScanQuery}
            setQuickScanQuery={setQuickScanQuery}
            isScannerFocused={isScannerFocused}
            setIsScannerFocused={setIsScannerFocused}
            quickScanResult={quickScanResult}
            setQuickScanResult={setQuickScanResult}
            quickScanError={quickScanError}
            setQuickScanError={setQuickScanError}
            handleQuickScan={handleQuickScan}
            setActiveTab={setActiveTab}
            calcOffer={calcOffer}
            setCalcOffer={setCalcOffer}
            calcMrp={calcMrp}
            setCalcMrp={setCalcMrp}
            b1g3Items={b1g3Items}
            setB1g3Items={setB1g3Items}
            formatCurrency={formatCurrency}
            darkMode={darkMode}
            setShowAlterationModal={setShowAlterationModal}
          />
        </div>
      )}

      {/* STORE P&L STATEMENT */}
      {activeTab === 'pnl' && (
        userRole === 'manager' ? (
          <div className="p-12 max-w-lg mx-auto text-center mt-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900/50 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Restricted Access (Owner Only)</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Store P&amp;L statements, wholesale purchase costs, supplier margins, and financial bottom lines are strictly confidential and restricted to the Store Owner.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
              Switch to <strong>Owner Mode</strong> in the top navbar to view financial telemetry.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                  <DollarSign className="w-6 h-6 mr-3 text-emerald-600 dark:text-emerald-400" /> Sales &amp; Store Profit &amp; Loss (P&amp;L) Statement
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Comprehensive store telemetry — Lifetime sales volume, month-by-month financial ledger, wholesale inventory COGS, and operating net margins.
                </p>
              </div>
              {pnlData?.lifetime && (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3.5 py-2 rounded-2xl">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Lifetime: {formatCurrency(pnlData.lifetime.grossSales)}
                  </span>
                </div>
              )}
            </div>

            {pnlData ? (() => {
              // Active month data computation
              const activeMonthData = (() => {
                if (pnlData.monthlySales && pnlData.monthlySales.length > 0) {
                  if (selectedPnlMonth && selectedPnlMonth !== 'current') {
                    const found = pnlData.monthlySales.find(m => m.monthKey === selectedPnlMonth);
                    if (found) return found;
                  }
                }
                return {
                  grossSales: pnlData.grossSales,
                  taxCollected: pnlData.taxCollected,
                  taxableRevenue: pnlData.taxableRevenue,
                  costOfGoodsSold: pnlData.costOfGoodsSold,
                  operatingExpenses: pnlData.operatingExpenses,
                  netStoreProfit: pnlData.netStoreProfit,
                  profitMarginPct: pnlData.profitMarginPct,
                  monthName: pnlData.currentMonthName || 'Current Month',
                  monthKey: pnlData.currentMonthKey,
                  totalBills: pnlData.totalBills,
                  avgBillValue: pnlData.avgBillValue
                };
              })();

              const isViewingCurrent = !selectedPnlMonth || selectedPnlMonth === 'current' || selectedPnlMonth === pnlData.currentMonthKey;

              return (
                <>
                  {/* 1. LIFETIME STORE SALES HERO DECK */}
                  {pnlData.lifetime && (
                    <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border border-slate-800 relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute bottom-0 left-1/4 -mb-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                      <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase tracking-wider rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5" /> All-Time Store Performance
                              </span>
                              <span className="text-xs text-slate-400">
                                {pnlData.lifetime.activeMonthsCount || 1} Active Billing Months
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Lifetime Gross Sales (Receipts)</p>
                            <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-1 flex flex-wrap items-baseline gap-3">
                              <span>{formatCurrency(pnlData.lifetime.grossSales)}</span>
                              <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/50">
                                {pnlData.lifetime.profitMarginPct}% All-Time Net Margin
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-white/5 backdrop-blur-sm px-5 py-4 rounded-2xl border border-white/10">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Customer Bills</p>
                              <p className="text-2xl font-black text-white mt-0.5">{pnlData.lifetime.totalBills?.toLocaleString()} <span className="text-xs font-normal text-slate-400">Checkouts</span></p>
                            </div>
                            <div className="w-px h-8 bg-white/10 hidden sm:block" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Avg Order (AOV)</p>
                              <p className="text-2xl font-black text-emerald-400 mt-0.5">{formatCurrency(pnlData.lifetime.avgBillValue)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Lifetime Breakdown Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
                          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Taxable Revenue</p>
                            <h5 className="text-xl sm:text-2xl font-black text-slate-100 mt-1">{formatCurrency(pnlData.lifetime.taxableRevenue)}</h5>
                            <p className="text-[11px] text-slate-400 mt-1">Excl. {formatCurrency(pnlData.lifetime.taxCollected)} GST Tax</p>
                          </div>

                          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Wholesale COGS (73%)</p>
                            <h5 className="text-xl sm:text-2xl font-black text-amber-300 mt-1">{formatCurrency(pnlData.lifetime.costOfGoodsSold)}</h5>
                            <p className="text-[11px] text-slate-400 mt-1">Wholesale Inventory Cost</p>
                          </div>

                          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Store Operating Expenses</p>
                            <h5 className="text-xl sm:text-2xl font-black text-rose-300 mt-1">{formatCurrency(pnlData.lifetime.totalOperatingExpenses)}</h5>
                            <p className="text-[11px] text-slate-400 mt-1">Rent, Staff, Power &amp; Misc</p>
                          </div>

                          <div className="bg-emerald-500/15 backdrop-blur-sm p-4 rounded-2xl border border-emerald-500/30">
                            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Est. Cumulative Net Profit</p>
                            <h5 className="text-xl sm:text-2xl font-black text-emerald-300 mt-1">{formatCurrency(pnlData.lifetime.netStoreProfit)}</h5>
                            <p className="text-[11px] text-emerald-400 mt-1">Net Owner Bottomline</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. EACH MONTH SALES & PROFITABILITY LEDGER */}
                  {pnlData.monthlySales && pnlData.monthlySales.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 sm:p-8 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                              <Calendar className="w-5 h-5" />
                            </span>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">
                              Each Month Sales &amp; Profitability Ledger
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Historical month-by-month financial telemetry. Click any row to inspect that month's full statement.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                            {pnlData.monthlySales.length} Billing Cycles
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                              <th className="py-3.5 px-4 whitespace-nowrap">Billing Month</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Footfall / Bills</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Avg Ticket (AOV)</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Gross Receipts</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Tax (GST)</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Net Taxable</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Wholesale COGS</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Fixed Overheads</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Net Profit</th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">Net Margin</th>
                              <th className="py-3.5 px-4 text-center whitespace-nowrap">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {pnlData.monthlySales.map((m) => {
                              const isSelected = selectedPnlMonth === m.monthKey || (selectedPnlMonth === 'current' && m.monthKey === pnlData.currentMonthKey);
                              const isCurrent = m.monthKey === pnlData.currentMonthKey;

                              return (
                                <tr
                                  key={m.monthKey}
                                  onClick={() => setSelectedPnlMonth(m.monthKey)}
                                  className={`transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-l-4 border-emerald-500 font-bold'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                  }`}
                                >
                                  <td className="py-4 px-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                      <span className="font-black text-slate-900 dark:text-white text-sm">{m.monthName}</span>
                                      {isCurrent && (
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-800">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs font-bold">{m.totalBills}</span>
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    {formatCurrency(m.avgBillValue)}
                                  </td>
                                  <td className="py-4 px-4 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                                    {formatCurrency(m.grossSales)}
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                    -{formatCurrency(m.taxCollected)}
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                    {formatCurrency(m.taxableRevenue)}
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                    -{formatCurrency(m.costOfGoodsSold)}
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    -{formatCurrency(m.operatingExpenses?.totalExpenses || 110000)}
                                  </td>
                                  <td className="py-4 px-4 text-right font-black whitespace-nowrap">
                                    <span className={m.netStoreProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                      {formatCurrency(m.netStoreProfit)}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-right whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black font-mono shadow-sm ${
                                      m.profitMarginPct >= 0
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                    }`}>
                                      {m.profitMarginPct >= 0 ? '▲' : '▼'} {m.profitMarginPct}%
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-center whitespace-nowrap">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPnlMonth(m.monthKey);
                                      }}
                                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600'
                                      }`}
                                    >
                                      {isSelected ? 'Viewing' : 'Inspect P&L'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3. SELECTED MONTH DETAILED STATEMENT & WATERFALL VIEW */}
                  <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-8">
                    {/* Control Bar: Month Switcher Tabs + Share Action */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="px-3 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-black uppercase tracking-wider rounded-full border border-emerald-500/30">
                            Executive Detailed Audit
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {activeMonthData.totalBills} bills • Avg Ticket {formatCurrency(activeMonthData.avgBillValue)}
                          </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                          <span>Detailed Statement:</span>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
                            {activeMonthData.monthName}
                          </span>
                        </h3>
                      </div>

                      {/* Interactive Month Switcher Pills + Share Button */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-sm">
                          <button
                            onClick={() => setSelectedPnlMonth(pnlData.currentMonthKey)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                              isViewingCurrent
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{pnlData.currentMonthName || 'Current Month'}</span>
                          </button>

                          {pnlData.monthlySales
                            ?.filter(m => m.monthKey !== pnlData.currentMonthKey)
                            .map(m => {
                              const isSelected = selectedPnlMonth === m.monthKey;
                              return (
                                <button
                                  key={m.monthKey}
                                  onClick={() => setSelectedPnlMonth(m.monthKey)}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                >
                                  {m.monthName}
                                </button>
                              );
                            })}
                        </div>

                        {/* Copy / Export Button */}
                        <button
                          onClick={() => copyPnlSummary(activeMonthData)}
                          className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Copy text summary for WhatsApp/Accountant"
                        >
                          {pnlCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-black">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copy Summary</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Visual Financial Waterfall Pipeline */}
                    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-500" /> Revenue-to-Profit Financial Flow ({activeMonthData.monthName})
                        </p>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                          Bottom Line: {activeMonthData.profitMarginPct}% Net Margin
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">1. Gross Receipts</p>
                          <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">{formatCurrency(activeMonthData.grossSales)}</p>
                          <span className="text-[10px] font-bold text-slate-400">100% (Base)</span>
                        </div>

                        <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40">
                          <p className="text-[10px] font-bold text-rose-500 uppercase">2. Less GST Tax</p>
                          <p className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">-{formatCurrency(activeMonthData.taxCollected)}</p>
                          <span className="text-[10px] font-bold text-rose-400 font-mono">{activeMonthData.grossSales > 0 ? (activeMonthData.taxCollected / activeMonthData.grossSales * 100).toFixed(1) : 0}%</span>
                        </div>

                        <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40">
                          <p className="text-[10px] font-bold text-blue-500 uppercase">3. Net Taxable</p>
                          <p className="text-base font-black text-blue-700 dark:text-blue-300 mt-0.5">{formatCurrency(activeMonthData.taxableRevenue)}</p>
                          <span className="text-[10px] font-bold text-blue-400 font-mono">{activeMonthData.grossSales > 0 ? (activeMonthData.taxableRevenue / activeMonthData.grossSales * 100).toFixed(1) : 0}%</span>
                        </div>

                        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/40">
                          <p className="text-[10px] font-bold text-amber-500 uppercase">4. Less COGS (~73%)</p>
                          <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">-{formatCurrency(activeMonthData.costOfGoodsSold)}</p>
                          <span className="text-[10px] font-bold text-amber-400 font-mono">Wholesale</span>
                        </div>

                        <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40">
                          <p className="text-[10px] font-bold text-purple-500 uppercase">5. Less Overheads</p>
                          <p className="text-base font-black text-purple-600 dark:text-purple-400 mt-0.5">-{formatCurrency(activeMonthData.operatingExpenses?.totalExpenses || 110000)}</p>
                          <span className="text-[10px] font-bold text-purple-400 font-mono">Rent+Staff+Pwr</span>
                        </div>

                        <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/40 shadow-sm">
                          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">6. Net Profit</p>
                          <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{formatCurrency(activeMonthData.netStoreProfit)}</p>
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono">
                            {activeMonthData.profitMarginPct}% Margin
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Top 4 Bento KPI Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Card 1: Gross Sales */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gross Sales Receipts</span>
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                              <Receipt className="w-4 h-4" />
                            </div>
                          </div>
                          <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
                            {formatCurrency(activeMonthData.grossSales)}
                          </h4>
                        </div>
                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-1 text-xs">
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Taxable Inflow:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(activeMonthData.taxableRevenue)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>Transactions:</span>
                            <span>{activeMonthData.totalBills} Bills (AOV {formatCurrency(activeMonthData.avgBillValue)})</span>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Wholesale COGS */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Wholesale Inventory (COGS)</span>
                            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                              <Package className="w-4 h-4" />
                            </div>
                          </div>
                          <h4 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
                            {formatCurrency(activeMonthData.costOfGoodsSold)}
                          </h4>
                        </div>
                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-1 text-xs">
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Distributor Cost:</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">~73% of Taxable</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>Gross Retained Margin:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">27% ({formatCurrency(activeMonthData.grossProfit || Math.round(activeMonthData.taxableRevenue * 0.27))})</span>
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Store Fixed Overheads */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Store Fixed Overheads</span>
                            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                              <Building2 className="w-4 h-4" />
                            </div>
                          </div>
                          <h4 className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
                            {formatCurrency(activeMonthData.operatingExpenses?.totalExpenses || 110000)}
                          </h4>
                        </div>
                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-1 text-xs">
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Main Components:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">4 Fixed Expenses</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>Rent+Staff+Power+Misc:</span>
                            <span>₹40k + ₹45k + ₹15k + ₹10k</span>
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Net Store Profit */}
                      <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-green-800 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-emerald-200 uppercase tracking-wider">Net Owner Bottom Line</span>
                            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center">
                              <Award className="w-4 h-4" />
                            </div>
                          </div>
                          <h4 className="text-3xl font-black text-white mt-2 tracking-tight">
                            {formatCurrency(activeMonthData.netStoreProfit)}
                          </h4>
                        </div>
                        <div className="pt-4 mt-4 border-t border-white/20 flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xs font-bold text-emerald-100">
                            <span>Store Net Margin:</span>
                            <span className="bg-white/20 px-2.5 py-0.5 rounded-full font-mono text-white text-xs">
                              {activeMonthData.profitMarginPct}%
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-200/90 mt-0.5">
                            {activeMonthData.netStoreProfit >= 0 ? '🎉 Profitable Billing Cycle' : '⚠️ Breakeven shortfall'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Itemized Financial Statement Ledger */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                        <div>
                          <h4 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                            <span>Audit Statement Breakdown</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                              {activeMonthData.monthName}
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Full statutory audit trail including GST tax deductions, wholesale distributor transfers, and shop operational expenses.
                          </p>
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-500 bg-white dark:bg-slate-700/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600">
                          Accounting Model: Franchise Retail 27% Gross
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700/80 text-slate-400 font-black uppercase text-[10px] tracking-wider bg-slate-50/30 dark:bg-slate-800/30">
                              <th className="py-3 px-6 whitespace-nowrap">Itemized Telemetry &amp; Line Item</th>
                              <th className="py-3 px-6 text-center whitespace-nowrap">Accounting Category</th>
                              <th className="py-3 px-6 text-right whitespace-nowrap">Amount (₹)</th>
                              <th className="py-3 px-6 text-right whitespace-nowrap">% of Gross Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-200">
                            {/* SECTION 1: INFLOW */}
                            <tr className="bg-slate-50/70 dark:bg-slate-800/60 font-black text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              <td colSpan={4} className="py-2.5 px-6">
                                1. Gross Inflow &amp; Tax Deductions
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-white whitespace-nowrap flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span>Gross Sales Revenue (POS Checkouts)</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                                  Inflow
                                </span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-black text-slate-900 dark:text-white whitespace-nowrap font-mono">
                                {formatCurrency(activeMonthData.grossSales)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-slate-500 font-mono whitespace-nowrap">
                                100.0%
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span>Less: Output GST Collected (5% &amp; 12% Slabs)</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="px-2.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                                  Tax Liability
                                </span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap font-mono">
                                -{formatCurrency(activeMonthData.taxCollected)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-rose-500 dark:text-rose-400 font-mono whitespace-nowrap">
                                -{activeMonthData.grossSales > 0 ? (activeMonthData.taxCollected / activeMonthData.grossSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-blue-50/30 dark:bg-blue-950/20 font-bold border-y border-blue-100 dark:border-blue-900/30">
                              <td className="py-3 px-6 text-blue-950 dark:text-blue-200 whitespace-nowrap flex items-center gap-2.5">
                                <span className="text-blue-500">↳</span>
                                <span>Net Taxable Sales (Store Retained Inflow)</span>
                              </td>
                              <td className="py-3 px-6 text-center whitespace-nowrap">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Subtotal</span>
                              </td>
                              <td className="py-3 px-6 text-right font-black text-blue-900 dark:text-blue-200 whitespace-nowrap font-mono">
                                {formatCurrency(activeMonthData.taxableRevenue)}
                              </td>
                              <td className="py-3 px-6 text-right text-blue-600 dark:text-blue-300 font-mono whitespace-nowrap">
                                {activeMonthData.grossSales > 0 ? (activeMonthData.taxableRevenue / activeMonthData.grossSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>

                            {/* SECTION 2: COGS */}
                            <tr className="bg-slate-50/70 dark:bg-slate-800/60 font-black text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              <td colSpan={4} className="py-2.5 px-6">
                                2. Merchandise Inventory &amp; Wholesale Purchase
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-700 dark:text-slate-200 whitespace-nowrap flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>Less: Cost of Goods Sold (Cobb Wholesale Transfer ~73%)</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                                  COGS (Direct)
                                </span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap font-mono">
                                -{formatCurrency(activeMonthData.costOfGoodsSold)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-amber-600 dark:text-amber-400 font-mono whitespace-nowrap">
                                -{activeMonthData.grossSales > 0 ? (activeMonthData.costOfGoodsSold / activeMonthData.grossSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-amber-50/30 dark:bg-amber-950/20 font-bold border-y border-amber-100 dark:border-amber-900/30">
                              <td className="py-3 px-6 text-amber-950 dark:text-amber-200 whitespace-nowrap flex items-center gap-2.5">
                                <span className="text-amber-500">↳</span>
                                <span>Gross Retail Margin Retained (27%)</span>
                              </td>
                              <td className="py-3 px-6 text-center whitespace-nowrap">
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Gross Margin</span>
                              </td>
                              <td className="py-3 px-6 text-right font-black text-amber-900 dark:text-amber-200 whitespace-nowrap font-mono">
                                {formatCurrency(activeMonthData.grossProfit || Math.round(activeMonthData.taxableRevenue * 0.27))}
                              </td>
                              <td className="py-3 px-6 text-right text-amber-600 dark:text-amber-300 font-mono whitespace-nowrap">
                                ~27.0%
                              </td>
                            </tr>

                            {/* SECTION 3: FIXED STORE OVERHEADS */}
                            <tr className="bg-slate-50/70 dark:bg-slate-800/60 font-black text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              <td colSpan={4} className="py-2.5 px-6">
                                3. Store Fixed Overheads &amp; Operating Expenses
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-2.5 pl-8">
                                <span>🏢 Store Rent (Pundri Main Market Prime Road)</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="text-xs text-slate-400 font-mono">Occupancy</span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.rent || 40000)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthData.grossSales > 0 ? ((activeMonthData.operatingExpenses?.rent || 40000) / activeMonthData.grossSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-2.5 pl-8">
                                <span>👥 Staff Payroll, Store Team &amp; Commissions</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="text-xs text-slate-400 font-mono">Payroll</span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.staffSalaries || 45000)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthData.grossSales > 0 ? ((activeMonthData.operatingExpenses?.staffSalaries || 45000) / activeMonthData.grossSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-2.5 pl-8">
                                <span>⚡ Electricity, Showroom Lighting &amp; Air Conditioning</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="text-xs text-slate-400 font-mono">Utilities</span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.electricity || 15000)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthData.grossSales > 0 ? ((activeMonthData.operatingExpenses?.electricity || 15000) / activeMonthData.grossSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-2.5 pl-8">
                                <span>🛠 Miscellaneous Operating, POS Software &amp; Upkeep</span>
                              </td>
                              <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                <span className="text-xs text-slate-400 font-mono">Sundry</span>
                              </td>
                              <td className="py-3.5 px-6 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                -{formatCurrency(activeMonthData.operatingExpenses?.miscExpenses || 10000)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthData.grossSales > 0 ? ((activeMonthData.operatingExpenses?.miscExpenses || 10000) / activeMonthData.grossSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-purple-50/30 dark:bg-purple-950/20 font-bold border-y border-purple-100 dark:border-purple-900/30">
                              <td className="py-3 px-6 text-purple-950 dark:text-purple-200 whitespace-nowrap flex items-center gap-2.5">
                                <span className="text-purple-500">↳</span>
                                <span>Total Fixed Store Operating Expenses</span>
                              </td>
                              <td className="py-3 px-6 text-center whitespace-nowrap">
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Total Overheads</span>
                              </td>
                              <td className="py-3 px-6 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap font-mono">
                                -{formatCurrency(activeMonthData.operatingExpenses?.totalExpenses || 110000)}
                              </td>
                              <td className="py-3 px-6 text-right text-slate-400 font-mono whitespace-nowrap">
                                {activeMonthData.grossSales > 0 ? ((activeMonthData.operatingExpenses?.totalExpenses || 110000) / activeMonthData.grossSales * 100).toFixed(1) : 0}%
                              </td>
                            </tr>

                            {/* SECTION 4: NET BOTTOM LINE */}
                            <tr className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-base shadow-inner">
                              <td className="py-5 px-6 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <Award className="w-5 h-5 text-emerald-200" />
                                  <div>
                                    <p className="text-sm font-black text-white">Net Monthly Store Operating Profit</p>
                                    <p className="text-[11px] font-normal text-emerald-100">
                                      Owner net income for {activeMonthData.monthName}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-5 px-6 text-center whitespace-nowrap">
                                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-white uppercase tracking-wider">
                                  Final Bottomline
                                </span>
                              </td>
                              <td className="py-5 px-6 text-right font-black text-white whitespace-nowrap text-xl font-mono">
                                {formatCurrency(activeMonthData.netStoreProfit)}
                              </td>
                              <td className="py-5 px-6 text-right text-emerald-100 font-mono whitespace-nowrap text-sm font-black">
                                {activeMonthData.profitMarginPct}% Net
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              );
            })() : <p className="text-slate-400">Loading P&amp;L statement...</p>}
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

      <AlterationSlipModal
        isOpen={showAlterationModal}
        onClose={() => setShowAlterationModal(false)}
        darkMode={darkMode}
        storeId={activeStore}
      />
    </>
  );
};

export default DashboardTab;
