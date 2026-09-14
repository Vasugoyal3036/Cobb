import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  Upload,
  Disc,
  ListMusic,
  Sparkles,
  Loader2,
  Headphones,
  Sliders,
  Trash2,
  X
} from 'lucide-react';

const STATIONS = [
  {
    id: 'groovesalad',
    name: 'Groove Salad',
    genre: 'Chill Lounge & Downtempo',
    vibe: 'Relaxed Retail Vibe',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
    tag: 'Ambient Lounge',
    gradient: 'from-emerald-500 to-teal-600',
    color: 'emerald',
  },
  {
    id: 'poptron',
    name: 'PopTron',
    genre: 'Electropop & Retail Hits',
    vibe: 'Upbeat Fashion Energy',
    url: 'https://ice1.somafm.com/poptron-128-mp3',
    tag: 'Commercial Pop',
    gradient: 'from-indigo-500 to-blue-600',
    color: 'indigo',
  },
  {
    id: 'suburbsofgoa',
    name: 'Suburbs of Goa',
    genre: 'Desi Fusion & Asian Lounge',
    vibe: 'Indian Ambient Beats',
    url: 'https://ice1.somafm.com/suburbsofgoa-128-mp3',
    tag: 'Desi Chill',
    gradient: 'from-amber-500 to-orange-600',
    color: 'amber',
  },
  {
    id: 'lush',
    name: 'Lush Mellow',
    genre: 'Warm Acoustic & Vocals',
    vibe: 'Cozy Boutique Style',
    url: 'https://ice1.somafm.com/lush-128-mp3',
    tag: 'Acoustic',
    gradient: 'from-rose-500 to-pink-600',
    color: 'rose',
  },
  {
    id: 'secretagent',
    name: 'Secret Agent',
    genre: 'Retro Spy & Jazz Lounge',
    vibe: 'Classy Menswear Feel',
    url: 'https://ice1.somafm.com/secretagent-128-mp3',
    tag: 'Jazz & Retro',
    gradient: 'from-cyan-500 to-blue-600',
    color: 'cyan',
  },
  {
    id: 'indiepop',
    name: 'Indie Pop',
    genre: 'Modern Indie & Youth Hits',
    vibe: 'Fresh Trend Vibe',
    url: 'https://ice1.somafm.com/indiepop-128-mp3',
    tag: 'Youth Hits',
    gradient: 'from-purple-500 to-fuchsia-600',
    color: 'purple',
  },
];

export default function StoreMusicPlayer() {
  const [mode, setMode] = useState('radio'); // 'radio' | 'local'
  const [currentStationIdx, setCurrentStationIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('cobb_bgm_vol');
    return saved !== null ? parseFloat(saved) : 0.75;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [showStations, setShowStations] = useState(false);

  // Local playlist state
  const [localTracks, setLocalTracks] = useState([]);
  const [currentLocalIdx, setCurrentLocalIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle station change
  const selectStation = (index, autoPlay = true) => {
    setCurrentStationIdx(index);
    setMode('radio');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = STATIONS[index].url;
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

  // Handle local track selection
  const selectLocalTrack = (index, autoPlay = true) => {
    if (localTracks.length === 0 || !localTracks[index]) return;
    setCurrentLocalIdx(index);
    setMode('local');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = localTracks[index].url;
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

  // Toggle play / pause
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      // Ensure source is loaded
      if (!audioRef.current.src) {
        if (mode === 'radio') {
          audioRef.current.src = STATIONS[currentStationIdx].url;
        } else if (localTracks.length > 0) {
          audioRef.current.src = localTracks[currentLocalIdx].url;
        }
      }
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      }).catch(err => {
        console.warn('Audio play failure:', err);
        setIsPlaying(false);
        setIsLoading(false);
      });
    }
  };

  // Next track / station
  const handleNext = () => {
    if (mode === 'radio') {
      const nextIdx = (currentStationIdx + 1) % STATIONS.length;
      selectStation(nextIdx, isPlaying);
    } else if (localTracks.length > 0) {
      const nextIdx = (currentLocalIdx + 1) % localTracks.length;
      selectLocalTrack(nextIdx, isPlaying);
    }
  };

  // Prev track / station
  const handlePrev = () => {
    if (mode === 'radio') {
      const prevIdx = (currentStationIdx - 1 + STATIONS.length) % STATIONS.length;
      selectStation(prevIdx, isPlaying);
    } else if (localTracks.length > 0) {
      const prevIdx = (currentLocalIdx - 1 + localTracks.length) % localTracks.length;
      selectLocalTrack(prevIdx, isPlaying);
    }
  };

  // Handle local file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newTracks = files.map(file => ({
      name: file.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(file),
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
    }));

    setLocalTracks(prev => [...prev, ...newTracks]);
    setMode('local');
    setCurrentLocalIdx(localTracks.length); // point to first new track
    setTimeout(() => {
      selectLocalTrack(localTracks.length, true);
    }, 50);

    // Reset input
    e.target.value = '';
  };

  const clearLocalPlaylist = () => {
    if (mode === 'local') {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      setMode('radio');
      selectStation(currentStationIdx, false);
    }
    setLocalTracks([]);
  };

  // Volume changes
  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    localStorage.setItem('cobb_bgm_vol', newVol);
    if (isMuted && newVol > 0) setIsMuted(false);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentStation = STATIONS[currentStationIdx];
  const currentLocalTrack = localTracks[currentLocalIdx];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs p-4 sm:p-5 transition-all overflow-hidden relative group">
      {/* Background audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current && mode === 'local') {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
          }
        }}
        onEnded={() => {
          if (mode === 'local') handleNext();
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

      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 mb-3.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                In-Store Music Player
              </h3>
              {isPlaying ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  On Air
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                  Paused
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Curated retail background music & store vibes
            </p>
          </div>
        </div>

        {/* Mode selector pills & upload button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('radio');
              if (isPlaying && mode !== 'radio') selectStation(currentStationIdx, true);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'radio'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Store Radio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (localTracks.length === 0) {
                fileInputRef.current?.click();
              } else {
                setMode('local');
                if (isPlaying && mode !== 'local') selectLocalTrack(currentLocalIdx, true);
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'local'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Custom MP3s {localTracks.length > 0 && `(${localTracks.length})`}</span>
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
            onClick={() => fileInputRef.current?.click()}
            title="Upload MP3s from device or USB"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowStations(!showStations)}
            title="View channels & playlist"
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              showStations
                ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main player controls & now playing panel */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Now playing track display & animated equalizer */}
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          {/* Album art / spinning vinyl disc */}
          <div className="relative flex-shrink-0">
            <div
              className={`w-13 h-13 rounded-2xl bg-gradient-to-tr ${
                mode === 'radio' ? currentStation.gradient : 'from-purple-500 to-indigo-600'
              } flex items-center justify-center text-white shadow-md transition-all ${
                isPlaying ? 'ring-2 ring-blue-500/40 ring-offset-2 dark:ring-offset-slate-900' : 'opacity-90'
              }`}
            >
              <Disc className={`w-7 h-7 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            </div>

            {/* Pulsing indicator badge */}
            {isPlaying && (
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
              </span>
            )}
          </div>

          {/* Title & Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                {mode === 'radio'
                  ? currentStation.name
                  : (currentLocalTrack ? currentLocalTrack.name : 'No MP3s Loaded')}
              </h4>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex-shrink-0">
                {mode === 'radio' ? currentStation.tag : `Track ${currentLocalIdx + 1}/${localTracks.length}`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {mode === 'radio' ? currentStation.genre : (currentLocalTrack ? currentLocalTrack.size : 'Tap "Upload" to add files')}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                {mode === 'radio' ? `Vibe: ${currentStation.vibe}` : 'Local In-Store Audio'}
              </span>
            </div>
          </div>

          {/* Equalizer soundwave visualizer */}
          <div className="flex items-end gap-0.5 h-6 px-2 flex-shrink-0">
            {[40, 80, 50, 95, 60, 85, 45, 75].map((h, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-300 ${
                  isPlaying
                    ? 'bg-blue-500 dark:bg-blue-400 animate-pulse'
                    : 'bg-slate-300 dark:bg-slate-700 h-1.5'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(15, (h * (volume || 0.5))) * 0.25}px` : '4px',
                  animationDelay: `${i * 120}ms`,
                  animationDuration: `${400 + (i % 3) * 150}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Center: Playback buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrev}
            title="Previous Station/Track"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-transform active:scale-90"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading || (mode === 'local' && localTracks.length === 0)}
            className="w-11 h-11 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
            title={isPlaying ? 'Pause Music' : 'Play Music'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleNext}
            title="Next Station/Track"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-transform active:scale-90"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Right: Volume control & scrubber */}
        <div className="flex items-center gap-2.5 w-full md:w-56 justify-end">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>

          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-8 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>

      {/* Local playback timeline scrubber (only visible for local mp3s) */}
      {mode === 'local' && localTracks.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-400">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              if (audioRef.current) audioRef.current.currentTime = val;
            }}
            className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
          />
          <span className="text-[10px] font-mono font-bold text-slate-400">{formatTime(duration)}</span>
        </div>
      )}

      {/* Expandable Station Selector / Local Playlist Panel */}
      {showStations && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {mode === 'radio' ? 'Select Store Atmosphere Channel' : `Store MP3 Playlist (${localTracks.length} tracks)`}
            </span>
            {mode === 'local' && localTracks.length > 0 && (
              <button
                type="button"
                onClick={clearLocalPlaylist}
                className="text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear Playlist
              </button>
            )}
          </div>

          {mode === 'radio' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {STATIONS.map((station, idx) => {
                const isActive = currentStationIdx === idx && mode === 'radio';
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => selectStation(idx, true)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 group ${
                      isActive
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-xs'
                        : 'bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {station.tag}
                      </span>
                      {isActive && isPlaying && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {station.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {station.vibe}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {localTracks.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 font-medium">No custom music files loaded.</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Choose MP3 Files
                  </button>
                </div>
              ) : (
                localTracks.map((track, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectLocalTrack(idx, true)}
                    className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      currentLocalIdx === idx
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] text-slate-400 w-4">{idx + 1}.</span>
                      <Music className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{track.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 ml-2">{track.size}</span>
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
