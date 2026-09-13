import React, { useState, useEffect, useRef } from 'react';
import { useToast } from './context/ToastContext';
import InventoryTab from './components/tabs/InventoryTab';
import CustomerProfileModal from './components/CustomerProfileModal';
import DashboardTab from './components/tabs/DashboardTab';
import CustomerInsightsTab from './components/tabs/CustomerInsightsTab';
import LiveBillsTab from './components/tabs/LiveBillsTab';
import AutomationEngineTab from './components/tabs/AutomationEngineTab';
import CampaignBuilderTab from './components/tabs/CampaignBuilderTab';
import ReorderTab from './components/tabs/ReorderTab';
import DenominationTab from './components/tabs/DenominationTab';
import LoyaltyTab from './components/tabs/LoyaltyTab';
import ExchangeTab from './components/tabs/ExchangeTab';
import PocketKhataTab from './components/tabs/PocketKhataTab';
import ShelfTalkerStudioTab from './components/tabs/ShelfTalkerStudioTab';
import HoldDeskTab from './components/tabs/HoldDeskTab';
import SaveTheSaleTab from './components/tabs/SaveTheSaleTab';
import LoungeRadioTab from './components/tabs/LoungeRadioTab';
import ChatbotTab from './components/tabs/ChatbotTab';
import { fetchWithOfflineFallback, subscribeToData } from './utils/offlineDb';

import Layout from './components/Layout';
import SetupScreen from './components/SetupScreen';
import LoginScreen from './components/LoginScreen';
import { useAuth } from './context/AuthContext';
import { hasConfig } from './utils/firebase';
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
  Copy
} from 'lucide-react';

const isElectron = window.location.protocol === 'app:' || window.location.protocol === 'file:' || (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron'));
const isLocalhost = isElectron || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.');
const isTunnel = window.location.hostname.includes('trycloudflare.com') || window.location.hostname.includes('ngrok') || window.location.hostname.includes('loca.lt');
const isLocalEnvironment = isLocalhost || isTunnel;
const API_BASE = isTunnel ? window.location.origin : 'http://localhost:5000';


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
            if (data.items !== undefined && Object.keys(data).length <= 2) { 
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
  return originalAxiosGet(url, config);
};

// Local Cache Helpers for Instant 0ms Page Renders
const getLocalCache = (key, fallback) => {
  try {
    const item = localStorage.getItem('cobb_cache_' + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

const setLocalCache = (key, val) => {
  try {
    localStorage.setItem('cobb_cache_' + key, JSON.stringify(val));
  } catch (e) {}
};

export default function App() {
  const { user, role, activeStore, switchStore, switchRole } = useAuth();
  const currentRole = role || user?.role || 'owner';
  const [showSetup, setShowSetup] = useState(false);

  let [vips, setVips] = useState(() => getLocalCache('vips', [])); if (!Array.isArray(vips)) vips = [];
  let [dormant, setDormant] = useState(() => getLocalCache('dormant', [])); if (!Array.isArray(dormant)) dormant = [];

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
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
  const [smartCoordinate, setSmartCoordinate] = useState({ data: null, loading: false, itemText: '' });
  const [showCoordinateModal, setShowCoordinateModal] = useState(false);

  // VM Auditor State
  let [vmImages, setVmImages] = useState([]); if (!Array.isArray(vmImages)) vmImages = [];
  let [vmImageUrls, setVmImageUrls] = useState([]); if (!Array.isArray(vmImageUrls)) vmImageUrls = [];
  const [vmAuditResult, setVmAuditResult] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [vmError, setVmError] = useState('');

  // Smart Bundling State
  let [bundles, setBundles] = useState(() => getLocalCache('bundles', [])); if (!Array.isArray(bundles)) bundles = [];
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);
  const [publishedBundles, setPublishedBundles] = useState(new Set());

  const handleVmUpload = async (files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setVmImages(fileArray);
    setVmImageUrls(fileArray.map(f => URL.createObjectURL(f)));
    setVmAuditResult(null);
    setVmError('');
    setIsAuditing(true);

    const formData = new FormData();
    fileArray.forEach(file => {
      formData.append('images', file);
    });

    try {
      const res = await axios.post(`${API_BASE}/api/ai/vm-audit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVmAuditResult(res.data);
    } catch (err) {
      console.error(err);
      setVmError(err.response?.data?.error || 'Audit request failed. Please try again.');
    } finally {
      setIsAuditing(false);
    }
  };

  const [trendForecast, setTrendForecast] = useState(null);
  const [isForecasting, setIsForecasting] = useState(false);

  const fetchTrendForecast = async () => {
    setIsForecasting(true);
    try {
      const res = await axios.get(`${API_BASE}/api/ai/trend-forecast`);
      setTrendForecast(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsForecasting(false);
    }
  };

  const [compImage, setCompImage] = useState(null);
  const [compImageUrl, setCompImageUrl] = useState('');
  const [compIntelResult, setCompIntelResult] = useState(null);
  const [isAnalyzingComp, setIsAnalyzingComp] = useState(false);
  const [compError, setCompError] = useState('');

  const handleCompUpload = async (file) => {
    if (!file) return;
    setCompImage(file);
    setCompImageUrl(URL.createObjectURL(file));
    setCompIntelResult(null);
    setCompError('');
    setIsAnalyzingComp(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await axios.post(`${API_BASE}/api/ai/competitor-intel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCompIntelResult(res.data);
    } catch (err) {
      console.error(err);
      setCompError('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzingComp(false);
    }
  };

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
  const [eodCopied, setEodCopied] = useState(false);
  const [isSendingEod, setIsSendingEod] = useState(false);
  const [eodSendResult, setEodSendResult] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState('ALL');

  const [isListenerRunning, setIsListenerRunning] = useState(false);
  const [isTogglingListener, setIsTogglingListener] = useState(false);
  let [listenerLogs, setListenerLogs] = useState([]); if (!Array.isArray(listenerLogs)) listenerLogs = [];
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
  
  // RBAC Tab Protection Guard (Forces restricted tabs back to live checkouts if manager is active)
  useEffect(() => {
    if (currentRole === 'manager') {
      const managerRestrictedTabs = ['pnl', 'gst', 'automation', 'automationengine', 'broadcast', 'competitor_intel'];
      if (managerRestrictedTabs.includes(activeTab)) {
        setActiveTab('live');
      }
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
  const [campaignEvent, setCampaignEvent] = useState('Autumn Collection Drop');
  const [campaignAudience, setCampaignAudience] = useState('All VIP Customers');
  const [campaignDraft, setCampaignDraft] = useState('');
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);

  // Removed AI state
  const [openProductType, setOpenProductType] = useState(null);
  const [openMonth, setOpenMonth] = useState(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [billItemsCache, setBillItemsCache] = useState({});
  const [loadingBillItems, setLoadingBillItems] = useState(false);

  const DAILY_TARGET = 50000;

  
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
      subscribeToData('dead-stock', `${API_BASE}/api/inventory/dead-stock`, setDeadStock);
    }, 300);

    // Priority 3: Customer queries — staggered to 700ms
    setTimeout(() => {
      axios.get(`${API_BASE}/api/customers/vip`).then(res => {
        if(!res?.data?.error) {
          setVips(res.data);
          setLocalCache('vips', res.data);
        }
      }).catch(console.error);
      axios.get(`${API_BASE}/api/customers/dormant`).then(res => {
        if(!res?.data?.error) {
          setDormant(res.data);
          setLocalCache('dormant', res.data);
        }
      }).catch(console.error);
    }, 700);

    // Priority 4: Financial & Inventory analytics — staggered to 1200ms
    setTimeout(() => {
      axios.get(`${API_BASE}/api/financials/gst-summary`).then(res => {
        if(!res?.data?.error && res?.data) {
          const payload = { ...res.data, lastFetched: Date.now() };
          setGstSummary(payload);
          setLocalCache('gstSummary', payload);
        }
      }).catch(console.error);

      axios.get(`${API_BASE}/api/sales/returns`).then(res => {
        if(!res?.data?.error && res?.data?.today) {
          setReturnsData(res.data);
          setLocalCache('returnsData', res.data);
        }
      }).catch(console.error);

      axios.get(`${API_BASE}/api/inventory/size-matrix`).then(res => {
        if(!res?.data?.error) {
          setSizeMatrix(res.data);
          setLocalCache('sizeMatrix', res.data);
        }
      }).catch(console.error);

      axios.get(`${API_BASE}/api/analytics/monthly-products`).then(res => {
        if(!res?.data?.error) {
          setMonthlyProducts(res.data);
          setLocalCache('monthlyProducts', res.data);
        }
      }).catch(console.error);

      axios.get(`${API_BASE}/api/analytics/retention-radar`).then(res => {
        if(!res?.data?.error) {
          setRetentionData(res.data);
          setLocalCache('retentionData', res.data);
        }
      }).catch(console.error);

      axios.get(`${API_BASE}/api/financials/pnl`).then(res => {
        if(!res?.data?.error) {
          setPnlData(res.data);
          setLocalCache('pnlData', res.data);
        }
      }).catch(console.error);

      axios.get(`${API_BASE}/api/analytics/wardrobe-profiles`).then(res => {
        if(!res?.data?.error) {
          setWardrobeProfiles(res.data);
          setLocalCache('wardrobeProfiles', res.data);
        }
      }).catch(console.error);
    }, 1200);

    // Priority 5: Marketing & Bundles — staggered to 2000ms
    setTimeout(() => {
      axios.get(`${API_BASE}/api/smart-bundles`).then(res => {
        if(!res?.data?.error && Array.isArray(res.data)) {
          setBundles(res.data);
          setLocalCache('bundles', res.data);
        }
      }).catch(console.error);

      axios.get(`${API_BASE}/api/broadcast/group`).then(res => {
        if(!res?.data?.error && res.data?.contacts) {
          setBroadcastGroup(res.data.contacts);
          setBroadcastGroupCount(res.data.totalCount || 0);
          setLocalCache('broadcastGroup', res.data.contacts);
        }
      }).catch(console.error);

      axios.get(`${API_BASE}/api/analytics/top-movers`).then(res => {
        if(!res?.data?.error && res.data?.topArticles) {
          setTopMoversData(res.data);
          setLocalCache('topMoversData', res.data);
        }
      }).catch(console.error);
    }, 2000);
  }, []);

  // Lazy load data only when its tab is active
  useEffect(() => {
    if (['inventory', 'deadstock'].includes(activeTab) && (!deadStock || deadStock.length === 0)) {
      subscribeToData('dead-stock', `${API_BASE}/api/inventory/dead-stock`, setDeadStock);
    }
    if (activeTab === 'monthly' && (!monthlyProducts || monthlyProducts.length === 0)) {
      axios.get(`${API_BASE}/api/analytics/monthly-products`).then(res => {
        if(!res?.data?.error) {
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

  const handleGenerateCampaign = async () => {
    setIsGeneratingCampaign(true);
    try {
      const res = await axios.post(`${API_BASE}/api/ai/campaign-builder`, {
        event: campaignEvent,
        audience: campaignAudience
      });
      setCampaignDraft(res.data.message);
    } catch (err) {
      alert(`AI Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsGeneratingCampaign(false);
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

  const handleGenerateEodReport = async () => {
    try {
      if (isLocalhost || isTunnel) {
        const res = await axios.get(`${API_BASE}/api/reports/eod-summary`);
        setEodSummaryText(res.data.text);
      } else {
        const docRef = doc(db, "stores", "DEMO_STORE_001", "data", "reports_eod-summary");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().text) {
          setEodSummaryText(docSnap.data().text);
        } else {
          setEodSummaryText("EOD Report is still being synced from the store. Please try again later.");
        }
      }
      setShowEodModal(true);
    } catch (err) {
      alert(`Failed to generate report: ${err.message}`);
    }
  };

  const handleDispatchEodReport = async () => {
    setIsSendingEod(true);
    setEodSendResult('');
    try {
      const res = await axios.post(`${API_BASE}/api/reports/eod-summary/send`);
      if (res.data?.success) {
        setEodSendResult('✅ Closing digest successfully dispatched to all 4 store owners on WhatsApp!');
      } else {
        setEodSendResult('⚠️ Dispatched with partial response. Please verify numbers.');
      }
    } catch (err) {
      console.error('Failed to dispatch EOD report:', err);
      setEodSendResult('❌ Failed to dispatch: ' + (err.response?.data?.error || err.message));
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
    smartCoordinate: typeof smartCoordinate !== 'undefined' ? smartCoordinate : undefined,
    setSmartCoordinate: typeof setSmartCoordinate !== 'undefined' ? setSmartCoordinate : undefined,
    showCoordinateModal: typeof showCoordinateModal !== 'undefined' ? showCoordinateModal : undefined,
    setShowCoordinateModal: typeof setShowCoordinateModal !== 'undefined' ? setShowCoordinateModal : undefined,
    vmImages: typeof vmImages !== 'undefined' ? vmImages : undefined,
    setVmImages: typeof setVmImages !== 'undefined' ? setVmImages : undefined,
    vmImageUrls: typeof vmImageUrls !== 'undefined' ? vmImageUrls : undefined,
    setVmImageUrls: typeof setVmImageUrls !== 'undefined' ? setVmImageUrls : undefined,
    vmAuditResult: typeof vmAuditResult !== 'undefined' ? vmAuditResult : undefined,
    setVmAuditResult: typeof setVmAuditResult !== 'undefined' ? setVmAuditResult : undefined,
    isAuditing: typeof isAuditing !== 'undefined' ? isAuditing : undefined,
    setIsAuditing: typeof setIsAuditing !== 'undefined' ? setIsAuditing : undefined,
    vmError: typeof vmError !== 'undefined' ? vmError : undefined,
    setVmError: typeof setVmError !== 'undefined' ? setVmError : undefined,
    bundles: typeof bundles !== 'undefined' ? bundles : undefined,
    setBundles: typeof setBundles !== 'undefined' ? setBundles : undefined,
    isLoadingBundles: typeof isLoadingBundles !== 'undefined' ? isLoadingBundles : undefined,
    setIsLoadingBundles: typeof setIsLoadingBundles !== 'undefined' ? setIsLoadingBundles : undefined,
    publishedBundles: typeof publishedBundles !== 'undefined' ? publishedBundles : undefined,
    setPublishedBundles: typeof setPublishedBundles !== 'undefined' ? setPublishedBundles : undefined,
    handleVmUpload: typeof handleVmUpload !== 'undefined' ? handleVmUpload : undefined,
    fetchTrendForecast: typeof fetchTrendForecast !== 'undefined' ? fetchTrendForecast : undefined,
    handleCompUpload: typeof handleCompUpload !== 'undefined' ? handleCompUpload : undefined,
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
    pnlData: typeof pnlData !== 'undefined' ? pnlData : undefined,
    setPnlData: typeof setPnlData !== 'undefined' ? setPnlData : undefined,
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
    campaignEvent: typeof campaignEvent !== 'undefined' ? campaignEvent : undefined,
    setCampaignEvent: typeof setCampaignEvent !== 'undefined' ? setCampaignEvent : undefined,
    campaignAudience: typeof campaignAudience !== 'undefined' ? campaignAudience : undefined,
    setCampaignAudience: typeof setCampaignAudience !== 'undefined' ? setCampaignAudience : undefined,
    campaignDraft: typeof campaignDraft !== 'undefined' ? campaignDraft : undefined,
    setCampaignDraft: typeof setCampaignDraft !== 'undefined' ? setCampaignDraft : undefined,
    isGeneratingCampaign: typeof isGeneratingCampaign !== 'undefined' ? isGeneratingCampaign : undefined,
    setIsGeneratingCampaign: typeof setIsGeneratingCampaign !== 'undefined' ? setIsGeneratingCampaign : undefined,
    openProductType: typeof openProductType !== 'undefined' ? openProductType : undefined,
    setOpenProductType: typeof setOpenProductType !== 'undefined' ? setOpenProductType : undefined,
    openMonth: typeof openMonth !== 'undefined' ? openMonth : undefined,
    setOpenMonth: typeof setOpenMonth !== 'undefined' ? setOpenMonth : undefined,
    selectedCalendarDay: typeof selectedCalendarDay !== 'undefined' ? selectedCalendarDay : undefined,
    setSelectedCalendarDay: typeof setSelectedCalendarDay !== 'undefined' ? setSelectedCalendarDay : undefined,
    expandedBillId: typeof expandedBillId !== 'undefined' ? expandedBillId : undefined,
    setExpandedBillId: typeof setExpandedBillId !== 'undefined' ? setExpandedBillId : undefined,
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
    handleGenerateCampaign: typeof handleGenerateCampaign !== 'undefined' ? handleGenerateCampaign : undefined,
    handleSaveReconciliation: typeof handleSaveReconciliation !== 'undefined' ? handleSaveReconciliation : undefined,
    handleGenerateEodReport: typeof handleGenerateEodReport !== 'undefined' ? handleGenerateEodReport : undefined,
    handleMasterRestock: typeof handleMasterRestock !== 'undefined' ? handleMasterRestock : undefined,
    formatCurrency: typeof formatCurrency !== 'undefined' ? formatCurrency : undefined,
    MASTER_CATEGORIES: typeof MASTER_CATEGORIES !== 'undefined' ? MASTER_CATEGORIES : undefined,
    classifySubCategory: typeof classifySubCategory !== 'undefined' ? classifySubCategory : undefined,
    handleGlobalSearch: typeof handleGlobalSearch !== 'undefined' ? handleGlobalSearch : undefined,
    renderLogLine: typeof renderLogLine !== 'undefined' ? renderLogLine : undefined,
    persona: typeof persona !== 'undefined' ? persona : undefined,
    handleGenerateSmartCoordinate: typeof handleGenerateSmartCoordinate !== 'undefined' ? handleGenerateSmartCoordinate : undefined,
    trendForecast: typeof trendForecast !== 'undefined' ? trendForecast : undefined,
    isForecasting: typeof isForecasting !== 'undefined' ? isForecasting : undefined,
    compImage: typeof compImage !== 'undefined' ? compImage : undefined,
    compImageUrl: typeof compImageUrl !== 'undefined' ? compImageUrl : undefined,
    compIntelResult: typeof compIntelResult !== 'undefined' ? compIntelResult : undefined,
    isAnalyzingComp: typeof isAnalyzingComp !== 'undefined' ? isAnalyzingComp : undefined,
    compError: typeof compError !== 'undefined' ? compError : undefined
  };

  if (showSetup) {
    return <SetupScreen onComplete={() => setShowSetup(false)} />;
  }

  if (!user) {
    return <LoginScreen onSetup={() => setShowSetup(true)} />;
  }

  return (
    <div className={`flex h-screen bg-slate-100 ${darkMode ? 'dark' : ''} font-sans transition-colors duration-300 ${darkMode ? 'dark-mode bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
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

        /* Premium Custom Dark Mode Overrides */
        html.dark, .dark-mode {
          color-scheme: dark !important;
          background-color: #030712 !important;
          color: #f3f4f6 !important;
        }
        .dark-mode .bg-white {
          background-color: #0b1329 !important;
          color: #f3f4f6 !important;
          border-color: #1e293b !important;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5) !important;
        }
        .dark-mode .bg-slate-50, .dark-mode .bg-gray-50 {
          background-color: #030712 !important;
          color: #e2e8f0 !important;
        }
        .dark-mode .bg-slate-100, .dark-mode .bg-gray-100 {
          background-color: #070d1e !important;
          color: #e2e8f0 !important;
        }
        .dark-mode .bg-slate-200, .dark-mode .bg-gray-200 {
          background-color: #162036 !important;
          color: #e2e8f0 !important;
        }
        .dark-mode .bg-slate-300 {
          background-color: #1e293b !important;
        }
        .dark-mode .bg-slate-50\/50, .dark-mode .bg-slate-100\/50 {
          background-color: rgba(11, 19, 41, 0.5) !important;
        }
        .dark-mode .bg-white\/85, .dark-mode .bg-white\/80, .dark-mode .bg-white\/90 {
          background-color: rgba(7, 13, 30, 0.85) !important;
          border-color: #1e293b !important;
        }
        /* High-Contrast Headings & Text */
        .dark-mode .text-slate-900, .dark-mode .text-slate-950, .dark-mode .text-gray-900, .dark-mode .text-black {
          color: #f8fafc !important;
        }
        .dark-mode .text-slate-800, .dark-mode .text-gray-800 {
          color: #f1f5f9 !important;
        }
        .dark-mode .text-slate-700, .dark-mode .text-gray-700 {
          color: #e2e8f0 !important;
        }
        .dark-mode .text-slate-650, .dark-mode .text-slate-600, .dark-mode .text-gray-600 {
          color: #cbd5e1 !important;
        }
        .dark-mode .text-slate-500, .dark-mode .text-gray-500 {
          color: #94a3b8 !important;
        }
        .dark-mode .text-slate-400, .dark-mode .text-gray-400 {
          color: #64748b !important;
        }
        /* Borders & Dividers */
        .dark-mode .border-slate-100,
        .dark-mode .border-slate-200,
        .dark-mode .border-slate-200\/80,
        .dark-mode .border-slate-300,
        .dark-mode .border-gray-100,
        .dark-mode .border-gray-200 {
          border-color: #1e293b !important;
        }
        .dark-mode .divide-slate-100 > * + *,
        .dark-mode .divide-slate-200 > * + * {
          border-color: #1e293b !important;
        }
        .dark-mode .divide-slate-100,
        .dark-mode .divide-slate-200 {
          border-color: #1e293b !important;
        }
        /* Form Inputs & Selects */
        .dark-mode input, .dark-mode select, .dark-mode textarea {
          background-color: #070d1e !important;
          border-color: #243452 !important;
          color: #f8fafc !important;
        }
        .dark-mode input:focus, .dark-mode select:focus, .dark-mode textarea:focus {
          border-color: #3b82f6 !important;
          background-color: #0b1329 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25) !important;
        }
        .dark-mode select option {
          background-color: #0b1329 !important;
          color: #f8fafc !important;
        }
        .dark-mode input::placeholder, .dark-mode textarea::placeholder {
          color: #64748b !important;
        }
        /* Tables */
        .dark-mode table th {
          background-color: #060b18 !important;
          color: #cbd5e1 !important;
          border-bottom: 1px solid #1e293b !important;
        }
        .dark-mode table tr {
          border-color: #1e293b !important;
        }
        .dark-mode table tr:hover {
          background-color: rgba(30, 41, 59, 0.4) !important;
        }
        .dark-mode table td {
          border-color: #1e293b !important;
        }
        /* Hover States */
        .dark-mode .hover\:bg-slate-50:hover,
        .dark-mode .hover\:bg-slate-100:hover {
          background-color: #162036 !important;
        }
        .dark-mode .hover\:bg-blue-50\/30:hover {
          background-color: rgba(30, 41, 59, 0.3) !important;
        }
        .dark-mode .hover\:bg-white:hover {
          background-color: #1e293b !important;
        }
        /* Badges & Status Pills */
        .dark-mode .bg-blue-50 {
          background-color: rgba(30, 58, 138, 0.4) !important;
          color: #60a5fa !important;
          border-color: rgba(96, 165, 250, 0.25) !important;
        }
        .dark-mode .text-blue-600, .dark-mode .text-blue-700, .dark-mode .text-blue-800, .dark-mode .text-blue-900 {
          color: #60a5fa !important;
        }
        .dark-mode .border-blue-200 {
          border-color: rgba(96, 165, 250, 0.25) !important;
        }
        .dark-mode .bg-green-50, .dark-mode .bg-emerald-50 {
          background-color: rgba(6, 78, 59, 0.45) !important;
          color: #34d399 !important;
          border-color: rgba(52, 211, 153, 0.25) !important;
        }
        .dark-mode .text-green-600, .dark-mode .text-green-700, .dark-mode .text-emerald-600, .dark-mode .text-emerald-700, .dark-mode .text-emerald-800 {
          color: #34d399 !important;
        }
        .dark-mode .border-emerald-200, .dark-mode .border-green-200 {
          border-color: rgba(52, 211, 153, 0.25) !important;
        }
        .dark-mode .bg-red-50, .dark-mode .bg-rose-50 {
          background-color: rgba(127, 29, 29, 0.45) !important;
          color: #f87171 !important;
          border-color: rgba(248, 113, 113, 0.25) !important;
        }
        .dark-mode .text-red-500, .dark-mode .text-red-600, .dark-mode .text-red-700, .dark-mode .text-red-800, .dark-mode .text-red-900,
        .dark-mode .text-rose-500, .dark-mode .text-rose-600, .dark-mode .text-rose-700, .dark-mode .text-rose-800 {
          color: #f87171 !important;
        }
        .dark-mode .border-red-100, .dark-mode .border-red-200, .dark-mode .border-rose-200 {
          border-color: rgba(248, 113, 113, 0.25) !important;
        }
        .dark-mode .bg-red-100, .dark-mode .bg-rose-100 {
          background-color: rgba(239, 68, 68, 0.25) !important;
          color: #f87171 !important;
        }
        .dark-mode .bg-amber-50, .dark-mode .bg-yellow-50 {
          background-color: rgba(120, 53, 4, 0.45) !important;
          color: #fbbf24 !important;
          border-color: rgba(251, 191, 36, 0.25) !important;
        }
        .dark-mode .text-amber-600, .dark-mode .text-amber-700, .dark-mode .text-amber-800, .dark-mode .text-amber-900 {
          color: #fbbf24 !important;
        }
        .dark-mode .border-amber-200 {
          border-color: rgba(251, 191, 36, 0.25) !important;
        }
        .dark-mode .bg-indigo-50 {
          background-color: rgba(49, 46, 129, 0.45) !important;
          color: #818cf8 !important;
          border-color: rgba(129, 140, 248, 0.25) !important;
        }
        .dark-mode .text-indigo-600, .dark-mode .text-indigo-700, .dark-mode .text-indigo-800 {
          color: #a5b4fc !important;
        }
        .dark-mode .border-indigo-200 {
          border-color: rgba(99, 102, 241, 0.3) !important;
        }
        .dark-mode .bg-purple-50 {
          background-color: rgba(88, 28, 135, 0.45) !important;
          color: #c084fc !important;
          border-color: rgba(192, 132, 252, 0.25) !important;
        }
        .dark-mode .text-purple-600, .dark-mode .text-purple-700, .dark-mode .text-purple-800 {
          color: #c084fc !important;
        }
        .dark-mode .border-purple-200 {
          border-color: rgba(192, 132, 252, 0.25) !important;
        }
        /* Modals & Surfaces */
        .dark-mode .bg-slate-50\/80 {
          background-color: rgba(11, 19, 41, 0.8) !important;
        }
        .dark-mode .bg-indigo-950, .dark-mode .bg-indigo-900 {
          background-color: #0b1329 !important;
          border-color: #1e293b !important;
        }
        .dark-mode .from-slate-900, .dark-mode .to-indigo-950 {
          background-image: none !important;
          background-color: #0b1329 !important;
          border-color: #1e293b !important;
        }
        .dark-mode .bg-slate-900 {
          background-color: #070d1e !important;
          border-color: #1e293b !important;
        }
        .dark-mode .bg-slate-950 {
          background-color: #030712 !important;
        }
        .dark-mode .dark-toggle-btn {
          background-color: #162036 !important;
          border-color: #243452 !important;
          color: #fbbf24 !important;
        }
        .dark-mode .dark-toggle-btn:hover {
          background-color: #1e293b !important;
        }
        .dark-mode .status-badge {
          background-color: #070d1e !important;
          border-color: #1e293b !important;
          color: #e2e8f0 !important;
        }
      `}</style>

      
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
        isGatewayRunning={isGatewayRunning}
        isListenerRunning={isListenerRunning}
      >
        {/* Dynamic Views */}


          {/* Dynamic Views */}
          <div>

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

            {/* NIGHT CLOSING DENOMINATION */}
            {activeTab === 'denomination' && (
              <DenominationTab {...appState} />
            )}

            {/* NO-APP CUSTOMER LOYALTY */}
            {activeTab === 'loyalty' && (
              <LoyaltyTab {...appState} />
            )}

            {/* 6. AI CAMPAIGN BUILDER */}
            {['campaigns', 'vm_auditor', 'smart_bundles'].includes(activeTab) && (
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
            {['customerinsights', 'vip', 'dormant', 'trend_forecast', 'competitor_intel'].includes(activeTab) && (
              <CustomerInsightsTab {...appState} />
            )}

            {/* 10. POCKET KHATA (COUNTER PETTY CASH & EXPENSE JOURNAL) */}
            {activeTab === 'pocket_khata' && (
              <PocketKhataTab {...appState} />
            )}

            {/* 11. LUXURY SHELF TALKER & RACK SIGNAGE STUDIO */}
            {activeTab === 'shelf_talkers' && (
              <ShelfTalkerStudioTab {...appState} />
            )}

            {/* 12. HOLD & RESERVE DESK */}
            {activeTab === 'hold_desk' && (
              <HoldDeskTab darkMode={darkMode} />
            )}

            {/* 13. MULTI-STORE SAVE-THE-SALE NETWORK */}
            {activeTab === 'save_the_sale' && (
              <SaveTheSaleTab darkMode={darkMode} />
            )}

            {/* 14. COBB LOUNGE RADIO & FLOOR ANNOUNCEMENTS */}
            {activeTab === 'lounge_radio' && (
              <LoungeRadioTab darkMode={darkMode} />
            )}

            {/* 15. COBB RETAIL AI COPILOT / CHATBOT */}
            {activeTab === 'copilot' && (
              <ChatbotTab API_BASE={API_BASE} darkMode={darkMode} />
            )}



        <CustomerProfileModal {...appState} />

        {/* EOD CASH RECONCILIATION MODAL WITH POCKET KHATA INTEGRATION */}
        {showReconModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className={`rounded-2xl p-6 w-full max-w-md shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className={`text-xl font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Calculator className="w-6 h-6 text-emerald-500"/> Cash Reconciliation
                </h3>
                <button onClick={() => setShowReconModal(false)} className={`p-1.5 rounded-lg ${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
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
                    <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">System Cash Sales:</span>
                        <span className="font-bold font-mono text-slate-200">{formatCurrency(systemCashSales)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-amber-400 flex items-center gap-1">☕ Less: Pocket Khata Spent:</span>
                        <span className="font-bold font-mono text-rose-400">- {formatCurrency(pettyCashSpent)}</span>
                      </div>
                      <div className={`pt-2 border-t flex justify-between items-center text-sm font-black ${darkMode ? 'border-slate-800 text-emerald-400' : 'border-slate-200 text-emerald-600'}`}>
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
                          darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
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
                          darkMode ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                        }`}
                      />
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={() => setShowReconModal(false)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-amber-500" />
                    Store Closing Digest (EOD)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automated nightly store intelligence report dispatched at <strong>9:30 PM</strong>.
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1">
                  ⏰ Auto 9:30 PM
                </span>
              </div>

              {/* Recipient list card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Configured Owner Recipients (4 Numbers)
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600">Active</span>
                </div>
                <div className="flex flex-wrap gap-1.5 font-mono text-xs font-bold text-slate-700">
                  <span className="px-2 py-0.5 bg-white rounded border border-slate-200">9138122820</span>
                  <span className="px-2 py-0.5 bg-white rounded border border-slate-200">8708788707</span>
                  <span className="px-2 py-0.5 bg-white rounded border border-slate-200">9034522000</span>
                  <span className="px-2 py-0.5 bg-white rounded border border-slate-200">9466422821</span>
                </div>
              </div>

              {/* Live Preview textarea */}
              <textarea 
                value={eodSummaryText} 
                readOnly 
                className="w-full h-64 p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl focus:outline-none custom-scrollbar leading-relaxed border border-slate-800" 
              />

              {eodSendResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  eodSendResult.startsWith('✅') 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {eodSendResult}
                </div>
              )}
              
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button 
                  onClick={() => { setShowEodModal(false); setEodSendResult(''); }} 
                  className="px-4 py-2.5 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { 
                      navigator.clipboard.writeText(eodSummaryText); 
                      setEodCopied(true); 
                      setTimeout(() => setEodCopied(false), 2000); 
                    }} 
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
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
                    <span>{isSendingEod ? 'Dispatching...' : 'Send to 4 Owners Now'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

                {/* BOTTOM NAVIGATION BAR (MOBILE ONLY) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around pb-safe-bottom z-40 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center justify-center w-full py-2 cursor-pointer ${activeTab === 'dashboard' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-wider">HOME</span>
          </button>
          <button onClick={() => { setActiveTab('live'); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center justify-center w-full py-2 cursor-pointer ${activeTab === 'live' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
            <Receipt className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-wider">LIVE</span>
          </button>

          {/* CENTER ELEVATED AI COPILOT BUTTON */}
          <button onClick={() => { setActiveTab('copilot'); setIsMobileMenuOpen(false); }}
            className="flex flex-col items-center justify-center w-full -mt-4 py-0.5 relative group cursor-pointer">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
              activeTab === 'copilot'
                ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-indigo-500/40 ring-4 ring-blue-500/20'
                : 'bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-800 dark:via-indigo-900 dark:to-slate-800 text-white shadow-slate-900/30 border border-indigo-400/30'
            }`}>
              <Sparkles className="w-5 h-5 animate-pulse text-indigo-200" />
            </div>
            <span className={`text-[9px] font-black tracking-wider mt-0.5 ${activeTab === 'copilot' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
              COPILOT
            </span>
          </button>

          <button onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center justify-center w-full py-2 cursor-pointer ${activeTab === 'inventory' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
            <Package className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold tracking-wider">STOCK</span>
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center justify-center w-full py-2 cursor-pointer ${isMobileMenuOpen ? 'text-blue-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
            {isMobileMenuOpen ? <X className="w-5 h-5 mb-0.5" /> : <Menu className="w-5 h-5 mb-0.5" />}
            <span className="text-[9px] font-bold tracking-wider">MORE</span>
          </button>
        </div>

        </div>
      </Layout>
    </div>
  );
}
