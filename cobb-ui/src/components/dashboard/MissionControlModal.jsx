import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tv,
  Maximize2,
  Minimize2,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  Activity,
  TrendingUp,
  Receipt,
  Users,
  Flame,
  Crown,
  Coins,
  ShieldCheck,
  Trophy
} from 'lucide-react';
import AppleWatchRings from './AppleWatchRings';
import {
  playCashRegisterChaching,
  playAirhorn,
  playJackpotChime,
  getSoundSettings,
  saveSoundSettings
} from '../../utils/sound';

export default function MissionControlModal({
  isOpen,
  onClose,
  overviewStats = {},
  liveBills = [],
  DAILY_TARGET = 100000,
  targetProgress = 0,
  formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  activeStore = 'DEMO_STORE_001'
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => getSoundSettings().soundEnabled);
  const [salesPulse, setSalesPulse] = useState(false);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);

  // Today's numbers
  const todaySales = Number(overviewStats?.today?.TotalSales || 24744);
  const todayBillsCount = Number(overviewStats?.today?.BillCount || 8);
  const todayCash = Number(overviewStats?.today?.CashAmount || 8347);
  const todayUPI = Number(overviewStats?.today?.UPIAmount || 14898);
  const todayCard = Number(overviewStats?.today?.CardAmount || 1499);

  // WoW Day-Matched Benchmark
  const wowBenchmark = useMemo(() => {
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = overviewStats?.lastWeekSameDay?.DayName || dayNames[today.getDay()];
    const lwSales = Number(overviewStats?.lastWeekSameDay?.TotalSales || 0);
    const diff = todaySales - lwSales;
    const pct = lwSales > 0 ? Number(((diff / lwSales) * 100).toFixed(1)) : (todaySales > 0 ? 100 : 0);
    const isAhead = diff >= 0;
    return { dayName, lwSales, diff, pct, isAhead, hasData: lwSales > 0 || todaySales > 0 };
  }, [overviewStats, todaySales]);

  // Live Digital Clock ticker
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    saveSoundSettings({ soundEnabled: next });
  };

  // Keyboard shortcut listener (F for fullscreen, Space for celebration, Escape for close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'f' || e.key === 'F') {
        if (!['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
          e.preventDefault();
          toggleFullScreen();
        }
      } else if (e.code === 'Space') {
        if (!['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
          e.preventDefault();
          triggerBlast();
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Confetti Particle Burst
  const triggerBlast = () => {
    setSalesPulse(true);
    setTimeout(() => setSalesPulse(false), 800);

    try {
      playCashRegisterChaching();
    } catch (e) {}

    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    const colors = ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#06b6d4', '#ec4899', '#ffffff'];
    const newParticles = [];
    for (let i = 0; i < 90; i++) {
      newParticles.push({
        x: width * 0.5 + (Math.random() * 80 - 40),
        y: height * 0.35,
        vx: (Math.random() - 0.5) * 22,
        vy: (Math.random() - 0.5) * 18 - 4,
        size: Math.random() * 9 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 16,
        gravity: 0.35,
        drag: 0.98,
        opacity: 1
      });
    }
    particlesRef.current.push(...newParticles);
  };

  // Canvas particle renderer loop
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p, idx) => {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;
        p.opacity = Math.max(0, p.opacity - 0.012);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();

        if (p.opacity <= 0 || p.y > canvas.height + 50) {
          particlesRef.current.splice(idx, 1);
        }
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen]);

  // Recent 5 bills for live stream
  const recentBills = useMemo(() => {
    return (Array.isArray(liveBills) ? liveBills : []).slice(0, 6);
  }, [liveBills]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#030712] text-white flex flex-col p-4 sm:p-6 lg:p-8 select-none overflow-y-auto animate-in fade-in duration-300">
      {/* Background Animated Glow Gradients */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Confetti Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[201]" />

      {/* TOP COMMAND BAR */}
      <div className="relative z-[202] flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10 shrink-0">
        {/* Left: Store Identity & Beacon */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-white font-mono">
                COBB PUNDRI • MISSION CONTROL
              </h1>
              <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE TERMINAL
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Floor Terminal Node #1 • Store Active &amp; Synced
            </p>
          </div>
        </div>

        {/* Center: Live Digital Clock */}
        <div className="text-center font-mono">
          <div className="text-xl sm:text-2xl font-black text-amber-300 tracking-wider">
            {currentTime.toLocaleTimeString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <p className="text-[11px] text-slate-400 uppercase tracking-widest">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={toggleSound}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
            title="Toggle Sound FX"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio ON' : 'Muted'}</span>
          </button>

          <button
            onClick={triggerBlast}
            className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Fire Confetti & Chime (Spacebar)"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Celebration</span>
          </button>

          <button
            onClick={toggleFullScreen}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Window' : 'Fullscreen'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Exit Mission Control (Esc)"
          >
            <X className="w-4 h-4" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* CENTERPIECE: GIANT LIVE ODOMETER & 3-RING HALO */}
      <div className="relative z-[202] my-auto py-6 sm:py-8 flex flex-col items-center justify-center text-center">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" /> Today's Gross Store Sales
        </span>

        {/* Massive Revenue Counter with Pulsing Glow Ring */}
        <div className="relative inline-block my-1">
          {salesPulse && (
            <div className="absolute inset-0 -m-6 rounded-3xl border-2 border-emerald-400/80 animate-ping pointer-events-none" />
          )}
          <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black font-mono tracking-tight text-white drop-shadow-[0_10px_40px_rgba(16,185,129,0.35)] transition-all">
            {formatCurrency(todaySales)}
          </h2>
        </div>

        {/* Sub-Metric Tender Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mt-3">
          <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 font-mono text-xs sm:text-sm font-bold text-emerald-300">
            💵 Cash: {formatCurrency(todayCash)}
          </span>
          <span className="px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 font-mono text-xs sm:text-sm font-bold text-purple-300">
            ⚡ UPI: {formatCurrency(todayUPI)}
          </span>
          <span className="px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 font-mono text-xs sm:text-sm font-bold text-blue-300">
            💳 Card: {formatCurrency(todayCard)}
          </span>
          <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 font-mono text-xs sm:text-sm font-black text-amber-300">
            🧾 {todayBillsCount} Bills Completed
          </span>
        </div>

        {/* WoW Day-Matched Benchmark Chip */}
        {wowBenchmark.hasData && (
          <div className="mt-3.5 flex items-center justify-center">
            <div className={`px-4 py-1.5 rounded-2xl border flex items-center gap-2.5 text-xs sm:text-sm font-semibold backdrop-blur-md transition-all ${
              wowBenchmark.isAhead
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${wowBenchmark.isAhead ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span>
                vs Last {wowBenchmark.dayName}: <strong className="font-mono text-white">{formatCurrency(wowBenchmark.lwSales)}</strong>
              </span>
              <span className="font-mono font-black">
                ({wowBenchmark.isAhead ? '+' : ''}{wowBenchmark.pct}% {wowBenchmark.isAhead ? '▲' : '▼'} {wowBenchmark.diff >= 0 ? '+' : '-'}{formatCurrency(Math.abs(wowBenchmark.diff))})
              </span>
              <span className="hidden sm:inline text-[11px] opacity-75 font-normal">
                • {wowBenchmark.isAhead ? 'Ahead of Retail Rhythm' : 'Below Retail Rhythm'}
              </span>
            </div>
          </div>
        )}

        {/* Scaled 3-Ring Activity Halo & Target Progress */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 bg-slate-900/60 p-4 sm:p-5 rounded-3xl border border-white/10 backdrop-blur-md max-w-2xl w-full">
          <AppleWatchRings
            size={120}
            todaySales={todaySales}
            dailyTarget={DAILY_TARGET}
            todayBills={todayBillsCount}
            expectedBills={20}
            targetMargin={27}
            actualMargin={27}
            formatCurrency={formatCurrency}
            showLegend={true}
          />

          <div className="w-full sm:w-px sm:h-20 bg-white/10" />

          {/* Target Progress Bar */}
          <div className="text-left w-full sm:w-64 space-y-1.5 font-mono">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase">Daily Target:</span>
              <span className="text-amber-300 font-black">{formatCurrency(DAILY_TARGET)}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
              <div
                className="bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400 h-full rounded-full transition-all duration-1000 shadow-md"
                style={{ width: `${Math.min(100, targetProgress)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span className="font-bold text-emerald-400">{targetProgress.toFixed(0)}% Done</span>
              <span>{formatCurrency(Math.max(0, DAILY_TARGET - todaySales))} left</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM DUAL STREAM: LIVE TRANSACTION RIVER & FLOOR RACE */}
      <div className="relative z-[202] grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10 shrink-0">
        {/* Left Box: Live Transaction Stream */}
        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-400" /> Latest Checkout Stream
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Auto-Refreshed</span>
          </div>

          <div className="space-y-1.5 overflow-hidden">
            {recentBills.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No recent bills recorded yet today</p>
            ) : (
              recentBills.map((b, idx) => {
                const amount = Number(b.GrandTotal || b.NetAmt || b.TotalAmount || 0);
                const cust = b.CustomerName || b.FirstName || 'Walk-in Shopper';
                const mode = b.PaymentMode || 'Cash';
                const time = b.BillTime ? String(b.BillTime).slice(11, 16) : '';

                return (
                  <div key={b.BillNumber || idx} className="flex items-center justify-between text-xs font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] text-slate-400">{time || `#${idx + 1}`}</span>
                      <span className="font-bold text-white truncate max-w-[140px]">{cust}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-bold">
                        {mode}
                      </span>
                      <span className="font-black text-amber-300">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Box: Floor Grand Prix Podium */}
        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" /> Today's Staff Leaderboard
            </span>
            <span className="text-[10px] font-mono text-amber-300">Floor Race</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between bg-gradient-to-r from-amber-500/20 to-transparent p-2 rounded-xl border border-amber-500/30">
              <div className="flex items-center gap-2">
                <span className="text-base">🥇</span>
                <div>
                  <span className="font-black text-white block">Simran</span>
                  <span className="text-[10px] text-amber-300">Top Performer • 7 Bills</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-black text-amber-300 text-sm block">₹20,744</span>
                <span className="text-[9px] text-emerald-400 font-bold">Tier 1 Unlocked</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-base">🥈</span>
                <div>
                  <span className="font-bold text-slate-300 block">Counter Floor</span>
                  <span className="text-[10px] text-slate-400">1 Checkout</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-200 block">₹4,000</span>
                <span className="text-[9px] text-slate-400">Floor Counter</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
