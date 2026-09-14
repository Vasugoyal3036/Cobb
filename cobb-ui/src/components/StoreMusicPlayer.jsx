import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
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
  Search,
  X,
  Loader2,
  Music,
  Tv,
  ListMusic,
  Sparkles,
  Flame,
  Radio,
  ExternalLink
} from 'lucide-react';

const QUICK_MIXES = [
  { label: 'Bollywood Hits', query: 'Top Bollywood romantic songs 2026', icon: '🌸', color: 'from-rose-500 to-red-600' },
  { label: 'Punjabi Energy', query: 'Top Punjabi party songs Diljit Karan Aujla', icon: '🔥', color: 'from-amber-500 to-orange-600' },
  { label: 'Lo-Fi Store Chill', query: 'Lofi retail shopping ambient beats instrumental', icon: '🎧', color: 'from-indigo-500 to-blue-600' },
  { label: 'Acoustic Boutique', query: 'Acoustic guitar cafe songs soft unplugged', icon: '☕', color: 'from-emerald-500 to-teal-600' },
  { label: '90s Nostalgia', query: 'Best 90s bollywood songs kumar sanu udit', icon: '📻', color: 'from-purple-500 to-fuchsia-600' },
  { label: 'Global Fashion Pop', query: 'Global commercial pop hits coldplay weeknd', icon: '✨', color: 'from-cyan-500 to-blue-600' }
];

export default function StoreMusicPlayer({ API_BASE = '' }) {
  const effectiveApiBase = API_BASE || (
    typeof window !== 'undefined' && (window.location.protocol === 'app:' || window.location.hostname === 'localhost')
      ? 'http://localhost:5000'
      : ''
  );

  // Search & Playlist State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('cobb_yt_music_vol');
    return saved !== null ? parseInt(saved) : 80;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  // Timeline
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs
  const playerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const playerReadyRef = useRef(false);

  const currentTrack = searchResults[currentTrackIndex] || null;

  // Initialize YouTube IFrame API
  useEffect(() => {
    const loadYT = () => {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };

      if (window.YT && window.YT.Player) {
        initPlayer();
      }
    };

    const initPlayer = () => {
      if (playerRef.current) return;
      try {
        playerRef.current = new window.YT.Player('cobb-yt-iframe-player', {
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              playerReadyRef.current = true;
              event.target.setVolume(isMuted ? 0 : volume);
            },
            onStateChange: (event) => {
              // YT.PlayerState: 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 0 = ENDED
              if (event.data === 1) {
                setIsPlaying(true);
                setIsLoading(false);
                if (playerRef.current && playerRef.current.getDuration) {
                  setDuration(playerRef.current.getDuration() || 0);
                }
              } else if (event.data === 2) {
                setIsPlaying(false);
                setIsLoading(false);
              } else if (event.data === 3) {
                setIsLoading(true);
              } else if (event.data === 0) {
                // Song ended
                handleTrackEnded();
              }
            },
            onError: (err) => {
              console.warn('YouTube Player error:', err);
              setIsLoading(false);
              setIsPlaying(false);
            }
          }
        });
      } catch (e) {
        console.error('Error instantiating YT Player:', e);
      }
    };

    loadYT();

    // Default initial search to load top retail hits
    executeSearch('Top Bollywood romantic hits official audio', false);

    return () => {
      clearInterval(progressTimerRef.current);
    };
  }, []);

  // Poll current playback time
  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const t = playerRef.current.getCurrentTime();
          setCurrentTime(t || 0);
          const d = playerRef.current.getDuration();
          if (d && d > 0) setDuration(d);
        }
      }, 500);
    } else {
      clearInterval(progressTimerRef.current);
    }
    return () => clearInterval(progressTimerRef.current);
  }, [isPlaying]);

  // Sync Volume
  useEffect(() => {
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  // Search Function
  const executeSearch = async (queryText, autoPlay = true) => {
    const q = (queryText || '').trim();
    if (!q) return;
    setIsSearching(true);
    try {
      const res = await axios.get(`${effectiveApiBase}/api/music/search?q=${encodeURIComponent(q)}`);
      if (res.data && res.data.results && res.data.results.length > 0) {
        setSearchResults(res.data.results);
        setCurrentTrackIndex(0);
        if (autoPlay) {
          playTrack(res.data.results[0], 0);
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Play Specific Track
  const playTrack = (track, index) => {
    if (!track || !track.id) return;
    setCurrentTrackIndex(index);
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);

    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(track.id);
      playerRef.current.playVideo();
    } else {
      setTimeout(() => {
        if (playerRef.current && playerRef.current.loadVideoById) {
          playerRef.current.loadVideoById(track.id);
          playerRef.current.playVideo();
        }
      }, 800);
    }
  };

  // Play / Pause Toggle
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      if (playerRef.current.pauseVideo) playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      if (playerRef.current.playVideo) {
        playerRef.current.playVideo();
        setIsPlaying(true);
      } else if (currentTrack) {
        playTrack(currentTrack, currentTrackIndex);
      }
    }
  };

  // Next Track
  const handleNext = () => {
    if (searchResults.length === 0) return;
    let nextIdx;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * searchResults.length);
    } else {
      nextIdx = (currentTrackIndex + 1) % searchResults.length;
    }
    playTrack(searchResults[nextIdx], nextIdx);
  };

  // Prev Track
  const handlePrev = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + searchResults.length) % searchResults.length;
    playTrack(searchResults[prevIdx], prevIdx);
  };

  // Track Ended Handler
  const handleTrackEnded = () => {
    if (repeat) {
      if (playerRef.current && playerRef.current.seekTo) {
        playerRef.current.seekTo(0);
        playerRef.current.playVideo();
      }
    } else {
      handleNext();
    }
  };

  // Seek
  const handleSeek = (e) => {
    if (!duration || !playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const seekSeconds = ratio * duration;
    setCurrentTime(seekSeconds);
    if (playerRef.current.seekTo) {
      playerRef.current.seekTo(seekSeconds, true);
    }
  };

  // Volume Change
  const handleVolumeChange = (val) => {
    setVolume(val);
    localStorage.setItem('cobb_yt_music_vol', val);
    if (isMuted && val > 0) setIsMuted(false);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-[#0f0f0f] text-white rounded-2xl border border-[#272727] shadow-2xl p-4 transition-all relative overflow-hidden select-none font-sans">
      
      {/* Hidden YouTube IFrame Container (or visible when Video Mode is ON) */}
      <div
        className={`${
          showVideo
            ? 'w-full h-48 sm:h-64 mb-3 rounded-xl overflow-hidden border border-[#272727] bg-black relative'
            : 'w-[1px] h-[1px] opacity-0 pointer-events-none absolute -left-[9999px]'
        }`}
      >
        <div id="cobb-yt-iframe-player" className="w-full h-full" />
      </div>

      {/* Top Brand Bar & Search Form */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#272727]">
        
        {/* YT Music Brand Header */}
        <div className="flex items-center gap-2.5">
          {/* YouTube Music Red Emblem */}
          <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.4)] flex-shrink-0">
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
              <path d="M10 9.5v5l4-2.5z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
                YouTube Music
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-600/20 text-red-400 font-bold border border-red-600/30">STORE AUDIO</span>
              </span>
              {isPlaying ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Playing
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#aaaaaa] px-2 py-0.5 rounded-full bg-[#272727]">
                  Paused
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Song Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch(searchQuery, true);
          }}
          className="flex-1 max-w-md relative flex items-center"
        >
          <Search className="w-3.5 h-3.5 absolute left-3 text-[#aaaaaa] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any song, artist, or album on YouTube Music..."
            className="w-full bg-[#212121] hover:bg-[#272727] focus:bg-[#2a2a2a] text-white text-xs font-medium pl-8 pr-16 py-1.5 rounded-full border border-transparent focus:border-red-500 focus:outline-none transition-all placeholder-[#717171]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-10 text-[#aaaaaa] hover:text-white cursor-pointer p-1"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-600 hover:bg-red-500 text-white cursor-pointer disabled:opacity-50 transition-colors"
          >
            {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* Tools (Queue / Video toggle) */}
        <div className="flex items-center gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => setShowVideo(!showVideo)}
            title={showVideo ? 'Hide Video (Audio Only)' : 'Show Music Video'}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              showVideo
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-[#212121] text-[#aaaaaa] hover:text-white hover:bg-[#272727]'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowDrawer(!showDrawer)}
            title="Browse Results & Quick Mixes"
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              showDrawer
                ? 'bg-red-600 text-white'
                : 'bg-[#212121] text-[#aaaaaa] hover:text-white hover:bg-[#272727]'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Songs ({searchResults.length})</span>
          </button>
        </div>

      </div>

      {/* Quick Mixes Shortcut Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-2 no-scrollbar">
        <span className="text-[10px] font-black uppercase text-[#aaaaaa] flex-shrink-0 mr-1">Quick Mixes:</span>
        {QUICK_MIXES.map((mix, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setSearchQuery(mix.label);
              executeSearch(mix.query, true);
            }}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#212121] hover:bg-[#2e2e2e] text-[#e1e1e1] hover:text-white border border-[#333333] hover:border-red-500/50 flex-shrink-0 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <span>{mix.icon}</span>
            <span>{mix.label}</span>
          </button>
        ))}
      </div>

      {/* Main 3-Column Player Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        
        {/* Left: Track Information (cols 1-4) */}
        <div className="md:col-span-4 flex items-center gap-3 min-w-0">
          {/* Thumbnail / Album Art */}
          <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => setShowDrawer(!showDrawer)}>
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-[#212121] shadow-md border border-[#272727]">
              {currentTrack?.thumbnail ? (
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-tr from-red-600 to-rose-700">
                  🎵
                </div>
              )}
            </div>

            {/* Glowing active ring when playing */}
            {isPlaying && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>

          {/* Titles */}
          <div className="flex-1 min-w-0">
            <h4
              onClick={() => setShowDrawer(!showDrawer)}
              className="text-xs sm:text-sm font-bold text-white hover:underline cursor-pointer truncate"
              title={currentTrack?.title || 'No Song Selected'}
            >
              {currentTrack?.title || 'Search any song above...'}
            </h4>
            <p className="text-[11px] text-[#aaaaaa] hover:text-white cursor-pointer truncate mt-0.5">
              {currentTrack?.artist || 'YouTube Music'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#212121] text-red-400 border border-red-500/20">
                YT Music Audio
              </span>
              {currentTrack?.duration && (
                <span className="text-[10px] text-[#717171] font-mono">{currentTrack.duration}</span>
              )}
            </div>
          </div>

          {/* Heart Button */}
          <button
            type="button"
            onClick={() => setIsLiked(!isLiked)}
            className="text-[#aaaaaa] hover:text-white transition-colors cursor-pointer p-1"
            title={isLiked ? 'Liked' : 'Like Song'}
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                isLiked ? 'fill-red-500 text-red-500' : ''
              }`}
            />
          </button>

          {/* Equalizer Soundwave Visualizer */}
          <div className="hidden sm:flex items-end gap-[2px] h-5 px-1 flex-shrink-0">
            {[65, 100, 45, 90, 75].map((h, i) => (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-all duration-200 ${
                  isPlaying ? 'bg-red-500 animate-pulse' : 'bg-[#404040] h-[3px]'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(4, (h * (volume / 100)) * 0.2)}px` : '3px',
                  animationDelay: `${i * 100}ms`,
                  animationDuration: `${350 + (i % 3) * 120}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Center: Controls & Scrubber (cols 5-8) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center gap-1.5 w-full">
          {/* Buttons row */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Shuffle */}
            <button
              type="button"
              onClick={() => setShuffle(!shuffle)}
              className={`p-1 transition-colors cursor-pointer relative ${
                shuffle ? 'text-red-500' : 'text-[#aaaaaa] hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-3.5 h-3.5" />
              {shuffle && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />}
            </button>

            {/* Skip Back */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={searchResults.length === 0}
              className="text-[#aaaaaa] hover:text-white transition-colors cursor-pointer active:scale-90 disabled:opacity-40"
              title="Previous"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Play / Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading || !currentTrack}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-white/90 text-black flex items-center justify-center shadow-lg hover:scale-106 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
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
              disabled={searchResults.length === 0}
              className="text-[#aaaaaa] hover:text-white transition-colors cursor-pointer active:scale-90 disabled:opacity-40"
              title="Next"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Repeat */}
            <button
              type="button"
              onClick={() => setRepeat(!repeat)}
              className={`p-1 transition-colors cursor-pointer relative ${
                repeat ? 'text-red-500' : 'text-[#aaaaaa] hover:text-white'
              }`}
              title="Repeat Current Song"
            >
              <Repeat className="w-3.5 h-3.5" />
              {repeat && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />}
            </button>
          </div>

          {/* Timeline Scrubber */}
          <div className="flex items-center gap-2 w-full max-w-md group">
            <span className="text-[10px] font-mono text-[#aaaaaa] w-8 text-right select-none">
              {formatTime(currentTime)}
            </span>

            <div
              onClick={handleSeek}
              className="flex-1 h-1 group-hover:h-1.5 bg-[#404040] rounded-full relative cursor-pointer flex items-center transition-all overflow-hidden"
            >
              <div
                className="h-full bg-red-600 transition-all rounded-full relative"
                style={{ width: `${progressPct}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <span className="text-[10px] font-mono text-[#aaaaaa] w-8 select-none">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Volume & Link (cols 9-12) */}
        <div className="md:col-span-3 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="text-[#aaaaaa] hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-500" />
            ) : volume < 50 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Volume Slider */}
          <div className="w-20 sm:w-24 group relative flex items-center">
            <div
              className="w-full h-1 group-hover:h-1.5 bg-[#404040] rounded-full relative cursor-pointer flex items-center transition-all overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                handleVolumeChange(Math.round(ratio * 100));
              }}
            >
              <div
                className="h-full bg-white group-hover:bg-red-600 transition-colors rounded-full"
                style={{ width: `${isMuted ? 0 : volume}%` }}
              />
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#aaaaaa] w-7 text-right">
            {isMuted ? 0 : volume}%
          </span>

          {currentTrack?.url && (
            <a
              href={currentTrack.url}
              target="_blank"
              rel="noreferrer"
              title="Open in YouTube"
              className="text-[#717171] hover:text-white p-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

      </div>

      {/* Drawer: Search Results & Queue Grid */}
      {showDrawer && (
        <div className="mt-4 pt-3.5 border-t border-[#272727] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                Up Next & Search Results ({searchResults.length} Songs)
              </h5>
              <p className="text-[10px] text-[#aaaaaa]">
                Click any song to play instantly or click quick mixes above
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDrawer(false)}
              className="text-[10px] text-[#aaaaaa] hover:text-white font-bold cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {searchResults.map((track, idx) => {
              const isSelected = currentTrackIndex === idx;
              return (
                <div
                  key={track.id || idx}
                  onClick={() => playTrack(track, idx)}
                  className={`p-2 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2.5 border group/card ${
                    isSelected
                      ? 'bg-[#212121] border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : 'bg-[#181818] hover:bg-[#212121] border-transparent hover:border-[#333333]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#272727] flex-shrink-0">
                      {track.thumbnail ? (
                        <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">🎵</div>
                      )}
                      <div
                        className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                          isSelected && isPlaying ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'
                        }`}
                      >
                        {isSelected && isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-white text-white" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-red-400' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-[10px] text-[#aaaaaa] truncate">{track.artist}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[#717171] flex-shrink-0">{track.duration}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
