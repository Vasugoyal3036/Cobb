import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import DashboardBackground, { getThemeCardCSS } from './components/DashboardBackground';
import { useToast } from './context/ToastContext';
import DashboardTab from './components/tabs/DashboardTab';

// Lazy-loaded secondary tabs & heavy modals for instant startup & lightweight bundle
const InventoryTab = lazy(() => import('./components/tabs/InventoryTab'));
const CustomerInsightsTab = lazy(() => import('./components/tabs/CustomerInsightsTab'));
const LiveBillsTab = lazy(() => import('./components/tabs/LiveBillsTab'));
const AutomationEngineTab = lazy(() => import('./components/tabs/AutomationEngineTab'));
const CampaignBuilderTab = lazy(() => import('./components/tabs/CampaignBuilderTab'));
const ReorderTab = lazy(() => import('./components/tabs/ReorderTab'));
const LoyaltyTab = lazy(() => import('./components/tabs/LoyaltyTab'));
const ExchangeTab = lazy(() => import('./components/tabs/ExchangeTab'));
const PocketKhataTab = lazy(() => import('./components/tabs/PocketKhataTab'));
const HoldDeskTab = lazy(() => import('./components/tabs/HoldDeskTab'));
const ChatbotTab = lazy(() => import('./components/tabs/ChatbotTab'));
const AlterationsTab = lazy(() => import('./components/tabs/AlterationsTab'));
const GoodsInTransitTab = lazy(() => import('./components/tabs/GoodsInTransitTab'));
const InterBranchTransferTab = lazy(() => import('./components/tabs/InterBranchTransferTab'));
const StaffLeaderboardTab = lazy(() => import('./components/tabs/StaffLeaderboardTab'));
const ThermalReceiptModal = lazy(() => import('./components/ThermalReceiptModal'));
const CustomerProfileModal = lazy(() => import('./components/CustomerProfileModal'));
const RatingsTab = lazy(() => import('./components/tabs/RatingsTab'));
const SetupScreen = lazy(() => import('./components/SetupScreen'));
const DepreciationClockTab = lazy(() => import('./components/tabs/DepreciationClockTab'));
const WardrobePassportModal = lazy(() => import('./components/WardrobePassportModal'));
const DenominationModal = lazy(() => import('./components/DenominationModal'));
const SpeedBillingModal = lazy(() => import('./components/SpeedBillingModal'));

import { fetchWithOfflineFallback, subscribeToData } from './utils/offlineDb';

import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import CheckoutNotificationToast from './components/CheckoutNotificationToast';
import {
  subscribeToCheckoutNotifications,
  registerForPushNotifications,
  isNotificationGranted,
  playCheckoutChime,
  triggerTestCheckoutNotification,
  triggerTestSystemStatusAlert,
  triggerTestBigTicketAlert,
  triggerTestHeavyDiscountAlert,
  triggerTestCancelledBillAlert,
  triggerTestEodSummaryAlert
} from './utils/checkoutNotifications';
import { subscribeToSystemWatchdog } from './utils/systemWatchdog';
import { useAuth, ROLE_PERMISSIONS } from './context/AuthContext';
import { hasConfig } from './utils/firebase';
import axios from 'axios';
import {
  Bell,
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
  Copy,
  Share2,
  CreditCard,
  Smartphone,
  Coins,
  Eye,
  Wallet
} from 'lucide-react';

const isElectron = window.location.protocol === 'app:' || window.location.protocol === 'file:' || (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron'));
const isLocalhost = isElectron || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.');
const isTunnel = window.location.hostname.includes('trycloudflare.com') || window.location.hostname.includes('ngrok') || window.location.hostname.includes('loca.lt');
const isLocalEnvironment = isLocalhost || isTunnel;

const resolveApiBase = () => {
  // 1. Electron Desktop App: ALWAYS connect directly to local POS backend on 127.0.0.1:5000
  if (isElectron) return 'http://127.0.0.1:5000';

  // 2. Tunnel access in browser
  if (isTunnel) return window.location.origin;

  // 3. Environment variable override (if defined and non-empty)
  if (import.meta.env.VITE_API_URL && typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL.trim() !== '') {
    return import.meta.env.VITE_API_URL.trim();
  }
  if (import.meta.env.VITE_API_BASE && typeof import.meta.env.VITE_API_BASE === 'string' && import.meta.env.VITE_API_BASE.trim() !== '') {
    return import.meta.env.VITE_API_BASE.trim();
  }

  // 4. Host-based resolution
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Phone Link (Firebase Hosting / Vercel): Cloud SaaS Firestore mode
    if (host.includes('web.app') || host.includes('firebaseapp.com') || host.includes('vercel.app')) {
      return '';
    }
    // Local LAN (e.g. tablet on store Wi-Fi)
    if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
      return `http://${host}:5000`;
    }
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:5000';
    }
  }
  return 'http://127.0.0.1:5000';
};
const API_BASE = resolveApiBase();



axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';
axios.defaults.headers.common['ngrok-skip-browser-warning'] = '69420';

// --- CLOUD SAAS INTERCEPTOR ---
// When the app is accessed via the web (not local desktop), automatically route GET requests
// to the Firebase Cloud Database instead of the local SQL API.
import { db, authPromise } from './utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

const getActiveStoreId = () => {
  try {
    const s = localStorage.getItem('cobb_active_store');
    if (s === 'STORE_02') return 'STORE_002';
    return import.meta.env.VITE_DEFAULT_STORE_ID || "DEMO_STORE_001";
  } catch (e) {
    return import.meta.env.VITE_DEFAULT_STORE_ID || "DEMO_STORE_001";
  }
};

const originalAxiosGet = axios.get;

axios.get = async (url, config) => {
  let targetUrl = url;
  if (!targetUrl.startsWith('http')) {
    targetUrl = API_BASE ? `${API_BASE}${url}` : url;
  }
  // Standardize localhost to 127.0.0.1 in Electron to avoid IPv6 loopback hiccups
  if (isElectron && targetUrl.includes('localhost:5000')) {
    targetUrl = targetUrl.replace('localhost:5000', '127.0.0.1:5000');
  }

  // In Desktop Electron, ALWAYS bypass cloud interceptors and fetch straight from local backend
  if (isElectron) {
    return originalAxiosGet(targetUrl, config);
  }

  // 1. If we have an active live tunnel API_BASE (ngrok/Cloudflare) or are local, prioritize live real-time backend!
  // This guarantees the phone link receives real-time, 100% updated data directly from the POS.
  if (API_BASE && (API_BASE.includes('ngrok') || API_BASE.includes('trycloudflare') || isLocalEnvironment)) {
    try {
      const liveRes = await originalAxiosGet(targetUrl, { ...config, timeout: 6000 });
      if (liveRes && liveRes.status === 200) {
        return liveRes;
      }
    } catch (liveErr) {
      // If live tunnel failed or is momentarily unreachable, fall through to Firestore cloud cache
    }
  }

  // 2. Fallback to Firestore Cloud Cache when running on remote phone without live tunnel
  if (!isLocalEnvironment && db && url.includes('/api/')) {
       let docName = url.replace(API_BASE, '').replace('/api/', '').replace(/\//g, '_');
       docName = docName.split('?')[0]; 
       try {
         // Await anonymous authentication before hitting Firestore to satisfy security rules
         if (authPromise) await authPromise;
         
         const targetStore = getActiveStoreId();
         const docRef = doc(db, 'stores', targetStore, 'data', docName);
         const docSnap = await getDoc(docRef);
         if (docSnap.exists()) {
            let data = docSnap.data();
            // Unwrap arrays if the sync agent wrapped them
            if (data && Array.isArray(data.items)) { 
                data = data.items; 
            }
            return { data, status: 200, statusText: 'OK' };
         } else {
            console.warn(`[SaaS Interceptor] Missing Firestore document for ${targetStore}: ${docName}`);
            return { data: { error: 'Not synced to cloud yet', empty: true }, status: 404, statusText: 'Not Found' };
         }
       } catch (e) {
         console.error("Firebase SaaS Interceptor error:", e);
         return { data: { error: e.message }, status: 500 };
       }
  }
  return originalAxiosGet(targetUrl, config);
};

// Local Cache Helpers for Instant 0ms Page Renders (Cache Version v4 - purges stale Sep 27 snapshots)
const CACHE_PREFIX = 'cobb_cache_v4_';
const getLocalCache = (key, fallback) => {
  try {
    if (localStorage.getItem('cobb_cache_' + key)) {
      localStorage.removeItem('cobb_cache_' + key);
    }
    const item = localStorage.getItem(CACHE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

const setLocalCache = (key, val) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(val));
  } catch (e) {}
};

// Lightweight skeleton fallback for lazy-loaded tabs
const TabFallback = () => (
  <div className="w-full min-h-[420px] flex flex-col items-center justify-center p-8 space-y-3 animate-pulse">
    <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
      <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
    <div className="h-3 w-32 bg-slate-700/30 rounded-full" />
  </div>
);

const DigitalCatalog = lazy(() => import('./components/DigitalCatalog'));
const AttendanceTab = lazy(() => import('./components/tabs/AttendanceTab'));

export default function App() {
  const [isCatalogMode, setIsCatalogMode] = useState(() => {
    // 1. If running as the Electron Desktop App locally, always show the CRM POS
    if (window.location.protocol === 'file:') return false;
    
    // 2. Show the public Digital Catalog ONLY on the /shop endpoint
    if (window.location.pathname.includes('/shop')) {
      return true;
    }
    
    // 3. For the root link (/) or /crm, default to the CRM (which is password protected)
    return false;
  });

  if (isCatalogMode) {
    return (
      <Suspense fallback={<TabFallback />}>
        <DigitalCatalog />
      </Suspense>
    );
  }

  const { user, role, activeStore, switchStore, switchRole } = useAuth();
  const currentRole = role || user?.role || 'owner';
  const [showSetup, setShowSetup] = useState(false);

  let [vips, setVips] = useState(() => getLocalCache('vips', [])); if (!Array.isArray(vips)) vips = [];
  let [dormant, setDormant] = useState(() => getLocalCache('dormant', [])); if (!Array.isArray(dormant)) dormant = [];

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [dashTheme, setDashTheme] = useState(() => localStorage.getItem('dashTheme') || 'noise-grain');

  useEffect(() => {
    localStorage.setItem('dashTheme', dashTheme);
  }, [dashTheme]);

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark', 'dark-mode');
    } else {
      document.documentElement.classList.remove('dark', 'dark-mode');
    }
  }, [darkMode]);

  const [overviewStats, setOverviewStats] = useState(() => getLocalCache('overviewStats', {
    today: { TotalSales: 0, BillCount: 0 },
    yesterday: { TotalSales: 0, BillCount: 0 },
    thisWeek: { TotalSales: 0, BillCount: 0 },
    lastWeek: { TotalSales: 0, BillCount: 0 },
    thisMonth: { TotalSales: 0, BillCount: 0 },
    lastMonth: { TotalSales: 0, BillCount: 0 }
  }));

  const [returnsData, setReturnsData] = useState(() => getLocalCache('returnsData', null));

  // Thermal Slip Modal State
  const [thermalModalConfig, setThermalModalConfig] = useState({
    isOpen: false,
    receiptType: 'bill',
    billData: null,
    alterationData: null,
    exchangeData: null
  });

  const openThermalModal = (cfg = {}) => {
    setThermalModalConfig({
      isOpen: true,
      receiptType: cfg.receiptType || 'bill',
      billData: cfg.billData || null,
      alterationData: cfg.alterationData || null,
      exchangeData: cfg.exchangeData || null
    });
  };

  const closeThermalModal = () => {
    setThermalModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Digital Wardrobe Passport Modal State
  const [showWardrobePassportModal, setShowWardrobePassportModal] = useState(false);
  const [wardrobePassportPhone, setWardrobePassportPhone] = useState('');
  const [wardrobePassportCustomerName, setWardrobePassportCustomerName] = useState('');

  const openWardrobePassport = (phone = '', name = '') => {
    setWardrobePassportPhone(phone || '');
    setWardrobePassportCustomerName(name || '');
    setShowWardrobePassportModal(true);
  };

  // Smart Bundling State
  let [bundles, setBundles] = useState(() => getLocalCache('bundles', [])); if (!Array.isArray(bundles)) bundles = [];
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);


  const fetchBundles = async () => {
    setIsLoadingBundles(true);
    try {
      const res = await axios.get(`${API_BASE}/api/smart-bundles`);
      setBundles(res.data);
    } catch (err) {
      console.error("Failed to fetch bundles:", err);
    } finally {
      setIsLoadingBundles(false);
    }
  };

  let [globalCustomers, setGlobalCustomers] = useState([]); if (!Array.isArray(globalCustomers)) globalCustomers = [];
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  let [liveBills, setLiveBills] = useState([]); if (!Array.isArray(liveBills)) liveBills = [];
  const { addToast } = useToast();
  const prevLiveBillsRef = useRef([]);
  let [inventory, setInventory] = useState([]); if (!Array.isArray(inventory)) inventory = [];
  let [deadStock, setDeadStock] = useState([]); if (!Array.isArray(deadStock)) deadStock = [];
  let [hourlySales, setHourlySales] = useState(() => getLocalCache('hourlySales', [])); if (!Array.isArray(hourlySales)) hourlySales = [];
  let [dailySales, setDailySales] = useState(() => getLocalCache('dailySales', [])); if (!Array.isArray(dailySales)) dailySales = [];
  let [monthlyProducts, setMonthlyProducts] = useState(() => getLocalCache('monthlyProducts', [])); if (!Array.isArray(monthlyProducts)) monthlyProducts = [];
  const [gstSummary, setGstSummary] = useState(() => getLocalCache('gstSummary', { today: { TaxCollected: 0, TaxableSales: 0, GrossSales: 0 }, monthly: { TaxCollected: 0, TaxableSales: 0, GrossSales: 0 }, history: [] }));
  const [gstRateSlab, setGstRateSlab] = useState(5);
  const [gstCopied, setGstCopied] = useState(false);
  let [sizeMatrix, setSizeMatrix] = useState(() => getLocalCache('sizeMatrix', [])); if (!Array.isArray(sizeMatrix)) sizeMatrix = [];
  let [wardrobeProfiles, setWardrobeProfiles] = useState(() => getLocalCache('wardrobeProfiles', [])); if (!Array.isArray(wardrobeProfiles)) wardrobeProfiles = [];
  const [pnlData, setPnlData] = useState(() => getLocalCache('pnlData', null));
  const [retentionData, setRetentionData] = useState(() => getLocalCache('retentionData', null));
  const [reconData, setReconData] = useState(null);
  const [countedCashInput, setCountedCashInput] = useState('');
  const [reconNotes, setReconNotes] = useState('');
  const [showReconModal, setShowReconModal] = useState(false);
  const [reconPettyCash, setReconPettyCash] = useState({ totalSpent: 0, items: [] });
  useEffect(() => {
    if (showReconModal) {
      axios.get(`${API_BASE}/api/expenses/today?storeId=${activeStore}`)
        .then(res => {
          if (res.data?.success) {
            setReconPettyCash(res.data.summary);
          }
        })
        .catch(console.error);
    }
  }, [showReconModal, activeStore]);
  const [showEodModal, setShowEodModal] = useState(false);
  const [eodSummaryText, setEodSummaryText] = useState('');
  const [eodSummaryData, setEodSummaryData] = useState(null);
  const [eodSelectedDate, setEodSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eodActiveTab, setEodActiveTab] = useState('visual');
  const [isLoadingEod, setIsLoadingEod] = useState(false);
  const [eodCopied, setEodCopied] = useState(false);
  const [isSendingEod, setIsSendingEod] = useState(false);
  const [eodSendResult, setEodSendResult] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState('ALL');

  const [isListenerRunning, setIsListenerRunning] = useState(false);
  const [isTogglingListener, setIsTogglingListener] = useState(false);
  let [listenerLogs, setListenerLogs] = useState([]); if (!Array.isArray(listenerLogs)) listenerLogs = [];
  const [automationDispatches, setAutomationDispatches] = useState({
    totalAttempted: 0,
    sentCount: 0,
    checkoutsSent: 0,
    exchangesSent: 0,
    notOnWhatsAppCount: 0,
    failedCount: 0,
    noPhoneCount: 0,
    latestReason: "Monitoring checkouts & exchanges...",
    events: []
  });
  const [isGatewayRunning, setIsGatewayRunning] = useState(false);
  const [isTogglingGateway, setIsTogglingGateway] = useState(false);
  const [isGatewayReady, setIsGatewayReady] = useState(false);
  const [gatewayQr, setGatewayQr] = useState(null);
  let [gatewayLogs, setGatewayLogs] = useState([]); if (!Array.isArray(gatewayLogs)) gatewayLogs = [];
  const [testPhone, setTestPhone] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [isSendingTestWa, setIsSendingTestWa] = useState(false);

  let [broadcastGroup, setBroadcastGroup] = useState(() => getLocalCache('broadcastGroup', [])); if (!Array.isArray(broadcastGroup)) broadcastGroup = [];
  const [broadcastGroupCount, setBroadcastGroupCount] = useState(0);
  const [broadcastStatus, setBroadcastStatus] = useState({ isRunning: false, total: 0, sentCount: 0, failedCount: 0, currentIndex: 0, status: 'idle', logs: [] });
  const [broadcastMsg, setBroadcastMsg] = useState('🎉 *SPECIAL OFFER!* 🎉\n\nHello *{name}*! 👋\n\nEnjoy our exclusive deals this week! 🏷️✨\n\n-----------------------------------\nVisit us in-store to claim your offer!\n-----------------------------------\n\nShow this WhatsApp message at counter.\n\nWarm Regards,\nYour Store Team');
  const [isStartingBroadcast, setIsStartingBroadcast] = useState(false);
  const [isSyncingGroup, setIsSyncingGroup] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [topMoversData, setTopMoversData] = useState(() => getLocalCache('topMoversData', { topArticles: [], sizeDemand: [] }));

  const [activeTab, setActiveTab] = useState('dashboard');
  
  // RBAC Tab Protection Guard — uses ROLE_PERMISSIONS to redirect if current tab is not allowed
  useEffect(() => {
    const allowed = ROLE_PERMISSIONS[currentRole];
    if (allowed !== null && allowed !== undefined && !allowed.includes(activeTab)) {
      // Redirect to the first allowed tab for this role, defaulting to 'live'
      const fallback = allowed.includes('live') ? 'live' : allowed[0] || 'live';
      setActiveTab(fallback);
    }
  }, [currentRole, activeTab]);

  useEffect(() => {
    if (activeTab === 'smart_bundles') {
      fetchBundles();
    }
  }, [activeTab]);
  const [activeConsole, setActiveConsole] = useState('listener');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  let [customerHistory, setCustomerHistory] = useState([]); if (!Array.isArray(customerHistory)) customerHistory = [];
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [customerPersona, setCustomerPersona] = useState('');
  const [loadingPersona, setLoadingPersona] = useState(false);
  const [aiMessageType, setAiMessageType] = useState('cross-sell');
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateWhatsAppDraft = async (customer) => {
    setLoadingPersona(true);
    try {
      const res = await axios.post(`${API_BASE}/api/ai/whatsapp-draft`, {
        customerName: customer.CustomerName,
        pastPurchases: "Assorted Casuals and Formals",
        stylePreferences: customer.PrimaryStyle || "Unknown"
      });
      setGeneratedMsg(res.data.message);
    } catch (err) {
      console.error(err);
      setGeneratedMsg("Failed to generate message.");
    } finally {
      setLoadingPersona(false);
    }
  };
  const [activeOutfitMatch, setActiveOutfitMatch] = useState(null);
  const [outfitPitch, setOutfitPitch] = useState('');
  const [isGeneratingOutfit, setIsGeneratingOutfit] = useState(false);

  // Removed AI state
  const [openMonth, setOpenMonth] = useState(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [billItemsCache, setBillItemsCache] = useState({});
  const [loadingBillItems, setLoadingBillItems] = useState(false);

  const [activeCheckoutAlert, setActiveCheckoutAlert] = useState(null);
  const [targetHighlightBill, setTargetHighlightBill] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => isNotificationGranted());
  const [showNotificationPromptBanner, setShowNotificationPromptBanner] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && Notification.permission === 'default';
  });

  // Automatically ensure service worker and FCM token registration if permission is granted
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
      registerForPushNotifications(storeId, false).catch(() => {});
      setNotificationsEnabled(true);
    }
  }, [activeStore]);

  // Deep-link routing via URL parameters (e.g. ?tab=livebills&bill=1042)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlTab = searchParams.get('tab');
      const urlBill = searchParams.get('bill') || searchParams.get('billId');

      if (urlTab === 'livebills' || urlTab === 'live') {
        setActiveTab('live');
      }
      if (urlBill) {
        setTargetHighlightBill(String(urlBill).trim());
      }
    } catch (e) {}
  }, []);

  const [isRefreshingPnl, setIsRefreshingPnl] = useState(false);
  const [isRefreshingMonthly, setIsRefreshingMonthly] = useState(false);

  const [localExpConfig, setLocalExpConfig] = useState(() => {
    try {
      const raw = localStorage.getItem('cobb_store_config');
      return raw ? JSON.parse(raw)?.operatingExpenses : null;
    } catch (e) {
      return null;
    }
  });

  const fetchPnl = async () => {
    setIsRefreshingPnl(true);
    try {
      const res = await axios.get(`${API_BASE}/api/financials/pnl?refresh=true&t=${Date.now()}`);
      if (!res?.data?.error && res?.data) {
        let merged = res.data;
        try {
          const raw = localStorage.getItem('cobb_store_config');
          if (raw) {
            const exp = JSON.parse(raw)?.operatingExpenses;
            if (exp) {
              merged = {
                ...merged,
                operatingExpenses: {
                  ...(merged.operatingExpenses || {}),
                  ...exp
                }
              };
            }
          }
        } catch (e) {}

        setPnlData(merged);
        setLocalCache('pnlData', merged);
      }
      return res.data;
    } catch (e) {
      console.error('[PNL] Refresh error:', e);
    } finally {
      setIsRefreshingPnl(false);
    }
  };

  // Listen for live store expenses and configuration updates from modal
  useEffect(() => {
    const handleConfigUpdate = (e) => {
      try {
        const raw = localStorage.getItem('cobb_store_config');
        const parsed = e?.detail || (raw ? JSON.parse(raw)?.operatingExpenses : null);
        if (parsed) {
          setLocalExpConfig(parsed);
          setPnlData(prev => ({
            ...(prev || {}),
            operatingExpenses: {
              ...(prev?.operatingExpenses || {}),
              ...parsed
            }
          }));
        }
      } catch (err) {}
      fetchPnl();
    };
    window.addEventListener('cobb_store_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('cobb_store_config_updated', handleConfigUpdate);
  }, []);

  const fetchMonthlyProducts = async () => {
    setIsRefreshingMonthly(true);
    try {
      const res = await axios.get(`${API_BASE}/api/analytics/monthly-products`);
      if (!res?.data?.error && Array.isArray(res.data)) {
        setMonthlyProducts(res.data);
        setLocalCache('monthlyProducts', res.data);
      }
      return res.data;
    } catch (e) {
      console.error('[MONTHLY] Refresh error:', e);
    } finally {
      setIsRefreshingMonthly(false);
    }
  };

  const handleOpenBillFromNotification = (alertData) => {
    setActiveCheckoutAlert(null);
    if (alertData?.type === 'eod_summary') {
      handleGenerateEodReport();
      return;
    }
    const billNo = alertData?.billNumber || alertData?.billId;
    setActiveTab('live');
    if (billNo) {
      const cleanNo = String(billNo).replace(/^cancelled_/, '').trim();
      setTargetHighlightBill(cleanNo);
      const matched = (Array.isArray(liveBills) ? liveBills : []).find(b => 
        String(b.BillNumber || '').trim().toLowerCase() === cleanNo.toLowerCase() ||
        String(b.BillId || '').trim().toLowerCase() === cleanNo.toLowerCase()
      );
      if (matched) {
        toggleBillExpansion(matched.BillId);
      }
    }
  };

  const handleEnablePushNotifications = async () => {
    const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
    const res = await registerForPushNotifications(storeId, true);
    if (res.success) {
      setNotificationsEnabled(true);
      setShowNotificationPromptBanner(false);
    }
    return res;
  };

  const handleTestCheckoutNotification = async () => {
    const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
    const testAlert = await triggerTestCheckoutNotification(storeId);
    setActiveCheckoutAlert(testAlert);
    return testAlert;
  };

  const handleTriggerTestAlert = async (type) => {
    const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
    let testAlert;
    if (type === 'vip') {
      testAlert = await triggerTestBigTicketAlert(storeId);
    } else if (type === 'discount') {
      testAlert = await triggerTestHeavyDiscountAlert(storeId);
    } else if (type === 'cancelled') {
      testAlert = await triggerTestCancelledBillAlert(storeId);
    } else if (type === 'eod') {
      testAlert = await triggerTestEodSummaryAlert(storeId);
    } else if (type === 'online' || type === 'offline') {
      testAlert = await triggerTestSystemStatusAlert(type, storeId);
    } else {
      testAlert = await triggerTestCheckoutNotification(storeId);
    }
    setActiveCheckoutAlert(testAlert);
    return testAlert;
  };

  // Store POS System Hardware & Power Status
  const [systemStatus, setSystemStatus] = useState({
    status: 'online',
    isOnline: true,
    lastBootTimeFormatted: 'Recently',
    lastShutdownTimeFormatted: 'None',
    machineName: 'Store POS'
  });

  const handleTriggerSystemTest = async (type) => {
    const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
    const testAlert = await triggerTestSystemStatusAlert(type, storeId);
    setActiveCheckoutAlert(testAlert);
    return testAlert;
  };

  // System Watchdog: Listens to POS heartbeat and triggers alerts on power cuts / crash
  useEffect(() => {
    const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
    const unsubscribe = subscribeToSystemWatchdog(storeId, (statusData) => {
      setSystemStatus(statusData);
    }, (powerCutAlert) => {
      setActiveCheckoutAlert(powerCutAlert);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeStore]);

  // Real-time Firestore checkout listener for instant in-app alerts and chimes
  useEffect(() => {
    const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
    const unsubscribe = subscribeToCheckoutNotifications(storeId, (alertData, isDirectSystemClick) => {
      if (isDirectSystemClick) {
        handleOpenBillFromNotification(alertData);
      } else {
        setActiveCheckoutAlert(alertData);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeStore]);

  // Auto-expand bill when targetHighlightBill matches loaded liveBills
  useEffect(() => {
    if (!targetHighlightBill || !Array.isArray(liveBills) || liveBills.length === 0) return;
    const target = String(targetHighlightBill).trim().toLowerCase();
    const matched = liveBills.find(b => 
      String(b.BillNumber || '').trim().toLowerCase() === target ||
      String(b.BillId || '').trim().toLowerCase() === target
    );
    if (matched) {
      if (expandedBillId !== matched.BillId) {
        toggleBillExpansion(matched.BillId);
      }
    }
  }, [targetHighlightBill, liveBills]);

  const DAILY_TARGET = Number(
    localExpConfig?.dailyTargetSales ??
    pnlData?.operatingExpenses?.dailyTargetSales ??
    50000
  );

  const processedBills = useRef(new Set());
  const initialLoadRef = useRef(true);

  // Automated Checkout WhatsApp Trigger
  useEffect(() => {
    if (!liveBills || liveBills.length === 0) return;
    
    if (initialLoadRef.current) {
       liveBills.forEach(b => processedBills.current.add(b.VOUCHER_NO));
       initialLoadRef.current = false;
       return;
    }

    liveBills.forEach(bill => {
       if (bill.VOUCHER_NO && !processedBills.current.has(bill.VOUCHER_NO)) {
          processedBills.current.add(bill.VOUCHER_NO);
          if (bill.MOBILE1 && bill.MOBILE1.length >= 10) {
             const amount = bill.NET_AMOUNT || 0;
             const message = `🎉 Thank you for shopping with us!\n\nYour bill (No: ${bill.VOUCHER_NO}) amount is Rs ${amount}.\n\nWe hope to see you again soon! ✨`;
             import('./utils/firebase.js').then(({ queueWhatsAppMessage }) => {
                if (queueWhatsAppMessage) queueWhatsAppMessage(bill.MOBILE1, message);
             }).catch(console.error);
          }
       }
    });
  }, [liveBills]);

  // Desktop Automation: Listen to WhatsApp Queue
  useEffect(() => {
    const isDesktop = navigator.userAgent.toLowerCase().includes('electron') || (window.process && window.process.type);
    if (!isDesktop) return;

    import('./utils/firebase.js').then(({ db, hasConfig }) => {
      if (!hasConfig || !db) return;
      import('firebase/firestore').then(({ collection, query, where, onSnapshot, doc, updateDoc }) => {
        const q = query(collection(db, 'whatsapp_queue'), where('status', '==', 'pending'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const docId = change.doc.id;
              
              axios.post(`${API_BASE}/api/whatsapp/send`, {
                phone: data.phone,
                message: data.message
              }).then(() => {
                 updateDoc(doc(db, 'whatsapp_queue', docId), { status: 'sent' });
              }).catch(err => {
                 console.error('Failed to dispatch queue message:', err);
                 updateDoc(doc(db, 'whatsapp_queue', docId), { status: 'failed', error: err.message });
              });
            }
          });
        });
      });
    }).catch(console.error);
  }, []);

// Core dashboard metrics needed on mount for alerts and command center
  // Staggered fetching to prevent flooding the SQL connection pool
  useEffect(() => {
    // Priority 1: The absolute fastest queries first — fire immediately
    axios.get(`${API_BASE}/api/sales/overview`).then(res => {
      if(res.data && !res?.data?.error) {
        console.log('[RENDERER] Overview Stats loaded:', res.data);
        setOverviewStats(res.data);
        setLocalCache('overviewStats', res.data);
      }
    }).catch(err => console.error('[RENDERER] Overview fetch failed:', err));

    axios.get(`${API_BASE}/api/sales/live`).then(res => {
      if(res.data && !res?.data?.error) {
        const bills = Array.isArray(res.data) ? res.data : [];
        console.log(`[RENDERER] Live Bills loaded: ${bills.length} bills`);
        setLiveBills(bills);
        const itemsCache = {};
        bills.forEach(bill => {
          if (bill.Items && bill.Items.length > 0) {
            itemsCache[bill.BillId] = bill.Items;
          }
        });
        if (Object.keys(itemsCache).length > 0) {
          setBillItemsCache(prev => ({ ...prev, ...itemsCache }));
        }
      }
    }).catch(err => console.error('[RENDERER] Live bills fetch failed:', err));

    axios.get(`${API_BASE}/api/analytics/hourly`).then(res => {
      if(!res?.data?.error) {
        setHourlySales(res.data);
        setLocalCache('hourlySales', res.data);
      }
    }).catch(console.error);

    // Priority 2: Staggered at 300ms
    setTimeout(() => {
      axios.get(`${API_BASE}/api/sales/daily-month`).then(res => {
        if(!res?.data?.error) {
          setDailySales(res.data);
          setLocalCache('dailySales', res.data);
        }
      }).catch(console.error);
      axios.get(`${API_BASE}/api/reconciliation/latest`).then(res => { if(!res?.data?.error) setReconData(res.data); }).catch(console.error);
      axios.get(`${API_BASE}/api/financials/pnl`).then(res => {
        if (!res?.data?.error && res?.data) {
          setPnlData(res.data);
          setLocalCache('pnlData', res.data);
        }
      }).catch(console.error);
      axios.get(`${API_BASE}/api/analytics/monthly-products`).then(res => {
        if (!res?.data?.error && Array.isArray(res.data)) {
          setMonthlyProducts(res.data);
          setLocalCache('monthlyProducts', res.data);
        }
      }).catch(console.error);

      // Fetch P&L telemetry & operating expense benchmarks for executive dashboard
      fetchPnl();
    }, 300);
  }, [activeStore]);

  // Lazy load data on-demand strictly when its tab becomes active
  useEffect(() => {
    if (['inventory', 'deadstock'].includes(activeTab) && (!deadStock || deadStock.length === 0)) {
      subscribeToData('dead-stock', `${API_BASE}/api/inventory/dead-stock`, setDeadStock);
    }
    if (activeTab === 'monthly') {
      axios.get(`${API_BASE}/api/analytics/monthly-products`).then(res => {
        if(!res?.data?.error && Array.isArray(res.data)) {
          setMonthlyProducts(res.data);
          setLocalCache('monthlyProducts', res.data);
        }
      }).catch(console.error);
    }
    if (activeTab === 'gst') {
      if (!gstSummary?.history || gstSummary.history.length === 0 || !gstSummary.lastFetched) {
        setGstSummary(prev => ({ ...(prev || {}), fetching: true }));
        axios.get(`${API_BASE}/api/financials/gst-summary`).then(res => {
          if (!res?.data?.error && res?.data) {
            const payload = { ...res.data, lastFetched: Date.now(), fetching: false };
            setGstSummary(payload);
            setLocalCache('gstSummary', payload);
          } else {
            setGstSummary(prev => ({ ...(prev || {}), fetching: false }));
          }
        }).catch(err => {
          console.error("GST Fetch error:", err);
          setGstSummary(prev => ({ ...(prev || {}), fetching: false }));
        });
      }
    }
    if (activeTab === 'sizematrix' && (!sizeMatrix || sizeMatrix.length === 0)) {
      axios.get(`${API_BASE}/api/inventory/size-matrix`).then(res => {
        if(!res?.data?.error) {
          setSizeMatrix(res.data);
          setLocalCache('sizeMatrix', res.data);
        }
      }).catch(console.error);
    }
    if (activeTab === 'topmovers' && (!topMoversData || !topMoversData.topArticles || topMoversData.topArticles.length === 0)) {
      axios.get(`${API_BASE}/api/analytics/top-movers`).then(res => {
        if(!res?.data?.error && res.data?.topArticles) {
          setTopMoversData(res.data);
          setLocalCache('topMoversData', res.data);
        }
      }).catch(console.error);
    }
    if (activeTab === 'returns' && !returnsData) {
      axios.get(`${API_BASE}/api/sales/returns`).then(res => { 
        if (res.data && typeof res.data === 'object' && !res?.data?.error && res.data.today) {
          setReturnsData(res.data);
          setLocalCache('returnsData', res.data);
        }
      }).catch(console.error);
    }
    if (activeTab === 'broadcast' && (!broadcastGroup || broadcastGroup.length === 0)) {
      axios.get(`${API_BASE}/api/broadcast/group`).then(res => {
        if(!res?.data?.error && res.data?.contacts) {
          setBroadcastGroup(res.data.contacts);
          setBroadcastGroupCount(res.data.totalCount || 0);
          setLocalCache('broadcastGroup', res.data.contacts);
        }
      }).catch(console.error);
    }
    if (activeTab === 'smart_bundles' && (!bundles || bundles.length === 0)) {
      fetchBundles();
    }
    if (activeTab === 'pnl') {
      axios.get(`${API_BASE}/api/financials/pnl`).then(res => {
        if (!res?.data?.error && res?.data) {
          setPnlData(res.data);
          setLocalCache('pnlData', res.data);
        }
      }).catch(console.error);
    }
    if (activeTab === 'retention' && (!retentionData || Object.keys(retentionData).length === 0)) {
      axios.get(`${API_BASE}/api/analytics/retention-radar`).then(res => {
        if (!res?.data?.error) {
          setRetentionData(res.data);
          setLocalCache('retentionData', res.data);
        }
      }).catch(console.error);
    }
    if (activeTab === 'wardrobe' && (!wardrobeProfiles || wardrobeProfiles.length === 0)) {
      axios.get(`${API_BASE}/api/analytics/wardrobe-profiles`).then(res => {
        if (!res?.data?.error) {
          setWardrobeProfiles(res.data);
          setLocalCache('wardrobeProfiles', res.data);
        }
      }).catch(console.error);
    }
    if (['vip', 'dormant', 'customerinsights'].includes(activeTab)) {
      if (!vips || vips.length === 0) {
        axios.get(`${API_BASE}/api/customers/vip`).then(res => {
          if (!res?.data?.error) {
            setVips(res.data);
            setLocalCache('vips', res.data);
          }
        }).catch(console.error);
      }
      if (!dormant || dormant.length === 0) {
        axios.get(`${API_BASE}/api/customers/dormant`).then(res => {
          if (!res?.data?.error) {
            setDormant(res.data);
            setLocalCache('dormant', res.data);
          }
        }).catch(console.error);
      }
    }
  }, [activeTab]);

  // Hardware Barcode Scanner Listener (HID Emulation)
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // Global Customer Search Debouncer
  useEffect(() => {
    if ((activeTab !== 'vip' && activeTab !== 'dormant') || !searchQuery.trim()) {
      setGlobalCustomers([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingCustomers(true);
      try {
        const res = await axios.get(`${API_BASE}/api/customers/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setGlobalCustomers(res.data);
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // F1 to jump to Speed Billing POS from anywhere
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('speed_billing');
        return;
      }

      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          const scannedCode = barcodeBufferRef.current.trim();
          setSearchQuery(scannedCode);
          if (/^[6-9]\d{9}$/.test(scannedCode)) {
            setActiveTab('vip');
          } else {
            setActiveTab('inventory');
          }

          setToasts(prev => [
            ...prev,
            { id: Date.now(), title: 'BARCODE SCANNED 📷', message: `Scanned Tag: ${scannedCode}` }
          ]);
        }
        barcodeBufferRef.current = '';
      } else if (e.key.length === 1) {
        if (timeDiff > 100) {
          barcodeBufferRef.current = '';
        }
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleBillExpansion = async (billId) => {
    if (expandedBillId === billId) {
      setExpandedBillId(null);
      return;
    }
    setExpandedBillId(billId);
    if (!billItemsCache[billId]) {
      // Check if the bill has inline Items from the enriched /api/sales/live response
      const bill = liveBills.find(b => b.BillId === billId);
      if (bill && bill.Items && bill.Items.length > 0) {
        setBillItemsCache(prev => ({ ...prev, [billId]: bill.Items }));
        return;
      }
      // Fallback: fetch from dedicated endpoint (desktop/local only)
      setLoadingBillItems(true);
      try {
        const res = await axios.get(`${API_BASE}/api/sales/bill/${billId}/items`);
        if (Array.isArray(res.data)) {
          setBillItemsCache(prev => ({ ...prev, [billId]: res.data }));
        }
      } catch (err) {
        console.error("Failed to fetch bill items:", err);
      } finally {
        setLoadingBillItems(false);
      }
    }
  };

  useEffect(() => {
    const fetchAutomationStatus = () => {
      // 1. Fetch backend automation status
      axios.get(`${API_BASE}/api/automation/status`)
        .then(res => {
          setIsListenerRunning(res.data.isRunning);
          setListenerLogs(res.data.logs);
          if (res.data?.dispatches) {
            setAutomationDispatches(res.data.dispatches);
          }
        })
        .catch(console.error);


      // 2. Fetch WhatsApp gateway status
      axios.get(`${API_BASE}/api/gateway/status`)
        .then(res => {
          setIsGatewayRunning(res.data.isRunning);
          setIsGatewayReady(res.data.isReady);
          setGatewayQr(res.data.qrCodeUrl);
          setGatewayLogs(res.data.logs);
        })
        .catch(console.error);

      // 3. Fetch broadcast status
      axios.get(`${API_BASE}/api/broadcast/status`)
        .then(res => { if(!res?.data?.error) setBroadcastStatus(res.data); })
        .catch(console.error);

      // Removed heavy polling of dashboard metrics (now relies on mount fetch and manual refresh)
      // Only polling live sales for the Live POS Checkout Alerts
      axios.get(`${API_BASE}/api/sales/live`)
        .then(res => {
          const oldBills = prevLiveBillsRef.current;
          const newBills = res.data;

          if (oldBills.length > 0 && newBills.length > 0) {
            const oldBillNumbers = new Set(oldBills.map(b => b.BillNumber.trim()));
            newBills.forEach(bill => {
              if (!oldBillNumbers.has(bill.BillNumber.trim())) {
                // Toasts removed to avoid reference error
              }
            });
          }

          prevLiveBillsRef.current = newBills;
          setLiveBills(newBills);

          const itemsCache = {};
          (Array.isArray(newBills) ? newBills : []).forEach(bill => {
            if (bill.Items && bill.Items.length > 0) {
              itemsCache[bill.BillId] = bill.Items;
            }
          });
          if (Object.keys(itemsCache).length > 0) {
            setBillItemsCache(prev => ({ ...prev, ...itemsCache }));
          }
        })
        .catch(console.error);
    };

    // Auto-start Automation Engine & WhatsApp Gateway if stopped
    const autoStartServicesOnLoad = async () => {
      try {
        const autoRes = await axios.get(`${API_BASE}/api/automation/status`);
        if (!autoRes.data.isRunning) {
          console.log("Auto-starting Automation Listener Engine on frontend mount...");
          await axios.post(`${API_BASE}/api/automation/start`);
        }
        const gwRes = await axios.get(`${API_BASE}/api/gateway/status`);
        if (!gwRes.data.isRunning) {
          console.log("Auto-starting WhatsApp Gateway on frontend mount...");
          await axios.post(`${API_BASE}/api/gateway/start`);
        }
      } catch (err) {
        console.error("Auto-start services error:", err);
      }
    };

    autoStartServicesOnLoad();
    fetchAutomationStatus();
    // Reduced from 3s to 10s — each call fires 4 parallel requests which was starving the SQL pool
    const interval = setInterval(fetchAutomationStatus, 10000);
    return () => clearInterval(interval);
  }, []);



  const toggleListener = async () => {
    if (isTogglingListener) return;
    setIsTogglingListener(true);
    try {
      const endpoint = isListenerRunning ? 'stop' : 'start';
      await axios.post(`${API_BASE}/api/automation/${endpoint}`);
      const res = await axios.get(`${API_BASE}/api/automation/status`);
      setIsListenerRunning(res.data.isRunning);
      setListenerLogs(res.data.logs || []);
    } catch (err) {
      console.error("Toggle Listener error:", err);
      alert(`Listener operation failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsTogglingListener(false);
    }
  };

  const toggleGateway = async () => {
    if (isTogglingGateway) return;
    setIsTogglingGateway(true);
    try {
      const endpoint = isGatewayRunning ? 'stop' : 'start';
      await axios.post(`${API_BASE}/api/gateway/${endpoint}`);
      const res = await axios.get(`${API_BASE}/api/gateway/status`);
      setIsGatewayRunning(res.data.isRunning);
      setIsGatewayReady(res.data.isReady);
      setGatewayQr(res.data.qrCodeUrl);
      setGatewayLogs(res.data.logs || []);
    } catch (err) {
      console.error("Toggle Gateway error:", err);
      alert(`Gateway operation failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsTogglingGateway(false);
    }
  };

  const resetGateway = async () => {
    if (!confirm("⚠️ Are you sure you want to reset the WhatsApp session?\n\nThis will clear cached locks, wipe corrupted data, and generate a fresh QR code if re-pairing is needed.")) return;
    setIsTogglingGateway(true);
    try {
      await axios.post(`${API_BASE}/api/gateway/reset`);
      const res = await axios.get(`${API_BASE}/api/gateway/status`);
      setIsGatewayRunning(res.data.isRunning);
      setIsGatewayReady(res.data.isReady);
      setGatewayQr(res.data.qrCodeUrl);
      setGatewayLogs(res.data.logs || []);
      alert("✅ WhatsApp Gateway has been reset. Please check the dashboard for the fresh status/QR.");
    } catch (err) {
      console.error("Reset Gateway error:", err);
      alert(`Gateway reset failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsTogglingGateway(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    if (!testPhone) return alert("Please enter a target 10-digit mobile number.");
    setIsSendingTestWa(true);
    try {
      await axios.post(`${API_BASE}/api/whatsapp/send`, {
        phone: testPhone,
        message: testMsg || 'Hello! 👋 This is a live test message sent from your Store Automation Engine via local WhatsApp Gateway.'
      });
      alert(`✅ WhatsApp message sent successfully to ${testPhone}!`);
      setTestMsg('');
    } catch (err) {
      alert(`Failed to send WhatsApp message: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSendingTestWa(false);
    }
  };

  const handleSyncBroadcastGroup = async () => {
    setIsSyncingGroup(true);
    try {
      const res = await axios.post(`${API_BASE}/api/broadcast/sync`);
      alert(`✅ ${res.data.message}`);
      const groupRes = await axios.get(`${API_BASE}/api/broadcast/group`);
      setBroadcastGroup(groupRes.data.contacts || []);
      setBroadcastGroupCount(groupRes.data.totalCount || 0);
    } catch (err) {
      alert(`Sync failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSyncingGroup(false);
    }
  };

  const handleStartBroadcast = async (customConfig = {}) => {
    if (!broadcastMsg.trim()) return alert("Please enter a broadcast offer message.");
    if (!isGatewayReady && !isGatewayRunning) {
      if (!confirm("WhatsApp Gateway seems offline. Proceeding will fail unless Gateway is started. Continue anyway?")) return;
    }
    if (!confirm(`🛡️ Launch Anti-Ban WhatsApp Broadcast to ${broadcastGroupCount} customers?\n\n• Human-pacing delays (20-38s)\n• Batch limit (20 per batch) with 3-min cool-downs\n• Unsubscribe footer to prevent spam reports.`)) return;

    setIsStartingBroadcast(true);
    try {
      const res = await axios.post(`${API_BASE}/api/broadcast/start`, {
        message: broadcastMsg,
        safetyMode: customConfig.safetyMode || 'ultra',
        batchSize: customConfig.batchSize || 20,
        cooldownSeconds: customConfig.cooldownSeconds || 180,
        includeOptOut: customConfig.includeOptOut !== false
      });
      alert(`✅ ${res.data.message}`);
    } catch (err) {
      alert(`Broadcast failed to start: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsStartingBroadcast(false);
    }
  };

  const handleStopBroadcast = async () => {
    try {
      await axios.post(`${API_BASE}/api/broadcast/stop`);
      alert("⏹️ Broadcast stop request sent.");
    } catch (err) {
      alert(`Failed to stop broadcast: ${err.message}`);
    }
  };

  const handleExportGroupCsv = () => {
    if (broadcastGroup.length === 0) return alert("Group is empty.");
    let csv = "Phone Number,Customer Name,Total Invoices,Total Spent (INR),Last Billed Date\n";
    broadcastGroup.forEach(c => {
      csv += `"${c.phone}","${c.customerName || 'Valued Customer'}","${c.totalBills || 1}","${c.totalSpent || 0}","${c.lastBilledAt || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cobb_billed_customer_group_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const openCustomerCard = (customer) => {
    setSelectedCustomer(customer);
    setLoadingHistory(true);
    setGeneratedMsg('');
    setCustomerPersona('');

    axios.get(`${API_BASE}/api/customers/${customer.Phone}/history`)
      .then(res => {
        setCustomerHistory(res.data);
        if (res.data.length > 0) {
          setLoadingPersona(true);
          const recentItems = res.data.slice(0, 5).map(i => i.ArticleName).join(", ");
          axios.post(`${API_BASE}/api/ai/persona`, { purchases: recentItems })
            .then(pRes => setCustomerPersona(pRes.data.persona))
            .catch(console.error)
            .finally(() => setLoadingPersona(false));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  };

  const handleGenerateAI = async () => {
    if (!selectedCustomer) return;
    setIsGenerating(true);
    const recentItems = customerHistory.slice(0, 3).map(i => i.ArticleName).join(", ") || "General Menswear";
    const uniqueSizes = [...new Set(customerHistory.map(i => i.Size).filter(s => s && s !== 'Standard'))].join(", ") || "Standard";

    try {
      const res = await axios.post(`${API_BASE}/api/campaigns/generate`, {
        customerName: selectedCustomer.FirstName,
        pastPurchases: recentItems,
        type: aiMessageType,
        sizes: uniqueSizes
      });
      setGeneratedMsg(res.data.message);
    } catch (err) {
      alert(`AI Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateOutfitMatch = async (item) => {
    setActiveOutfitMatch(item.SKU);
    setIsGeneratingOutfit(true);
    try {
      const res = await axios.post(`${API_BASE}/api/ai/outfit-matcher`, {
        deadStockItem: item.ItemName
      });
      setOutfitPitch(res.data.message);
    } catch (err) {
      alert(`AI Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsGeneratingOutfit(false);
    }
  };

  const handleSaveReconciliation = async () => {
    const counted = parseFloat(countedCashInput) || 0;
    const system = overviewStats.today.CashAmount || 0;
    const variance = counted - system;

    try {
      const res = await axios.post(`${API_BASE}/api/reconciliation/save`, {
        systemCash: system,
        countedCash: counted,
        variance,
        notes: reconNotes,
        managerName: 'Store Manager'
      });
      setReconData(res.data.record);
      setShowReconModal(false);
      setCountedCashInput('');
      setReconNotes('');
    } catch (err) {
      alert(`Failed to save reconciliation: ${err.message}`);
    }
  };

  const handleGenerateEodReport = async (dateParam = null) => {
    setIsLoadingEod(true);
    try {
      const storeId = (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01') ? 'DEMO_STORE_001' : activeStore;
      const target = dateParam !== null ? dateParam : eodSelectedDate;
      if (dateParam !== null) {
        setEodSelectedDate(dateParam);
      }
      const dateQuery = target ? `?date=${encodeURIComponent(target)}` : '';

      if (isLocalhost || isTunnel) {
        const res = await axios.get(`${API_BASE}/api/reports/eod-summary${dateQuery}`);
        setEodSummaryText(res.data?.text || '');
        setEodSummaryData(res.data?.summary || null);
      } else {
        const docRef = doc(db, "stores", storeId, "data", "reports_eod-summary");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const docData = docSnap.data();
          setEodSummaryText(docData.text || '');
          setEodSummaryData(docData.summary || null);
        } else {
          setEodSummaryText("EOD Report is still being synced from the store. Please try again later.");
          setEodSummaryData(null);
        }
      }
      setShowEodModal(true);
    } catch (err) {
      alert(`Failed to generate report: ${err.message}`);
    } finally {
      setIsLoadingEod(false);
    }
  };

  const handleDispatchEodReport = async () => {
    setIsSendingEod(true);
    setEodSendResult('');

    // Helper: open URL in system browser (Electron uses IPC shell.openExternal)
    const openUrl = (url) => {
      if (isElectron && window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    };

    try {
      if (isLocalhost || isTunnel) {
        const res = await axios.post(`${API_BASE}/api/reports/eod-summary/send`, { date: eodSelectedDate });
        if (res.data?.success) {
          setEodSendResult('✅ Closing digest successfully dispatched to all 4 store owners on WhatsApp!');
        } else {
          setEodSendResult('⚠️ Dispatched with partial response. Please verify numbers.');
        }
      } else {
        const cleanText = encodeURIComponent(eodSummaryText);
        openUrl(`https://wa.me/?text=${cleanText}`);
        setEodSendResult('✅ Opened WhatsApp to dispatch Daily Digest!');
      }
    } catch (err) {
      console.error('Failed to dispatch EOD report:', err);
      const cleanText = encodeURIComponent(eodSummaryText);
      openUrl(`https://wa.me/?text=${cleanText}`);
      setEodSendResult('📲 Opening WhatsApp share...');
    } finally {
      setIsSendingEod(false);
    }
  };

  const handleMasterRestock = () => {
    const lowStockItems = inventory.filter(i => i.CurrentStock <= 3);
    if (lowStockItems.length === 0) {
      return alert("Great news! You have no low-stock items (< 3 units) right now.");
    }

    const grouped = lowStockItems.reduce((acc, curr) => {
      const type = curr.ProductType || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(curr);
      return acc;
    }, {});

    let message = `Hello Supplier, please process the following stock replenishment for our store:\n\n`;
    Object.entries(grouped).forEach(([type, items]) => {
      message += `*${type}*\n`;
      items.forEach(i => {
        message += `- [${i.ArticleNo}] ${i.ItemName} (${i.Color}, Size: ${i.Size}) - Only ${i.CurrentStock} left.\n`;
      });
      message += `\n`;
    });

    message += `Please confirm availability and expected dispatch date.\nRegards,\nParbhat Goyal`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

  const filteredInventory = inventory.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/^0+/, '');
    return (
      item.ArticleNo?.toLowerCase().includes(q) ||
      item.ItemName?.toLowerCase().includes(q) ||
      item.ProductType?.toLowerCase().includes(q) ||
      item.Color?.toLowerCase().includes(q) ||
      item.SKU?.toLowerCase().includes(q) ||
      (cleanQ.length > 2 && item.SKU?.toLowerCase().includes(cleanQ))
    );
  });

  const groupedByType = filteredInventory.reduce((acc, item) => {
    const type = item.ProductType || 'Uncategorized';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const MASTER_CATEGORIES = [
    { id: 'Shirts', label: 'Shirts', icon: '👔' },
    { id: 'T-Shirts', label: 'T-Shirts & Polos', icon: '👕' },
    { id: 'Jeans', label: 'Jeans & Denims', icon: '👖' },
    { id: 'Formals', label: 'Formals & Trousers', icon: '🕴️' },
    { id: 'Accessories', label: 'Accessories (Belts, Wallets, Hanky, etc.)', icon: '⌚' },
    { id: 'Other Products', label: 'Other Products', icon: '🛍️' },
  ];

  const classifySubCategory = (articleName = '', productType = '') => {
    const name = `${articleName} ${productType}`.toLowerCase();
    if (name.includes('jean') || name.includes('denim')) return 'Jeans';
    if (name.includes('t-shirt') || name.includes('tshirt') || name.includes('tee') || name.includes('polo') || name.includes('half sleeve')) return 'T-Shirts';
    if (name.includes('shirt')) return 'Shirts';
    if (name.includes('trouser') || name.includes('formal') || name.includes('suit') || name.includes('blazer') || name.includes('pant') || name.includes('chinos')) return 'Formals';
    if (name.includes('belt') || name.includes('wallet') || name.includes('tie') || name.includes('sock') || name.includes('perfume') || name.includes('deo') || name.includes('cap') || name.includes('hanky') || name.includes('handkerchief')) return 'Accessories';
    return 'Other Products';
  };

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

  const totalMonthlyUnits = (Array.isArray(monthlyProducts) ? monthlyProducts : []).reduce((acc, curr) => acc + (curr.TotalUnitsSold || 0), 0);
  const totalMonthlyRevenue = (Array.isArray(monthlyProducts) ? monthlyProducts : []).reduce((acc, curr) => acc + (curr.TotalRevenue || 0), 0);
  const maxHourlyRevenue = Math.max(...(Array.isArray(hourlySales) ? hourlySales : []).map(h => h.TotalRevenue), 1);
  const averageOrderValue = overviewStats?.today?.BillCount > 0 ? (overviewStats?.today?.TotalSales / overviewStats?.today?.BillCount) : 0;
  const targetProgress = Math.min((overviewStats?.today?.TotalSales / DAILY_TARGET) * 100, 100);

  const handleGlobalSearch = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      const query = searchQuery.trim().toLowerCase();
      const isAmount = /^\d+(\.\d{1,2})?$/.test(query);
      const isPhone = /^[0-9]{10}$/.test(query);

      // Check local VIP/Dormant lists first for quick matches
      const matchesLocalCustomer = [...vips, ...dormant].some(c => 
        `${c.FirstName || ''} ${c.LastName || ''}`.toLowerCase().includes(query) ||
        c.Phone?.includes(query) ||
        (isAmount && Math.round(c.LifetimeSpend) === Math.round(parseFloat(query)))
      );

      if (matchesLocalCustomer) {
        setActiveTab('vip');
        setToasts(prev => [
          ...prev,
          { id: Date.now(), title: 'CUSTOMER SEARCH 🔍', message: `Found local match for: ${query}` }
        ]);
        return;
      }

      // If not found locally, ask the backend directly to see if any customer exists
      try {
        const res = await axios.get(`${API_BASE}/api/customers/search?q=${encodeURIComponent(query)}`);
        const foundCustomers = res.data;
        
        if (foundCustomers && foundCustomers.length > 0) {
          setGlobalCustomers(foundCustomers);
          setActiveTab('vip');
          setToasts(prev => [
            ...prev,
            { id: Date.now(), title: 'CUSTOMER SEARCH 🔍', message: `Found ${foundCustomers.length} database match(es) for: ${query}` }
          ]);
          return;
        }
      } catch (err) {
        console.error('Customer search error:', err);
      }

      // If still no customer found, treat as an inventory search
      setActiveTab('inventory');
      setToasts(prev => [
        ...prev,
        { id: Date.now(), title: 'STOCK SCAN / SEARCH 🔍', message: `Filtering inventory for: ${query}` }
      ]);
    }
  };

  const renderLogLine = (logText, idx) => {
    let textColor = "text-slate-300";
    let badgeColor = "bg-slate-850 text-slate-400 border border-slate-800";
    let badgeText = "INFO";

    const text = String(logText);

    if (text.includes("[SUCCESS]")) {
      textColor = "text-emerald-300";
      badgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      badgeText = "SUCCESS";
    } else if (text.includes("[FAILED]") || text.includes("[ERROR]") || text.includes("[FATAL]")) {
      textColor = "text-rose-300";
      badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      badgeText = "ERROR";
    } else if (text.includes("[SKIPPED]")) {
      textColor = "text-amber-300";
      badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      badgeText = "SKIP";
    } else if (text.includes("[NEW BILL DETECTED]")) {
      textColor = "text-cyan-300 font-semibold";
      badgeColor = "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
      badgeText = "BILL";
    }

    const cleanText = text
      .replace(/\[SUCCESS\]|\[FAILED\]|\[ERROR\]|\[FATAL\]|\[SKIPPED\]|\[NEW BILL DETECTED\]/g, "")
      .trim();


    return (
      <div key={idx} className={`py-1.5 px-3 rounded-lg hover:bg-slate-900/50 transition-colors flex items-start gap-3 border border-transparent hover:border-slate-850 font-mono text-[11px] ${textColor}`}>
        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase ${badgeColor} flex-shrink-0`}>
          {badgeText}
        </span>
        <span className="flex-1 whitespace-pre-wrap">{cleanText}</span>
      </div>
    );
  };

    const appState = {
    userRole: currentRole,
    activeStore,
    switchStore,
    switchRole,
    totalMonthlyUnits: typeof totalMonthlyUnits !== 'undefined' ? totalMonthlyUnits : undefined,
    totalMonthlyRevenue: typeof totalMonthlyRevenue !== 'undefined' ? totalMonthlyRevenue : undefined,
    maxHourlyRevenue: typeof maxHourlyRevenue !== 'undefined' ? maxHourlyRevenue : undefined,
    averageOrderValue: typeof averageOrderValue !== 'undefined' ? averageOrderValue : undefined,
    DAILY_TARGET: typeof DAILY_TARGET !== "undefined" ? DAILY_TARGET : undefined,
    targetProgress: typeof targetProgress !== "undefined" ? targetProgress : undefined,
    API_BASE: typeof API_BASE !== 'undefined' ? API_BASE : undefined,
    vips: typeof vips !== 'undefined' ? vips : undefined,
    setVips: typeof setVips !== 'undefined' ? setVips : undefined,
    dormant: typeof dormant !== 'undefined' ? dormant : undefined,
    setDormant: typeof setDormant !== 'undefined' ? setDormant : undefined,
    darkMode: typeof darkMode !== 'undefined' ? darkMode : undefined,
    setDarkMode: typeof setDarkMode !== 'undefined' ? setDarkMode : undefined,
    overviewStats: typeof overviewStats !== 'undefined' ? overviewStats : undefined,
    setOverviewStats: typeof setOverviewStats !== 'undefined' ? setOverviewStats : undefined,
    returnsData: typeof returnsData !== 'undefined' ? returnsData : undefined,
    setReturnsData: typeof setReturnsData !== 'undefined' ? setReturnsData : undefined,
    bundles: typeof bundles !== 'undefined' ? bundles : undefined,
    setBundles: typeof setBundles !== 'undefined' ? setBundles : undefined,
    isLoadingBundles: typeof isLoadingBundles !== 'undefined' ? isLoadingBundles : undefined,
    setIsLoadingBundles: typeof setIsLoadingBundles !== 'undefined' ? setIsLoadingBundles : undefined,
    fetchBundles: typeof fetchBundles !== 'undefined' ? fetchBundles : undefined,
    globalCustomers: typeof globalCustomers !== 'undefined' ? globalCustomers : undefined,
    setGlobalCustomers: typeof setGlobalCustomers !== 'undefined' ? setGlobalCustomers : undefined,
    isSearchingCustomers: typeof isSearchingCustomers !== 'undefined' ? isSearchingCustomers : undefined,
    setIsSearchingCustomers: typeof setIsSearchingCustomers !== 'undefined' ? setIsSearchingCustomers : undefined,
    liveBills: typeof liveBills !== 'undefined' ? liveBills : undefined,
    setLiveBills: typeof setLiveBills !== 'undefined' ? setLiveBills : undefined,
    inventory: typeof inventory !== 'undefined' ? inventory : undefined,
    setInventory: typeof setInventory !== 'undefined' ? setInventory : undefined,
    deadStock: typeof deadStock !== 'undefined' ? deadStock : undefined,
    setDeadStock: typeof setDeadStock !== 'undefined' ? setDeadStock : undefined,
    hourlySales: typeof hourlySales !== 'undefined' ? hourlySales : undefined,
    setHourlySales: typeof setHourlySales !== 'undefined' ? setHourlySales : undefined,
    dailySales: typeof dailySales !== 'undefined' ? dailySales : undefined,
    setDailySales: typeof setDailySales !== 'undefined' ? setDailySales : undefined,
    monthlyProducts: typeof monthlyProducts !== 'undefined' ? monthlyProducts : undefined,
    setMonthlyProducts: typeof setMonthlyProducts !== 'undefined' ? setMonthlyProducts : undefined,
    gstSummary: typeof gstSummary !== 'undefined' ? gstSummary : undefined,
    setGstSummary: typeof setGstSummary !== 'undefined' ? setGstSummary : undefined,
    gstRateSlab: typeof gstRateSlab !== 'undefined' ? gstRateSlab : undefined,
    setGstRateSlab: typeof setGstRateSlab !== 'undefined' ? setGstRateSlab : undefined,
    gstCopied: typeof gstCopied !== 'undefined' ? gstCopied : undefined,
    setGstCopied: typeof setGstCopied !== 'undefined' ? setGstCopied : undefined,
    sizeMatrix: typeof sizeMatrix !== 'undefined' ? sizeMatrix : undefined,
    setSizeMatrix: typeof setSizeMatrix !== 'undefined' ? setSizeMatrix : undefined,
    wardrobeProfiles: typeof wardrobeProfiles !== 'undefined' ? wardrobeProfiles : undefined,
    setWardrobeProfiles: typeof setWardrobeProfiles !== 'undefined' ? setWardrobeProfiles : undefined,
    openWardrobePassport,
    onOpenWardrobePassport: openWardrobePassport,
    pnlData: typeof pnlData !== 'undefined' ? pnlData : undefined,
    setPnlData: typeof setPnlData !== 'undefined' ? setPnlData : undefined,
    fetchPnl,
    isRefreshingPnl,
    fetchMonthlyProducts,
    isRefreshingMonthly,
    retentionData: typeof retentionData !== 'undefined' ? retentionData : undefined,
    setRetentionData: typeof setRetentionData !== 'undefined' ? setRetentionData : undefined,
    reconData: typeof reconData !== 'undefined' ? reconData : undefined,
    setReconData: typeof setReconData !== 'undefined' ? setReconData : undefined,
    countedCashInput: typeof countedCashInput !== 'undefined' ? countedCashInput : undefined,
    setCountedCashInput: typeof setCountedCashInput !== 'undefined' ? setCountedCashInput : undefined,
    reconNotes: typeof reconNotes !== 'undefined' ? reconNotes : undefined,
    setReconNotes: typeof setReconNotes !== 'undefined' ? setReconNotes : undefined,
    showReconModal: typeof showReconModal !== 'undefined' ? showReconModal : undefined,
    setShowReconModal: typeof setShowReconModal !== 'undefined' ? setShowReconModal : undefined,
    showEodModal: typeof showEodModal !== 'undefined' ? showEodModal : undefined,
    setShowEodModal: typeof setShowEodModal !== 'undefined' ? setShowEodModal : undefined,
    eodSummaryText: typeof eodSummaryText !== 'undefined' ? eodSummaryText : undefined,
    setEodSummaryText: typeof setEodSummaryText !== 'undefined' ? setEodSummaryText : undefined,
    eodCopied: typeof eodCopied !== 'undefined' ? eodCopied : undefined,
    setEodCopied: typeof setEodCopied !== 'undefined' ? setEodCopied : undefined,
    isMobileMenuOpen: typeof isMobileMenuOpen !== 'undefined' ? isMobileMenuOpen : undefined,
    setIsMobileMenuOpen: typeof setIsMobileMenuOpen !== 'undefined' ? setIsMobileMenuOpen : undefined,
    matrixCategoryFilter: typeof matrixCategoryFilter !== 'undefined' ? matrixCategoryFilter : undefined,
    setMatrixCategoryFilter: typeof setMatrixCategoryFilter !== 'undefined' ? setMatrixCategoryFilter : undefined,
    isListenerRunning: typeof isListenerRunning !== 'undefined' ? isListenerRunning : undefined,
    setIsListenerRunning: typeof setIsListenerRunning !== 'undefined' ? setIsListenerRunning : undefined,
    isTogglingListener: typeof isTogglingListener !== 'undefined' ? isTogglingListener : undefined,
    setIsTogglingListener: typeof setIsTogglingListener !== 'undefined' ? setIsTogglingListener : undefined,
    listenerLogs: typeof listenerLogs !== 'undefined' ? listenerLogs : undefined,
    setListenerLogs: typeof setListenerLogs !== 'undefined' ? setListenerLogs : undefined,
    automationDispatches: typeof automationDispatches !== 'undefined' ? automationDispatches : undefined,
    setAutomationDispatches: typeof setAutomationDispatches !== 'undefined' ? setAutomationDispatches : undefined,
    isGatewayRunning: typeof isGatewayRunning !== 'undefined' ? isGatewayRunning : undefined,
    setIsGatewayRunning: typeof setIsGatewayRunning !== 'undefined' ? setIsGatewayRunning : undefined,
    isTogglingGateway: typeof isTogglingGateway !== 'undefined' ? isTogglingGateway : undefined,
    setIsTogglingGateway: typeof setIsTogglingGateway !== 'undefined' ? setIsTogglingGateway : undefined,
    isGatewayReady: typeof isGatewayReady !== 'undefined' ? isGatewayReady : undefined,
    setIsGatewayReady: typeof setIsGatewayReady !== 'undefined' ? setIsGatewayReady : undefined,
    gatewayQr: typeof gatewayQr !== 'undefined' ? gatewayQr : undefined,
    setGatewayQr: typeof setGatewayQr !== 'undefined' ? setGatewayQr : undefined,
    gatewayLogs: typeof gatewayLogs !== 'undefined' ? gatewayLogs : undefined,
    setGatewayLogs: typeof setGatewayLogs !== 'undefined' ? setGatewayLogs : undefined,
    testPhone: typeof testPhone !== 'undefined' ? testPhone : undefined,
    setTestPhone: typeof setTestPhone !== 'undefined' ? setTestPhone : undefined,
    testMsg: typeof testMsg !== 'undefined' ? testMsg : undefined,
    setTestMsg: typeof setTestMsg !== 'undefined' ? setTestMsg : undefined,
    isSendingTestWa: typeof isSendingTestWa !== 'undefined' ? isSendingTestWa : undefined,
    setIsSendingTestWa: typeof setIsSendingTestWa !== 'undefined' ? setIsSendingTestWa : undefined,
    broadcastGroup: typeof broadcastGroup !== 'undefined' ? broadcastGroup : undefined,
    setBroadcastGroup: typeof setBroadcastGroup !== 'undefined' ? setBroadcastGroup : undefined,
    broadcastGroupCount: typeof broadcastGroupCount !== 'undefined' ? broadcastGroupCount : undefined,
    setBroadcastGroupCount: typeof setBroadcastGroupCount !== 'undefined' ? setBroadcastGroupCount : undefined,
    broadcastStatus: typeof broadcastStatus !== 'undefined' ? broadcastStatus : undefined,
    setBroadcastStatus: typeof setBroadcastStatus !== 'undefined' ? setBroadcastStatus : undefined,
    broadcastMsg: typeof broadcastMsg !== 'undefined' ? broadcastMsg : undefined,
    setBroadcastMsg: typeof setBroadcastMsg !== 'undefined' ? setBroadcastMsg : undefined,
    isStartingBroadcast: typeof isStartingBroadcast !== 'undefined' ? isStartingBroadcast : undefined,
    setIsStartingBroadcast: typeof setIsStartingBroadcast !== 'undefined' ? setIsStartingBroadcast : undefined,
    isSyncingGroup: typeof isSyncingGroup !== 'undefined' ? isSyncingGroup : undefined,
    setIsSyncingGroup: typeof setIsSyncingGroup !== 'undefined' ? setIsSyncingGroup : undefined,
    groupSearchQuery: typeof groupSearchQuery !== 'undefined' ? groupSearchQuery : undefined,
    setGroupSearchQuery: typeof setGroupSearchQuery !== 'undefined' ? setGroupSearchQuery : undefined,
    topMoversData: typeof topMoversData !== 'undefined' ? topMoversData : undefined,
    setTopMoversData: typeof setTopMoversData !== 'undefined' ? setTopMoversData : undefined,
    activeTab: typeof activeTab !== 'undefined' ? activeTab : undefined,
    setActiveTab: typeof setActiveTab !== 'undefined' ? setActiveTab : undefined,
    activeConsole: typeof activeConsole !== 'undefined' ? activeConsole : undefined,
    setActiveConsole: typeof setActiveConsole !== 'undefined' ? setActiveConsole : undefined,
    searchQuery: typeof searchQuery !== 'undefined' ? searchQuery : undefined,
    setSearchQuery: typeof setSearchQuery !== 'undefined' ? setSearchQuery : undefined,
    selectedCustomer: typeof selectedCustomer !== 'undefined' ? selectedCustomer : undefined,
    setSelectedCustomer: typeof setSelectedCustomer !== 'undefined' ? setSelectedCustomer : undefined,
    customerHistory: typeof customerHistory !== 'undefined' ? customerHistory : undefined,
    setCustomerHistory: typeof setCustomerHistory !== 'undefined' ? setCustomerHistory : undefined,
    loadingHistory: typeof loadingHistory !== 'undefined' ? loadingHistory : undefined,
    setLoadingHistory: typeof setLoadingHistory !== 'undefined' ? setLoadingHistory : undefined,
    customerPersona: typeof customerPersona !== 'undefined' ? customerPersona : undefined,
    setCustomerPersona: typeof setCustomerPersona !== 'undefined' ? setCustomerPersona : undefined,
    loadingPersona: typeof loadingPersona !== 'undefined' ? loadingPersona : undefined,
    setLoadingPersona: typeof setLoadingPersona !== 'undefined' ? setLoadingPersona : undefined,
    aiMessageType: typeof aiMessageType !== 'undefined' ? aiMessageType : undefined,
    setAiMessageType: typeof setAiMessageType !== 'undefined' ? setAiMessageType : undefined,
    generatedMsg: typeof generatedMsg !== 'undefined' ? generatedMsg : undefined,
    setGeneratedMsg: typeof setGeneratedMsg !== 'undefined' ? setGeneratedMsg : undefined,
    isGenerating: typeof isGenerating !== 'undefined' ? isGenerating : undefined,
    setIsGenerating: typeof setIsGenerating !== 'undefined' ? setIsGenerating : undefined,
    generateWhatsAppDraft: typeof generateWhatsAppDraft !== 'undefined' ? generateWhatsAppDraft : undefined,
    activeOutfitMatch: typeof activeOutfitMatch !== 'undefined' ? activeOutfitMatch : undefined,
    setActiveOutfitMatch: typeof setActiveOutfitMatch !== 'undefined' ? setActiveOutfitMatch : undefined,
    outfitPitch: typeof outfitPitch !== 'undefined' ? outfitPitch : undefined,
    setOutfitPitch: typeof setOutfitPitch !== 'undefined' ? setOutfitPitch : undefined,
    isGeneratingOutfit: typeof isGeneratingOutfit !== 'undefined' ? isGeneratingOutfit : undefined,
    setIsGeneratingOutfit: typeof setIsGeneratingOutfit !== 'undefined' ? setIsGeneratingOutfit : undefined,
    openMonth: typeof openMonth !== 'undefined' ? openMonth : undefined,
    setOpenMonth: typeof setOpenMonth !== 'undefined' ? setOpenMonth : undefined,
    selectedCalendarDay: typeof selectedCalendarDay !== 'undefined' ? selectedCalendarDay : undefined,
    setSelectedCalendarDay: typeof setSelectedCalendarDay !== 'undefined' ? setSelectedCalendarDay : undefined,
    expandedBillId: typeof expandedBillId !== 'undefined' ? expandedBillId : undefined,
    setExpandedBillId: typeof setExpandedBillId !== 'undefined' ? setExpandedBillId : undefined,
    targetHighlightBill: typeof targetHighlightBill !== 'undefined' ? targetHighlightBill : undefined,
    setTargetHighlightBill: typeof setTargetHighlightBill !== 'undefined' ? setTargetHighlightBill : undefined,
    billItemsCache: typeof billItemsCache !== 'undefined' ? billItemsCache : undefined,
    setBillItemsCache: typeof setBillItemsCache !== 'undefined' ? setBillItemsCache : undefined,
    loadingBillItems: typeof loadingBillItems !== 'undefined' ? loadingBillItems : undefined,
    setLoadingBillItems: typeof setLoadingBillItems !== 'undefined' ? setLoadingBillItems : undefined,
    handleKeyDown: typeof handleKeyDown !== 'undefined' ? handleKeyDown : undefined,
    toggleBillExpansion: typeof toggleBillExpansion !== 'undefined' ? toggleBillExpansion : undefined,
    fetchAutomationStatus: typeof fetchAutomationStatus !== 'undefined' ? fetchAutomationStatus : undefined,
    toggleListener: typeof toggleListener !== 'undefined' ? toggleListener : undefined,
    toggleGateway: typeof toggleGateway !== 'undefined' ? toggleGateway : undefined,
    resetGateway: typeof resetGateway !== 'undefined' ? resetGateway : undefined,
    handleSendTestWhatsApp: typeof handleSendTestWhatsApp !== 'undefined' ? handleSendTestWhatsApp : undefined,
    handleSyncBroadcastGroup: typeof handleSyncBroadcastGroup !== 'undefined' ? handleSyncBroadcastGroup : undefined,
    handleStartBroadcast: typeof handleStartBroadcast !== 'undefined' ? handleStartBroadcast : undefined,
    handleStopBroadcast: typeof handleStopBroadcast !== 'undefined' ? handleStopBroadcast : undefined,
    handleExportGroupCsv: typeof handleExportGroupCsv !== 'undefined' ? handleExportGroupCsv : undefined,
    openCustomerCard: typeof openCustomerCard !== 'undefined' ? openCustomerCard : undefined,
    handleGenerateAI: typeof handleGenerateAI !== 'undefined' ? handleGenerateAI : undefined,
    handleGenerateOutfitMatch: typeof handleGenerateOutfitMatch !== 'undefined' ? handleGenerateOutfitMatch : undefined,
    handleSaveReconciliation: typeof handleSaveReconciliation !== 'undefined' ? handleSaveReconciliation : undefined,
    handleGenerateEodReport: typeof handleGenerateEodReport !== 'undefined' ? handleGenerateEodReport : undefined,
    handleMasterRestock: typeof handleMasterRestock !== 'undefined' ? handleMasterRestock : undefined,
    formatCurrency: typeof formatCurrency !== 'undefined' ? formatCurrency : undefined,
    MASTER_CATEGORIES: typeof MASTER_CATEGORIES !== 'undefined' ? MASTER_CATEGORIES : undefined,
    classifySubCategory: typeof classifySubCategory !== 'undefined' ? classifySubCategory : undefined,
    handleGlobalSearch: typeof handleGlobalSearch !== 'undefined' ? handleGlobalSearch : undefined,
    renderLogLine: typeof renderLogLine !== 'undefined' ? renderLogLine : undefined,
    persona: typeof persona !== 'undefined' ? persona : undefined,
    openThermalModal
  };

  if (showSetup) {
    return (
      <Suspense fallback={<TabFallback />}>
        <SetupScreen onComplete={() => setShowSetup(false)} />
      </Suspense>
    );
  }

  if (!user) {
    return <LoginScreen onSetup={() => setShowSetup(true)} />;
  }

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''} font-sans transition-colors duration-300 overflow-hidden relative ${darkMode ? 'dark-mode text-white' : 'bg-slate-50 text-slate-800'}`}>
      
      {darkMode && <DashboardBackground theme={dashTheme} />}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(1.5rem);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* AURORA ANIMATIONS */
        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.55;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        .aurora-blob-1 {
          width: 60%; height: 60%;
          top: -20%; left: -15%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.8), transparent 70%);
          animation: aurora1 12s infinite alternate ease-in-out;
        }
        .aurora-blob-2 {
          width: 50%; height: 50%;
          bottom: -20%; right: -10%;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.7), transparent 70%);
          animation: aurora2 15s infinite alternate ease-in-out;
        }
        .aurora-blob-3 {
          width: 45%; height: 45%;
          top: 30%; left: 30%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.5), transparent 70%);
          animation: aurora3 18s infinite alternate ease-in-out;
        }
        .aurora-blob-4 {
          width: 35%; height: 35%;
          bottom: 10%; left: 10%;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.4), transparent 70%);
          animation: aurora4 20s infinite alternate ease-in-out;
        }
        @keyframes aurora1 {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(8%, 12%) scale(1.08); }
          66%  { transform: translate(-5%, 6%) scale(0.95); }
          100% { transform: translate(10%, -8%) scale(1.05); }
        }
        @keyframes aurora2 {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(-10%, -8%) scale(1.1); }
          66%  { transform: translate(5%, -12%) scale(0.92); }
          100% { transform: translate(-8%, 10%) scale(1.06); }
        }
        @keyframes aurora3 {
          0%   { transform: translate(0, 0) scale(1) rotate(0deg); }
          50%  { transform: translate(-15%, 8%) scale(1.15) rotate(20deg); }
          100% { transform: translate(12%, -10%) scale(0.9) rotate(-15deg); }
        }
        @keyframes aurora4 {
          0%   { transform: translate(0, 0) scale(1); }
          40%  { transform: translate(20%, -15%) scale(1.2); }
          100% { transform: translate(-10%, 10%) scale(0.85); }
        }
        .animate-slide-in {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }

        /* WALLPAPER GLASS THEME: transparent root so image shows through */
        html.dark, .dark-mode, .dark-mode body, html.dark body, html.dark #root, .dark-mode #root {
          color-scheme: dark !important;
          background-color: transparent !important;
          color: #ffffff !important;
        }
        .dark-mode body {
          background-color: transparent !important;
        }
        
        ${getThemeCardCSS(dashTheme)}

        /* MONOCHROME KPI METRIC TILES */
        .dark-mode .kpi-card-revenue,
        .dark-mode .kpi-card-target,
        .dark-mode .kpi-card-aov,
        .dark-mode .kpi-card-margin {
          background: rgba(30, 30, 32, 0.45) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(40px) saturate(150%) !important;
          -webkit-backdrop-filter: blur(40px) saturate(150%) !important;
          border-radius: 1.5rem !important;
          box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.05) !important;
        }
        .dark-mode .kpi-card-revenue:hover,
        .dark-mode .kpi-card-target:hover,
        .dark-mode .kpi-card-aov:hover,
        .dark-mode .kpi-card-margin:hover {
          background: rgba(45, 45, 48, 0.55) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08) !important;
        }

        /* RECESSED SUB-TILES, INNER BOXES & CONTAINERS */
        .dark-mode .bg-slate-50, .dark-mode .bg-gray-50 {
          background-color: transparent !important;
          color: #ffffff !important;
        }
        .dark-mode .bg-slate-100,
        .dark-mode .bg-gray-100,
        .dark-mode [class*="bg-slate-100"],
        .dark-mode .bg-slate-200,
        .dark-mode .bg-gray-200,
        .dark-mode [class*="bg-slate-200"],
        .dark-mode [class*="bg-slate-800"],
        .dark-mode [class*="bg-slate-850"],
        .dark-mode [class*="bg-gray-800"] {
          background-color: rgba(255, 255, 255, 0.02) !important;
          border-radius: 1rem !important;
          color: #e2e8f0 !important;
          border-color: rgba(255, 255, 255, 0.05) !important;
        }
        .dark-mode .bg-white\/85, .dark-mode .bg-white\/80, .dark-mode .bg-white\/90 {
          background-color: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          backdrop-filter: blur(24px) !important;
          -webkit-backdrop-filter: blur(24px) !important;
        }

        /* HIGHLIGHTED TYPOGRAPHY (Max High Contrast against Pitch Black) */
        /* Crisp, Pure Radiant White for Headings, Metrics & Key Figures */
        .dark-mode h1, .dark-mode h2, .dark-mode h3, .dark-mode h4, .dark-mode h5, .dark-mode h6,
        .dark-mode .text-slate-900, .dark-mode .text-slate-950, .dark-mode .text-gray-900, .dark-mode .text-black,
        .dark-mode .text-white {
          color: #ffffff !important;
        }
        .dark-mode .font-black, .dark-mode .font-extrabold {
          color: #ffffff;
        }

        /* High Visibility Secondary Titles */
        .dark-mode .text-slate-800, .dark-mode .text-gray-800 {
          color: #f8fafc !important;
        }

        /* Readable Body Text */
        .dark-mode .text-slate-700, .dark-mode .text-gray-700 {
          color: #e2e8f0 !important;
        }
        .dark-mode .text-slate-650, .dark-mode .text-slate-600, .dark-mode .text-gray-600 {
          color: #cbd5e1 !important;
        }

        /* Highlighted Secondary Labels & Metrics Subtext (Platinum clarity, not dark gray) */
        .dark-mode .text-slate-500, .dark-mode .text-gray-500 {
          color: #94a3b8 !important;
        }
        .dark-mode .text-slate-400, .dark-mode .text-gray-400 {
          color: #94a3b8 !important;
        }

        /* BOLD SLEEK SOLID BOUNDARY LINES FOR EVERY TILE & DIVIDER */
        .dark-mode .border,
        .dark-mode .border-t,
        .dark-mode .border-b,
        .dark-mode .border-l,
        .dark-mode .border-r,
        .dark-mode [class*="border-slate-"],
        .dark-mode [class*="border-gray-"] {
          border-color: #354259 !important;
        }
        .dark-mode .divide-slate-100 > * + *,
        .dark-mode .divide-slate-200 > * + *,
        .dark-mode .divide-slate-700 > * + *,
        .dark-mode .divide-slate-800 > * + *,
        .dark-mode [class*="divide-slate-"] > * + *,
        .dark-mode [class*="divide-gray-"] > * + * {
          border-color: #232d3f !important;
        }

        /* Form Inputs, Selects, and Textareas */
        .dark-mode input, .dark-mode select, .dark-mode textarea {
          background-color: #070a12 !important;
          border-color: #3b475c !important;
          color: #ffffff !important;
        }
        .dark-mode input:focus, .dark-mode select:focus, .dark-mode textarea:focus {
          border-color: #a855f7 !important;
          background-color: #070a12 !important;
          box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.35) !important;
        }
        .dark-mode select option {
          background-color: #070a12 !important;
          color: #ffffff !important;
        }
        .dark-mode input::placeholder, .dark-mode textarea::placeholder {
          color: #64748b !important;
        }

        /* Tables with Bold Sleek Separation Lines */
        .dark-mode table th {
          background-color: #0a0e18 !important;
          color: #f1f5f9 !important;
          font-weight: 700 !important;
          border-bottom: 1.5px solid #3b475c !important;
        }
        .dark-mode table tr {
          background-color: #111625 !important;
          border-color: #1e2638 !important;
        }
        .dark-mode table tr:hover {
          background-color: #161c2e !important;
        }
        .dark-mode table td {
          border-color: #1e2638 !important;
          color: #e2e8f0 !important;
        }

        /* Hover States */
        .dark-mode .hover\:bg-slate-50:hover,
        .dark-mode .hover\:bg-slate-100:hover,
        .dark-mode .hover\:bg-white:hover {
          background-color: #161c2e !important;
        }
        .dark-mode .hover\:bg-blue-50\/30:hover {
          background-color: rgba(59, 130, 246, 0.15) !important;
        }

        /* LUMINOUS STATUS PILLS & ACCENT HIGHLIGHTS */
        /* Green / Emerald (Sales, Revenue, Profit, Success) */
        .dark-mode .bg-green-50, .dark-mode .bg-emerald-50, .dark-mode .bg-emerald-500\/10 {
          background-color: rgba(16, 185, 129, 0.15) !important;
          color: #34d399 !important;
          border-color: rgba(52, 211, 153, 0.4) !important;
        }
        .dark-mode .text-green-600, .dark-mode .text-green-700, .dark-mode .text-emerald-600, .dark-mode .text-emerald-700, .dark-mode .text-emerald-800, .dark-mode .text-emerald-500 {
          color: #34d399 !important;
        }
        .dark-mode .border-emerald-200, .dark-mode .border-green-200 {
          border-color: rgba(52, 211, 153, 0.4) !important;
        }

        /* Blue / Sky (Bills, Orders, Units, Scanner) */
        .dark-mode .bg-blue-50, .dark-mode .bg-sky-50, .dark-mode .bg-blue-500\/10 {
          background-color: rgba(14, 165, 233, 0.15) !important;
          color: #38bdf8 !important;
          border-color: rgba(56, 189, 248, 0.4) !important;
        }
        .dark-mode .text-blue-600, .dark-mode .text-blue-700, .dark-mode .text-blue-800, .dark-mode .text-blue-900, .dark-mode .text-blue-500 {
          color: #38bdf8 !important;
        }
        .dark-mode .border-blue-200, .dark-mode .border-sky-200 {
          border-color: rgba(56, 189, 248, 0.4) !important;
        }

        /* Purple / Violet (VIP, UPI, Copilot) */
        .dark-mode .bg-purple-50, .dark-mode .bg-violet-50, .dark-mode .bg-purple-500\/10 {
          background-color: rgba(168, 85, 247, 0.16) !important;
          color: #c084fc !important;
          border-color: rgba(192, 132, 252, 0.4) !important;
        }
        .dark-mode .text-purple-600, .dark-mode .text-purple-700, .dark-mode .text-purple-800, .dark-mode .text-purple-500 {
          color: #c084fc !important;
        }
        .dark-mode .border-purple-200 {
          border-color: rgba(192, 132, 252, 0.4) !important;
        }

        /* Amber / Gold (Target, Warning, Khata) */
        .dark-mode .bg-amber-50, .dark-mode .bg-yellow-50, .dark-mode .bg-amber-500\/10 {
          background-color: rgba(245, 158, 11, 0.15) !important;
          color: #fbbf24 !important;
          border-color: rgba(251, 191, 36, 0.4) !important;
        }
        .dark-mode .text-amber-600, .dark-mode .text-amber-700, .dark-mode .text-amber-800, .dark-mode .text-amber-900, .dark-mode .text-amber-500 {
          color: #fbbf24 !important;
        }
        .dark-mode .border-amber-200 {
          border-color: rgba(251, 191, 36, 0.4) !important;
        }

        /* Rose / Red (Loss, Drop trends, Alerts, Top Movers) */
        .dark-mode .bg-red-50, .dark-mode .bg-rose-50, .dark-mode .bg-rose-500\/10 {
          background-color: rgba(244, 63, 94, 0.15) !important;
          color: #fb7185 !important;
          border-color: rgba(251, 113, 133, 0.4) !important;
        }
        .dark-mode .text-red-500, .dark-mode .text-red-600, .dark-mode .text-red-700, .dark-mode .text-rose-500, .dark-mode .text-rose-600, .dark-mode .text-rose-700 {
          color: #fb7185 !important;
        }
        .dark-mode .border-red-100, .dark-mode .border-red-200, .dark-mode .border-rose-200 {
          border-color: rgba(251, 113, 133, 0.4) !important;
        }

        /* Indigo (Analytics, Forecasts) */
        .dark-mode .bg-indigo-50, .dark-mode .bg-indigo-500\/10 {
          background-color: rgba(99, 102, 241, 0.15) !important;
          color: #a5b4fc !important;
          border-color: rgba(165, 180, 252, 0.4) !important;
        }
        .dark-mode .text-indigo-600, .dark-mode .text-indigo-700, .dark-mode .text-indigo-800, .dark-mode .text-indigo-500 {
          color: #a5b4fc !important;
        }
        .dark-mode .border-indigo-200 {
          border-color: rgba(165, 180, 252, 0.4) !important;
        }

        /* Modals & Surfaces */
        .dark-mode .bg-slate-50\/80 {
          background-color: rgba(0, 0, 0, 0.85) !important;
        }
        .dark-mode .bg-indigo-950, .dark-mode .bg-indigo-900 {
          background-color: #111625 !important;
          border-color: #3b475c !important;
        }
        .dark-mode .from-slate-900, .dark-mode .to-indigo-950 {
          background-image: none !important;
          background-color: #111625 !important;
          border-color: #3b475c !important;
        }
        .dark-mode .dark-toggle-btn {
          background-color: #070a12 !important;
          border-color: #3b475c !important;
          color: #fbbf24 !important;
        }
        .dark-mode .dark-toggle-btn:hover {
          background-color: #111625 !important;
        }
        .dark-mode .status-badge {
          background-color: #070a12 !important;
          border-color: #3b475c !important;
          color: #ffffff !important;
        }
      `}</style>

      {/* Floating Phone Notification Bar Alert Prompt */}
      {showNotificationPromptBanner && !notificationsEnabled && (
        <aside
          aria-label="Phone notification permission prompt"
          className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-50"
        >
          <div className={`p-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center justify-between gap-3 ${
            darkMode 
              ? 'bg-[#0f172a]/95 border-indigo-500/40 text-white shadow-indigo-950/50' 
              : 'bg-white/95 border-indigo-200 text-slate-900 shadow-indigo-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30 text-white">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-tight text-indigo-500 uppercase">Phone Alert System</p>
                <h4 className="text-xs font-bold leading-snug">Enable Phone Notification Bar Alerts</h4>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleEnablePushNotifications}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Enable
              </button>
              <button
                type="button"
                onClick={() => setShowNotificationPromptBanner(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </aside>
      )}

      <Layout
        userRole={currentRole}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleGlobalSearch={handleGlobalSearch}
        setShowReconModal={setShowReconModal}
        handleGenerateEodReport={handleGenerateEodReport}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        dashTheme={dashTheme}
        setDashTheme={setDashTheme}
        isGatewayRunning={isGatewayRunning}
        isListenerRunning={isListenerRunning}
        openThermalModal={openThermalModal}
        API_BASE={API_BASE}
        notificationsEnabled={notificationsEnabled}
        onEnableNotifications={handleEnablePushNotifications}
        onTestNotification={handleTestCheckoutNotification}
        playCheckoutChime={playCheckoutChime}
        systemStatus={systemStatus}
        onTriggerSystemTest={handleTriggerSystemTest}
        onTriggerTestAlert={handleTriggerTestAlert}
      >

        {/* Dynamic Views */}


          {/* Dynamic Views */}
          <div>
            <Suspense fallback={<TabFallback />}>
              {/* 1. COMMAND CENTER */}
            {['dashboard', 'pnl', 'gst', 'analytics', 'monthly', 'topmovers', 'sizematrix', 'broadcast', 'wardrobe', 'retention'].includes(activeTab) && (
              <DashboardTab {...appState} />
            )}

            {/* 4. DEAD STOCK WITH AI OUTFIT MATCHER */}
            {['deadstock', 'inventory'].includes(activeTab) && (
              <InventoryTab {...appState} />
            )}

            {/* WAREHOUSE REORDER */}
            {activeTab === 'reorder' && (
              <ReorderTab {...appState} />
            )}



            {/* NO-APP CUSTOMER LOYALTY */}
            {activeTab === 'loyalty' && (
              <LoyaltyTab {...appState} />
            )}

            {/* CUSTOMER RATINGS & NPS TAB */}
            {activeTab === 'ratings' && (
              <RatingsTab {...appState} openCustomerCard={openCustomerCard} />
            )}

            {/* 6. AI CAMPAIGN BUILDER */}
            {activeTab === 'smart_bundles' && (
              <CampaignBuilderTab {...appState} />
            )}

            {/* 7. AUTOMATION ENGINE */}
            {['automationengine', 'automation'].includes(activeTab) && (
              <AutomationEngineTab {...appState} />
            )}

            {/* 8. LIVE BILLS */}
            {['livebills', 'live'].includes(activeTab) && (
              <LiveBillsTab {...appState} />
            )}

            {/* PRODUCT EXCHANGES & REPLACEMENTS */}
            {['returns', 'exchanges'].includes(activeTab) && (
              <ExchangeTab {...appState} />
            )}

            {/* 9. VIP & DORMANT */}
            {['customerinsights', 'vip', 'dormant'].includes(activeTab) && (
              <CustomerInsightsTab {...appState} />
            )}

            {/* 10. POCKET KHATA (COUNTER PETTY CASH & EXPENSE JOURNAL) */}
            {activeTab === 'pocket_khata' && (
              <PocketKhataTab {...appState} />
            )}

            {/* ZERO-MOUSE SPEED BILLING POS (F1-F12) */}
            {activeTab === 'speed_billing' && (
              <SpeedBillingModal
                isOpen={true}
                onClose={() => setActiveTab('dashboard')}
                API_BASE={API_BASE}
                activeStore={activeStore}
                userRole={currentRole}
              />
            )}

            {/* 11. CASH DRAWER DENOMINATION & NIGHT CLOSING */}
            {activeTab === 'denomination' && (
              <DenominationModal
                isOpen={true}
                onClose={() => setActiveTab('pocket_khata')}
                API_BASE={API_BASE}
              />
            )}



            {/* 12. HOLD & RESERVE DESK */}
            {activeTab === 'hold_desk' && (
              <HoldDeskTab darkMode={darkMode} />
            )}




            {/* 15. COBB RETAIL AI COPILOT / CHATBOT */}
            {activeTab === 'copilot' && (
              <ChatbotTab API_BASE={API_BASE} darkMode={darkMode} onNavigateTab={(tab) => setActiveTab(tab)} />
            )}



            {/* 18. ALTERATIONS DESK */}
            {activeTab === 'alterations' && (
              <AlterationsTab
                darkMode={darkMode}
                activeStore={activeStore}
                API_BASE={API_BASE}
                formatCurrency={formatCurrency}
                openThermalModal={openThermalModal}
              />
            )}

            {/* 19. STAFF LEADERBOARD & INCENTIVES */}
            {activeTab === 'staff_leaderboard' && (
              <StaffLeaderboardTab API_BASE={API_BASE} />
            )}

            {/* 20. GOODS IN TRANSIT */}
            {activeTab === 'transit' && (
              <GoodsInTransitTab darkMode={darkMode} API_BASE={API_BASE} />
            )}

            {/* 20A. ATTENDANCE & CLOCK-IN */}
            {activeTab === 'attendance' && (
              <AttendanceTab activeStore={activeStore} />
            )}

            {/* 20B. INTER-BRANCH TRANSFERS */}
            {activeTab === 'ibt' && (
              <InterBranchTransferTab API_BASE={API_BASE} darkMode={darkMode} activeStore={activeStore} />
            )}

            {/* 21. DEAD-STOCK DEPRECIATION CLOCK & CLEARANCE MATRIX */}
            {activeTab === 'depreciation_clock' && (
              <DepreciationClockTab
                API_BASE={API_BASE}
                darkMode={darkMode}
                formatCurrency={formatCurrency}
                onOpenBundleModal={() => setActiveTab('smart_bundles')}
                onOpenTransferModal={() => setActiveTab('transit')}
              />
            )}


            {/* DIGITAL WARDROBE PASSPORT MODAL (Available globally) */}
            <WardrobePassportModal
              isOpen={showWardrobePassportModal}
              onClose={() => setShowWardrobePassportModal(false)}
              initialPhone={wardrobePassportPhone}
              initialCustomerName={wardrobePassportCustomerName}
              API_BASE={API_BASE}
              darkMode={darkMode}
            />

              {!['vip', 'dormant'].includes(activeTab) && <CustomerProfileModal {...appState} />}
            </Suspense>
          </div>

        {/* EOD CASH RECONCILIATION MODAL WITH POCKET KHATA INTEGRATION */}
        {showReconModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className={`rounded-2xl p-6 w-full max-w-md shadow-2xl border ${darkMode ? 'bg-[#000000] border-[#1a1a1f] text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className={`text-xl font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Calculator className="w-6 h-6 text-emerald-500"/> Cash Reconciliation
                </h3>
                <button onClick={() => setShowReconModal(false)} className={`p-1.5 rounded-lg ${darkMode ? 'text-slate-400 hover:text-white hover:bg-white/[0.08]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className={`text-xs mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Physical drawer balance audit automatically factoring Pocket Khata counter expenses.
              </p>

              {/* Tally Breakdown Box */}
              {(() => {
                const systemCashSales = overviewStats?.today?.CashAmount || 0;
                const pettyCashSpent = reconPettyCash?.totalSpent || 0;
                const netExpectedCash = Math.max(0, systemCashSales - pettyCashSpent);
                const counted = parseFloat(countedCashInput) || 0;
                const variance = counted - netExpectedCash;

                return (
                  <div className="space-y-4">
                    <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${darkMode ? 'bg-[#000000] border-[#1a1a1f]' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">System Cash Sales:</span>
                        <span className="font-bold font-mono text-white">{formatCurrency(systemCashSales)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-amber-400 flex items-center gap-1">☕ Less: Pocket Khata Spent:</span>
                        <span className="font-bold font-mono text-rose-400">- {formatCurrency(pettyCashSpent)}</span>
                      </div>
                      <div className={`pt-2 border-t flex justify-between items-center text-sm font-black ${darkMode ? 'border-[#1a1a1f] text-emerald-400' : 'border-slate-200 text-emerald-600'}`}>
                        <span>Net Expected In Drawer:</span>
                        <span className="font-mono">{formatCurrency(netExpectedCash)}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">
                        Physical Cash Counted in Register (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={countedCashInput}
                        onChange={e => setCountedCashInput(e.target.value)}
                        placeholder="0.00"
                        className={`w-full p-3.5 text-xl font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          darkMode ? 'bg-[#000000] border-[#1a1a1f] text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                        autoFocus
                      />
                    </div>

                    {countedCashInput && (
                      <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                        Math.abs(variance) < 1
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : variance > 0
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }`}>
                        <span>Variance Status:</span>
                        <span className="font-mono">
                          {Math.abs(variance) < 1 ? '✅ Exact Match (₹0)' : variance > 0 ? `▲ Surplus +${formatCurrency(variance)}` : `▼ Shortage ${formatCurrency(variance)}`}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">
                        Manager Notes (Optional)
                      </label>
                      <textarea
                        value={reconNotes}
                        onChange={e => setReconNotes(e.target.value)}
                        placeholder="Explain reason for any variance..."
                        className={`w-full p-2.5 rounded-xl text-xs border h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          darkMode ? 'bg-[#000000] border-[#1a1a1f] text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                        }`}
                      />
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={() => setShowReconModal(false)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${darkMode ? 'text-slate-400 hover:bg-white/[0.08]' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await axios.post(`${API_BASE}/api/reconciliation/save`, {
                              systemCash: netExpectedCash,
                              countedCash: counted,
                              variance,
                              notes: reconNotes,
                              managerName: 'Store Manager'
                            });
                            setReconData(res.data.record);
                            setShowReconModal(false);
                            alert(`Reconciliation complete. Variance: ₹${variance}`);
                          } catch (e) {
                            alert(e.message);
                          }
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4"/> Confirm & Reconcile
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* EOD WHATSAPP REPORT MODAL */}
        {showEodModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        Store Closing Digest (EOD)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Cobb Apparels, Fatehpur Road, Pundri
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 rounded-full flex items-center gap-1">
                    ⏰ Auto Close
                  </span>
                  <button
                    onClick={() => { setShowEodModal(false); setEodSendResult(''); }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Date Selector & Mode Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      handleGenerateEodReport(today);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      eodSelectedDate === new Date().toISOString().split('T')[0]
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const yest = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                      handleGenerateEodReport(yest);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      eodSelectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Yesterday
                  </button>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-700 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={eodSelectedDate}
                      onChange={(e) => handleGenerateEodReport(e.target.value)}
                      className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEodActiveTab('visual')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      eodActiveTab === 'visual'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    📊 Visual Digest
                  </button>
                  <button
                    type="button"
                    onClick={() => setEodActiveTab('text')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      eodActiveTab === 'text'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    💬 WhatsApp Text
                  </button>
                </div>
              </div>

              {isLoadingEod ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-500 font-semibold">Compiling store metrics from POS...</p>
                </div>
              ) : eodActiveTab === 'visual' && eodSummaryData ? (
                <div className="space-y-3.5">
                  {/* Hero Total Sales Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white shadow-lg border border-indigo-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">
                          Total Net Daily Sales
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight mt-0.5">
                          ₹{Number(eodSummaryData.grossSales || 0).toLocaleString('en-IN')}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Processed across <strong className="text-white font-bold">{eodSummaryData.billCount || 0} Customer Bills</strong>
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-end gap-1.5 sm:gap-2">
                        <div className="px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 text-right">
                          <span className="text-[9px] uppercase tracking-wider text-slate-300 block">Avg Ticket (ABV)</span>
                          <span className="text-sm font-black text-amber-300">
                            ₹{eodSummaryData.billCount > 0 ? Math.round((eodSummaryData.grossSales || 0) / eodSummaryData.billCount).toLocaleString('en-IN') : 0}
                          </span>
                        </div>
                        {eodSummaryData.discounts > 0 && (
                          <div className="px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-lg text-amber-300 text-[11px] font-bold">
                            ₹{Number(eodSummaryData.discounts).toLocaleString('en-IN')} Discounts Given
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4-Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Drawer Cash */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" /> Net Drawer Cash
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">
                          Expected
                        </span>
                      </div>
                      <div className="text-xl font-black text-emerald-800 dark:text-emerald-200">
                        ₹{Number(eodSummaryData.netExpectedDrawerCash ?? (eodSummaryData.cash || 0)).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                        <span>Gross Cash: ₹{Number(eodSummaryData.cash || 0).toLocaleString('en-IN')}</span>
                        {eodSummaryData.pettyCashSpent > 0 && (
                          <span className="text-rose-600 font-bold">-₹{Number(eodSummaryData.pettyCashSpent).toLocaleString('en-IN')} Khata</span>
                        )}
                      </div>
                    </div>

                    {/* UPI Online */}
                    <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5" /> UPI / QR
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                          Digital
                        </span>
                      </div>
                      <div className="text-xl font-black text-blue-800 dark:text-blue-200">
                        ₹{Number(eodSummaryData.upi || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Instant Bank Credit
                      </div>
                    </div>

                    {/* Card Swipes */}
                    <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5" /> Card Swipe
                        </span>
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded">
                          POS
                        </span>
                      </div>
                      <div className="text-xl font-black text-purple-800 dark:text-purple-200">
                        ₹{Number(eodSummaryData.card || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Credit / Debit Terminals
                      </div>
                    </div>
                  </div>

                  {/* Highlights Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
                          <Trophy className="w-4 h-4" />
                        </span>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Best Seller Today</span>
                          <span className="text-xs font-black text-slate-800 dark:text-white">
                            {eodSummaryData.topCategory || 'Apparel'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {eodSummaryData.topCategoryUnits || 0} units
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                          <RotateCcw className="w-4 h-4" />
                        </span>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Exchanges & Upsell</span>
                          <span className="text-xs font-black text-slate-800 dark:text-white">
                            {eodSummaryData.exchangeBills || 0} Replacement Bills
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(eodSummaryData.upsellCollected || 0) >= 0 ? '+' : ''}₹{Number(eodSummaryData.upsellCollected || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Recipient list card */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Configured Store Owners (4 Numbers)
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600">Active</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                      <span className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">9138122820</span>
                      <span className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">8708788707</span>
                      <span className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">9034522000</span>
                      <span className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">9466422821</span>
                    </div>
                  </div>

                  {/* Live Preview textarea */}
                  <textarea 
                    value={eodSummaryText} 
                    readOnly 
                    className="w-full h-56 p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl focus:outline-none custom-scrollbar leading-relaxed border border-slate-800" 
                  />
                </div>
              )}

              {eodSendResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  eodSendResult.startsWith('✅') 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                }`}>
                  {eodSendResult}
                </div>
              )}
              
              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => { setShowEodModal(false); setEodSendResult(''); }} 
                  className="px-4 py-2.5 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button 
                      onClick={async () => {
                        try {
                          await navigator.share({
                            title: 'Cobb Store Closing Digest',
                            text: eodSummaryText
                          });
                        } catch (e) {}
                      }}
                      className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-blue-500"/>
                      <span>Share</span>
                    </button>
                  )}

                  <button 
                    onClick={() => { 
                      navigator.clipboard.writeText(eodSummaryText); 
                      setEodCopied(true); 
                      setTimeout(() => setEodCopied(false), 2000); 
                    }} 
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {eodCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600"/> : <Copy className="w-4 h-4"/>}
                    {eodCopied ? 'Copied!' : 'Copy Text'}
                  </button>

                  <button 
                    onClick={handleDispatchEodReport}
                    disabled={isSendingEod}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingEod ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                    <span>{isSendingEod ? 'Dispatching...' : 'Send WhatsApp to 4 Owners'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION BAR (Android Material Design — MOBILE ONLY) */}
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around px-2 pb-safe pt-1 ${
          darkMode
            ? 'bg-[#0d1017]/95 border-t border-white/[0.06] backdrop-blur-xl shadow-[0_-8px_24px_rgba(0,0,0,0.4)]'
            : 'bg-white/95 border-t border-slate-200/80 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
        }`} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 8px)' }}>

          {/* SALES */}
          <button
            onClick={() => { setActiveTab('live'); setIsMobileMenuOpen(false); }}
            className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 cursor-pointer group"
          >
            <div className={`flex items-center justify-center w-14 h-7 rounded-full transition-all duration-200 ${
              activeTab === 'live'
                ? darkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                : 'bg-transparent'
            }`}>
              <Receipt className={`w-5 h-5 transition-colors ${
                activeTab === 'live'
                  ? darkMode ? 'text-blue-400' : 'text-blue-600'
                  : darkMode ? 'text-slate-400' : 'text-slate-500'
              }`} />
            </div>
            <span className={`text-[10px] font-bold transition-colors ${
              activeTab === 'live'
                ? darkMode ? 'text-blue-400' : 'text-blue-600'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>Sales</span>
          </button>

          {/* STOCK */}
          <button
            onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }}
            className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 cursor-pointer group"
          >
            <div className={`flex items-center justify-center w-14 h-7 rounded-full transition-all duration-200 ${
              activeTab === 'inventory'
                ? darkMode ? 'bg-amber-500/20' : 'bg-amber-100'
                : 'bg-transparent'
            }`}>
              <Package className={`w-5 h-5 transition-colors ${
                activeTab === 'inventory'
                  ? darkMode ? 'text-amber-400' : 'text-amber-600'
                  : darkMode ? 'text-slate-400' : 'text-slate-500'
              }`} />
            </div>
            <span className={`text-[10px] font-bold transition-colors ${
              activeTab === 'inventory'
                ? darkMode ? 'text-amber-400' : 'text-amber-600'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>Stock</span>
          </button>

          {/* CLIENTS */}
          <button
            onClick={() => { setActiveTab('wardrobe'); setIsMobileMenuOpen(false); }}
            className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 cursor-pointer group"
          >
            <div className={`flex items-center justify-center w-14 h-7 rounded-full transition-all duration-200 ${
              activeTab === 'wardrobe'
                ? darkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                : 'bg-transparent'
            }`}>
              <Shirt className={`w-5 h-5 transition-colors ${
                activeTab === 'wardrobe'
                  ? darkMode ? 'text-purple-400' : 'text-purple-600'
                  : darkMode ? 'text-slate-400' : 'text-slate-500'
              }`} />
            </div>
            <span className={`text-[10px] font-bold transition-colors ${
              activeTab === 'wardrobe'
                ? darkMode ? 'text-purple-400' : 'text-purple-600'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>Clients</span>
          </button>

          {/* KHATA */}
          <button
            onClick={() => { setActiveTab('pocket_khata'); setIsMobileMenuOpen(false); }}
            className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 cursor-pointer group"
          >
            <div className={`flex items-center justify-center w-14 h-7 rounded-full transition-all duration-200 ${
              activeTab === 'pocket_khata'
                ? darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
                : 'bg-transparent'
            }`}>
              <Wallet className={`w-5 h-5 transition-colors ${
                activeTab === 'pocket_khata'
                  ? darkMode ? 'text-emerald-400' : 'text-emerald-600'
                  : darkMode ? 'text-slate-400' : 'text-slate-500'
              }`} />
            </div>
            <span className={`text-[10px] font-bold transition-colors ${
              activeTab === 'pocket_khata'
                ? darkMode ? 'text-emerald-400' : 'text-emerald-600'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>Khata</span>
          </button>

          {/* MORE / MENU */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 cursor-pointer group"
          >
            <div className={`flex items-center justify-center w-14 h-7 rounded-full transition-all duration-200 relative ${
              isMobileMenuOpen
                ? darkMode ? 'bg-slate-500/20' : 'bg-slate-200'
                : 'bg-transparent'
            }`}>
              {isMobileMenuOpen
                ? <X className={`w-5 h-5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`} />
                : <Menu className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
              }
            </div>
            <span className={`text-[10px] font-bold transition-colors ${
              isMobileMenuOpen
                ? darkMode ? 'text-slate-300' : 'text-slate-700'
                : darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>Menu</span>
          </button>
        </div>

        {/* ESC/POS Thermal Receipt Modal */}
        {thermalModalConfig.isOpen && (
          <Suspense fallback={null}>
            <ThermalReceiptModal
              isOpen={thermalModalConfig.isOpen}
              onClose={closeThermalModal}
              receiptType={thermalModalConfig.receiptType}
              billData={thermalModalConfig.billData}
              alterationData={thermalModalConfig.alterationData}
              exchangeData={thermalModalConfig.exchangeData}
            />
          </Suspense>
        )}

        {/* Real-time Checkout Push Notification Banner */}
        <CheckoutNotificationToast
          notification={activeCheckoutAlert}
          onClose={() => setActiveCheckoutAlert(null)}
          onOpenBill={handleOpenBillFromNotification}
          onOpenEod={() => handleGenerateEodReport()}
        />
      </Layout>
    </div>
  );
}
