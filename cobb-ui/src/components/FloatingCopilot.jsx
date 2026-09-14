import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Maximize2,
  Mic,
  MicOff,
  Shirt,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Volume2,
  VolumeX,
  RotateCcw,
  Package,
  Truck,
  ExternalLink,
  ChevronRight,
  Boxes,
  Tag,
  Search,
  Radio,
  UserCheck
} from 'lucide-react';

const STORAGE_KEY = 'cobb_copilot_messages_v2';

const DEFAULT_WELCOME = {
  id: 'welcome_float',
  sender: 'bot',
  text: "👋 Hi! I am your **Cobb Store AI Copilot**.\n\nAsk me anything about live store stock, sizes, sales, customer purchase histories, or incoming goods in transit.",
  chips: [
    { label: "👔 Full Sleeve Shirts", query: "how many full sleeves shirt are present" },
    { label: "📏 Size 40 Shirts", query: "size 40 shirts in stock" },
    { label: "💰 Today's Sales & UPI", query: "what is today's total sales and UPI split" },
    { label: "🚚 Goods in Transit", query: "what parcels are in transit from head office" },
    { label: "🚨 Low Stock Alerts", query: "which items are low on stock" }
  ],
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export default function FloatingCopilot({
  API_BASE = 'http://localhost:5000',
  darkMode = false,
  onOpenFullTab = null,
  onNavigateTab = null,
  activeTab = null
}) {
  if (activeTab === 'copilot') return null;

  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  // Load chat history from localStorage or fallback to welcome message
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

  const messagesEndRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  // Global Ctrl+K shortcut to toggle copilot
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Web Speech Recognition setup
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

  // Auto-complete suggestion search
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
    }, 220);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [inputQuery, API_BASE]);

  const toggleSpeechRecognition = () => {
    if (!speechRecognitionRef.current) return;
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (e) {}
    }
  };

  // Text-To-Speech Playback
  const speakText = (msgId, rawText) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;

    if (activeSpeechId === msgId) {
      synth.cancel();
      setActiveSpeechId(null);
      return;
    }

    synth.cancel();

    // Clean markdown asterisks and symbols
    const cleanSpeech = rawText
      .replace(/[#*`_~]/g, '')
      .replace(/₹(\d+)/g, '$1 rupees')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN';

    const voices = synth.getVoices();
    const indVoice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India') || v.name.includes('Natural'));
    if (indVoice) utterance.voice = indVoice;

    utterance.onstart = () => setActiveSpeechId(msgId);
    utterance.onend = () => setActiveSpeechId(null);
    utterance.onerror = () => setActiveSpeechId(null);

    synth.speak(utterance);
  };

  const handleClearChat = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveSpeechId(null);
    setMessages([DEFAULT_WELCOME]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSend = async (overrideQuery = null) => {
    const q = (overrideQuery !== null ? overrideQuery : inputQuery).trim();
    if (!q || loading) return;

    setShowSuggestions(false);

    const userMsg = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q })
      });
      const data = await res.json();

      const botMsg = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: data.answer || "No response received.",
        metrics: data.metrics || [],
        products: data.products || [],
        actions: data.actions || [],
        chips: data.chips || [],
        customer: data.customer || null,
        table: data.table || null,
        intent: data.intent || null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'bot_err_' + Date.now(),
          sender: 'bot',
          text: `⚠️ Could not reach store server: ${err.message}`,
          chips: [
            { label: "👔 Check full sleeve shirts", query: "how many full sleeves shirt are present" },
            { label: "💰 Today's sales summary", query: "what is today's total sales and UPI split" }
          ],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = (action) => {
    if (!action) return;
    if (action.type === 'NAVIGATE') {
      if (onNavigateTab) {
        onNavigateTab(action.tab);
      } else {
        window.dispatchEvent(new CustomEvent('switchTab', { detail: action.tab }));
      }
      setIsOpen(false);
    } else if (action.type === 'PA_ANNOUNCE' && action.text) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(action.text);
        utt.rate = 0.9;
        utt.pitch = 0.95;
        utt.lang = 'en-IN';
        window.speechSynthesis.speak(utt);
      }
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20 group"
          title="Open Cobb AI Copilot (Ctrl+K)"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-xs font-bold tracking-wide">Ask Cobb AI</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-white/20 font-mono font-semibold">
            Ctrl+K
          </span>
        </button>
      )}

      {/* Floating Chat Drawer / Popover */}
      {isOpen && (
        <div
          className={`fixed bottom-20 right-2 sm:bottom-6 sm:right-6 z-50 w-[96vw] sm:w-[460px] h-[560px] sm:h-[620px] max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border transition-all animate-in fade-in slide-in-from-bottom-5 duration-200 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center space-x-1.5">
                  <span>Cobb AI Copilot</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-blue-100">Live POS & Inventory Intelligence</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Clear conversation history"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {onOpenFullTab && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullTab();
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Open full-screen Copilot tab"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Carousel Bar */}
          <div
            className={`px-3 py-2 border-b flex items-center space-x-1.5 overflow-x-auto no-scrollbar text-xs shrink-0 ${
              darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={() => handleSend("how many full sleeves shirt are present")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 font-bold text-[10.5px] border border-blue-200 dark:border-blue-800 hover:scale-102 transition-transform cursor-pointer"
            >
              👔 Full Sleeves
            </button>
            <button
              type="button"
              onClick={() => handleSend("size 40 shirts in stock")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 font-bold text-[10.5px] border border-purple-200 dark:border-purple-800 hover:scale-102 transition-transform cursor-pointer"
            >
              📏 Size 40 Shirts
            </button>
            <button
              type="button"
              onClick={() => handleSend("what is today's total sales and UPI split")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 font-bold text-[10.5px] border border-emerald-200 dark:border-emerald-800 hover:scale-102 transition-transform cursor-pointer"
            >
              💰 Today's Sales
            </button>
            <button
              type="button"
              onClick={() => handleSend("what parcels are in transit from head office")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 font-bold text-[10.5px] border border-amber-200 dark:border-amber-800 hover:scale-102 transition-transform cursor-pointer"
            >
              🚚 In Transit
            </button>
            <button
              type="button"
              onClick={() => handleSend("which items are low on stock")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 font-bold text-[10.5px] border border-rose-200 dark:border-rose-800 hover:scale-102 transition-transform cursor-pointer"
            >
              🚨 Low Stock
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs custom-scrollbar">
            {messages.map((m) => {
              const isBot = m.sender === 'bot';
              return (
                <div key={m.id} className={`flex items-start space-x-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
                  {isBot && (
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl transition-all ${
                      isBot
                        ? darkMode
                          ? 'bg-slate-800/90 text-slate-100 border border-slate-700/60 shadow-sm'
                          : 'bg-slate-100 text-slate-800 border border-slate-200/80 shadow-xs'
                        : 'bg-blue-600 text-white rounded-tr-xs shadow-sm'
                    }`}
                  >
                    {/* Header bar of bot bubble */}
                    {isBot && (
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-inherit opacity-80 text-[10px]">
                        <span className="font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-blue-400" />
                          Cobb AI
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => speakText(m.id, m.text)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              activeSpeechId === m.id
                                ? 'text-blue-400 bg-blue-500/20 animate-pulse'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title={activeSpeechId === m.id ? 'Stop audio' : 'Listen to response'}
                          >
                            {activeSpeechId === m.id ? (
                              <VolumeX className="w-3.5 h-3.5" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span>{m.time}</span>
                        </div>
                      </div>
                    )}

                    {/* Text Body */}
                    <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>

                    {/* Rich Product Cards (e.g. for Size Stock lookups) */}
                    {m.products && m.products.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/50 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Package className="w-3 h-3 text-blue-400" /> Available Inventory Items:
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {m.products.map((p, pIdx) => (
                            <div
                              key={pIdx}
                              className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                                darkMode ? 'bg-slate-900/80 border-slate-700/60' : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-[11px] text-blue-400">
                                    {p.articleNo}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                      darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    Size {p.size}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {p.itemName} • {p.color}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block ${
                                    p.stock > 5
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                      : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                  }`}
                                >
                                  {p.stock} pcs
                                </span>
                                {p.mrp && <p className="text-[9px] font-mono text-slate-400 mt-0.5">{p.mrp}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metrics Banner */}
                    {m.metrics && m.metrics.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-700/50">
                        {m.metrics.slice(0, 4).map((met, i) => (
                          <div key={i} className="p-1.5 rounded-lg bg-black/10 dark:bg-white/5 border border-inherit">
                            <div className="text-[9.5px] text-slate-400 uppercase tracking-tight">{met.label}</div>
                            <div className="text-xs font-bold text-blue-500 dark:text-blue-400 mt-0.5">{met.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactive Action Triggers */}
                    {m.actions && m.actions.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-wrap gap-1.5">
                        {m.actions.map((act, actIdx) => (
                          <button
                            key={actIdx}
                            type="button"
                            onClick={() => executeAction(act)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <span>{act.label}</span>
                            <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Follow-up Question Chips */}
                    {m.chips && m.chips.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-wrap gap-1">
                        {m.chips.slice(0, 3).map((ch, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSend(ch.query)}
                            className="text-[10px] font-medium px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors cursor-pointer"
                          >
                            {ch.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Checking live database...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Suggestions Tray (Appears above input) */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className={`p-2 border-t space-y-1 max-h-36 overflow-y-auto custom-scrollbar shrink-0 ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between px-1.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1">
                  <Search className="w-2.5 h-2.5 text-blue-400" /> Suggested Matches
                </span>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="hover:underline cursor-pointer"
                >
                  dismiss
                </button>
              </div>
              {suggestions.map((sug, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => handleSend(sug.query)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-[11px] group ${
                    darkMode
                      ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-200'
                      : 'bg-white hover:bg-blue-50/60 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-1.5 truncate">
                    <span className="truncate font-medium group-hover:text-blue-400 transition-colors">
                      {sug.label}
                    </span>
                  </div>
                  {sug.meta && (
                    <span className="text-[9.5px] text-slate-400 shrink-0 ml-2 font-mono">
                      {sug.meta}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className={`p-3 border-t shrink-0 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div
              className={`flex items-center rounded-xl border px-3 py-1.5 transition-all ${
                isListening
                  ? 'ring-2 ring-red-500 border-red-500'
                  : 'focus-within:ring-2 focus-within:ring-blue-500'
              } ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isListening ? "Listening... speak query" : "Ask stock, size, customer, sales..."}
                className="w-full text-xs bg-transparent outline-none pr-2"
              />

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isListening
                      ? 'text-red-500 bg-red-500/10 animate-pulse'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  disabled={!inputQuery.trim() || loading}
                  onClick={() => handleSend()}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    inputQuery.trim() && !loading
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-600 opacity-40'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
