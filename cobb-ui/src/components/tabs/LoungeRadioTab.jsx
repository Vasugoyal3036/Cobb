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
  Timer,
  Megaphone,
  Zap,
  Loader,
  ExternalLink,
  Link,
  X,
  Check
} from 'lucide-react';

// Curated long-running lounge/ambient YouTube videos (8–12 hour compilations)
const PLAYLISTS = [
  {
    id: 'jazz_cafe',
    name: 'Jazz Café Lounge',
    desc: '8-hour smooth jazz for luxury retail',
    emoji: '🎷',
    videoId: 'Dx5qFachd3A',
  },
  {
    id: 'bossa_nova',
    name: 'Bossa Nova & Soul',
    desc: 'Relaxed Brazilian vibes for fitting rooms',
    emoji: '🎵',
    videoId: 'NJuSStkIZBg',
  },
  {
    id: 'piano_ambient',
    name: 'Soft Piano Ambient',
    desc: 'Elegant instrumental for focused shopping',
    emoji: '🎹',
    videoId: 'lTRiuFIWV54',
  },
  {
    id: 'lounge_chill',
    name: 'Luxury Lounge Chill',
    desc: '5-star hotel lobby atmosphere',
    emoji: '🏨',
    videoId: 'kZYIOYGSMaI',
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

function extractVideoId(input) {
  if (!input) return null;
  // Already a clean video ID (11 chars)
  if (/^[A-Za-z0-9_-]{11}$/.test(input.trim())) return input.trim();
  // youtube.com/watch?v=ID
  const match = input.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function LoungeRadioTab({ darkMode }) {
  const playerRef = useRef(null);
  const playerReadyRef = useRef(false);
  const iframeContainerRef = useRef(null);
  const intervalRef = useRef(null);

  const [activePlaylist, setActivePlaylist] = useState(PLAYLISTS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customVideoId, setCustomVideoId] = useState('');
  const [customError, setCustomError] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState(ANNOUNCEMENT_PRESETS[0]);
  const [customText, setCustomText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState('');
  const [ttsSupported, setTtsSupported] = useState(false);
  const [ttsVoice, setTtsVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [announcementCount, setAnnouncementCount] = useState(0);

  const [autoInterval, setAutoInterval] = useState(0);
  const [nextAnnouncementIn, setNextAnnouncementIn] = useState(null);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer(activePlaylist.videoId);
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      initPlayer(activePlaylist.videoId);
    };

    return () => {
      window.onYouTubeIframeAPIReady = null;
    };
  }, []);

  const initPlayer = (videoId) => {
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch (e) {}
      playerRef.current = null;
    }
    playerReadyRef.current = false;
    setPlayerLoaded(false);

    if (!document.getElementById('yt-player-container')) return;

    // Reset the container div
    const container = document.getElementById('yt-player-inner');
    if (container) container.innerHTML = '<div id="yt-player"></div>';

    playerRef.current = new window.YT.Player('yt-player', {
      height: '100%',
      width: '100%',
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        loop: 1,
        playlist: videoId,
      },
      events: {
        onReady: (e) => {
          playerReadyRef.current = true;
          e.target.setVolume(volume);
          setPlayerLoaded(true);
        },
        onStateChange: (e) => {
          setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
        },
        onError: () => {
          setPlayerLoaded(true); // allow UI to still show
        }
      }
    });
  };

  const switchPlaylist = (playlist) => {
    setActivePlaylist(playlist);
    setIsPlaying(false);
    setPlayerLoaded(false);
    setCustomVideoId('');
    setCustomUrl('');
    setShowCustomInput(false);
    if (window.YT && window.YT.Player) {
      setTimeout(() => initPlayer(playlist.videoId), 100);
    }
  };

  const handleCustomUrl = () => {
    const vid = extractVideoId(customUrl);
    if (!vid) {
      setCustomError('Invalid YouTube URL or video ID');
      return;
    }
    setCustomError('');
    setCustomVideoId(vid);
    setActivePlaylist({ id: 'custom', name: 'Custom YouTube', desc: customUrl, emoji: '🔗', videoId: vid });
    setIsPlaying(false);
    setPlayerLoaded(false);
    if (window.YT && window.YT.Player) {
      setTimeout(() => initPlayer(vid), 100);
    }
    setShowCustomInput(false);
  };

  const togglePlay = () => {
    if (!playerRef.current || !playerReadyRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleVolumeChange = (val) => {
    setVolume(val);
    if (playerRef.current && playerReadyRef.current) {
      playerRef.current.setVolume(val);
      if (val > 0) setIsMuted(false);
    }
  };

  const handleMute = () => {
    if (!playerRef.current || !playerReadyRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  // TTS setup
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) { setTtsSupported(false); return; }
    setTtsSupported(true);

    const loadVoices = () => {
      const all = synth.getVoices().filter(v => v.lang.startsWith('en'));
      const preferred = all.filter(v =>
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('google') ||
        v.name.toLowerCase().includes('natural')
      );
      setAvailableVoices(all);
      setTtsVoice(preferred[0] || all[0] || null);
    };
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    return () => { synth.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text) => {
    const synth = window.speechSynthesis;
    if (!synth || !text.trim()) return;

    // Dip music volume
    const wasPlaying = isPlaying;
    if (playerRef.current && playerReadyRef.current && wasPlaying) {
      playerRef.current.setVolume(10);
    }

    synth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.voice = ttsVoice;
    utt.rate = 0.88;
    utt.pitch = 0.95;
    utt.volume = 1;
    utt.lang = 'en-IN';

    utt.onstart = () => { setIsSpeaking(true); setSpeakingText(text); };
    utt.onend = () => {
      setIsSpeaking(false);
      setSpeakingText('');
      setAnnouncementCount(c => c + 1);
      if (playerRef.current && playerReadyRef.current && wasPlaying) {
        playerRef.current.setVolume(volume);
      }
    };
    utt.onerror = () => {
      setIsSpeaking(false);
      setSpeakingText('');
      if (playerRef.current && playerReadyRef.current && wasPlaying) {
        playerRef.current.setVolume(volume);
      }
    };
    synth.speak(utt);
  }, [isPlaying, volume, ttsVoice]);

  const handleAnnounce = () => {
    const text = selectedPreset.id === 'custom' ? customText : selectedPreset.text;
    speak(text);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setSpeakingText('');
    if (playerRef.current && playerReadyRef.current) playerRef.current.setVolume(volume);
  };

  // Auto announcement scheduler
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoInterval === 0) { setNextAnnouncementIn(null); return; }

    const text = selectedPreset.id === 'custom' ? customText : selectedPreset.text;
    const ms = autoInterval * 60 * 1000;
    setNextAnnouncementIn(autoInterval);

    intervalRef.current = setInterval(() => {
      if (text.trim()) speak(text);
      setNextAnnouncementIn(autoInterval);
    }, ms);

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
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
          <Radio className="w-6 h-6 text-purple-400" />
          Cobb Lounge Radio
        </h2>
        <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          YouTube-powered ambient music + smart in-store floor announcements via Text-to-Speech
        </p>
      </div>

      {/* YouTube Player Card */}
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 p-5 shadow-2xl shadow-purple-500/10 space-y-4">
        <div className="flex items-start gap-4">
          {/* Station icon & info */}
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-3xl flex-shrink-0">
            {activePlaylist.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-black text-base truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{activePlaylist.name}</p>
              {isPlaying && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse font-semibold">
                  ▶ LIVE
                </span>
              )}
              {isSpeaking && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse font-semibold">
                  <Mic className="w-3 h-3" /> ANNOUNCEMENT
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-0.5 truncate">{activePlaylist.desc}</p>

            {/* Controls row */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <button
                onClick={togglePlay}
                disabled={!playerLoaded}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border font-bold transition-all flex-shrink-0 ${isPlaying
                  ? 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white shadow-purple-500/30'
                  : 'bg-slate-800 hover:bg-purple-700 border-slate-700 text-slate-300 hover:text-white'} ${!playerLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {!playerLoaded
                  ? <Loader className="w-4 h-4 animate-spin" />
                  : isPlaying
                    ? <Pause className="w-4 h-4" />
                    : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button onClick={handleMute} disabled={!playerLoaded} className="text-slate-400 hover:text-white transition-colors disabled:opacity-40">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={volume}
                  onChange={e => handleVolumeChange(Number(e.target.value))}
                  disabled={!playerLoaded}
                  className="w-24 h-1.5 accent-purple-500 disabled:opacity-40"
                />
                <span className="text-xs text-slate-500 w-7">{isMuted ? '🔇' : `${volume}%`}</span>
              </div>

              {/* Open in YouTube */}
              <a
                href={`https://www.youtube.com/watch?v=${activePlaylist.videoId}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-purple-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Open in YouTube
              </a>
            </div>
          </div>
        </div>

        {/* Hidden YouTube player (renders audio; video is visually hidden) */}
        <div id="yt-player-container" className="rounded-xl overflow-hidden border border-purple-500/10" style={{ height: '0px', position: 'absolute', pointerEvents: 'none', opacity: 0 }}>
          <div id="yt-player-inner">
            <div id="yt-player"></div>
          </div>
        </div>

        {/* Visualizer bars (decorative, react to playing state) */}
        <div className="flex items-end gap-[2px] h-5">
          {Array.from({ length: 22 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all ${isPlaying && !isSpeaking ? 'bg-purple-500' : 'bg-slate-700'}`}
              style={{
                height: isPlaying && !isSpeaking
                  ? `${8 + Math.abs(Math.sin(i * 0.6 + Date.now() * 0.001)) * 12}px`
                  : '3px',
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Playlist selector + Custom URL */}
      <div className={`rounded-2xl border p-4 space-y-3 ${darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <p className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Select Music</p>
          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${showCustomInput
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
              : darkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-800'}`}
          >
            <Link className="w-3 h-3" /> Custom YouTube URL
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PLAYLISTS.map(pl => (
            <button
              key={pl.id}
              onClick={() => switchPlaylist(pl)}
              className={`rounded-xl p-3 text-left transition-all border ${activePlaylist.id === pl.id && !customVideoId
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                : darkMode
                  ? 'border-slate-700 hover:border-purple-500/40 text-slate-400 bg-slate-800/50'
                  : 'border-slate-200 hover:border-purple-300 text-slate-600 bg-slate-50'}`}
            >
              <div className="text-xl mb-1">{pl.emoji}</div>
              <div className="font-bold text-xs leading-tight">{pl.name}</div>
              <div className="text-xs opacity-60 mt-0.5 leading-tight">{pl.desc}</div>
            </button>
          ))}
        </div>

        {/* Custom YouTube URL input */}
        {showCustomInput && (
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste YouTube URL or Video ID — e.g. https://youtube.com/watch?v=..."
                value={customUrl}
                onChange={e => { setCustomUrl(e.target.value); setCustomError(''); }}
                className={inputClass}
              />
              <button
                onClick={handleCustomUrl}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-all flex-shrink-0"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
            {customError && <p className="text-xs text-rose-400 flex items-center gap-1"><Zap className="w-3 h-3" /> {customError}</p>}
            <p className="text-xs text-slate-600">
              💡 Tip: Use long lounge/jazz compilations (4–12 hours) for best store experience. The video plays with audio only — video is hidden.
            </p>
          </div>
        )}
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

        {selectedPreset.id === 'custom' ? (
          <textarea
            rows={3}
            placeholder="Type your custom floor announcement here..."
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        ) : (
          <div className={`text-xs italic rounded-xl px-4 py-3 border leading-relaxed ${darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            "{selectedPreset.text.slice(0, 200)}{selectedPreset.text.length > 200 ? '...' : ''}"
          </div>
        )}

        {/* Voice selector */}
        {availableVoices.length > 1 && (
          <div className="flex items-center gap-3">
            <label className={`text-xs font-semibold flex-shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Voice:</label>
            <select
              value={ttsVoice?.name || ''}
              onChange={e => setTtsVoice(availableVoices.find(v => v.name === e.target.value))}
              className={`text-xs px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
            >
              {availableVoices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
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
            <span className="text-xs text-slate-500">{announcementCount} announcement{announcementCount > 1 ? 's' : ''} played</span>
          )}
        </div>

        {isSpeaking && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 animate-pulse">
            <Mic className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300 italic leading-relaxed">{speakingText}</p>
          </div>
        )}
      </div>

      {/* Auto scheduler */}
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
          Music auto-dips to 10% volume during each announcement, then restores automatically.
        </p>
      </div>
    </div>
  );
}
