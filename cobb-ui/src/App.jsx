import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
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
  Scan
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [vips, setVips] = useState([]);
  const [dormant, setDormant] = useState([]);
  
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  
  const [overviewStats, setOverviewStats] = useState({ 
    today: { TotalSales: 0, BillCount: 0 }, 
    yesterday: { TotalSales: 0, BillCount: 0 } 
  });
  
  const [liveBills, setLiveBills] = useState([]);
  const [toasts, setToasts] = useState([]);
  const prevLiveBillsRef = useRef([]);
  const [inventory, setInventory] = useState([]);
  const [deadStock, setDeadStock] = useState([]);
  const [hourlySales, setHourlySales] = useState([]);
  const [monthlyProducts, setMonthlyProducts] = useState([]);
  const [gstSummary, setGstSummary] = useState({ today: { TaxCollected: 0, TaxableSales: 0, GrossSales: 0 }, monthly: { TaxCollected: 0, TaxableSales: 0, GrossSales: 0 }, history: [] });
  const [gstRateSlab, setGstRateSlab] = useState(5);
  const [gstCopied, setGstCopied] = useState(false);
  const [sizeMatrix, setSizeMatrix] = useState([]);
  const [wardrobeProfiles, setWardrobeProfiles] = useState([]);
  const [pnlData, setPnlData] = useState(null);
  const [retentionData, setRetentionData] = useState(null);
  const [reconData, setReconData] = useState(null);
  const [countedCashInput, setCountedCashInput] = useState('');
  const [reconNotes, setReconNotes] = useState('');
  const [showReconModal, setShowReconModal] = useState(false);
  const [showEodModal, setShowEodModal] = useState(false);
  const [eodSummaryText, setEodSummaryText] = useState('');
  const [eodCopied, setEodCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState('ALL');
  
  const [isListenerRunning, setIsListenerRunning] = useState(false);
  const [isTogglingListener, setIsTogglingListener] = useState(false);
  const [listenerLogs, setListenerLogs] = useState([]);
  const [isGatewayRunning, setIsGatewayRunning] = useState(false);
  const [isTogglingGateway, setIsTogglingGateway] = useState(false);
  const [isGatewayReady, setIsGatewayReady] = useState(false);
  const [gatewayQr, setGatewayQr] = useState(null);
  const [gatewayLogs, setGatewayLogs] = useState([]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeConsole, setActiveConsole] = useState('listener');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [customerPersona, setCustomerPersona] = useState('');
  const [loadingPersona, setLoadingPersona] = useState(false);
  const [aiMessageType, setAiMessageType] = useState('cross-sell');
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeOutfitMatch, setActiveOutfitMatch] = useState(null);
  const [outfitPitch, setOutfitPitch] = useState('');
  const [isGeneratingOutfit, setIsGeneratingOutfit] = useState(false);
  const [campaignEvent, setCampaignEvent] = useState('Autumn Collection Drop');
  const [campaignAudience, setCampaignAudience] = useState('All VIP Customers');
  const [campaignDraft, setCampaignDraft] = useState('');
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);

  const defaultTips = [
    { tag: "Trend Forecast", tip: "Position structured formal shirts and chinos near the entrance to capture corporate & weekend rush traffic." },
    { tag: "Cross-Sell Playbook", tip: "Train floor staff to pair new arrivals with classic blue denim or premium accessories for higher cart value." },
    { tag: "Inventory Strategy", tip: "Prioritize showcasing 60+ day stagnant items on central mannequins styled with bestselling basics." },
    { tag: "Size Optimization", tip: "Ensure core sizes (38, 40 shirts & 32, 34 denims) are replenished on shelves before evening store rush." }
  ];

  const [forecastTips, setForecastTips] = useState(defaultTips);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [openProductType, setOpenProductType] = useState(null);
  const [openMonth, setOpenMonth] = useState(null);

  const DAILY_TARGET = 50000; 

  const trendingCatalog = [
    {
      id: 'T1',
      name: 'COBB SOLID PEACH SMART-FIT FORMAL SHIRT',
      group: 'Upperwear',
      trend: '💼 Corporate Pick',
      stock: 0,
      imageUrl: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?auto=format&fit=crop&q=80&w=400&h=500',
      pitch: 'Self-design pastels are essential for the ongoing return-to-office wave.'
    },
    {
      id: 'T2',
      name: 'COBB NAVY BLUE COLOR-BLOCK POLO',
      group: 'Upperwear',
      trend: '📈 High Demand',
      stock: 1,
      imageUrl: 'https://images.unsplash.com/photo-1586363104862-3a5e222ee260?auto=format&fit=crop&q=80&w=400&h=500',
      pitch: 'The textured and color-block polo shift trend is accelerating rapidly.'
    },
    {
      id: 'T3',
      name: 'COBB WHITE SKY CHECKED SMART-FIT SHIRT',
      group: 'Upperwear',
      trend: '⭐ Essential',
      stock: 0,
      imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=400&h=500',
      pitch: 'Classic checks are the highest moving item for Friday casual office wear.'
    },
    {
      id: 'T4',
      name: 'COBB AUTUMN LIGHTWEIGHT SHACKET',
      group: 'Upperwear',
      trend: '🍂 Seasonal',
      stock: 0,
      imageUrl: 'https://images.unsplash.com/photo-1559551409-dadc959f76b8?auto=format&fit=crop&q=80&w=400&h=500',
      pitch: 'Lightweight layering is the #1 transition item for the approaching autumn.'
    },
    {
      id: 'T5',
      name: 'COBB SIX-POCKET OLIVE CARGO LOWER',
      group: 'Bottomwear',
      trend: '🔥 #1 All India Trend',
      stock: 0,
      imageUrl: 'https://images.unsplash.com/photo-1517438476312-10d79c077509?auto=format&fit=crop&q=80&w=400&h=500',
      pitch: 'Utility cargos are highly searched right now in earthy tones.'
    },
    {
      id: 'T6',
      name: 'COBB BOOT-CUT ICE BLUE JEANS',
      group: 'Bottomwear',
      trend: '👖 Vintage Revival',
      stock: 0,
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=400&h=500',
      pitch: 'Skinny is out. Boot-cut and straight-fit premium denim are taking over.'
    },
    {
      id: 'T7',
      name: 'COBB ULTRA-FIT KHAKI CHINOS',
      group: 'Bottomwear',
      trend: '📈 High Demand',
      stock: 2,
      imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b1c7c4b?auto=format&fit=crop&q=80&w=400&h=500',
      pitch: 'Earthy tones like Khaki and Olive are dominating formal-casual wear.'
    },
    {
      id: 'T8',
      name: 'COBB STRAIGHT-FIT DARK WASH DENIM',
      group: 'Bottomwear',
      trend: '⭐ Core Basic',
      stock: 0,
      imageUrl: 'https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&q=80&w=400&h=500',
      pitch: 'The absolute core essential for the upcoming festive/winter season.'
    }
  ];

  useEffect(() => {
    axios.get(`${API_BASE}/api/customers/vip`).then(res => setVips(res.data)).catch(console.error);
    axios.get(`${API_BASE}/api/customers/dormant`).then(res => setDormant(res.data)).catch(console.error);
    axios.get(`${API_BASE}/api/sales/overview`).then(res => setOverviewStats(res.data)).catch(console.error);
    axios.get(`${API_BASE}/api/sales/live`).then(res => setLiveBills(res.data)).catch(console.error);
    axios.get(`${API_BASE}/api/inventory`).then(res => setInventory(res.data)).catch(console.error);
    axios.get(`${API_BASE}/api/inventory/dead-stock`).then(res => setDeadStock(res.data)).catch(console.error);
    axios.get(`${API_BASE}/api/analytics/hourly`).then(res => setHourlySales(res.data)).catch(console.error);
    axios.get(`${API_BASE}/api/analytics/monthly-products`).then(res => setMonthlyProducts(res.data)).catch(console.error);
    axios.get(`${API_BASE}/api/financials/gst-summary`).then(res => setGstSummary(res.data)).catch(console.error);
    axios.get(`${API_BASE}/api/inventory/size-matrix`).then(res => setSizeMatrix(res.data)).catch(console.error);
    axios.get(`${API_BASE}/api/reconciliation/latest`).then(res => setReconData(res.data)).catch(console.error);
  }, []);

  // Hardware Barcode Scanner Listener (HID Emulation)
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

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

      // 3. Fetch live transactions & dashboard metrics for real-time dynamic updates
      axios.get(`${API_BASE}/api/sales/overview`)
        .then(res => setOverviewStats(res.data))
        .catch(console.error);

      axios.get(`${API_BASE}/api/sales/live`)
        .then(res => {
          const oldBills = prevLiveBillsRef.current;
          const newBills = res.data;

          if (oldBills.length > 0 && newBills.length > 0) {
            // Find bills in newBills that weren't in oldBills
            const oldBillNumbers = new Set(oldBills.map(b => b.BillNumber.trim()));
            newBills.forEach(bill => {
              if (!oldBillNumbers.has(bill.BillNumber.trim())) {
                // Trigger enriched toast with progress timer!
                const toastId = Date.now() + Math.random();
                const durationMs = 5000;
                const newToast = {
                  id: toastId,
                  title: "⚡ Live POS Checkout Alert",
                  billNumber: bill.BillNumber?.trim(),
                  customer: bill.CustomerName?.trim() || bill.FirstName?.trim() || 'Guest Customer',
                  paymentMode: bill.PaymentMode || 'Cash',
                  amount: bill.Amount || 0,
                  duration: durationMs
                };
                setToasts(prev => [newToast, ...prev].slice(0, 3));
                // Auto dismiss toast after duration
                setTimeout(() => {
                  setToasts(prev => prev.filter(t => t.id !== toastId));
                }, durationMs);
              }
            });
          }

          prevLiveBillsRef.current = newBills;
          setLiveBills(newBills);
        })
        .catch(console.error);

      axios.get(`${API_BASE}/api/analytics/hourly`)
        .then(res => setHourlySales(res.data))
        .catch(console.error);

      axios.get(`${API_BASE}/api/analytics/wardrobe-profiles`)
        .then(res => setWardrobeProfiles(res.data))
        .catch(console.error);

      axios.get(`${API_BASE}/api/financials/pnl`)
        .then(res => setPnlData(res.data))
        .catch(console.error);

      axios.get(`${API_BASE}/api/analytics/retention-radar`)
        .then(res => setRetentionData(res.data))
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
    const interval = setInterval(fetchAutomationStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleNextTip = () => setCurrentTipIndex((prev) => (prev + 1) % forecastTips.length);
  const handlePrevTip = () => setCurrentTipIndex((prev) => (prev - 1 + forecastTips.length) % forecastTips.length);

  const handleRefreshForecastTips = async () => {
    setIsLoadingForecast(true);
    try {
      const lowStockCount = inventory.filter(i => i.CurrentStock <= 3).length;
      const res = await axios.post(`${API_BASE}/api/ai/demand-forecasts`, {
        todaySales: overviewStats.today.TotalSales,
        yesterdaySales: overviewStats.yesterday.TotalSales,
        deadStockCount: deadStock.length,
        lowStockCount: lowStockCount
      });
      if (res.data.tips && Array.isArray(res.data.tips) && res.data.tips.length > 0) {
        setForecastTips(res.data.tips);
        setCurrentTipIndex(0);
      }
    } catch (err) {
      console.error("Forecast Refresh Error:", err);
      alert(`AI Forecast Refresh Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsLoadingForecast(false);
    }
  };

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
      const res = await axios.get(`${API_BASE}/api/reports/eod-summary`);
      setEodSummaryText(res.data.text);
      setShowEodModal(true);
    } catch (err) {
      alert(`Failed to generate report: ${err.message}`);
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

    let message = `Hello Supplier, please process the following stock replenishment for *Cobb Pundri*:\n\n`;
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

  const navigationItems = [
    { category: "Overview & P&L", items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "pnl", label: "Store P&L Statement", icon: DollarSign, colorClass: "text-green-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-green-500/15 text-green-400 font-bold border-l-2 border-green-500" },
      { id: "gst", label: "GST & Tax Summary", icon: FileText, colorClass: "text-emerald-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-500" },
      { id: "analytics", label: "Visual Rush Chart", icon: Clock },
      { id: "monthly", label: "Monthly Products", icon: Calendar },
    ]},
    { category: "Operations", items: [
      { id: "live", label: "Live Checkouts", icon: Receipt },
      { id: "inventory", label: "Live Inventory", icon: Package },
      { id: "sizematrix", label: "Size Matrix Heatmap", icon: Grid, colorClass: "text-blue-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-blue-500/15 text-blue-400 font-bold border-l-2 border-blue-500" },
      { id: "deadstock", label: "Dead Stock", icon: Archive },
      { id: "trending", label: "Trending Catalog", icon: Star, colorClass: "text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-400 font-bold border-l-2 border-amber-500" },
    ]},
    { category: "Marketing & CRM", items: [
      { id: "wardrobe", label: "Wardrobe Profiler", icon: Shirt, colorClass: "text-purple-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-purple-500/15 text-purple-400 font-bold border-l-2 border-purple-500" },
      { id: "retention", label: "Retention Radar", icon: Activity, colorClass: "text-rose-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-rose-500/15 text-rose-400 font-bold border-l-2 border-rose-500" },
      { id: "campaigns", label: "AI Campaigns", icon: Megaphone, colorClass: "text-indigo-400 hover:bg-slate-900 hover:text-indigo-300", activeColorClass: "bg-indigo-500/15 text-indigo-400 font-bold border-l-2 border-indigo-500" },
      { id: "vip", label: "VIP Profiles", icon: Users },
      { id: "dormant", label: "Dormant Clients", icon: AlertCircle },
    ]},
    { category: "System", items: [
      { id: "automation", label: "Automation Engine", icon: Terminal },
    ]}
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

  const groupedByMonth = monthlyProducts.reduce((acc, curr) => {
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

  const totalMonthlyUnits = monthlyProducts.reduce((acc, curr) => acc + (curr.TotalUnitsSold || 0), 0);
  const totalMonthlyRevenue = monthlyProducts.reduce((acc, curr) => acc + (curr.TotalRevenue || 0), 0);
  const maxHourlyRevenue = Math.max(...hourlySales.map(h => h.TotalRevenue), 1);
  const averageOrderValue = overviewStats.today.BillCount > 0 ? (overviewStats.today.TotalSales / overviewStats.today.BillCount) : 0;
  const targetProgress = Math.min((overviewStats.today.TotalSales / DAILY_TARGET) * 100, 100);

  const handleGlobalSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      const query = searchQuery.trim();
      if (/^[6-9]\d{9}$/.test(query)) {
        setActiveTab('vip');
      } else {
        setActiveTab('inventory');
      }
      setToasts(prev => [
        ...prev, 
        { id: Date.now(), title: 'STOCK SCAN / SEARCH 📷', message: `Filtering inventory for: ${query}` }
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

  return (
    <div className={`flex h-screen font-sans transition-colors duration-300 ${darkMode ? 'dark-mode bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
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
        .dark-mode {
          background-color: #030712 !important;
          color: #f3f4f6 !important;
        }
        .dark-mode .bg-white {
          background-color: #0f172a !important;
          color: #f3f4f6 !important;
          border-color: #1e293b !important;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.4) !important;
        }
        .dark-mode .bg-slate-50 {
          background-color: #030712 !important;
          color: #e2e8f0 !important;
        }
        .dark-mode .bg-slate-100 {
          background-color: #030712 !important;
        }
        .dark-mode .bg-slate-50\/50 {
          background-color: rgba(15, 23, 42, 0.4) !important;
        }
        .dark-mode .bg-white\/85, .dark-mode .bg-white\/80 {
          background-color: rgba(3, 7, 18, 0.8) !important;
          border-color: #1e293b !important;
        }
        .dark-mode .text-slate-800 {
          color: #f9fafb !important;
        }
        .dark-mode .text-slate-700 {
          color: #e5e7eb !important;
        }
        .dark-mode .text-slate-650, .dark-mode .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
        .dark-mode .text-slate-400 {
          color: #64748b !important;
        }
        .dark-mode .border-slate-200 {
          border-color: #1e293b !important;
        }
        .dark-mode .border-slate-100 {
          border-color: #0f172a !important;
        }
        .dark-mode .divide-slate-100 > * + * {
          border-color: #1e293b !important;
        }
        .dark-mode .divide-slate-100 {
          border-color: #1e293b !important;
        }
        .dark-mode input, .dark-mode select, .dark-mode textarea {
          background-color: #0f172a !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }
        .dark-mode input:focus, .dark-mode select:focus, .dark-mode textarea:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25) !important;
        }
        .dark-mode input::placeholder {
          color: #475569 !important;
        }
        .dark-mode table th {
          background-color: #090d16 !important;
          color: #cbd5e1 !important;
          border-bottom: 1px solid #1e293b !important;
        }
        .dark-mode table tr {
          border-color: #1e293b !important;
        }
        .dark-mode table tr:hover {
          background-color: rgba(30, 41, 59, 0.4) !important;
        }
        .dark-mode .hover\/bg-slate-50:hover {
          background-color: #1e293b !important;
        }
        .dark-mode .hover\/bg-blue-50\/30:hover {
          background-color: rgba(30, 41, 59, 0.2) !important;
        }
        .dark-mode .bg-blue-50 {
          background-color: rgba(30, 41, 59, 0.6) !important;
          color: #60a5fa !important;
          border-color: rgba(96, 165, 250, 0.2) !important;
        }
        .dark-mode .text-blue-600 {
          color: #60a5fa !important;
        }
        .dark-mode .text-blue-800 {
          color: #93c5fd !important;
        }
        .dark-mode .bg-green-50 {
          background-color: rgba(6, 78, 59, 0.4) !important;
          color: #34d399 !important;
          border-color: rgba(52, 211, 153, 0.2) !important;
        }
        .dark-mode .text-green-600 {
          color: #34d399 !important;
        }
        .dark-mode .bg-red-50 {
          background-color: rgba(127, 29, 29, 0.4) !important;
          color: #f87171 !important;
          border-color: rgba(248, 113, 113, 0.2) !important;
        }
        .dark-mode .text-red-500 {
          color: #f87171 !important;
        }
        .dark-mode .text-red-900 {
          color: #fca5a5 !important;
        }
        .dark-mode .bg-red-50\/50 {
          background-color: rgba(239, 68, 68, 0.03) !important;
        }
        .dark-mode .border-red-100 {
          border-color: rgba(239, 68, 68, 0.15) !important;
        }
        .dark-mode .bg-red-100 {
          background-color: rgba(239, 68, 68, 0.2) !important;
          color: #f87171 !important;
        }
        .dark-mode .bg-amber-50 {
          background-color: rgba(120, 53, 4, 0.4) !important;
          color: #fbbf24 !important;
          border-color: rgba(251, 191, 36, 0.2) !important;
        }
        .dark-mode .text-amber-600 {
          color: #fbbf24 !important;
        }
        .dark-mode .text-amber-700 {
          color: #fde047 !important;
        }
        .dark-mode .bg-indigo-50 {
          background-color: rgba(49, 46, 129, 0.4) !important;
          color: #818cf8 !important;
          border-color: rgba(129, 140, 248, 0.2) !important;
        }
        .dark-mode .text-indigo-600 {
          color: #818cf8 !important;
        }
        .dark-mode .hover\:bg-indigo-50:hover {
          background-color: rgba(99, 102, 241, 0.15) !important;
        }
        .dark-mode .border-indigo-200 {
          border-color: rgba(99, 102, 241, 0.3) !important;
        }
        .dark-mode .bg-slate-50\/80 {
          background-color: rgba(15, 23, 42, 0.8) !important;
        }
        .dark-mode .bg-indigo-100 {
          background-color: rgba(99, 102, 241, 0.15) !important;
          color: #a5b4fc !important;
          border-color: rgba(165, 180, 252, 0.2) !important;
        }
        .dark-mode .text-indigo-700 {
          color: #c7d2fe !important;
        }
        .dark-mode .bg-indigo-950, .dark-mode .bg-indigo-900 {
          background-color: #0f172a !important;
          border-color: #1e293b !important;
        }
        .dark-mode .from-slate-900, .dark-mode .to-indigo-950 {
          background-image: none !important;
          background-color: #0f172a !important;
          border-color: #1e293b !important;
        }
        .dark-mode .bg-slate-900 {
          background-color: #090d16 !important;
          border-color: #1e293b !important;
        }
        .dark-mode .bg-slate-950 {
          background-color: #020617 !important;
        }
        .dark-mode .bg-slate-200 {
          background-color: #1e293b !important;
        }
        .dark-mode .bg-gradient-to-t.from-blue-600 {
          background-image: linear-gradient(to top, #2563eb, #60a5fa) !important;
        }
        .dark-mode .bg-white.w-full.max-w-xl {
          background-color: #090d16 !important;
          border-left: 1px solid #1e293b !important;
        }
        .dark-mode .bg-slate-50.p-8,
        .dark-mode .bg-slate-50.p-6,
        .dark-mode .bg-slate-50.border-b {
          background-color: #0f172a !important;
          border-color: #1e293b !important;
        }
        .dark-mode .dark-toggle-btn {
          background-color: #0f172a !important;
          border-color: #1e293b !important;
          color: #fbbf24 !important;
        }
        .dark-mode .dark-toggle-btn:hover {
          background-color: #1e293b !important;
        }
        .dark-mode .status-badge {
          background-color: #0f172a !important;
          border-color: #1e293b !important;
          color: #e2e8f0 !important;
        }
        .dark-mode .from-indigo-900 {
          background-image: none !important;
          background-color: #0f172a !important;
          border-color: #1e293b !important;
        }
      `}</style>
      
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-950 text-slate-300 flex flex-col shadow-xl z-40 border-r border-slate-800 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <h1 className="text-xl font-bold tracking-wider text-white">COBB ITALY</h1>
            </div>
            <p className="text-slate-500 text-xs font-medium ml-11">Smart CRM System</p>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-3 space-y-4 mt-6 overflow-y-auto custom-scrollbar">
          {navigationItems.map((cat, catIdx) => (
            <div key={catIdx} className="space-y-1">
              <p className="px-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">{cat.category}</p>
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                const normalColor = item.colorClass || "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200";
                const activeColor = item.activeColorClass || "bg-blue-600/15 text-blue-400 font-semibold border-l-2 border-blue-500";

                return (
                  <button 
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSearchQuery(''); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer relative group text-xs ${isActive ? activeColor : normalColor}`}
                  >
                    <Icon className={`w-4 h-4 mr-3 transition-colors ${isActive ? "" : "opacity-60 group-hover:opacity-100"}`} /> 
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <div className="pb-8"></div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto relative bg-slate-50 min-w-0">
        
        {/* Top Navbar */}
        <div className="bg-white/80 backdrop-blur-md px-4 lg:px-8 py-3.5 border-b border-slate-200 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center sticky top-0 z-20">
          <div className="flex items-center gap-3 w-full md:max-w-lg">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-200 transition-all cursor-pointer shrink-0"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text" 
                placeholder="Scan Tag or Search Article / Phone..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleGlobalSearch}
                className="w-full pl-9 pr-28 py-2 bg-slate-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
              />
              <div className="absolute right-2 top-1.5 hidden sm:flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-xs pointer-events-none">
                <Barcode className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Scanner Ready</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-2 overflow-x-auto pb-1 md:pb-0">
             {/* EOD Cash Reconciliation Button */}
             <button 
               onClick={() => setShowReconModal(true)}
               className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1 shrink-0"
               title="EOD Cash Register Reconciliation"
             >
               <Calculator className="w-3.5 h-3.5" />
               <span>EOD Cash</span>
             </button>

             {/* EOD WhatsApp Report Button */}
             <button 
               onClick={handleGenerateEodReport}
               className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1 shrink-0"
               title="Generate Daily EOD Report for Owner"
             >
               <Send className="w-3.5 h-3.5" />
               <span>EOD Report</span>
             </button>

             {/* Dark Mode Toggle Button */}
             <button 
               onClick={() => setDarkMode(!darkMode)}
               className="dark-toggle-btn p-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-650 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center shrink-0"
               title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
             >
               {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
             </button>

             {/* Systems status badge */}
             <div className="status-badge flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm cursor-help shrink-0" title="Automation Engine Status">
               <div className="relative flex h-2 w-2">
                  {(isGatewayRunning && isListenerRunning) && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isGatewayRunning && isListenerRunning ? 'bg-green-500' : 'bg-red-500'}`}></span>
               </div>
               <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                 {isGatewayRunning && isListenerRunning ? 'Active' : 'Offline'}
               </span>
             </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          
          {/* Dynamic Views */}
          <div>
            
            {/* 1. COMMAND CENTER */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Store Command Center</h2>
                    <p className="text-sm text-slate-500 mt-1">Live operational metrics and AI insights for Cobb Pundri.</p>
                  </div>
                </div>

                {/* Top Row Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* Revenue Card */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-2">{formatCurrency(overviewStats.today.TotalSales)}</h3>
                      </div>
                      <div className="p-3 bg-green-50 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <div className="mt-4 flex items-center text-sm mb-3">
                        <span className={`font-bold ${overviewStats.today.TotalSales >= overviewStats.yesterday.TotalSales ? 'text-green-600' : 'text-amber-600'}`}>
                          {overviewStats.yesterday.TotalSales === 0 ? '+100%' : `${(((overviewStats.today.TotalSales - overviewStats.yesterday.TotalSales) / overviewStats.yesterday.TotalSales) * 100).toFixed(1)}%`}
                        </span>
                        <span className="text-slate-400 ml-2">vs yesterday</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold tracking-wide uppercase">
                        <span className={`px-2.5 py-1 rounded-md border ${darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          Cash: {formatCurrency(overviewStats.today.CashAmount || 0)}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md border ${darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-800/50' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          Card: {formatCurrency(overviewStats.today.CardAmount || 0)}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md border ${darkMode ? 'bg-purple-900/30 text-purple-400 border-purple-800/50' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                          UPI: {formatCurrency(overviewStats.today.UPIAmount || 0)}
                        </span>
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
                      <p className="text-xs text-slate-400 mt-2 text-right">{formatCurrency(DAILY_TARGET - overviewStats.today.TotalSales)} remaining</p>
                    </div>
                  </div>

                  {/* Average Order Value */}
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
                    <div className="mt-4 text-sm text-slate-500">
                      Across <span className="font-bold text-slate-700">{overviewStats.today.BillCount}</span> total invoices today.
                    </div>
                  </div>

                  {/* AI Demand Forecaster Slider Card */}
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl border border-indigo-800 shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                      <Sparkles className="w-20 h-20" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-indigo-300" />
                          <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                            AI Daily Brief
                          </span>
                        </div>
                        <button
                          onClick={handleRefreshForecastTips}
                          disabled={isLoadingForecast}
                          title="Generate Fresh AI Tips"
                          className="p-1 rounded-md hover:bg-slate-800 text-indigo-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingForecast ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {/* Tag Pill */}
                      <div className="mt-2.5">
                        <span className="inline-block bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {forecastTips[currentTipIndex]?.tag || "Store Insight"}
                        </span>
                      </div>

                      {/* Sliding Tip Content */}
                      <div className="min-h-[64px] flex items-center mt-2">
                        <p className="text-xs font-medium leading-relaxed text-indigo-50">
                          "{forecastTips[currentTipIndex]?.tip || "Checking latest store metrics..."}"
                        </p>
                      </div>
                    </div>

                    {/* Slider Navigation & Dots */}
                    <div className="mt-3 pt-3 border-t border-indigo-800/60 flex items-center justify-between relative z-10">
                      <div className="flex gap-1">
                        {forecastTips.map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            onClick={() => setCurrentTipIndex(dotIdx)}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${dotIdx === currentTipIndex ? 'w-4 bg-indigo-300' : 'w-1.5 bg-indigo-800 hover:bg-indigo-600'}`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={handlePrevTip}
                          className="p-1 rounded hover:bg-indigo-800/60 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono text-indigo-300 font-bold px-1">
                          {currentTipIndex + 1}/{forecastTips.length}
                        </span>
                        <button 
                          onClick={handleNextTip}
                          className="p-1 rounded hover:bg-indigo-800/60 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* BENTO GRID: Middle Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column (Spans 2) */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    {/* Visual Sales Trend */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex-1">
                      <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-slate-800 flex items-center">
                           <BarChart3 className="w-4 h-4 mr-2 text-blue-500" /> Hourly Footfall Velocity
                         </h3>
                         <button onClick={() => setActiveTab('analytics')} className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer">View Full &rarr;</button>
                      </div>
                      <div className="h-40 flex items-end justify-between gap-2">
                        {hourlySales.map((h, i) => {
                          const heightPercent = Math.max((h.TotalRevenue / maxHourlyRevenue) * 100, 10);
                          const isPeak = h.TotalRevenue === maxHourlyRevenue && maxHourlyRevenue > 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                                {formatCurrency(h.TotalRevenue)}
                              </div>
                              <div 
                                style={{ height: `${heightPercent}%` }} 
                                className={`w-full max-w-[36px] rounded-t-md transition-all duration-500 ${isPeak ? 'bg-blue-500' : 'bg-slate-200 group-hover:bg-blue-300'}`}
                              />
                              <span className="text-[10px] text-slate-400 mt-2 font-medium">{h.SaleHour}:00</span>
                            </div>
                          );
                        })}
                        {hourlySales.length === 0 && <div className="w-full text-center text-sm text-slate-400 mb-8">Waiting for checkout data...</div>}
                      </div>
                    </div>

                    {/* Quick Action Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <button onClick={() => setActiveTab('inventory')} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
                        <div className="bg-amber-50 p-3 rounded-full text-amber-600 group-hover:scale-110 transition-transform"><Package className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-slate-700">Auto Restock</span>
                      </button>
                      <button onClick={() => setActiveTab('campaigns')} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
                        <div className="bg-indigo-50 p-3 rounded-full text-indigo-600 group-hover:scale-110 transition-transform"><Megaphone className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-slate-700">AI Broadcast</span>
                      </button>
                      <button onClick={() => setActiveTab('deadstock')} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group text-center cursor-pointer">
                        <div className="bg-red-50 p-3 rounded-full text-red-600 group-hover:scale-110 transition-transform"><Archive className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-slate-700">Clear Dead Stock</span>
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
                           {( (!isGatewayRunning ? 1 : 0) + (!isListenerRunning ? 1 : 0) + (deadStock.length > 0 ? 1 : 0) )} Alerts
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
                            <span className="text-slate-700 font-medium"><span className="font-bold text-red-600">{deadStock.length} items</span> in Dead Stock.</span>
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
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1.5 inline-block ${
                                bill.PaymentMode === 'Cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
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
                          <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center h-full">
                             <RefreshCw className="w-6 h-6 mb-2 text-slate-300" />
                             Waiting for POS checkouts...
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* TRENDING CATALOG */}
            {activeTab === 'trending' && (
              <div className="p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 border-b border-slate-200 pb-6">
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 flex items-center">
                      <Star className="w-8 h-8 mr-3 text-amber-500" /> Cobb Trend Catalog
                    </h3>
                    <p className="text-base text-slate-500 mt-2">High-demand Cobb Apparels items trending nationwide that are critically low in your Pundri store.</p>
                  </div>
                  <button 
                    onClick={() => {
                      let msg = `Hello Supplier, please dispatch the following All-India Trending items to Cobb Pundri immediately:\n\n`;
                      trendingCatalog.forEach(i => {
                         msg += `- ${i.name} (Currently ${i.stock} in stock)\n`;
                      });
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-colors flex items-center cursor-pointer"
                  >
                    <Send className="w-5 h-5 mr-2" /> Order All to Supplier
                  </button>
                </div>

                {/* UPPERWEAR SECTION */}
                <div className="mb-12">
                  <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                    <span className="bg-blue-100 text-blue-700 p-2 rounded-lg mr-3"><Shirt className="w-5 h-5" /></span>
                    Upperwear Collection
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trendingCatalog.filter(item => item.group === 'Upperwear').map((item) => (
                      <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col">
                        <div className="h-64 overflow-hidden relative bg-slate-100 flex-shrink-0">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-md shadow-sm border border-slate-200 flex items-center">
                             <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{item.trend}</span>
                          </div>
                          {item.stock === 0 ? (
                             <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-md shadow-md">
                                <span className="text-[10px] font-black uppercase tracking-widest">Out of Stock</span>
                             </div>
                          ) : (
                             <div className="absolute top-3 right-3 bg-amber-500 text-white px-2 py-1 rounded-md shadow-md">
                                <span className="text-[10px] font-black uppercase tracking-widest">Low Stock: {item.stock}</span>
                             </div>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 mb-2 leading-tight">{item.name}</h4>
                            <p className="text-xs text-slate-500 mb-5 leading-relaxed">{item.pitch}</p>
                          </div>
                          <button 
                             onClick={() => {
                                let msg = `Hello Supplier, please dispatch ${item.name} to Cobb Pundri. We currently have ${item.stock} units and it is highly requested.`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                             }}
                             className="w-full bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-200 font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <Package className="w-4 h-4 mr-2" /> Request Restock
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOTTOMWEAR SECTION */}
                <div>
                  <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                    <span className="bg-blue-100 text-blue-700 p-2 rounded-lg mr-3"><Scissors className="w-5 h-5" /></span>
                    Bottomwear Collection
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trendingCatalog.filter(item => item.group === 'Bottomwear').map((item) => (
                      <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col">
                        <div className="h-64 overflow-hidden relative bg-slate-100 flex-shrink-0">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-md shadow-sm border border-slate-200 flex items-center">
                             <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{item.trend}</span>
                          </div>
                          {item.stock === 0 ? (
                             <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-md shadow-md">
                                <span className="text-[10px] font-black uppercase tracking-widest">Out of Stock</span>
                             </div>
                          ) : (
                             <div className="absolute top-3 right-3 bg-amber-500 text-white px-2 py-1 rounded-md shadow-md">
                                <span className="text-[10px] font-black uppercase tracking-widest">Low Stock: {item.stock}</span>
                             </div>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 mb-2 leading-tight">{item.name}</h4>
                            <p className="text-xs text-slate-500 mb-5 leading-relaxed">{item.pitch}</p>
                          </div>
                          <button 
                             onClick={() => {
                                let msg = `Hello Supplier, please dispatch ${item.name} to Cobb Pundri. We currently have ${item.stock} units and it is highly requested.`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                             }}
                             className="w-full bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-200 font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <Package className="w-4 h-4 mr-2" /> Request Restock
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* STORE P&L STATEMENT */}
            {activeTab === 'pnl' && (
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
                            <th className="pb-3">Line Item Description</th>
                            <th className="pb-3 text-right">Amount (₹)</th>
                            <th className="pb-3 text-right">% of Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          <tr>
                            <td className="py-3 font-bold text-slate-800">Gross Sales Revenue (Receipts)</td>
                            <td className="py-3 text-right font-bold text-slate-900">{formatCurrency(pnlData.grossSales)}</td>
                            <td className="py-3 text-right text-slate-500 font-mono">100%</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-600">Less: GST Tax Collected</td>
                            <td className="py-3 text-right text-rose-600 font-mono">-{formatCurrency(pnlData.taxCollected)}</td>
                            <td className="py-3 text-right text-slate-400 font-mono">{pnlData.grossSales > 0 ? (pnlData.taxCollected / pnlData.grossSales * 100).toFixed(1) : 0}%</td>
                          </tr>
                          <tr className="bg-slate-50 font-bold">
                            <td className="py-3 text-slate-800">Net Taxable Revenue</td>
                            <td className="py-3 text-right text-slate-900">{formatCurrency(pnlData.taxableRevenue)}</td>
                            <td className="py-3 text-right text-slate-600 font-mono">{pnlData.grossSales > 0 ? (pnlData.taxableRevenue / pnlData.grossSales * 100).toFixed(1) : 0}%</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-600">Less: Cost of Goods Sold (Wholesale Purchase)</td>
                            <td className="py-3 text-right text-rose-600 font-mono">-{formatCurrency(pnlData.costOfGoodsSold)}</td>
                            <td className="py-3 text-right text-slate-400 font-mono">48%</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-600">Less: Store Rent (Pundri Main Market)</td>
                            <td className="py-3 text-right text-slate-600 font-mono">-{formatCurrency(pnlData.operatingExpenses.rent)}</td>
                            <td className="py-3 text-right text-slate-400 font-mono">-</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-600">Less: Staff Salaries & Payroll</td>
                            <td className="py-3 text-right text-slate-600 font-mono">-{formatCurrency(pnlData.operatingExpenses.staffSalaries)}</td>
                            <td className="py-3 text-right text-slate-400 font-mono">-</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-600">Less: Electricity & Air-Conditioning Utilities</td>
                            <td className="py-3 text-right text-slate-600 font-mono">-{formatCurrency(pnlData.operatingExpenses.electricity)}</td>
                            <td className="py-3 text-right text-slate-400 font-mono">-</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-600">Less: Miscellaneous Operating & Maintenance</td>
                            <td className="py-3 text-right text-slate-600 font-mono">-{formatCurrency(pnlData.operatingExpenses.miscExpenses)}</td>
                            <td className="py-3 text-right text-slate-400 font-mono">-</td>
                          </tr>
                          <tr className="bg-emerald-50 text-emerald-900 font-black text-base">
                            <td className="py-4">Net Monthly Store Operating Profit</td>
                            <td className="py-4 text-right text-emerald-600">{formatCurrency(pnlData.netStoreProfit)}</td>
                            <td className="py-4 text-right text-emerald-700 font-mono">{pnlData.profitMarginPct}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : <p className="text-slate-400">Loading P&L statement...</p>}
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
                    <span className="text-xs font-semibold text-slate-400">Showing {wardrobeProfiles.length} Profiles</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                          <th className="pb-3 pr-4">Customer Name</th>
                          <th className="pb-3 px-3">Phone</th>
                          <th className="pb-3 px-3">AI Persona Tag</th>
                          <th className="pb-3 px-3">Primary Style Preference</th>
                          <th className="pb-3 px-3 text-right">Lifetime Value (LTV)</th>
                          <th className="pb-3 px-3 text-right">Total Visits</th>
                          <th className="pb-3 pl-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {wardrobeProfiles.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3.5 pr-4 font-bold text-slate-800">{c.CustomerName?.trim() || 'Valued Shopper'}</td>
                            <td className="py-3.5 px-3 text-xs font-mono text-slate-500">{c.Phone}</td>
                            <td className="py-3.5 px-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                c.Persona.includes('High Roller') ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                c.Persona.includes('Formal') ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                c.Persona.includes('Casual') ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {c.Persona}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-xs font-semibold text-slate-600">{c.PrimaryStyle}</td>
                            <td className="py-3.5 px-3 text-right font-black text-green-600">{formatCurrency(c.TotalSpent)}</td>
                            <td className="py-3.5 px-3 text-right text-xs font-bold text-slate-700">{c.TotalVisits} Visits</td>
                            <td className="py-3.5 pl-4 text-center">
                              <button 
                                onClick={() => {
                                  const msg = `Hello ${c.CustomerName?.trim() || 'Sir'}! 👋 We just added new ${c.PrimaryStyle} collections at Cobb Pundri matching your style! Drop by today to explore.`;
                                  window.open(`https://wa.me/${c.Phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
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
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue VIPs (30+ Days)</p>
                        <h4 className="text-3xl font-black text-amber-600 mt-2">{retentionData.overdueVips.length}</h4>
                        <p className="text-xs text-slate-400 mt-1">Ready for re-activation</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                      <h4 className="font-bold text-slate-800 text-lg mb-4">Overdue VIP Re-engagement Radar</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                              <th className="pb-3 pr-4">VIP Client Name</th>
                              <th className="pb-3 px-3">Phone</th>
                              <th className="pb-3 px-3 text-right">Lifetime Value (LTV)</th>
                              <th className="pb-3 px-3 text-right">Total Visits</th>
                              <th className="pb-3 px-3 text-right">Days Inactive</th>
                              <th className="pb-3 pl-4 text-center">Re-engagement Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {retentionData.overdueVips.map((v, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3.5 pr-4 font-bold text-slate-800">{v.CustomerName?.trim() || 'VIP Customer'}</td>
                                <td className="py-3.5 px-3 text-xs font-mono text-slate-500">{v.Phone}</td>
                                <td className="py-3.5 px-3 text-right font-black text-green-600">{formatCurrency(v.TotalSpent)}</td>
                                <td className="py-3.5 px-3 text-right text-xs font-bold text-slate-700">{v.TotalVisits} Visits</td>
                                <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-600">{v.DaysInactive} Days Ago</td>
                                <td className="py-3.5 pl-4 text-center">
                                  <button 
                                    onClick={() => {
                                      const msg = `Hello ${v.CustomerName?.trim() || 'Sir'}! 👋 We miss seeing you at Cobb Pundri. Enjoy an exclusive VIP discount on your next visit this week!`;
                                      window.open(`https://wa.me/${v.Phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
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

              const todayComp = computeGst(gstSummary.today.GrossSales || 0, gstSummary.today.TaxCollected || 0);
              const monthlyComp = computeGst(gstSummary.monthly.GrossSales || 0, gstSummary.monthly.TaxCollected || 0);

              const exportGstr1Text = () => {
                const lines = [
                  `🧾 *COBB PUNDRI - GSTR-1 MONTHLY TAX SUMMARY*`,
                  `📅 *Month:* ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
                  `-----------------------------------`,
                  `💰 *Gross Sales (Inc. GST):* ${formatCurrency(gstSummary.monthly.GrossSales)}`,
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
                        {gstSummary.history.length} Months Tracked
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                            <th className="pb-3 pr-4">Month / Period</th>
                            <th className="pb-3 px-3 text-right">Invoices</th>
                            <th className="pb-3 px-3 text-right">Units Sold</th>
                            <th className="pb-3 px-3 text-right">Gross Sales (Inc. Tax)</th>
                            <th className="pb-3 px-3 text-right">Taxable Base Amount</th>
                            <th className="pb-3 px-3 text-right">CGST ({(gstRateSlab / 2)}%)</th>
                            <th className="pb-3 px-3 text-right">SGST ({(gstRateSlab / 2)}%)</th>
                            <th className="pb-3 pl-4 text-right">Total GST Payable</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {gstSummary.history.map((row, idx) => {
                            const gross = row.GrossSales || 0;
                            const comp = computeGst(gross, row.TaxCollected || 0);

                            return (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="py-4 pr-4 font-bold text-slate-800 flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                  <span>{row.MonthStr}</span>
                                </td>
                                <td className="py-4 px-3 text-right text-slate-600 text-xs font-semibold">{row.TotalInvoices} Bills</td>
                                <td className="py-4 px-3 text-right text-slate-600 text-xs font-semibold">{row.TotalUnits} Units</td>
                                <td className="py-4 px-3 text-right font-black text-slate-900">{formatCurrency(gross)}</td>
                                <td className="py-4 px-3 text-right text-slate-600 font-mono text-xs">{formatCurrency(comp.taxable)}</td>
                                <td className="py-4 px-3 text-right text-slate-600 font-mono text-xs">{formatCurrency(comp.cgst)}</td>
                                <td className="py-4 px-3 text-right text-slate-600 font-mono text-xs">{formatCurrency(comp.sgst)}</td>
                                <td className="py-4 pl-4 text-right font-black text-emerald-600 text-base">{formatCurrency(comp.tax)}</td>
                              </tr>
                            );
                          })}
                          {gstSummary.history.length === 0 && (
                            <tr>
                              <td colSpan="8" className="text-center py-12 text-slate-400">Loading GST return history...</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* SIZE MATRIX HEATMAP */}
            {activeTab === 'sizematrix' && (() => {
              const categoriesList = ['ALL', ...Array.from(new Set(sizeMatrix.map(r => r.Category)))];
              
              const filteredMatrix = sizeMatrix.filter(row => {
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
                            <th className="pb-3 pr-4">Article Name</th>
                            <th className="pb-3 px-3">Section</th>
                            <th className="pb-3 px-3">Tag Size</th>
                            <th className="pb-3 px-3 text-right">Units Sold</th>
                            <th className="pb-3 px-3 text-right">Invoices</th>
                            <th className="pb-3 px-3 text-right">Total Revenue</th>
                            <th className="pb-3 px-3 text-right">Avg Unit Price</th>
                            <th className="pb-3 pl-4 text-center">Demand Heatmap Tier</th>
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
                                <td className="py-3.5 pr-4 font-bold text-slate-800">{row.ArticleName}</td>
                                <td className="py-3.5 px-3 font-semibold text-slate-500 text-xs"><span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">{row.Category}</span></td>
                                <td className="py-3.5 px-3 font-mono font-bold text-slate-700 text-xs"><span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">{row.Size}</span></td>
                                <td className="py-3.5 px-3 text-right font-black text-slate-900 text-base">{units}</td>
                                <td className="py-3.5 px-3 text-right text-slate-500 text-xs font-semibold">{row.Invoices || 0} Bills</td>
                                <td className="py-3.5 px-3 text-right font-black text-green-600">{formatCurrency(revenue)}</td>
                                <td className="py-3.5 px-3 text-right text-slate-600 text-xs font-mono">{formatCurrency(avgPrice)}</td>
                                <td className="py-3.5 pl-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-xs border inline-block ${heatBg}`}>
                                    {heatLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredMatrix.length === 0 && (
                            <tr>
                              <td colSpan="8" className="text-center py-12 text-slate-400">No size matrix records match the selected filter.</td>
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
              <div className="p-8">
                <div className="border-b border-slate-200 pb-5 mb-8">
                  <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                    <BarChart3 className="w-6 h-6 mr-3 text-blue-600" /> Store Rush Visualizer
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">Identify peak store hours to optimize staff allocation and inventory prep.</p>
                </div>

                <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm mb-8">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-8">Hourly Revenue Distribution</h4>
                  <div className="h-64 flex items-end justify-between gap-3 pt-6">
                    {hourlySales.map((h, i) => {
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
                    {hourlySales.length === 0 && (
                      <p className="w-full text-center py-12 text-slate-500">No bills generated today to plot chart.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {hourlySales.map((h, i) => (
                    <div key={i} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">{h.SaleHour}:00 - {h.SaleHour + 1}:00</p>
                      <p className="text-2xl font-black text-slate-800">{formatCurrency(h.TotalRevenue)}</p>
                      <p className="text-sm text-blue-600 mt-2 font-semibold bg-blue-50 w-fit px-2 py-0.5 rounded-md">{h.TotalBills} Checkouts</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. MONTHLY PRODUCTS */}
            {activeTab === 'monthly' && (
              <div className="p-8 bg-slate-50 min-h-screen">
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

                {Object.entries(groupedByMonth).map(([month, monthData], index) => {
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
                          {MASTER_CATEGORIES.map(category => {
                            const items = monthData.data[category.id];
                            if (!items || items.length === 0) return null;

                            const catUnits = items.reduce((sum, i) => sum + i.TotalUnitsSold, 0);
                            const catRevenue = items.reduce((sum, i) => sum + i.TotalRevenue, 0);

                            return (
                              <div key={category.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                <div className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center">
                                  <h4 className="font-bold text-slate-800 text-base flex items-center">
                                    <span className="mr-3 text-2xl">{category.icon}</span> {category.label}
                                  </h4>
                                  <div className="text-right bg-slate-50 px-4 py-1.5 rounded-lg border border-slate-100">
                                    <span className="text-sm font-bold text-slate-600 mr-4">{catUnits} Units</span>
                                    <span className="text-sm font-black text-green-600">{formatCurrency(catRevenue)}</span>
                                  </div>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-left text-sm">
                                    <thead>
                                      <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Article Description</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Units</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Revenue</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                          <td className="px-6 py-3.5 font-medium text-slate-800">{item.ArticleName}</td>
                                          <td className="px-6 py-3.5 text-slate-500 text-xs">{item.ProductType}</td>
                                          <td className="px-6 py-3.5 font-bold text-slate-700 text-right">{item.TotalUnitsSold}</td>
                                          <td className="px-6 py-3.5 font-black text-green-600 text-right">{formatCurrency(item.TotalRevenue)}</td>
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
                })}
              </div>
            )}

            {/* 4. DEAD STOCK WITH AI OUTFIT MATCHER */}
            {activeTab === 'deadstock' && (
              <div className="p-8">
                <div className="border-b border-slate-200 pb-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                      <Archive className="w-6 h-6 mr-3 text-red-500" /> Dead Stock Control
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">Articles stagnant for 60+ days. Use AI to generate fresh styling pitches to move stock.</p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="Filter Dead Stock by SKU or Name..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors shadow-sm"
                    />
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Article Description</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">AI Styling Pitch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deadStock
                        .filter(i => i.SKU?.toLowerCase().includes(searchQuery.toLowerCase()) || i.ItemName?.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((item, idx) => (
                          <React.Fragment key={idx}>
                            <tr className={`hover:bg-slate-50 transition-colors ${activeOutfitMatch === item.SKU ? 'bg-indigo-50/50' : ''}`}>
                              <td className="px-6 py-4 font-bold text-slate-700 text-sm">{item.SKU}</td>
                              <td className="px-6 py-4 text-slate-600 text-sm">{item.ItemName}</td>
                              <td className="px-6 py-4 font-black text-amber-600">
                                <span className="bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">{item.CurrentStock} Units</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleGenerateOutfitMatch(item)}
                                  disabled={isGeneratingOutfit && activeOutfitMatch === item.SKU}
                                  className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 hover:shadow-sm rounded-lg font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {isGeneratingOutfit && activeOutfitMatch === item.SKU ? 'Thinking...' : <><Sparkles className="w-3 h-3 mr-1.5" /> Style Match</>}
                                </button>
                              </td>
                            </tr>
                            {activeOutfitMatch === item.SKU && outfitPitch && (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. SEARCHABLE INVENTORY + MASTER RESTOCK */}
            {activeTab === 'inventory' && (
              <div className="p-8 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                      <Tag className="w-6 h-6 mr-3 text-blue-600" /> Live Inventory Explorer
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">Instant live search across articles, color, fit, and current stock sizes.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <button 
                      onClick={handleMasterRestock}
                      className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-md shadow-amber-500/20 flex items-center transition-all cursor-pointer"
                    >
                      <Package className="w-4 h-4 mr-2" /> Generate Auto-Restock
                    </button>
                    <div className="relative w-full sm:w-72">
                      <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="text" 
                        placeholder="Search Article No, Color..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {Object.keys(groupedByType).length === 0 && (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No matching inventory items found for "{searchQuery}".</p>
                  </div>
                )}

                {Object.entries(groupedByType).map(([productType, items], index) => {
                  const isOpen = openProductType === productType || searchQuery.length > 0;
                  const totalUnits = items.reduce((sum, item) => sum + item.CurrentStock, 0);

                  return (
                    <div key={index} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                      <button 
                        onClick={() => setOpenProductType(isOpen ? null : productType)}
                        className="w-full bg-white hover:bg-slate-50 p-5 flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-blue-50 rounded-xl">
                            <Layers className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-bold text-slate-800 text-lg">{productType}</h4>
                            <p className="text-sm text-slate-500 mt-0.5">{items.length} Matching Variants</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <span className="px-4 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-black text-sm border border-blue-200">
                            {totalUnits} Total Units
                          </span>
                          <div className="bg-slate-100 p-2.5 rounded-full">
                            {isOpen ? <ChevronUp className="w-5 h-5 text-slate-700" /> : <ChevronDown className="w-5 h-5 text-slate-700" />}
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="bg-slate-50/50 overflow-x-auto p-4">
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                            <table className="min-w-full text-left text-sm">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Article No</th>
                                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Color</th>
                                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Size</th>
                                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {items.map((item, idx) => {
                                  const isLow = item.CurrentStock <= 3;
                                  return (
                                    <tr key={idx} className={`hover:bg-blue-50/30 transition-colors ${isLow ? 'bg-red-50/20' : ''}`}>
                                      <td className="px-5 py-3.5 font-bold text-slate-700">{item.ArticleNo}</td>
                                      <td className="px-5 py-3.5 text-slate-600">{item.ItemName}</td>
                                      <td className="px-5 py-3.5 text-slate-600">{item.Color}</td>
                                      <td className="px-5 py-3.5 text-slate-600 font-medium">{item.Size}</td>
                                      <td className={`px-5 py-3.5 font-black ${isLow ? 'text-red-600' : 'text-slate-700'}`}>
                                        {item.CurrentStock} 
                                        {isLow && <span className="ml-2 text-[10px] bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Low</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 6. AI CAMPAIGN BUILDER */}
            {activeTab === 'campaigns' && (
              <div className="p-8">
                <div className="border-b border-slate-200 pb-5 mb-8">
                  <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                    <Megaphone className="w-6 h-6 mr-3 text-indigo-600" /> Seasonal Campaign Builder
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">Generate franchise-compliant WhatsApp broadcast messages for specific audiences and events.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Upcoming Event / Season</label>
                      <input 
                        type="text" 
                        value={campaignEvent}
                        onChange={(e) => setCampaignEvent(e.target.value)}
                        placeholder="e.g., Diwali Prep, Autumn Transition, Winter Wedding"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Audience Segment</label>
                      <select 
                        value={campaignAudience}
                        onChange={(e) => setCampaignAudience(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner cursor-pointer"
                      >
                        <option value="All VIP Customers">All VIP Customers</option>
                        <option value="Formal / Suit Buyers">Formal / Suit Buyers</option>
                        <option value="Denim Enthusiasts">Denim Enthusiasts</option>
                        <option value="Dormant Customers">Dormant Customers</option>
                      </select>
                    </div>

                    <button 
                      onClick={handleGenerateCampaign}
                      disabled={isGeneratingCampaign || !campaignEvent}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/30 mt-6"
                    >
                      {isGeneratingCampaign ? 'Drafting Campaign...' : <><Sparkles className="w-5 h-5 mr-2" /> Generate Broadcast Message</>}
                    </button>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex-1 bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-800 rounded-2xl shadow-xl overflow-hidden flex flex-col relative">
                      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Megaphone className="w-32 h-32 text-white" />
                      </div>
                      <div className="border-b border-indigo-800/50 p-5 relative z-10 flex items-center">
                        <Wand2 className="w-4 h-4 text-indigo-300 mr-2" />
                        <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">AI Generated Draft</p>
                      </div>
                      <textarea 
                        value={campaignDraft}
                        onChange={(e) => setCampaignDraft(e.target.value)}
                        placeholder="Your AI generated campaign message will appear here..."
                        className="flex-1 w-full p-6 text-slate-200 bg-transparent focus:outline-none resize-none relative z-10 text-sm leading-relaxed"
                      />
                    </div>
                    {campaignDraft && (
                      <button 
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(campaignDraft)}`, '_blank')}
                        className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center cursor-pointer shadow-lg shadow-green-600/20"
                      >
                        <Send className="w-5 h-5 mr-2" /> Send via WhatsApp Broadcast
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 7. AUTOMATION ENGINE */}
            {activeTab === 'automation' && (
              <div className="p-8 space-y-8">
                <div className="border-b border-slate-200 pb-5 mb-2">
                  <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                    <Terminal className="w-6 h-6 mr-3 text-slate-600" /> Automation Engine
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">Manage background scripts for POS tracking and WhatsApp Gateway pairing.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* WhatsApp Gateway Card with Live Embedded QR */}
                  <div className="bg-slate-900 text-white p-8 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
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

                    <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                      <button onClick={() => setActiveConsole('gateway')} className={`text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer ${activeConsole === 'gateway' ? 'bg-blue-900/50 text-blue-300' : 'text-slate-400 hover:text-white'}`}>
                        Console Logs
                      </button>
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
                  <div className="bg-slate-900 text-white p-8 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
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
                        {isTogglingListener ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : isListenerRunning ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {isTogglingListener ? 'Processing...' : isListenerRunning ? 'Stop' : 'Start Listener'}
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
                    (activeConsole === 'gateway' ? gatewayLogs : listenerLogs).map((log, index) => (
                      renderLogLine(log, index)
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 8. LIVE BILLS */}
            {activeTab === 'live' && (
              <div className="p-8">
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
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No.</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Name & Contact</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Mode of Payment</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Invoice Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {liveBills.map((bill, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                            {new Date(bill.BillTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700">{bill.BillNumber}</td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-800 text-base">{bill.CustomerName?.trim() || bill.FirstName?.trim() || 'Guest Customer'}</span>
                            <br/><span className="text-xs text-slate-400 font-mono mt-0.5 inline-block">{bill.Phone}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${
                              bill.PaymentMode === 'Cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
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
                          <td className="px-6 py-4 text-lg font-black text-green-600 text-right">{formatCurrency(bill.Amount)}</td>
                        </tr>
                      ))}
                      {liveBills.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-16 text-center text-slate-400 font-medium">
                            <Receipt className="w-10 h-10 mb-3 text-slate-300 mx-auto" />
                            No invoices processed today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 9. VIP & DORMANT */}
            {(activeTab === 'vip' || activeTab === 'dormant') && (
              <div className="p-8 min-h-screen">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-6 mb-6 gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                      {activeTab === 'vip' ? <Users className="w-6 h-6 mr-3 text-blue-600" /> : <AlertCircle className="w-6 h-6 mr-3 text-amber-500" />}
                      {activeTab === 'vip' ? 'VIP Client Database' : 'Dormant Client Recovery'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">Click on any customer to open their wardrobe history and AI persona.</p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="Search by Name or Phone..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 shadow-sm transition-colors"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client Identity</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lifetime Value</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{activeTab === 'vip' ? 'Total Visits' : 'Days Inactive'}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(activeTab === 'vip' ? vips : dormant)
                        .filter(c => `${c.FirstName} ${c.LastName}`.toLowerCase().includes(searchQuery.toLowerCase()) || c.Phone?.includes(searchQuery))
                        .map((customer, idx) => (
                          <tr key={idx} onClick={() => openCustomerCard(customer)} className="hover:bg-blue-50/50 cursor-pointer transition-all group">
                            <td className="px-6 py-4 font-bold text-slate-800 flex items-center">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-black text-xs">
                                {customer.FirstName?.charAt(0) || 'C'}
                              </div>
                              {customer.FirstName} {customer.LastName || ''}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-sm">{customer.Phone}</td>
                            <td className="px-6 py-4 font-black text-green-600">{formatCurrency(customer.LifetimeSpend)}</td>
                            <td className="px-6 py-4">
                              {activeTab === 'vip' 
                                ? <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg text-sm">{customer.TotalBills} Invoices</span>
                                : <span className="text-red-500 font-bold bg-red-50 px-3 py-1 rounded-lg text-sm border border-red-100">{customer.DaysSinceLastVisit} Days</span>
                              }
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-flex items-center text-xs text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 px-3 py-1.5 rounded-lg">
                                Open Profile &rarr;
                              </span>
                            </td>
                          </tr>
                      ))}
                      {(activeTab === 'vip' ? vips : dormant).length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-slate-400">No customer records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* CUSTOMER PROFILE MODAL / DRAWER WITH AI */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-end z-50 transition-opacity">
            <div className="bg-white w-full max-w-xl h-full shadow-2xl p-0 overflow-hidden flex flex-col relative">
              
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-100 bg-slate-50">
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

                <div className="grid grid-cols-2 gap-4 mt-8">
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
              <div className="p-8 flex-1 overflow-y-auto">
                
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
        )}

        {/* EOD CASH RECONCILIATION MODAL */}
        {showReconModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200">
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
            <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200">
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

        {/* Floating Toast Notifications Container with Timer Progress Bar */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              onClick={() => {
                setActiveTab('live');
                setToasts(prev => prev.filter(t => t.id !== toast.id));
              }}
              className="pointer-events-auto bg-slate-900/95 backdrop-blur text-white rounded-2xl shadow-2xl border border-slate-800/90 p-4 min-w-[340px] max-w-sm flex items-start gap-3.5 animate-slide-in relative overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all group"
            >
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1 pr-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{toast.title || "POS Alert"}</p>
                  {toast.billNumber && <span className="text-[10px] font-mono text-slate-400">#{toast.billNumber}</span>}
                </div>
                <p className="text-sm font-bold text-white mt-1 leading-snug">{toast.customer || 'Guest Customer'}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {formatCurrency(toast.amount || 0)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {toast.paymentMode || 'Cash'}
                  </span>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }}
                className="text-slate-500 hover:text-slate-200 transition-colors cursor-pointer absolute top-3.5 right-3.5"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Toast Visual Progress Countdown Bar */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-400 origin-left animate-toast-timer" 
                style={{ animationDuration: `${toast.duration || 5000}ms` }} 
              />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}