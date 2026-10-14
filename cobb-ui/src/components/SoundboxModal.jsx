import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Radio,
  Check,
  Store,
  User,
  X,
  Play,
  Bell,
  Coins,
  Zap
} from 'lucide-react';
import {
  getSoundboxSettings,
  saveSoundboxSettings,
  speakCheckoutVoice,
  replayLastCheckout,
  getLastCheckout,
  playCheckoutChime
} from '../utils/sound';

export default function SoundboxModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(() => getSoundboxSettings());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const [lastBill, setLastBill] = useState(() => getLastCheckout());

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
      setCurrentSpeechText(e?.detail?.spokenText || 'Announcing checkout bill...');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#090d16] border border-white/10 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-emerald-500 text-white shadow-lg shadow-cyan-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  COBB SOUNDBOX &bull; CHECKOUT VOICE ANNOUNCER
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  CLEAR MALE VOICE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Store Node #1 &bull; Cobb Pundri &bull; Real-time Bill Speech Announcer
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

        {/* BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* HARDWARE SOUNDBOX GADGET */}
          <div className="relative p-5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-[#050811] border border-white/15 shadow-2xl overflow-hidden">
            {/* Ambient Halo */}
            <div
              className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-all duration-500 ${
                isSpeaking
                  ? 'bg-emerald-500/40 animate-pulse'
                  : settings.mode === 'muted'
                  ? 'bg-rose-500/20'
                  : 'bg-cyan-500/25'
              }`}
            />

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
              {/* Speaker Mesh & LED Status Ring */}
              <div className="relative shrink-0 flex items-center justify-center">
                <div
                  className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-500 relative ${
                    isSpeaking
                      ? 'border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.7)] animate-pulse'
                      : settings.mode === 'muted'
                      ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                      : 'border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.4)]'
                  }`}
                  style={{
                    background: 'radial-gradient(circle, #0f172a 40%, #020617 90%)'
                  }}
                >
                  {/* Speaker Grill Pattern */}
                  <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                    {isSpeaking ? (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-9 bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-bounce" />
                      </div>
                    ) : settings.mode === 'muted' ? (
                      <VolumeX className="w-7 h-7 text-rose-400" />
                    ) : (
                      <Volume2 className="w-7 h-7 text-cyan-300" />
                    )}
                  </div>
                </div>

                {/* LED Ring Status Badge */}
                <span
                  className={`absolute -bottom-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider border shadow-md ${
                    isSpeaking
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                      : settings.mode === 'muted'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}
                >
                  {isSpeaking ? 'Speaking' : settings.mode === 'muted' ? 'Muted' : 'Online'}
                </span>
              </div>

              {/* LCD Display & Quick Hardware Actions */}
              <div className="flex-1 w-full space-y-3">
                {/* LCD Screen Display */}
                <div className="p-3.5 rounded-2xl bg-black/80 border border-cyan-500/30 font-mono shadow-inner space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                    <span>📟 COBB-BOX-001</span>
                    <span>CLEAR MALE VOICE &bull; VOL {Math.round(settings.volume * 100)}%</span>
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
                    title="Play Test ₹2,499 Checkout Announcement"
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

          {/* SINGLE VOICE INFO CARD */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2 rounded-2xl bg-black/40 border border-white/10 shrink-0 shadow-inner">
                🎙️
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">Madhur (Clear Studio Male Voice)</h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-500 text-slate-950">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 font-mono">
                  Reads bill amount, store name, and payment mode with authentic human male clarity.
                </p>
                <p className="text-[10px] text-cyan-300/80 mt-1 font-mono italic">
                  "कौब पुंडरी पर दो हज़ार चार सौ निन्यानवे रुपये प्राप्त हुए यूपीआई द्वारा।"
                </p>
              </div>
            </div>

            <button
              onClick={handleTestAnnouncement}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              title="Test Voice Announcement"
            >
              <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
              <span className="hidden sm:inline">Test</span>
            </button>
          </div>

          {/* OPERATING MODE SELECTOR */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
              Soundbox Operating Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'voice_and_chime', label: '🔊 Voice & Chime', sub: 'Full Soundbox' },
                { id: 'chime_only', label: '🔔 Chime Only', sub: 'Discreet' },
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

          {/* VOLUME SLIDER */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Counter Speaker Volume</span>
              </span>
              <span className="font-mono font-bold text-cyan-300">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={settings.volume}
              onChange={(e) => updateSetting('volume', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* ANNOUNCEMENT DETAIL TOGGLES */}
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
            </div>
          </div>

          {/* LANGUAGE STYLE */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
              Announcement Language Format
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  id: 'hinglish',
                  label: '🇮🇳 Hindi / Hinglish (Paytm Format)',
                  sample: 'Cobb Pundri par ₹2,499 praapt hue UPI dwara'
                },
                {
                  id: 'english',
                  label: '🇬🇧 Classic English',
                  sample: 'Cobb Pundri: Rupees 2,499 received via UPI'
                }
              ].map((lang) => {
                const isSelected = settings.language === lang.id;
                return (
                  <button
                    key={lang.id}
                    onClick={() => updateSetting('language', lang.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/15'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-black">
                      <span>{lang.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono italic truncate">
                      "{lang.sample}"
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Single Clear Male Voice &bull; Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-slate-200">Alt+R</kbd> anywhere to Replay
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
