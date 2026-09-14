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
  Tv,
  ListMusic,
  Sparkles,
  ExternalLink,
  Clock,
  History,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

const QUICK_MIXES = [
  { label: 'Bollywood Hits', query: 'Top Bollywood romantic songs 2026', icon: '🌸' },
  { label: 'Punjabi Energy', query: 'Top Punjabi party songs Diljit Karan Aujla', icon: '🔥' },
  { label: 'Lo-Fi Store Chill', query: 'Lofi retail shopping ambient beats instrumental', icon: '🎧' },
  { label: 'Acoustic Boutique', query: 'Acoustic guitar cafe songs soft unplugged', icon: '☕' },
  { label: '90s Nostalgia', query: 'Best 90s bollywood songs kumar sanu udit', icon: '📻' },
  { label: 'Global Fashion Pop', query: 'Global commercial pop hits coldplay weeknd', icon: '✨' }
];

export default function StoreMusicPlayer({ API_BASE = '' }) {
  const effectiveApiBase = API_BASE || (
    typeof window !== 'undefined' && (window.location.protocol === 'app:' || window.location.hostname === 'localhost')
      ? 'http://localhost:5000'
      : ''
  );

  // Search & Suggestions State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('cobb_recent_music_searches');
      return saved ? JSON.parse(saved) : ['Arijit Singh', 'Diljit Dosanjh', 'Lo-Fi Store Beats', 'Coldplay'];
    } catch (e) {
      return ['Arijit Singh', 'Diljit Dosanjh'];
    }
  });

  // Track & Playback State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

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
  const searchInputRef = useRef(null);
  const suggestTimerRef = useRef(null);
  const containerRef = useRef(null);

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
              event.target.setVolume(isMuted ? 0 : volume);
            },
            onStateChange: (event) => {
              // 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 0 = ENDED
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

    // Default search on load
    executeSearch('Top Bollywood romantic hits official audio', false);

    // Close suggestions on outside click
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(progressTimerRef.current);
      document.removeEventListener('mousedown', handleClickOutside);
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

  // Handle live search input & autocomplete debouncing
  const handleInputChange = (val) => {
    setSearchQuery(val);
    setActiveSuggestionIdx(-1);

    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(true);
      return;
    }

    setShowSuggestions(true);
    clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const res = await axios.get(`${effectiveApiBase}/api/music/suggestions?q=${encodeURIComponent(val)}`);
        if (res.data && Array.isArray(res.data.suggestions)) {
          setSuggestions(res.data.suggestions);
        }
      } catch (e) {
        console.warn('Suggestions error:', e);
      } finally {
        setIsSuggesting(false);
      }
    }, 180);
  };

  // Keyboard Navigation in suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIdx >= 0 && suggestions[activeSuggestionIdx]) {
        selectSuggestion(suggestions[activeSuggestionIdx]);
      } else {
        executeSearch(searchQuery, true);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Select suggestion item
  const selectSuggestion = (text) => {
    setSearchQuery(text);
    setShowSuggestions(false);
    saveRecentSearch(text);
    executeSearch(text, true);
  };

  const saveRecentSearch = (text) => {
    if (!text || !text.trim()) return;
    const clean = text.trim();
    const updated = [clean, ...recentSearches.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem('cobb_recent_music_searches', JSON.stringify(updated));
    } catch (e) {}
  };

  // Search Function
  const executeSearch = async (queryText, autoPlay = true) => {
    const q = (queryText || '').trim();
    if (!q) return;
    setShowSuggestions(false);
    setIsSearching(true);
    saveRecentSearch(q);

    try {
      const res = await axios.get(`${effectiveApiBase}/api/music/search?q=${encodeURIComponent(q)}`);
      if (res.data && res.data.results && res.data.results.length > 0) {
        setSearchResults(res.data.results);
        setCurrentTrackIndex(0);
        setShowDrawer(true);
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
      }, 700);
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
    <div
      ref={containerRef}
      className="bg-[#0c0c0e] text-white rounded-2xl border border-[#242429] shadow-2xl p-4 sm:p-5 transition-all relative overflow-hidden select-none font-sans"
    >
      {/* Dynamic Ambient Background Glow */}
      <div
        className={`absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-opacity duration-1000 ${
          isPlaying ? 'opacity-20 bg-red-600' : 'opacity-5 bg-slate-600'
        }`}
      />
      <div
        className={`absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-opacity duration-1000 ${
          isPlaying ? 'opacity-15 bg-amber-500' : 'opacity-0 bg-transparent'
        }`}
      />

      {/* Embedded YouTube IFrame Container */}
      <div
        className={`${
          showVideo
            ? 'w-full h-48 sm:h-64 mb-3 rounded-xl overflow-hidden border border-[#2a2a30] bg-black relative shadow-inner'
            : 'w-[1px] h-[1px] opacity-0 pointer-events-none absolute -left-[9999px]'
        }`}
      >
        <div id="cobb-yt-iframe-player" className="w-full h-full" />
      </div>

      {/* Row 1: Header + Autocomplete Search Bar + Actions */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#212126] relative z-20">
        
        {/* Brand Badge */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
              <path d="M10 9.5v5l4-2.5z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black tracking-wider uppercase text-white">
                YouTube Music
              </h3>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                PRO STORE
              </span>
              {isPlaying ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Playing
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#888891] px-2 py-0.5 rounded-full bg-[#1c1c22]">
                  Paused
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Autocomplete Search Input */}
        <div className="flex-1 max-w-xl relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch(searchQuery, true);
            }}
            className="relative flex items-center"
          >
            <Search className="w-4 h-4 absolute left-3 text-[#777782] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search any song, singer, album... (e.g. Arijit Singh, Diljit, Kesariya)"
              className="w-full bg-[#18181d] hover:bg-[#1f1f26] focus:bg-[#23232c] text-white text-xs font-medium pl-9 pr-20 py-2 rounded-xl border border-[#2a2a33] focus:border-red-500/80 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all placeholder-[#666672] shadow-inner"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-14 text-[#888894] hover:text-white cursor-pointer p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 px-3 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white cursor-pointer disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </form>

          {/* Autocomplete Dropdown Panel */}
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#141418] border border-[#2c2c36] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              
              {/* If query has suggestions */}
              {suggestions.length > 0 ? (
                <div className="py-1">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#737380] flex items-center justify-between border-b border-[#212128]">
                    <span>Suggestions</span>
                    {isSuggesting && <Loader2 className="w-3 h-3 animate-spin text-red-400" />}
                  </div>
                  {suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectSuggestion(item)}
                      onMouseEnter={() => setActiveSuggestionIdx(idx)}
                      className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        activeSuggestionIdx === idx
                          ? 'bg-red-600/15 text-red-300 font-bold border-l-2 border-red-500 pl-2.5'
                          : 'text-slate-200 hover:bg-[#1e1e24]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Search className="w-3.5 h-3.5 text-[#888894] flex-shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                      <span className="text-[10px] text-[#636370] font-mono">Select ↵</span>
                    </div>
                  ))}
                </div>
              ) : recentSearches.length > 0 ? (
                <div className="py-1">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#737380] flex items-center gap-1 border-b border-[#212128]">
                    <History className="w-3 h-3 text-[#888894]" />
                    <span>Recent & Popular Store Searches</span>
                  </div>
                  {recentSearches.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectSuggestion(item)}
                      className="px-3 py-2 text-xs flex items-center justify-between text-slate-300 hover:bg-[#1e1e24] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                        <span>{item}</span>
                      </div>
                      <span className="text-[10px] text-red-400 font-bold">Play</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Right Tools (Video View & Queue) */}
        <div className="flex items-center gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => setShowVideo(!showVideo)}
            title={showVideo ? 'Hide Video (Background Audio Mode)' : 'Show Music Video'}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              showVideo
                ? 'bg-red-600/20 text-red-400 border-red-500/40 shadow-sm'
                : 'bg-[#18181d] text-[#8e8e9c] border-[#25252e] hover:text-white hover:bg-[#202027]'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showVideo ? 'Video ON' : 'Video OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDrawer(!showDrawer)}
            title="Browse Results & Up Next"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              showDrawer
                ? 'bg-red-600 text-white border-red-500 shadow-md'
                : 'bg-[#18181d] text-[#8e8e9c] border-[#25252e] hover:text-white hover:bg-[#202027]'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Playlist ({searchResults.length})</span>
          </button>
        </div>

      </div>

      {/* Row 2: Curated Quick Mix Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-3 no-scrollbar relative z-10">
        <span className="text-[10px] font-black uppercase tracking-wider text-[#737380] flex-shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Quick Vibes:
        </span>
        {QUICK_MIXES.map((mix, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setSearchQuery(mix.label);
              executeSearch(mix.query, true);
            }}
            className="px-3 py-1 rounded-xl text-xs font-bold bg-[#18181d] hover:bg-[#22222a] text-[#d4d4dc] hover:text-white border border-[#272730] hover:border-red-500/50 flex-shrink-0 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
          >
            <span>{mix.icon}</span>
            <span>{mix.label}</span>
          </button>
        ))}
      </div>

      {/* Row 3: Modern Main Player Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-[#131317]/80 border border-[#202027] rounded-xl p-3 sm:p-4 backdrop-blur-sm relative z-10">
        
        {/* Left: Track Information & Visuals (Cols 1-4) */}
        <div className="lg:col-span-4 flex items-center gap-3.5 min-w-0">
          {/* High-res Album Thumbnail with hover play/pause */}
          <div
            onClick={togglePlay}
            className="relative flex-shrink-0 group cursor-pointer"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#202027] shadow-xl border border-[#2f2f3a] relative">
              {currentTrack?.thumbnail ? (
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-tr from-red-600 to-rose-700">
                  🎵
                </div>
              )}

              {/* Quick Play/Pause Overlay */}
              <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center transition-opacity ${
                  isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                }`}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-white text-white drop-shadow" />
                ) : (
                  <Play className="w-5 h-5 fill-white text-white ml-0.5 drop-shadow" />
                )}
              </div>
            </div>

            {/* Glowing Active Ring when playing */}
            {isPlaying && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              </span>
            )}
          </div>

          {/* Titles & Artist */}
          <div className="flex-1 min-w-0">
            <h4
              onClick={() => setShowDrawer(!showDrawer)}
              className="text-xs sm:text-sm font-black text-white hover:text-red-400 hover:underline cursor-pointer truncate transition-colors"
              title={currentTrack?.title || 'No Song Selected'}
            >
              {currentTrack?.title || 'Search any song above...'}
            </h4>
            
            <p className="text-[11px] text-[#9a9aa8] hover:text-white cursor-pointer truncate mt-0.5 flex items-center gap-1.5">
              <span>{currentTrack?.artist || 'YouTube Music Official'}</span>
              <CheckCircle2 className="w-3 h-3 text-red-500 flex-shrink-0" />
            </p>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                HQ Audio
              </span>
              {currentTrack?.duration && (
                <span className="text-[10px] text-[#71717f] font-mono">{currentTrack.duration}</span>
              )}
            </div>
          </div>

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={() => setIsLiked(!isLiked)}
            className="text-[#777785] hover:text-white transition-colors cursor-pointer p-1.5"
            title={isLiked ? 'Liked' : 'Like Song'}
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                isLiked ? 'fill-red-500 text-red-500' : ''
              }`}
            />
          </button>

          {/* Animated Equalizer Waveform */}
          <div className="hidden sm:flex items-end gap-[2px] h-6 px-1 flex-shrink-0">
            {[65, 100, 45, 90, 75, 85, 40].map((h, i) => (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-all duration-200 ${
                  isPlaying ? 'bg-gradient-to-t from-red-600 to-rose-400 animate-pulse' : 'bg-[#33333d] h-[3px]'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(4, (h * (volume / 100)) * 0.22)}px` : '3px',
                  animationDelay: `${i * 90}ms`,
                  animationDuration: `${340 + (i % 3) * 110}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Center: Controls & Timeline Scrubber (Cols 5-8) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center gap-2 w-full">
          {/* Main Control Buttons */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Shuffle */}
            <button
              type="button"
              onClick={() => setShuffle(!shuffle)}
              className={`p-1.5 transition-colors cursor-pointer relative ${
                shuffle ? 'text-red-500' : 'text-[#888894] hover:text-white'
              }`}
              title="Shuffle Playlist"
            >
              <Shuffle className="w-4 h-4" />
              {shuffle && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />}
            </button>

            {/* Skip Back */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={searchResults.length === 0}
              className="text-[#aaaaaa] hover:text-white transition-all cursor-pointer active:scale-90 disabled:opacity-40"
              title="Previous Track"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Primary Play / Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading || !currentTrack}
              className="w-11 h-11 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] hover:scale-106 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-white text-white" />
              ) : (
                <Play className="w-5 h-5 fill-white text-white ml-0.5" />
              )}
            </button>

            {/* Skip Forward */}
            <button
              type="button"
              onClick={handleNext}
              disabled={searchResults.length === 0}
              className="text-[#aaaaaa] hover:text-white transition-all cursor-pointer active:scale-90 disabled:opacity-40"
              title="Next Track"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Repeat */}
            <button
              type="button"
              onClick={() => setRepeat(!repeat)}
              className={`p-1.5 transition-colors cursor-pointer relative ${
                repeat ? 'text-red-500' : 'text-[#888894] hover:text-white'
              }`}
              title="Repeat Current Track"
            >
              <Repeat className="w-4 h-4" />
              {repeat && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />}
            </button>
          </div>

          {/* Timeline Scrubber */}
          <div className="flex items-center gap-2.5 w-full max-w-md group">
            <span className="text-[10px] font-mono text-[#888894] w-8 text-right select-none">
              {formatTime(currentTime)}
            </span>

            <div
              onClick={handleSeek}
              className="flex-1 h-1.5 group-hover:h-2 bg-[#2a2a33] rounded-full relative cursor-pointer flex items-center transition-all overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all rounded-full relative"
                style={{ width: `${progressPct}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <span className="text-[10px] font-mono text-[#888894] w-8 select-none">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Volume & External Actions (Cols 9-12) */}
        <div className="lg:col-span-3 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="text-[#888894] hover:text-white transition-colors cursor-pointer"
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

          {/* Volume Scrubber */}
          <div className="w-20 sm:w-24 group relative flex items-center">
            <div
              className="w-full h-1.5 group-hover:h-2 bg-[#2a2a33] rounded-full relative cursor-pointer flex items-center transition-all overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                handleVolumeChange(Math.round(ratio * 100));
              }}
            >
              <div
                className="h-full bg-white group-hover:bg-red-500 transition-colors rounded-full"
                style={{ width: `${isMuted ? 0 : volume}%` }}
              />
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#888894] w-7 text-right">
            {isMuted ? 0 : volume}%
          </span>

          {currentTrack?.url && (
            <a
              href={currentTrack.url}
              target="_blank"
              rel="noreferrer"
              title="Open Track in YouTube"
              className="text-[#666672] hover:text-white p-1 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

      </div>

      {/* Row 4: Expandable Up Next / Search Results Drawer */}
      {showDrawer && (
        <div className="mt-4 pt-3.5 border-t border-[#212126] animate-in fade-in slide-in-from-top-2 duration-200 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h5 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Playlist & Search Queue</span>
                <span className="text-[10px] font-mono text-red-400 bg-red-500/15 px-2 py-0.2 rounded-full border border-red-500/30">
                  {searchResults.length} Songs
                </span>
              </h5>
              <p className="text-[10px] text-[#888894]">
                Click any song to play immediately or pick a quick mix
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDrawer(false)}
              className="text-[10px] text-[#888894] hover:text-white font-bold cursor-pointer bg-[#18181d] px-2 py-1 rounded-lg border border-[#272730]"
            >
              Hide ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {searchResults.map((track, idx) => {
              const isSelected = currentTrackIndex === idx;
              return (
                <div
                  key={track.id || idx}
                  onClick={() => playTrack(track, idx)}
                  className={`p-2 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2.5 border group/card ${
                    isSelected
                      ? 'bg-red-600/10 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                      : 'bg-[#15151a] hover:bg-[#1c1c23] border-[#22222a] hover:border-[#2f2f3a]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-[#24242d] flex-shrink-0 shadow-sm">
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
                          isSelected ? 'text-red-400' : 'text-white group-hover/card:text-red-300'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-[10px] text-[#888894] truncate">{track.artist}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[#666672] flex-shrink-0">{track.duration}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
