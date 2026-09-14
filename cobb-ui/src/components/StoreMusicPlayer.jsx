import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Shuffle,
  Repeat,
  Heart,
  ListMusic,
  Radio,
  Upload,
  Sparkles,
  SlidersHorizontal,
  FolderPlus,
  Loader2,
  Check,
  Disc3,
  Music,
  Wifi,
  Trash2
} from 'lucide-react';

const STATIONS = [
  {
    id: 'groovesalad',
    name: 'Chill Retail Lounge',
    artist: 'SomaFM • Groove Salad',
    genre: 'Downtempo Ambient Beats',
    vibe: 'Relaxed Shopping Atmosphere',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
    gradient: 'from-[#10b981] via-[#059669] to-[#047857]',
    accentColor: '#10b981',
    coverIcon: '🌿',
  },
  {
    id: 'poptron',
    name: 'Store Energy & Hits',
    artist: 'SomaFM • PopTron',
    genre: 'Electropop & Indie Commercial',
    vibe: 'Youth Fashion & Peak Hours',
    url: 'https://ice1.somafm.com/poptron-128-mp3',
    gradient: 'from-[#6366f1] via-[#4f46e5] to-[#4338ca]',
    accentColor: '#6366f1',
    coverIcon: '⚡',
  },
  {
    id: 'suburbsofgoa',
    name: 'Desi Fusion & Lounge',
    artist: 'SomaFM • Suburbs of Goa',
    genre: 'Asian Lounge & Indian Chill',
    vibe: 'Festive & Ethnic Ambient',
    url: 'https://ice1.somafm.com/suburbsofgoa-128-mp3',
    gradient: 'from-[#f59e0b] via-[#d97706] to-[#b45309]',
    accentColor: '#f59e0b',
    coverIcon: '🪕',
  },
  {
    id: 'lush',
    name: 'Acoustic Boutique Cafe',
    artist: 'SomaFM • Lush',
    genre: 'Warm Vocals & Gentle Guitar',
    vibe: 'Cozy Luxury Fitting Experience',
    url: 'https://ice1.somafm.com/lush-128-mp3',
    gradient: 'from-[#ec4899] via-[#db2777] to-[#be185d]',
    accentColor: '#ec4899',
    coverIcon: '☕',
  },
  {
    id: 'secretagent',
    name: 'Classy Menswear Jazz',
    artist: 'SomaFM • Secret Agent',
    genre: 'Retro Spy Lounge & Smooth Jazz',
    vibe: 'Sophisticated Suiting & Formal',
    url: 'https://ice1.somafm.com/secretagent-128-mp3',
    gradient: 'from-[#06b6d4] via-[#0891b2] to-[#0e7490]',
    accentColor: '#06b6d4',
    coverIcon: '🍸',
  },
  {
    id: 'indiepop',
    name: 'Casual Streetwear Beats',
    artist: 'SomaFM • Indie Pop',
    genre: 'Modern Indie & Guitar Pop',
    vibe: 'Denim & Trendy Casuals',
    url: 'https://ice1.somafm.com/indiepop-128-mp3',
    gradient: 'from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9]',
    accentColor: '#8b5cf6',
    coverIcon: '🎧',
  },
];

export default function StoreMusicPlayer() {
  const [mode, setMode] = useState('radio'); // 'radio' | 'local'
  const [stationIdx, setStationIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('cobb_spotify_vol');
    return saved !== null ? parseFloat(saved) : 0.75;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // Streaming uptime simulation
  const [streamElapsed, setStreamElapsed] = useState(0);

  // Local files
  const [localTracks, setLocalTracks] = useState([]);
  const [localIdx, setLocalIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamTimerRef = useRef(null);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Stream elapsed timer when playing live radio
  useEffect(() => {
    if (isPlaying && mode === 'radio') {
      streamTimerRef.current = setInterval(() => {
        setStreamElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(streamTimerRef.current);
      if (!isPlaying) setStreamElapsed(0);
    }
    return () => clearInterval(streamTimerRef.current);
  }, [isPlaying, mode]);

  const selectStation = (idx, autoPlay = true) => {
    setStationIdx(idx);
    setMode('radio');
    setStreamElapsed(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = STATIONS[idx].url;
      audioRef.current.load();
      if (autoPlay) {
        setIsLoading(true);
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        }).catch(err => {
          console.warn('Playback error:', err);
          setIsPlaying(false);
          setIsLoading(false);
        });
      } else {
        setIsPlaying(false);
        setIsLoading(false);
      }
    }
  };

  const selectLocalTrack = (idx, autoPlay = true) => {
    if (!localTracks[idx]) return;
    setLocalIdx(idx);
    setMode('local');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = localTracks[idx].url;
      audioRef.current.load();
      if (autoPlay) {
        setIsLoading(true);
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        }).catch(err => {
          console.warn('Local playback error:', err);
          setIsPlaying(false);
          setIsLoading(false);
        });
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      if (!audioRef.current.src) {
        if (mode === 'radio') {
          audioRef.current.src = STATIONS[stationIdx].url;
        } else if (localTracks.length > 0) {
          audioRef.current.src = localTracks[localIdx].url;
        }
      }
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      }).catch(err => {
        console.warn('Play failed:', err);
        setIsPlaying(false);
        setIsLoading(false);
      });
    }
  };

  const handleNext = () => {
    if (mode === 'radio') {
      let nextIdx;
      if (shuffle) {
        nextIdx = Math.floor(Math.random() * STATIONS.length);
      } else {
        nextIdx = (stationIdx + 1) % STATIONS.length;
      }
      selectStation(nextIdx, isPlaying);
    } else if (localTracks.length > 0) {
      let nextIdx;
      if (shuffle) {
        nextIdx = Math.floor(Math.random() * localTracks.length);
      } else {
        nextIdx = (localIdx + 1) % localTracks.length;
      }
      selectLocalTrack(nextIdx, isPlaying);
    }
  };

  const handlePrev = () => {
    if (mode === 'radio') {
      const prevIdx = (stationIdx - 1 + STATIONS.length) % STATIONS.length;
      selectStation(prevIdx, isPlaying);
    } else if (localTracks.length > 0) {
      const prevIdx = (localIdx - 1 + localTracks.length) % localTracks.length;
      selectLocalTrack(prevIdx, isPlaying);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems = files.map(file => ({
      name: file.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(file),
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      file
    }));

    setLocalTracks(prev => [...prev, ...newItems]);
    setMode('local');
    setLocalIdx(localTracks.length);
    setTimeout(() => {
      selectLocalTrack(localTracks.length, true);
    }, 50);
    e.target.value = '';
  };

  const handleVolume = (val) => {
    setVolume(val);
    localStorage.setItem('cobb_spotify_vol', val);
    if (isMuted && val > 0) setIsMuted(false);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentStation = STATIONS[stationIdx];
  const currentTrack = localTracks[localIdx];

  // Scrub bar percentage calculation
  const progressPct = mode === 'local' 
    ? (duration ? (currentTime / duration) * 100 : 0)
    : 100; // live stream shows full active bar

  return (
    <div className="bg-[#121212] text-white rounded-2xl border border-[#282828] shadow-2xl p-4 transition-all relative overflow-hidden select-none font-sans">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current && mode === 'local') {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
          }
        }}
        onEnded={() => {
          if (mode === 'local') {
            if (repeat) {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
              }
            } else {
              handleNext();
            }
          }
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onError={() => {
          setIsLoading(false);
          setIsPlaying(false);
        }}
      />

      {/* Top Brand & Mode Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#282828]">
        <div className="flex items-center gap-2.5">
          {/* Spotify Green Icon */}
          <div className="w-6 h-6 rounded-full bg-[#1db954] flex items-center justify-center shadow-[0_0_12px_rgba(29,185,84,0.4)]">
            <svg className="w-3.5 h-3.5 fill-black" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.216.353-.674.467-1.027.25-2.813-1.718-6.354-2.107-10.526-1.155-.403.093-.804-.158-.897-.561-.093-.404.158-.804.561-.897 4.571-1.045 8.492-.596 11.638 1.336.354.217.468.674.251 1.027zm1.467-3.26c-.272.441-.849.582-1.29.31-3.22-1.978-8.128-2.55-11.936-1.393-.497.151-1.025-.133-1.176-.63-.151-.497.133-1.025.63-1.176 4.354-1.321 9.775-.68 13.462 1.587.441.272.582.85.31 1.302zm.126-3.395C15.234 8.358 8.878 8.147 5.17 9.273c-.604.184-1.24-.165-1.424-.769-.184-.604.165-1.24.769-1.424 4.258-1.293 11.282-1.043 15.727 1.597.544.323.722 1.028.399 1.572-.323.543-1.028.721-1.55.473z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-white">
                Spotify Store Audio
              </span>
              {isPlaying ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#1db954]/20 text-[#1ed760] border border-[#1db954]/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] animate-ping" />
                  Playing
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#b3b3b3] px-2 py-0.5 rounded-full bg-[#282828]">
                  Paused
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Source Mode Switcher */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('radio');
              if (isPlaying && mode !== 'radio') selectStation(stationIdx, true);
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'radio'
                ? 'bg-white text-black font-extrabold shadow-sm'
                : 'bg-[#282828] text-[#b3b3b3] hover:text-white hover:bg-[#333333]'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Curated Radio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (localTracks.length === 0) {
                fileInputRef.current?.click();
              } else {
                setMode('local');
                if (isPlaying && mode !== 'local') selectLocalTrack(localIdx, true);
              }
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'local'
                ? 'bg-white text-black font-extrabold shadow-sm'
                : 'bg-[#282828] text-[#b3b3b3] hover:text-white hover:bg-[#333333]'
            }`}
          >
            <FolderPlus className="w-3 h-3" />
            <span>Local Files {localTracks.length > 0 && `(${localTracks.length})`}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setShowQueue(!showQueue)}
            title="Browse Playlists & Channels"
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              showQueue ? 'bg-[#1ed760] text-black font-bold' : 'bg-[#282828] text-[#b3b3b3] hover:text-white hover:bg-[#333333]'
            }`}
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Spotify Signature 3-Section Player Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        
        {/* Section 1: Now Playing Track Info (cols 1-4) */}
        <div className="md:col-span-4 flex items-center gap-3 min-w-0">
          {/* Album Artwork with Spotify styling */}
          <div className="relative flex-shrink-0 group cursor-pointer">
            <div
              className={`w-14 h-14 rounded-lg bg-gradient-to-br ${
                mode === 'radio' ? currentStation.gradient : 'from-[#6366f1] to-[#a855f7]'
              } flex items-center justify-center text-2xl shadow-lg transition-transform group-hover:scale-102`}
            >
              {mode === 'radio' ? currentStation.coverIcon : '🎵'}
            </div>

            {/* Vinyl spin indicator on play */}
            {isPlaying && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#121212] flex items-center justify-center border border-[#282828]">
                <Disc3 className="w-3 h-3 text-[#1ed760] animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            )}
          </div>

          {/* Track Titles */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white hover:underline cursor-pointer truncate">
                {mode === 'radio'
                  ? currentStation.name
                  : (currentTrack ? currentTrack.name : 'No Songs Selected')}
              </h4>
            </div>
            <p className="text-[11px] text-[#b3b3b3] hover:underline hover:text-white cursor-pointer truncate">
              {mode === 'radio'
                ? currentStation.artist
                : (currentTrack ? currentTrack.size : 'Click "Local Files" to add')}
            </p>
            <p className="text-[10px] text-[#1ed760] font-medium truncate mt-0.5">
              {mode === 'radio' ? currentStation.vibe : 'In-Store Local MP3 Audio'}
            </p>
          </div>

          {/* Heart / Like button */}
          <button
            type="button"
            onClick={() => setIsLiked(!isLiked)}
            className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer p-1"
            title={isLiked ? 'Remove from Your Library' : 'Save to Your Library'}
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                isLiked ? 'fill-[#1ed760] text-[#1ed760]' : ''
              }`}
            />
          </button>

          {/* Equalizer Waveform bars */}
          <div className="hidden sm:flex items-end gap-[2px] h-5 px-1 flex-shrink-0">
            {[60, 100, 45, 90, 70].map((h, i) => (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-all duration-200 ${
                  isPlaying ? 'bg-[#1ed760] animate-pulse' : 'bg-[#404040] h-[3px]'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(4, (h * (volume || 0.5)) * 0.2)}px` : '3px',
                  animationDelay: `${i * 100}ms`,
                  animationDuration: `${350 + (i % 3) * 120}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Section 2: Player Controls & Timeline Scrubber (cols 5-8) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center gap-1.5 w-full">
          {/* Controls row */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Shuffle */}
            <button
              type="button"
              onClick={() => setShuffle(!shuffle)}
              className={`p-1 transition-colors cursor-pointer relative ${
                shuffle ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
              }`}
              title="Enable Shuffle"
            >
              <Shuffle className="w-3.5 h-3.5" />
              {shuffle && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />}
            </button>

            {/* Skip Back */}
            <button
              type="button"
              onClick={handlePrev}
              className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer active:scale-90"
              title="Previous"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Main Play / Pause Circle */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading || (mode === 'local' && localTracks.length === 0)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-white/90 text-black flex items-center justify-center shadow-md hover:scale-106 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-black text-black" />
              ) : (
                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
              )}
            </button>

            {/* Skip Forward */}
            <button
              type="button"
              onClick={handleNext}
              className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer active:scale-90"
              title="Next"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Repeat */}
            <button
              type="button"
              onClick={() => setRepeat(!repeat)}
              className={`p-1 transition-colors cursor-pointer relative ${
                repeat ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
              }`}
              title="Enable Repeat"
            >
              <Repeat className="w-3.5 h-3.5" />
              {repeat && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />}
            </button>
          </div>

          {/* Scrub Bar row */}
          <div className="flex items-center gap-2 w-full max-w-md group">
            <span className="text-[10px] font-mono text-[#b3b3b3] w-8 text-right select-none">
              {mode === 'local' ? formatTime(currentTime) : formatTime(streamElapsed)}
            </span>

            {/* Spotify Progress Bar */}
            <div
              className="flex-1 h-1 group-hover:h-1.5 bg-[#4d4d4d] rounded-full relative cursor-pointer flex items-center transition-all overflow-hidden"
              onClick={(e) => {
                if (mode === 'local' && duration && audioRef.current) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  audioRef.current.currentTime = ratio * duration;
                  setCurrentTime(ratio * duration);
                }
              }}
            >
              <div
                className="h-full bg-white group-hover:bg-[#1db954] transition-colors rounded-full relative"
                style={{ width: `${progressPct}%` }}
              >
                {/* Thumb circle on hover */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <span className="text-[10px] font-mono text-[#b3b3b3] w-10 select-none">
              {mode === 'local' ? (
                formatTime(duration)
              ) : (
                <span className="text-[#1ed760] font-black text-[9px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] animate-pulse inline-block" />
                  LIVE
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Section 3: Volume & Queue Tools (cols 9-12) */}
        <div className="md:col-span-3 flex items-center justify-end gap-2.5">
          {/* Mute Button */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Spotify Volume Slider */}
          <div className="w-20 sm:w-24 group relative flex items-center">
            <div
              className="w-full h-1 group-hover:h-1.5 bg-[#4d4d4d] rounded-full relative cursor-pointer flex items-center transition-all overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                handleVolume(ratio);
              }}
            >
              <div
                className="h-full bg-white group-hover:bg-[#1db954] transition-colors rounded-full"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#b3b3b3] w-7 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>

      </div>

      {/* Spotify Playlist & Channels Drawer */}
      {showQueue && (
        <div className="mt-4 pt-3.5 border-t border-[#282828] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                {mode === 'radio' ? 'Curated In-Store Playlists & Stations' : `Local Store MP3 Tracks (${localTracks.length})`}
              </h5>
              <p className="text-[10px] text-[#b3b3b3]">
                {mode === 'radio' ? 'Commercial-free 24/7 high-fidelity streams' : 'Audio files loaded from this device'}
              </p>
            </div>
            {mode === 'local' && localTracks.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsPlaying(false);
                  setLocalTracks([]);
                  setMode('radio');
                }}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear Tracks
              </button>
            )}
          </div>

          {mode === 'radio' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {STATIONS.map((station, idx) => {
                const isSelected = stationIdx === idx && mode === 'radio';
                return (
                  <div
                    key={station.id}
                    onClick={() => selectStation(idx, true)}
                    className={`group/card p-2.5 rounded-xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-2 border ${
                      isSelected
                        ? 'bg-[#282828] border-[#1ed760] shadow-[0_0_15px_rgba(30,215,96,0.15)]'
                        : 'bg-[#181818] hover:bg-[#282828] border-transparent'
                    }`}
                  >
                    {/* Card Cover Art with floating play button */}
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden flex items-center justify-center text-3xl shadow-md"
                         style={{ background: `linear-gradient(135deg, ${station.accentColor}, #000000)` }}>
                      <span>{station.coverIcon}</span>

                      {/* Spotify Hover Play Button */}
                      <div
                        className={`absolute right-1.5 bottom-1.5 w-8 h-8 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105 text-black flex items-center justify-center shadow-xl transition-all duration-200 ${
                          isSelected && isPlaying
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-2 group-hover/card:opacity-100 group-hover/card:translate-y-0'
                        }`}
                      >
                        {isSelected && isPlaying ? (
                          <Pause className="w-4 h-4 fill-black" />
                        ) : (
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div>
                      <h6
                        className={`text-xs font-bold truncate transition-colors ${
                          isSelected ? 'text-[#1ed760]' : 'text-white group-hover/card:text-white'
                        }`}
                      >
                        {station.name}
                      </h6>
                      <p className="text-[10px] text-[#b3b3b3] line-clamp-1 truncate mt-0.5">
                        {station.genre}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {localTracks.length === 0 ? (
                <div className="p-5 rounded-xl border border-dashed border-[#282828] text-center bg-[#181818]">
                  <p className="text-xs text-[#b3b3b3]">No custom MP3 files loaded yet.</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#1ed760] hover:bg-[#1fdf64] text-black cursor-pointer shadow-md"
                  >
                    <Upload className="w-3.5 h-3.5" /> Select MP3s from PC
                  </button>
                </div>
              ) : (
                localTracks.map((track, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectLocalTrack(idx, true)}
                    className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      localIdx === idx
                        ? 'bg-[#282828] text-[#1ed760] font-bold'
                        : 'hover:bg-[#1f1f1f] text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-[10px] text-[#b3b3b3] w-4">{idx + 1}.</span>
                      <Music className="w-3.5 h-3.5 flex-shrink-0 text-[#b3b3b3]" />
                      <span className="truncate">{track.name}</span>
                    </div>
                    <span className="text-[10px] text-[#b3b3b3] ml-2">{track.size}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
