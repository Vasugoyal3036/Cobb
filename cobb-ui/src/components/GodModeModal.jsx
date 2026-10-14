import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Crown,
  Sparkles,
  Zap,
  Flame,
  Volume2,
  DollarSign,
  Trophy,
  X,
  RotateCcw,
  ShieldAlert,
  Coins
} from 'lucide-react';
import {
  playJackpotChime,
  playCashRegisterChaching,
  playAirhorn
} from '../utils/sound';

const HYPE_QUOTES = [
  "⚡ Counter aura boosted +999%! Next customer is buying 5 blazers without asking for discount!",
  "🎯 Barcode scanner laser now firing in 4K Ultra HD! Zero scan delays detected!",
  "☕ Pocket Khata alert: All tea & samosa orders today are officially 100% tax deductible!",
  "🚀 Store momentum at MAXIMUM OVERDRIVE! Simran and floor team just entered Super Saiyan mode!",
  "👑 Pundri Overlord Status Confirmed: Every walk-in is legally required to leave with at least 2 shopping bags!"
];

export default function GodModeModal({
  overviewStats = {},
  pnlData,
  formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  darkMode = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hypeIndex, setHypeIndex] = useState(0);
  const [auraLevel, setAuraLevel] = useState(999);
  const [displaySales, setDisplaySales] = useState(0);
  const [displayLifetime, setDisplayLifetime] = useState(0);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);

  const todayActual = Number(overviewStats?.today?.TotalSales || 24744);
  const lifetimeActual = Number(pnlData?.lifetime?.grossSales || 2041086);

  // Trigger God Mode
  const triggerGodMode = useCallback(() => {
    setIsOpen(true);
    setAuraLevel(999);
    setDisplaySales(0);
    setDisplayLifetime(0);

    // Play triumphant casino jackpot fanfare
    try {
      playJackpotChime();
    } catch (e) {}

    // Mobile haptic vibration pattern
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100, 50, 200, 100, 400]);
      } catch (e) {}
    }
  }, []);

  // Listen to Global Custom Event
  useEffect(() => {
    const handleCustom = () => triggerGodMode();
    window.addEventListener('cobb_god_mode', handleCustom);
    return () => window.removeEventListener('cobb_god_mode', handleCustom);
  }, [triggerGodMode]);

  // Global Keyboard Easter Egg Listeners ('cobb', Ctrl+Shift+C, Konami Code)
  useEffect(() => {
    let keyBuffer = '';
    const konamiSequence = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'b', 'a'
    ];
    let konamiIndex = 0;

    const handleKeyDown = (e) => {
      // Ignore if user is currently typing inside an input or textarea
      const target = e.target;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // 1. Hotkey: Ctrl + Shift + C
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        triggerGodMode();
        return;
      }

      // Escape to close if open
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (isInput) return;

      // 2. Secret Word: 'cobb'
      keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-4);
      if (keyBuffer === 'cobb') {
        triggerGodMode();
        keyBuffer = '';
        return;
      }

      // 3. Konami Code (Up Up Down Down Left Right Left Right B A)
      const currentExpected = konamiSequence[konamiIndex];
      if (e.key === currentExpected || e.key.toLowerCase() === currentExpected) {
        konamiIndex++;
        if (konamiIndex === konamiSequence.length) {
          triggerGodMode();
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerGodMode]);

  // Rolling slot machine counter animation
  useEffect(() => {
    if (!isOpen) return;

    let step = 0;
    const totalSteps = 35;
    const interval = setInterval(() => {
      step++;
      const progress = step / totalSteps;
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplaySales(Math.round(todayActual * eased));
      setDisplayLifetime(Math.round(lifetimeActual * eased));

      if (step >= totalSteps) {
        setDisplaySales(todayActual);
        setDisplayLifetime(lifetimeActual);
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [isOpen, todayActual, lifetimeActual]);

  // Confetti Particle System
  const spawnConfettiBurst = useCallback((amount = 120) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width || window.innerWidth;
    const height = canvas.height || window.innerHeight;

    const goldColors = [
      '#fbbf24', '#f59e0b', '#d97706', '#10b981',
      '#34d399', '#fef08a', '#ffffff', '#ec4899', '#8b5cf6'
    ];

    const newParticles = [];
    for (let i = 0; i < amount; i++) {
      const isLeft = i % 2 === 0;
      newParticles.push({
        x: isLeft ? width * 0.15 + (Math.random() * 120 - 60) : width * 0.85 + (Math.random() * 120 - 60),
        y: height * 0.82 + Math.random() * 50,
        vx: isLeft ? Math.random() * 16 + 5 : -(Math.random() * 16 + 5),
        vy: -(Math.random() * 20 + 12),
        size: Math.random() * 10 + 6,
        color: goldColors[Math.floor(Math.random() * goldColors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 14,
        gravity: 0.44,
        drag: 0.978,
        opacity: 1,
        shape: Math.random() > 0.4 ? 'rect' : 'coin'
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, []);

  // Canvas particle renderer loop
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlesRef.current = [];
    spawnConfettiBurst(150);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p, idx) => {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;
        p.opacity = Math.max(0, p.opacity - 0.006);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        if (p.y > canvas.height + 50 || p.opacity <= 0) {
          particlesRef.current.splice(idx, 1);
        }
      });

      if (particlesRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, spawnConfettiBurst]);

  const boostAura = () => {
    setAuraLevel((prev) => prev + 100);
    setHypeIndex((prev) => (prev + 1) % HYPE_QUOTES.length);
    spawnConfettiBurst(60);
    try {
      playCashRegisterChaching();
    } catch (e) {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Background Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[151]"
      />

      {/* Cyber-Vegas God Mode Card */}
      <div className="relative z-[152] max-w-xl w-full bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-400/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_-15px_rgba(245,158,11,0.5)] overflow-hidden text-white animate-in zoom-in-95 duration-200">
        {/* Glow Spheres */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-amber-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-emerald-500/30 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Exit God Mode (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Ribbon */}
        <div className="text-center relative">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/40 mb-3 animate-bounce">
            <Crown className="w-8 h-8 fill-current" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm">
              👑 STORE OVERLORD MODE
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-amber-300 border border-amber-400/30">
              LVL {auraLevel}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            COBB PUNDRI COMMANDER
          </h2>
          <p className="text-xs sm:text-sm text-amber-200/90 font-medium mt-1">
            All limits lifted. Floor momentum set to maximum frequency.
          </p>
        </div>

        {/* Rolling Vegas Counter Deck */}
        <div className="grid grid-cols-2 gap-3.5 my-6">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-amber-500/30 backdrop-blur-md">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
              Today's Gross Sales
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono mt-1">
              {formatCurrency(displaySales)}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Live Register Counter
            </span>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-emerald-500/30 backdrop-blur-md">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
              Lifetime Reconciled
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono mt-1">
              {formatCurrency(displayLifetime)}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              POS Match: 100%
            </span>
          </div>
        </div>

        {/* Interactive Hype Man Quote Box */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-center mb-6">
          <p className="text-xs sm:text-sm font-bold text-amber-200">
            {HYPE_QUOTES[hypeIndex]}
          </p>
        </div>

        {/* Action Controls & Soundboard */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => {
                playCashRegisterChaching();
                spawnConfettiBurst(80);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Coins className="w-4 h-4" />
              <span>Ka-Ching! 💰</span>
            </button>

            <button
              onClick={() => {
                playAirhorn();
                spawnConfettiBurst(90);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Volume2 className="w-4 h-4" />
              <span>Airhorn 📢</span>
            </button>

            <button
              onClick={() => {
                playJackpotChime();
                spawnConfettiBurst(120);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Jackpot! 🎰</span>
            </button>

            <button
              onClick={boostAura}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>Boost Aura (+100) ⚡</span>
            </button>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer underline underline-offset-4"
            >
              Back to Store Operations →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
