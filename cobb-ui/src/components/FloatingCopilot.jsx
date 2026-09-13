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
  Loader2
} from 'lucide-react';

export default function FloatingCopilot({ API_BASE = 'http://localhost:5000', darkMode = false, onOpenFullTab = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome_float',
      sender: 'bot',
      text: "👋 Hi! Need a quick stock or sales check? Ask me anything (e.g. *how many full sleeves shirt are present?*).",
      chips: [
        { label: "👔 Full Sleeve Shirts", query: "how many full sleeves shirt are present" },
        { label: "💰 Today's Sales", query: "what is today's total sales and UPI split" },
        { label: "🚨 Low Stock", query: "which items are low on stock" }
      ],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);
  const speechRecognitionRef = useRef(null);

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

  // Voice speech setup
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

  const toggleSpeech = () => {
    if (!speechRecognitionRef.current) return;
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (e) { }
    }
  };

  const handleSend = async (overrideQuery = null) => {
    const q = (overrideQuery !== null ? overrideQuery : inputQuery).trim();
    if (!q || loading) return;

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

      setMessages(prev => [
        ...prev,
        {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: data.answer || "No response received.",
          metrics: data.metrics || [],
          chips: data.chips || [],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'bot_err_' + Date.now(),
          sender: 'bot',
          text: `⚠️ Could not reach server: ${err.message}`,
          chips: [],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center space-x-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20 group"
          title="Open Cobb AI Copilot (Ctrl+K)"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <span className="text-xs font-bold tracking-wide">Ask Cobb AI</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-white/20 font-mono font-semibold">Ctrl+K</span>
        </button>
      )}

      {/* Floating Chat Drawer / Popover */}
      {isOpen && (
        <div className={`fixed bottom-20 right-2 sm:bottom-6 sm:right-6 z-50 w-[96vw] sm:w-[440px] h-[520px] sm:h-[580px] max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border transition-all animate-in fade-in slide-in-from-bottom-5 duration-200 ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>

          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center space-x-1.5">
                  <span>Cobb AI Copilot</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h3>
                <p className="text-[10px] text-blue-100">Live POS Database Assistant</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {onOpenFullTab && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullTab();
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                  title="Open full-screen Copilot tab"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className={`px-3 py-2 border-b flex items-center space-x-1.5 overflow-x-auto no-scrollbar text-xs ${
            darkMode ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-100'
          }`}>
            <button
              onClick={() => handleSend("how many full sleeves shirt are present")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium text-[11px] hover:scale-102 transition-transform"
            >
              👔 Full Sleeves
            </button>
            <button
              onClick={() => handleSend("what is today's total sales and UPI split")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] hover:scale-102 transition-transform"
            >
              💰 Sales Today
            </button>
            <button
              onClick={() => handleSend("which items are low on stock")}
              className="shrink-0 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium text-[11px] hover:scale-102 transition-transform"
            >
              🚨 Low Stock
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((m) => {
              const isBot = m.sender === 'bot';
              return (
                <div key={m.id} className={`flex items-start space-x-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
                  {isBot && (
                    <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[85%] p-3 rounded-2xl ${
                    isBot
                      ? darkMode
                        ? 'bg-slate-800 text-slate-200 border border-slate-700/60'
                        : 'bg-slate-100 text-slate-800 border border-slate-200/60'
                      : 'bg-blue-600 text-white rounded-tr-xs'
                  }`}>
                    <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>

                    {/* Metrics in popup */}
                    {m.metrics && m.metrics.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-200/40 dark:border-slate-700/50">
                        {m.metrics.slice(0, 2).map((met, i) => (
                          <div key={i} className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5">
                            <div className="text-[10px] text-slate-400 uppercase">{met.label}</div>
                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{met.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Chips in popup */}
                    {m.chips && m.chips.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/40 dark:border-slate-700/50 flex flex-wrap gap-1">
                        {m.chips.slice(0, 2).map((ch, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(ch.query)}
                            className="text-[10px] px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition-colors"
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
              <div className="flex items-center space-x-2 text-slate-400 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Checking store database...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className={`p-3 border-t ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center rounded-xl border px-3 py-1.5 ${
              isListening ? 'ring-2 ring-red-500 border-red-500' : 'focus-within:ring-2 focus-within:ring-blue-500'
            } ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isListening ? "Listening..." : "Ask Cobb Copilot..."}
                className="w-full text-xs bg-transparent outline-none"
              />

              <div className="flex items-center space-x-1 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={toggleSpeech}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Voice input"
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  disabled={!inputQuery.trim() || loading}
                  onClick={() => handleSend()}
                  className={`p-1.5 rounded-lg transition-colors ${
                    inputQuery.trim() && !loading
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 dark:text-slate-600'
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
