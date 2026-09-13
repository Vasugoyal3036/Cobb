import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Music,
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  Clock,
  ChevronRight,
  CheckCircle2,
  Settings,
  Megaphone,
  Zap,
  Timer,
  SkipForward,
  Loader
} from 'lucide-react';

// Curated royalty-free lounge streams (public domain / free use)
const STATIONS = [
  {
    id: 'lounge1',
    name: 'Deep Lounge Jazz',
    desc: 'Smooth jazz perfect for luxury retail',
    emoji: '🎷',
    url: 'https://stream.zeno.fm/2n2j0fmf0tzuv',
    genre: 'Jazz Lounge'
  },
  {
    id: 'lounge2',
    name: 'Café Bossa Nova',
    desc: 'Relaxed Brazilian bossa for fitting rooms',
    emoji: '🎵',
    url: 'https://stream.zeno.fm/yn65f92a5k0uv',
    genre: 'Bossa Nova'
  },
  {
    id: 'lounge3',
    name: 'Hotel Lobby Jazz',
    desc: 'Classic 5-star hotel ambience',
    emoji: '🏨',
    url: 'https://stream.zeno.fm/hcp0qvvhv8zuv',
    genre: 'Hotel Jazz'
  },
  {
    id: 'lounge4',
    name: 'Soft Piano Classics',
    desc: 'Elegant instrumental for focused shopping',
    emoji: '🎹',
    url: 'https://stream.zeno.fm/0r0xa792kwzuv',
    genre: 'Piano'
  },
];

const ANNOUNCEMENT_PRESETS = [
  {
    id: 'welcome',
    label: 'Welcome Greeting',
    emoji: '🙏',
    text: 'Welcome to Cobb Italy. We are delighted to have you in our store today. Our floor staff are here to assist you in finding your perfect look. Please feel free to explore our latest collection of premium menswear.'
  },
  {
    id: 'offer_shirts',
    label: 'Shirt Combo Offer',
    emoji: '👔',
    text: 'Dear valued customers, we have a special complimentary offer today. Purchase any two shirts from our premium Cobb Italy collection and receive one shirt absolutely complimentary. Please visit the counter for styling assistance.'
  },
  {
    id: 'trial_rooms',
    label: 'Trial Room Assist',
    emoji: '🚪',
    text: 'Attention customers in our trial rooms. If you require a different size, color, or style, please let our floor staff know. We are happy to bring your selection directly to your fitting room within minutes.'
  },
  {
    id: 'closing',
    label: 'Closing Reminder',
    emoji: '⏰',
    text: 'Dear valued customers, our store will be closing shortly for the evening. We kindly request you to bring your selections to the billing counter at your earliest convenience. Thank you for shopping at Cobb Italy.'
  },
  {
    id: 'collection',
    label: 'New Collection',
    emoji: '✨',
    text: 'Attention! Cobb Italy is pleased to announce the arrival of our latest Autumn Winter collection. Featuring premium Cobb Smart-Fit formal shirts, Ultra-Fit trousers, and Co-ordinated Sets now available on the ground floor. Ask our staff for a personal styling demonstration.'
  },
  {
    id: 'custom',
    label: 'Custom Message',
    emoji: '✏️',
    text: ''
  }
];

const AUTO_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: 'Every 20 min', value: 20 },
  { label: 'Every 30 min', value: 30 },
  { label: 'Every 60 min', value: 60 },
];

export default function LoungeRadioTab({ darkMode }) {
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  const [activeStation, setActiveStation] = useState(STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState('');

  const [selectedPreset, setSelectedPreset] = useState(ANNOUNCEMENT_PRESETS[0]);
  const [customText, setCustomText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState('');
  const [ttsSupported, setTtsSupported] = useState(false);
  const [ttsVoice, setTtsVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);

  const [autoInterval, setAutoInterval] = useState(0);
  const [nextAnnouncementIn, setNextAnnouncementIn] = useState(null);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [visualizerBars] = useState(Array.from({ length: 18 }, (_, i) => i));

  // TTS setup
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) { setTtsSupported(false); return; }
    setTtsSupported(true);

    const loadVoices = () => {
      const voices = synth.getVoices().filter(v =>
        v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural'))
      );
      const all = synth.getVoices().filter(v => v.lang.startsWith('en'));
      const best = voices.length > 0 ? voices[0] : (all.length > 0 ? all[0] : null);
      setAvailableVoices(all);
      setTtsVoice(best);
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;
    return () => { synth.onvoiceschanged = null; };
  }, []);

  // Audio element volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const playStation = async (station) => {
    setAudioError('');
    setIsLoading(true);
    setActiveStation(station);
    if (audioRef.current) {
      audioRef.current.src = station.url;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        setAudioError('Could not connect to stream. Check internet connection.');
        setIsPlaying(false);
      }
    }
    setIsLoading(false);
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;
    setAudioError('');
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      try {
        audioRef.current.src = activeStation.url;
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        setAudioError('Could not connect to stream. Check internet connection.');
      }
      setIsLoading(false);
    }
  };

  const speak = useCallback((text) => {
    const synth = window.speechSynthesis;
    if (!synth || !text.trim()) return;

    // Pause music during announcement
    const wasPlaying = isPlaying;
    if (audioRef.current && wasPlaying) {
      audioRef.current.volume = 0.1;
    }

    synth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.voice = ttsVoice;
    utt.rate = 0.88;
    utt.pitch = 0.95;
    utt.volume = 1;
    utt.lang = 'en-IN';

    utt.onstart = () => {
      setIsSpeaking(true);
      setSpeakingText(text);
    };
    utt.onend = () => {
      setIsSpeaking(false);
      setSpeakingText('');
      setAnnouncementCount(c => c + 1);
      // Restore music volume
      if (audioRef.current && wasPlaying) {
        audioRef.current.volume = isMuted ? 0 : volume;
      }
    };
    utt.onerror = () => {
      setIsSpeaking(false);
      setSpeakingText('');
      if (audioRef.current && wasPlaying) {
        audioRef.current.volume = isMuted ? 0 : volume;
      }
    };
    synth.speak(utt);
  }, [isPlaying, isMuted, volume, ttsVoice]);

  const handleAnnounce = () => {
    const text = selectedPreset.id === 'custom' ? customText : selectedPreset.text;
    if (!text.trim()) return;
    speak(text);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setSpeakingText('');
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  };

  // Auto announcement scheduler
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoInterval === 0) { setNextAnnouncementIn(null); return; }

    const fireAnnouncement = () => {
      const text = selectedPreset.id === 'custom' ? customText : selectedPreset.text;
      if (text.trim()) speak(text);
    };

    const ms = autoInterval * 60 * 1000;
    setNextAnnouncementIn(autoInterval);

    intervalRef.current = setInterval(() => {
      fireAnnouncement();
      setNextAnnouncementIn(autoInterval);
    }, ms);

    // Countdown display
    let remaining = autoInterval;
    const countdown = setInterval(() => {
      remaining--;
      setNextAnnouncementIn(remaining);
      if (remaining <= 0) clearInterval(countdown);
    }, 60000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdown);
    };
  }, [autoInterval, selectedPreset, customText, speak]);

  const inputClass = `w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 ${darkMode
    ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500'
    : 'bg-white border-slate-200 text-slate-800'}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onError={() => { setAudioError('Stream unavailable'); setIsPlaying(false); }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Header */}
      <div>
        <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
          <Radio className="w-6 h-6 text-purple-400" />
          Cobb Lounge Radio
        </h2>
        <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Ambient luxury lounge music + smart in-store floor announcements
        </p>
      </div>

      {/* Now Playing Card */}
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 p-6 shadow-2xl shadow-purple-500/10">
        <div className="flex items-center gap-4">
          {/* Station icon */}
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-3xl flex-shrink-0 shadow-xl">
            {activeStation.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`font-black text-lg truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{activeStation.name}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 font-semibold">{activeStation.genre}</span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">{activeStation.desc}</p>

            {/* Visualizer bars */}
            <div className="flex items-end gap-[2px] mt-3 h-6">
              {visualizerBars.map(i => (
                <div
                  key={i}
                  className={`w-1 rounded-full bg-purple-500 transition-all ${isPlaying && !isSpeaking
                    ? 'animate-pulse opacity-80'
                    : 'opacity-20'}`}
                  style={{
                    height: isPlaying && !isSpeaking
                      ? `${12 + Math.sin(i * 0.7) * 10 + Math.random() * 4}px`
                      : '4px',
                    animationDelay: `${i * 60}ms`,
                    animationDuration: `${600 + i * 80}ms`
                  }}
                />
              ))}
              {isSpeaking && (
                <span className="ml-2 text-xs text-amber-400 font-bold animate-pulse flex items-center gap-1">
                  <Mic className="w-3 h-3" /> LIVE ANNOUNCEMENT
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all border font-bold ${isPlaying
                ? 'bg-purple-600 hover:bg-purple-500 border-purple-500 shadow-purple-500/30 text-white'
                : 'bg-slate-800 hover:bg-purple-600 border-slate-700 hover:border-purple-500 text-slate-300 hover:text-white'}`}
            >
              {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white transition-colors">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                className="w-20 h-1.5 accent-purple-500"
              />
            </div>
          </div>
        </div>

        {audioError && (
          <p className="text-xs text-rose-400 mt-3 flex items-center gap-1">
            <Zap className="w-3 h-3" /> {audioError}
          </p>
        )}
      </div>

      {/* Station Selector */}
      <div className={`rounded-2xl border p-4 space-y-3 ${darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
        <p className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Select Station</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STATIONS.map(station => (
            <button
              key={station.id}
              onClick={() => playStation(station)}
              className={`rounded-xl p-3 text-left transition-all border ${activeStation.id === station.id
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                : darkMode
                  ? 'border-slate-700 hover:border-purple-500/40 text-slate-400 hover:text-purple-300 bg-slate-800/50'
                  : 'border-slate-200 hover:border-purple-300 text-slate-600 hover:text-purple-600 bg-slate-50'}`}
            >
              <div className="text-xl mb-1">{station.emoji}</div>
              <div className="font-bold text-xs leading-tight">{station.name}</div>
              <div className="text-xs opacity-60 mt-0.5 leading-tight">{station.genre}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Floor Announcements */}
      <div className={`rounded-2xl border p-5 space-y-4 ${darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <p className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            <Megaphone className="w-4 h-4 text-amber-400" />
            In-Store Floor Announcements
          </p>
          {!ttsSupported && (
            <span className="text-xs text-rose-400 flex items-center gap-1">
              <Zap className="w-3 h-3" /> TTS not supported in this browser
            </span>
          )}
        </div>

        {/* Preset picker */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ANNOUNCEMENT_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset)}
              className={`rounded-xl p-2.5 text-left transition-all border text-xs ${selectedPreset.id === preset.id
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : darkMode
                  ? 'border-slate-700 hover:border-amber-500/40 text-slate-400 bg-slate-800/50'
                  : 'border-slate-200 hover:border-amber-300 text-slate-600 bg-slate-50'}`}
            >
              <span className="text-base">{preset.emoji}</span>
              <p className="font-bold mt-0.5">{preset.label}</p>
            </button>
          ))}
        </div>

        {/* Custom text if selected */}
        {selectedPreset.id === 'custom' ? (
          <textarea
            rows={3}
            placeholder="Type your custom floor announcement here..."
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        ) : (
          <div className={`text-xs italic rounded-xl px-4 py-3 border ${darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            "{selectedPreset.text.slice(0, 180)}{selectedPreset.text.length > 180 ? '...' : ''}"
          </div>
        )}

        {/* TTS Voice selector */}
        {availableVoices.length > 1 && (
          <div className="flex items-center gap-3">
            <label className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Voice:</label>
            <select
              value={ttsVoice?.name || ''}
              onChange={e => setTtsVoice(availableVoices.find(v => v.name === e.target.value))}
              className={`text-xs px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-purple-500 ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
            >
              {availableVoices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
          </div>
        )}

        {/* Speak button */}
        <div className="flex items-center gap-3">
          {isSpeaking ? (
            <button
              onClick={stopSpeaking}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
            >
              <Pause className="w-4 h-4" /> Stop Announcement
            </button>
          ) : (
            <button
              onClick={handleAnnounce}
              disabled={!ttsSupported || (selectedPreset.id === 'custom' && !customText.trim())}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              <Mic className="w-4 h-4" />
              🎙️ Play Announcement
            </button>
          )}
          {announcementCount > 0 && (
            <span className="text-xs text-slate-500">{announcementCount} announcement{announcementCount > 1 ? 's' : ''} played today</span>
          )}
        </div>

        {isSpeaking && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 animate-pulse">
            <Mic className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300 italic leading-relaxed">{speakingText}</p>
          </div>
        )}
      </div>

      {/* Auto Scheduler */}
      <div className={`rounded-2xl border p-4 space-y-3 ${darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <p className={`font-bold flex items-center gap-2 text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            <Timer className="w-4 h-4 text-blue-400" />
            Auto Schedule Announcements
          </p>
          {nextAnnouncementIn !== null && (
            <span className="text-xs text-blue-400 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" /> Next in ~{nextAnnouncementIn} min
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {AUTO_INTERVALS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setAutoInterval(opt.value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${autoInterval === opt.value
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                : 'border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-400'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          When active, the selected preset announcement will play through your store speakers at the chosen interval. Music volume auto-dips during announcements.
        </p>
      </div>
    </div>
  );
}
