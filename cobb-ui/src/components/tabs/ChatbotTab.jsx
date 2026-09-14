import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Mic,
  MicOff,
  Copy,
  Check,
  RotateCcw,
  Package,
  TrendingUp,
  AlertTriangle,
  Users,
  Code2,
  ChevronDown,
  ChevronUp,
  Shirt,
  Loader2,
  Volume2,
  VolumeX,
  Truck,
  ChevronRight,
  Search,
  Boxes,
  Tag
} from 'lucide-react';

const STORAGE_KEY = 'cobb_copilot_messages_v2';

const QUICK_PROMPTS = [
  { label: "👔 Full Sleeve Shirts", query: "how many full sleeves shirt are present", icon: Shirt, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  { label: "📏 Size 40 Shirts", query: "size 40 shirts in stock", icon: Shirt, color: "text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800" },
  { label: "🚚 Goods In Transit", query: "what parcels are in transit from head office", icon: Truck, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800" },
  { label: "💰 Today's Sales & UPI", query: "what is today's total sales and UPI split", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  { label: "🚨 Low Stock Alerts", query: "which items are low on stock", icon: AlertTriangle, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  { label: "👑 Top VIP Customers", query: "who are our top VIP customers", icon: Users, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  { label: "💤 Dead Stock (60d)", query: "show dead stock items", icon: Package, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
];

const DEFAULT_WELCOME = {
  id: 'welcome_full',
  sender: 'bot',
  text: `👋 Hello! I am your **Cobb Store AI Copilot**.\n\nYou can ask me any question about live stock, size matrices, sales, goods in transit, or customer purchase history. Tap a prompt below or speak into the mic:\n\n* **"Size 40 shirts in stock"**\n* **"What parcels are in transit from head office?"**\n* **"Customer Parminder purchase history"**\n* **"What is today's total sales and UPI split?"**`,
  chips: [
    { label: "👔 Full sleeves shirt in stock", query: "how many full sleeves shirt are present" },
    { label: "📏 Size 40 shirts", query: "size 40 shirts in stock" },
    { label: "🚚 Goods in transit", query: "what parcels are in transit from head office" },
    { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" },
    { label: "👑 Who are our top VIP customers?", query: "who are our top VIP customers" }
  ],
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export default function ChatbotTab({ API_BASE = 'http://localhost:5000', darkMode = false, onNavigateTab = null }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [DEFAULT_WELCOME];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedSqlId, setExpandedSqlId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  const messagesEndRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Web Speech API for voice recognition if available
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputQuery(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      speechRecognitionRef.current = recognition;
    }
  }, []);

  // Suggestions auto-complete
  useEffect(() => {
    if (!inputQuery || inputQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        setIsSearchingSuggestions(true);
        const res = await fetch(`${API_BASE}/api/ai/chat/suggestions?q=${encodeURIComponent(inputQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(debounceTimerRef.current);
  }, [inputQuery, API_BASE]);

  // Text-To-Speech
  const speakText = (id, textToSpeak) => {
    if (!window.speechSynthesis) return;

    if (activeSpeechId === id) {
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = textToSpeak.replace(/[*_`#]/g, '').replace(/[\n\r]+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN';

    utterance.onend = () => setActiveSpeechId(null);
    utterance.onerror = () => setActiveSpeechId(null);

    setActiveSpeechId(id);
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeechRecognition = () => {
    if (!speechRecognitionRef.current) {
      alert("Voice speech recognition is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech recognition start failed:", e);
      }
    }
  };

  const handleSend = async (queryToSend = null) => {
    const query = (queryToSend !== null ? queryToSend : inputQuery).trim();
    if (!query || loading) return;

    setShowSuggestions(false);

    const userMsgId = 'user_' + Date.now();
    const userMsg = {
      id: userMsgId,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: query })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const botMsg = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: data.answer || "I received an answer without text.",
        metrics: data.metrics || [],
        products: data.products || [],
        actions: data.actions || [],
        table: data.table || null,
        chips: data.chips || [],
        sqlUsed: data.sqlUsed || null,
        intent: data.intent || 'GENERAL',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("Chatbot request failed:", err);
      const errMsg = {
        id: 'bot_err_' + Date.now(),
        sender: 'bot',
        text: `⚠️ **Connection issue:** Could not fetch response from Cobb backend (${err.message}). Please ensure the local backend server is running.`,
        chips: [
          { label: "👔 How many full sleeves shirt are present?", query: "how many full sleeves shirt are present" },
          { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
        ],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = (action) => {
    if (!action) return;
    if (action.type === 'NAVIGATE' && onNavigateTab) {
      onNavigateTab(action.target || action.tab);
    } else if (action.type === 'QUERY') {
      handleSend(action.query);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setActiveSpeechId(null);
    setMessages([DEFAULT_WELCOME]);
  };

  return (
    <div className={`flex flex-col h-[calc(100dvh-7.5rem)] lg:h-[calc(100vh-5.5rem)] rounded-none sm:rounded-2xl overflow-hidden border-0 sm:border shadow-sm transition-colors ${
      darkMode ? 'bg-slate-900 sm:border-slate-800 text-slate-100' : 'bg-slate-50 sm:border-slate-200 text-slate-800'
    }`}>
      {/* Top Header Bar */}
      <div className={`px-3 py-2.5 sm:px-6 sm:py-4 border-b flex items-center justify-between shadow-2xs shrink-0 ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <h2 className="text-sm sm:text-lg font-bold truncate">Cobb AI Copilot</h2>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                Live DB Connected
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
              MSSQL Stock, Sizes, Goods In Transit & Sales Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={clearChat}
            className={`flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
              darkMode 
                ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' 
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
            }`}
            title="Reset conversation"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Quick Prompts Carousel Bar */}
      <div className={`px-3 py-2 sm:px-6 sm:py-2.5 border-b overflow-x-auto no-scrollbar flex items-center space-x-2 shrink-0 ${
        darkMode ? 'bg-slate-850 border-slate-800' : 'bg-slate-100/70 border-slate-200'
      }`}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Prompts:</span>
        {QUICK_PROMPTS.map((p, idx) => {
          const Icon = p.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSend(p.query)}
              className={`shrink-0 flex items-center space-x-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all shadow-2xs border hover:scale-102 cursor-pointer ${p.color}`}
            >
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 sm:space-y-6">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';

          return (
            <div key={msg.id} className={`flex items-start space-x-2 sm:space-x-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
              {isBot && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5">
                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}

              <div className={`max-w-[90%] sm:max-w-3xl rounded-2xl p-3.5 sm:p-5 shadow-xs transition-all ${
                isBot
                  ? darkMode
                    ? 'bg-slate-800 border border-slate-700/70 text-slate-200'
                    : 'bg-white border border-slate-200/80 text-slate-800'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs'
              }`}>
                {/* Header row: sender + time + tts + copy */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${isBot ? 'text-slate-400' : 'text-blue-100'}`}>
                    {isBot ? 'Cobb Copilot' : 'You'} • {msg.time}
                  </span>
                  {isBot && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => speakText(msg.id, msg.text)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          activeSpeechId === msg.id
                            ? 'text-blue-400 bg-blue-500/20 animate-pulse'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title={activeSpeechId === msg.id ? "Stop voice readout" : "Listen to voice readout"}
                      >
                        {activeSpeechId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Main Text Content */}
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {msg.text}
                </div>

                {/* Rich Product Cards Display (Size & Article Stock) */}
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200/40 dark:border-slate-700/60">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-500" />
                      Matching Articles In Stock ({msg.products.length}):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                      {msg.products.map((prod, pIdx) => (
                        <div
                          key={pIdx}
                          className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                            darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono font-bold text-xs text-blue-500 dark:text-blue-400">
                                {prod.articleNo}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  prod.stock > 5
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                }`}
                              >
                                {prod.stock} pcs
                              </span>
                            </div>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-1">
                              {prod.itemName}
                            </p>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                            <span>Size: <strong className="text-slate-700 dark:text-slate-300">{prod.size}</strong></span>
                            <span>{prod.color}</span>
                            {prod.mrp && <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{prod.mrp}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Metrics Badges */}
                {msg.metrics && msg.metrics.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-700/60">
                    {msg.metrics.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        className={`p-2 rounded-xl border ${
                          darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">{m.label}</div>
                        <div className="text-sm sm:text-base font-bold mt-0.5 text-blue-600 dark:text-blue-400 truncate">{m.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Action Trigger Buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-700/60 flex flex-wrap gap-2">
                    {msg.actions.map((act, actIdx) => (
                      <button
                        key={actIdx}
                        onClick={() => executeAction(act)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-102"
                      >
                        <span>{act.label}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Structured Table */}
                {msg.table && msg.table.rows && msg.table.rows.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-700/60">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                      <span>Breakdown ({msg.table.rows.length} rows)</span>
                      <span className="text-[10px] text-slate-500 font-normal sm:hidden">Swipe →</span>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 max-h-56 overflow-y-auto">
                      <table className="w-full text-[11px] sm:text-xs text-left">
                        <thead className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider sticky top-0 ${
                          darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <tr>
                            {msg.table.headers.map((h, hIdx) => (
                              <th key={hIdx} className="px-2.5 py-1.5 sm:px-3 sm:py-2 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {msg.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className={darkMode ? 'hover:bg-slate-750' : 'hover:bg-slate-50'}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-2.5 py-1.5 sm:px-3 sm:py-2 font-medium whitespace-nowrap">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Collapsible SQL Query Inspector */}
                {msg.sqlUsed && (
                  <div className="mt-2.5 pt-1.5">
                    <button
                      onClick={() => setExpandedSqlId(expandedSqlId === msg.id ? null : msg.id)}
                      className="text-[10px] sm:text-[11px] text-slate-400 hover:text-slate-300 flex items-center space-x-1 font-mono cursor-pointer"
                    >
                      <Code2 className="w-3 h-3" />
                      <span>{expandedSqlId === msg.id ? "Hide SQL" : "View SQL"}</span>
                      {expandedSqlId === msg.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {expandedSqlId === msg.id && (
                      <div className="mt-1.5 p-2 rounded-lg bg-slate-950 font-mono text-[10px] text-emerald-400 overflow-x-auto border border-slate-800">
                        <code>{msg.sqlUsed}</code>
                      </div>
                    )}
                  </div>
                )}

                {/* Follow-up Suggestion Chips */}
                {msg.chips && msg.chips.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-700/60 flex flex-wrap gap-1.5">
                    {msg.chips.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleSend(chip.query)}
                        className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                          darkMode
                            ? 'bg-slate-750 hover:bg-slate-700 border-slate-700 text-blue-300'
                            : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isBot && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-xs animate-pulse">
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className={`p-3 rounded-2xl rounded-tl-xs border flex items-center space-x-2.5 shadow-xs ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span className="text-xs font-medium">Querying MSSQL inventory, sizes & sales...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer Footer */}
      <div className={`p-2.5 sm:p-4 border-t shadow-lg shrink-0 relative ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-4xl mx-auto relative">
          {/* Smart Auto-Complete Suggestions Floating Menu */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className={`absolute bottom-full mb-2 left-0 right-0 max-h-48 overflow-y-auto rounded-xl border shadow-xl p-1.5 z-20 transition-all ${
                darkMode ? 'bg-slate-900/95 border-slate-700 backdrop-blur-md' : 'bg-white/95 border-slate-200 backdrop-blur-md'
              }`}
            >
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Suggested Queries & Items</span>
                {isSearchingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
              </div>
              <div className="space-y-0.5 mt-1">
                {suggestions.map((s, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setShowSuggestions(false);
                      setInputQuery(s.query);
                      handleSend(s.query);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      darkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{s.label}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 ml-2">
                      {s.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`relative flex items-center rounded-xl sm:rounded-2xl border transition-all ${
            isListening
              ? 'ring-2 ring-red-500 border-red-500'
              : 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'
          } ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
          }`}>
            <textarea
              ref={textareaRef}
              rows="1"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening... Speak your query..." : "Ask Cobb AI (e.g. 'size 40 shirts in stock' or customer history)..."}
              className={`w-full py-2.5 sm:py-3.5 pl-3.5 pr-20 sm:pr-24 bg-transparent outline-none resize-none text-sm leading-relaxed ${
                darkMode ? 'text-slate-100 placeholder-slate-400' : 'text-slate-800 placeholder-slate-400'
              }`}
            />

            <div className="absolute right-1.5 sm:right-2 flex items-center space-x-1">
              {/* Voice recognition button */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-2 rounded-xl transition-all touch-manipulation cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                }`}
                title={isListening ? "Stop listening" : "Voice search (Microphone)"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send button */}
              <button
                type="button"
                disabled={!inputQuery.trim() || loading}
                onClick={() => handleSend()}
                className={`p-2 rounded-xl transition-all touch-manipulation cursor-pointer ${
                  inputQuery.trim() && !loading
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
