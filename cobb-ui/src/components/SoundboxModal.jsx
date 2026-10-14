import React, { useState, useEffect, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  Radio,
  RotateCcw,
  Sparkles,
  Check,
  Sliders,
  Languages,
  Store,
  User,
  Mic,
  X,
  Play,
  Bell,
  Coins,
  Flame,
  Zap,
  Info,
  Film,
  Crown,
  Heart,
  Laugh
} from 'lucide-react';
import {
  getSoundboxSettings,
  saveSoundboxSettings,
  speakCheckoutVoice,
  replayLastCheckout,
  getLastCheckout,
  speakStoreBroadcast,
  playCheckoutChime,
  playCashRegisterChaching,
  playJackpotChime,
  playAirhorn,
  BOLLYWOOD_ACTORS
} from '../utils/sound';

export default function SoundboxModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(() => getSoundboxSettings());
  const [voices, setVoices] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const [lastBill, setLastBill] = useState(() => getLastCheckout());
  const [customBroadcast, setCustomBroadcast] = useState('');
  const [activeTab, setActiveTab] = useState('soundbox'); // 'soundbox' | 'bollywood' | 'broadcast' | 'voices'
  const [actorFilter, setActorFilter] = useState('all'); // 'all' | 'titans' | 'comedy' | 'cult'

  // Load available system TTS voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices() || [];
      setVoices(available);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  // Sync settings when opened or updated
  useEffect(() => {
    if (!isOpen) return;
    setSettings(getSoundboxSettings());
    setLastBill(getLastCheckout());

    const handleSettingsUpdated = (e) => {
      if (e?.detail) setSettings(e.detail);
    };
    const handleSpeaking = (e) => {
      setIsSpeaking(true);
      setCurrentSpeechText(e?.detail?.spokenText || 'Broadcasting audio...');
    };
    const handleIdle = () => {
      setIsSpeaking(false);
      setCurrentSpeechText('');
    };

    window.addEventListener('cobb_soundbox_settings_updated', handleSettingsUpdated);
    window.addEventListener('cobb_soundbox_speaking', handleSpeaking);
    window.addEventListener('cobb_soundbox_idle', handleIdle);

    return () => {
      window.removeEventListener('cobb_soundbox_settings_updated', handleSettingsUpdated);
      window.removeEventListener('cobb_soundbox_speaking', handleSpeaking);
      window.removeEventListener('cobb_soundbox_idle', handleIdle);
    };
  }, [isOpen]);

  // Global Keyboard shortcuts: Escape to close, Alt+R to replay last bill
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handleReplay();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const updateSetting = (key, value) => {
    const updated = saveSoundboxSettings({ [key]: value });
    setSettings(updated);
  };

  const handleReplay = () => {
    replayLastCheckout();
    setLastBill(getLastCheckout());
  };

  const handleTestAnnouncement = () => {
    playCheckoutChime();
    setTimeout(() => {
      speakCheckoutVoice({
        amount: 2499,
        paymentMode: 'UPI',
        staffName: 'Simran',
        customerName: 'Rahul Verma',
        billNumber: 'CB-1042'
      });
    }, 350);
  };

  const handleTestActorVoice = (actorId) => {
    const actor = BOLLYWOOD_ACTORS[actorId];
    if (!actor) return;

    if (actor.chimeType === 'airhorn') playAirhorn();
    else if (actor.chimeType === 'jackpot') playJackpotChime();
    else if (actor.chimeType === 'kaching') playCashRegisterChaching();
    else playCheckoutChime();

    setTimeout(() => {
      speakCheckoutVoice({
        amount: 2499,
        paymentMode: 'UPI',
        staffName: 'Simran',
        customerName: 'Rahul Verma',
        billNumber: 'CB-1042',
        overrideActor: actorId
      });
    }, 400);
  };

  const handleBroadcast = (type, text) => {
    speakStoreBroadcast(type, text);
  };

  const actorsList = useMemo(() => {
    return Object.values(BOLLYWOOD_ACTORS);
  }, []);

  const filteredActors = useMemo(() => {
    if (actorFilter === 'all') return actorsList;
    return actorsList.filter(a => a.category === actorFilter);
  }, [actorsList, actorFilter]);

  const activeActorObj = useMemo(() => {
    if (!settings.actorPersona || settings.actorPersona === 'none') return null;
    return BOLLYWOOD_ACTORS[settings.actorPersona] || null;
  }, [settings.actorPersona]);

  // Filter and sort voices: prioritize Indian English and Hindi
  const sortedVoices = useMemo(() => {
    return [...voices].sort((a, b) => {
      const aIsIndian = a.lang === 'en-IN' || a.lang.startsWith('hi');
      const bIsIndian = b.lang === 'en-IN' || b.lang.startsWith('hi');
      if (aIsIndian && !bIsIndian) return -1;
      if (!aIsIndian && bIsIndian) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [voices]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#090d16] border border-white/10 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-rose-500 text-white shadow-lg shadow-cyan-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  COBB SOUNDBOX &bull; BOLLYWOOD CELEBRITY EDITION
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  10 STARS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Store Node #1 &bull; Cobb Pundri &bull; Real-time Offline Voice Audio Counter
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center border-b border-white/10 px-2 sm:px-4 bg-slate-950/60 text-xs font-mono font-bold shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('soundbox')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'soundbox'
                ? 'border-cyan-400 text-cyan-300 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Soundbox Device</span>
          </button>

          <button
            onClick={() => setActiveTab('bollywood')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bollywood'
                ? 'border-rose-400 text-rose-300 bg-rose-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-4 h-4 text-rose-400" />
            <span className="font-black">🎭 Bollywood Stars (10)</span>
            {activeActorObj && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'broadcast'
                ? 'border-cyan-400 text-cyan-300 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Shop Floor Tannoy</span>
          </button>

          <button
            onClick={() => setActiveTab('voices')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'voices'
                ? 'border-cyan-400 text-cyan-300 bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Voice &amp; Tuning</span>
          </button>
        </div>

        {/* BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">

          {/* TAB 1: HARDWARE SIMULATOR & CORE CONTROLS */}
          {activeTab === 'soundbox' && (
            <div className="space-y-6">
              
              {/* HARDWARE SOUNDBOX GADGET */}
              <div className="relative p-5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-[#050811] border border-white/15 shadow-2xl overflow-hidden">
                {/* Glowing Ambient Halo */}
                <div
                  className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-all duration-500 ${
                    isSpeaking
                      ? 'bg-emerald-500/40 animate-pulse'
                      : activeActorObj
                      ? 'bg-rose-500/30'
                      : settings.mode === 'muted'
                      ? 'bg-rose-500/20'
                      : 'bg-cyan-500/25'
                  }`}
                />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                  {/* Speaker Mesh & LED Status Ring */}
                  <div className="relative shrink-0 flex items-center justify-center">
                    <div
                      className={`w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-500 relative ${
                        isSpeaking
                          ? 'border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.7)] animate-pulse'
                          : activeActorObj
                          ? 'border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                          : settings.mode === 'muted'
                          ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                          : 'border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.4)]'
                      }`}
                      style={{
                        background: 'radial-gradient(circle, #0f172a 40%, #020617 90%)'
                      }}
                    >
                      {/* Speaker Grill Pattern */}
                      <div className="w-20 h-20 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                        {isSpeaking ? (
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-10 bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-7 bg-emerald-400 rounded-full animate-bounce" />
                          </div>
                        ) : activeActorObj ? (
                          <span className="text-3xl filter drop-shadow">{activeActorObj.avatar}</span>
                        ) : settings.mode === 'muted' ? (
                          <VolumeX className="w-8 h-8 text-rose-400" />
                        ) : (
                          <Volume2 className="w-8 h-8 text-cyan-300" />
                        )}
                      </div>
                    </div>

                    {/* LED Ring Status Badge */}
                    <span
                      className={`absolute bottom-0 px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider border shadow-md ${
                        isSpeaking
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                          : activeActorObj
                          ? 'bg-rose-500 text-white border-rose-400'
                          : settings.mode === 'muted'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      }`}
                    >
                      {isSpeaking ? 'Speaking' : activeActorObj ? activeActorObj.name.split(' ')[0] : settings.mode === 'muted' ? 'Muted' : 'Standby'}
                    </span>
                  </div>

                  {/* LCD Display & Quick Hardware Actions */}
                  <div className="flex-1 w-full space-y-3">
                    {/* LCD Screen Display */}
                    <div className="p-3.5 rounded-2xl bg-black/80 border border-cyan-500/30 font-mono shadow-inner space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                        <span>📟 COBB-BOX-001</span>
                        <span>
                          {activeActorObj ? `STAR: ${activeActorObj.name.toUpperCase()}` : `${settings.language.toUpperCase()}`} &bull; VOL {Math.round(settings.volume * 100)}%
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-black text-white truncate">
                        {isSpeaking ? (
                          <span className="text-emerald-300 animate-pulse">🔊 "{currentSpeechText}"</span>
                        ) : lastBill?.amount ? (
                          <span>Last: ₹{Number(lastBill.amount).toLocaleString('en-IN')} via {lastBill.paymentMode} {lastBill.staffName ? `(${lastBill.staffName})` : ''}</span>
                        ) : (
                          <span className="text-slate-400">Ready for checkouts... (Alt+R to replay)</span>
                        )}
                      </p>
                    </div>

                    {/* Hardware Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleReplay}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title="Replay Last Bill Announcement (Alt+R)"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Replay Last Bill</span>
                        <span className="text-[10px] px-1 py-0.2 bg-black/20 rounded font-mono">Alt+R</span>
                      </button>

                      <button
                        onClick={handleTestAnnouncement}
                        className="py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title="Play Test ₹2,499 Checkout"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Test Voice</span>
                      </button>

                      <button
                        onClick={() => playCheckoutChime()}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition cursor-pointer"
                        title="Test 3-note POS Chime"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOLLYWOOD CELEBRITY BANNER TEASER */}
              <div
                onClick={() => setActiveTab('bollywood')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  activeActorObj
                    ? 'bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-900 border-rose-500/40 shadow-lg shadow-rose-950/30'
                    : 'bg-white/5 hover:bg-white/10 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl p-2 rounded-xl bg-white/10 shrink-0">
                    {activeActorObj ? activeActorObj.avatar : '🎭'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">
                        {activeActorObj ? `${activeActorObj.name} Voice Active` : 'Bollywood Celebrity Pack (10 Stars)'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {activeActorObj ? 'ACTIVE' : 'READY'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 font-mono italic">
                      "{activeActorObj ? activeActorObj.tagline : 'Big B, SRK, Salman, Sunny Deol, Babu Bhaiya & more!'}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-rose-400 hidden sm:inline">
                    {activeActorObj ? 'Change Star' : 'Pick Actor'}
                  </span>
                  <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold">
                    &rarr;
                  </span>
                </div>
              </div>

              {/* OPERATING MODE SELECTOR */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  Soundbox Operating Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'voice_and_chime', label: '🔊 Voice & Chime', sub: 'Full Soundbox' },
                    { id: 'chime_only', label: '🔔 Chime Only', sub: 'Discreet / Quiet' },
                    { id: 'voice_only', label: '🗣️ Voice Only', sub: 'Speech only' },
                    { id: 'muted', label: '🔇 Muted', sub: 'Silent counter' }
                  ].map((m) => {
                    const isSelected = settings.mode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          updateSetting('mode', m.id);
                          updateSetting('voiceEnabled', m.id === 'voice_and_chime' || m.id === 'voice_only');
                          updateSetting('soundEnabled', m.id !== 'muted');
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs font-black">{m.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{m.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LANGUAGE & DIALECT STYLE (When not using celebrity) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
                    Retail Voice Style (Standard)
                  </label>
                  {activeActorObj && (
                    <button
                      onClick={() => updateSetting('actorPersona', 'none')}
                      className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                    >
                      Reset to Standard Voice
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'hinglish',
                      label: '🇮🇳 Hinglish (Paytm Retail)',
                      sample: 'Cobb Pundri: Rupees 2,499 received on UPI',
                      badge: 'Recommended'
                    },
                    {
                      id: 'hindi',
                      label: '🇮🇳 शुद्ध हिन्दी (Hindi)',
                      sample: 'Cobb Pundri mein Rupees 2,499 praapt hue UPI dwara',
                      badge: 'Desi Accent'
                    },
                    {
                      id: 'english',
                      label: '🇬🇧 Executive English',
                      sample: 'Cobb Pundri: Rupees 2,499 received via UPI',
                      badge: 'Classic'
                    }
                  ].map((lang) => {
                    const isSelected = settings.language === lang.id && (!activeActorObj);
                    return (
                      <button
                        key={lang.id}
                        onClick={() => {
                          updateSetting('language', lang.id);
                          updateSetting('actorPersona', 'none');
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-md shadow-indigo-500/15'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-black">
                          <span>{lang.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-mono italic truncate">
                          "{lang.sample}"
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STORE TOGGLES & SMART RECOGNITION */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  Announcement Attributes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    onClick={() => updateSetting('announceStoreName', !settings.announceStoreName)}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-amber-400" />
                        <span>Store Name</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">"Cobb Pundri" prefix</div>
                    </div>
                    <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${settings.announceStoreName ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${settings.announceStoreName ? 'translate-x-3.5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <div
                    onClick={() => updateSetting('announceStaffName', !settings.announceStaffName)}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Staff Credit</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">"Billed by [Name]"</div>
                    </div>
                    <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${settings.announceStaffName ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${settings.announceStaffName ? 'translate-x-3.5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <div
                    onClick={() => updateSetting('announceMode', !settings.announceMode)}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-purple-400" />
                        <span>Payment Mode</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">"via UPI / Cash / Card"</div>
                    </div>
                    <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${settings.announceMode ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${settings.announceMode ? 'translate-x-3.5' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: BOLLYWOOD CELEBRITY PACK (10 ACTORS) */}
          {activeTab === 'bollywood' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/40 to-slate-900 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-200">
                <Sparkles className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <p>
                  Select a celebrity voice profile below. When active, all live checkouts and <kbd className="px-1 py-0.5 bg-black/40 rounded text-rose-300 font-mono">Alt+R</kbd> replays speak the exact bill payment announcement (e.g. <em>"Cobb Pundri par ₹2,499 praapt hue UPI dwara"</em>) cleanly in their vocal style—without any movie dialogues or jokes.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'all', label: 'All 10 Superstars' },
                  { id: 'titans', label: '👑 The Titans (Big B, SRK, Salman, Sunny)' },
                  { id: 'comedy', label: '😂 Comedy Legends (Babu Bhaiya, Raju, Nana, Munna)' },
                  { id: 'cult', label: '💥 Cult Icons (Ranveer, Mogambo)' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActorFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      actorFilter === f.id
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* 10 Actor Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredActors.map((actor) => {
                  const isSelected = settings.actorPersona === actor.id;
                  return (
                    <div
                      key={actor.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-br from-rose-950/50 via-slate-900 to-indigo-950/40 border-rose-400 shadow-xl shadow-rose-950/40'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                      }`}
                    >
                      {/* Top Row: Avatar, Name & Category */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl p-2 rounded-2xl bg-black/40 border border-white/10 shrink-0 shadow-inner">
                            {actor.avatar}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-white">{actor.name}</h3>
                              {isSelected && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-amber-300 block">
                              {actor.character}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-white/10 text-slate-300 shrink-0">
                          {actor.category}
                        </span>
                      </div>

                      {/* Famous Tagline */}
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs font-mono italic text-slate-200">
                        "{actor.tagline}"
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleTestActorVoice(actor.id)}
                          className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          title={`Listen to sample announcement by ${actor.name}`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
                          <span>Test Voice</span>
                        </button>

                        <button
                          onClick={() => {
                            if (isSelected) {
                              updateSetting('actorPersona', 'none');
                            } else {
                              updateSetting('actorPersona', actor.id);
                              handleTestActorVoice(actor.id);
                            }
                          }}
                          className={`py-2 px-4 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                              : 'bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <span>Select Star</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Deactivate Button */}
              {activeActorObj && (
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => updateSetting('actorPersona', 'none')}
                    className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-mono transition cursor-pointer"
                  >
                    &larr; Revert back to Standard Retail Voice
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHOP FLOOR TANNOY (STORE BROADCASTS) */}
          {activeTab === 'broadcast' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3 text-xs text-indigo-200">
                <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  Shop floor broadcasts play a pleasant chime and speak announcements clearly through your counter speakers for walk-in shoppers and staff.
                  {activeActorObj && (
                    <span className="block mt-1 font-bold text-rose-300">
                      🎭 Active Announcer: {activeActorObj.name} ({activeActorObj.character})
                    </span>
                  )}
                </p>
              </div>

              {/* 1-Click Store Broadcast Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  Quick Store Broadcast Presets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'welcome',
                      title: '🛍️ Store Welcome Greeting',
                      desc: 'Welcomes shoppers & invites them to check seasonal denim & shirts.',
                      text: activeActorObj ? activeActorObj.tannoy : 'Welcome to Cobb Pundri. Explore our latest collection of premium shirts, blazers, and denims with special seasonal offers!'
                    },
                    {
                      id: 'offer',
                      title: '🏷️ Buy 3 @ 70% Off Offer Alert',
                      desc: 'Announces the flagship B3 @ 70% mega combo offer to the showroom floor.',
                      text: 'Attention shoppers: Exclusive store offer at Cobb Pundri today! Buy 3 garments and get 70% off flat. Please ask our staff for assistance.'
                    },
                    {
                      id: 'closing',
                      title: '🕒 Closing in 15 Minutes',
                      desc: 'Polite reminder for shoppers to head to the cash counter for billing.',
                      text: 'Attention valued customers: Cobb Pundri will be closing in 15 minutes. Please bring your selected items to the cash counter for billing.'
                    },
                    {
                      id: 'counter_ready',
                      title: '⚡ Next Customer Ready',
                      desc: 'Alerts waiting shoppers that the cash billing desk is open.',
                      text: 'Next customer please, billing counter is open and ready for checkout.'
                    }
                  ].map((preset) => (
                    <div
                      key={preset.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <h4 className="text-xs font-black text-white">{preset.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1">{preset.desc}</p>
                      </div>
                      <button
                        onClick={() => handleBroadcast(preset.id, preset.text)}
                        className="py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Broadcast Now</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Speech Mic Box */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono block">
                  📢 Custom Shop Floor Announcement
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customBroadcast}
                    onChange={(e) => setCustomBroadcast(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customBroadcast.trim()) {
                        handleBroadcast('custom', customBroadcast);
                      }
                    }}
                    placeholder="Type custom counter announcement (e.g. Trial room 2 is now free)..."
                    className="flex-1 py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => {
                      if (customBroadcast.trim()) {
                        handleBroadcast('custom', customBroadcast);
                      }
                    }}
                    disabled={!customBroadcast.trim()}
                    className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Speak</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TTS ENGINE & VOICE TUNING */}
          {activeTab === 'voices' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  Select Speech Synthesizer Voice
                </label>
                <select
                  value={settings.selectedVoiceURI || ''}
                  onChange={(e) => updateSetting('selectedVoiceURI', e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="">Auto-Detect (Indian English / Hindi Preferred)</option>
                  {sortedVoices.map((v) => {
                    const isIndian = v.lang === 'en-IN' || v.lang.startsWith('hi');
                    return (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {isIndian ? '🇮🇳 ' : ''}{v.name} ({v.lang})
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-slate-400 font-mono">
                  Tip: Voices with 🇮🇳 flag sound natural for Indian retail currency pronunciation.
                </p>
              </div>

              {/* Sliders: Rate, Pitch, Volume */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Speech Speed (Rate)</span>
                    <span className="font-mono font-bold text-cyan-300">{settings.speechRate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={settings.speechRate}
                    onChange={(e) => updateSetting('speechRate', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Voice Pitch</span>
                    <span className="font-mono font-bold text-cyan-300">{settings.speechPitch.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={settings.speechPitch}
                    onChange={(e) => updateSetting('speechPitch', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Audio Volume</span>
                    <span className="font-mono font-bold text-cyan-300">{Math.round(settings.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) => updateSetting('volume', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Minimum Threshold */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  Minimum Bill Amount to Announce
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => updateSetting('minAmount', amt)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                        settings.minAmount === amt
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {amt === 0 ? 'All Bills' : `≥ ₹${amt}`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Skip small minor alteration charges if you only want garments spoken out loud.
                </p>
              </div>

              {/* Reset to Defaults */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    updateSetting('speechRate', 1.05);
                    updateSetting('speechPitch', 1.0);
                    updateSetting('volume', 1.0);
                    updateSetting('selectedVoiceURI', '');
                    updateSetting('minAmount', 0);
                    updateSetting('actorPersona', 'none');
                  }}
                  className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Voice Defaults</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {activeActorObj ? (
                <span className="text-rose-300 font-bold">{activeActorObj.avatar} {activeActorObj.name} Mode Active &bull; </span>
              ) : (
                <span>Soundbox Online &bull; </span>
              )}
              Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-slate-200">Alt+R</kbd> anywhere to Replay
            </span>
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
