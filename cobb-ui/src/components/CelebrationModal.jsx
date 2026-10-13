import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Award, Sparkles, X, Flame, CheckCircle2 } from 'lucide-react';
import { playMilestoneFanfare } from '../utils/sound';

/**
 * CelebrationModal
 * Lightweight canvas confetti engine + sound fanfare + mobile haptics.
 * Listens to 'cobb_celebrate' global events or auto-triggers on Target milestones.
 */
export default function CelebrationModal({
  targetProgress = 0,
  DAILY_TARGET = 100000,
  todaySales = 0,
  formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  darkMode = true
}) {
  const [activeCelebration, setActiveCelebration] = useState(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Trigger celebration routine
  const triggerCelebration = useCallback((data) => {
    setActiveCelebration({
      title: data.title || '🎉 Milestone Achieved!',
      subtitle: data.subtitle || 'Outstanding work by the floor team!',
      badge: data.badge || '100% Target',
      type: data.type || 'target'
    });

    // 1. Play triumph audio fanfare
    try {
      playMilestoneFanfare();
    } catch (e) {}

    // 2. Mobile Haptic feedback (Phone Link vibration)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([120, 60, 180, 60, 240]);
      } catch (e) {}
    }
  }, []);

  // Listen to custom event 'cobb_celebrate'
  useEffect(() => {
    const handler = (e) => {
      if (e?.detail) {
        triggerCelebration(e.detail);
      }
    };
    window.addEventListener('cobb_celebrate', handler);
    return () => window.removeEventListener('cobb_celebrate', handler);
  }, [triggerCelebration]);

  // Automatic target progress detection (50%, 75%, 100%)
  useEffect(() => {
    if (typeof window === 'undefined' || !DAILY_TARGET || DAILY_TARGET <= 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const progress = Number(targetProgress || 0);

    const checkMilestone = (level, title, subtitle) => {
      const key = `cobb_celebrated_${today}_${level}`;
      if (progress >= level && !localStorage.getItem(key)) {
        localStorage.setItem(key, 'true');
        triggerCelebration({
          title,
          subtitle,
          badge: `${level}% Achieved`,
          type: level >= 100 ? 'target_100' : 'target_milestone'
        });
      }
    };

    if (progress >= 100) {
      checkMilestone(100, '🏆 100% DAILY TARGET CONQUERED!', `Incredible hustle! Store sales hit ${formatCurrency(todaySales)} today!`);
    } else if (progress >= 75) {
      checkMilestone(75, '🚀 75% TARGET MILESTONE CRUSHED!', `Almost there! Just ${formatCurrency(Math.max(0, DAILY_TARGET - todaySales))} left to close the day!`);
    } else if (progress >= 50) {
      checkMilestone(50, '⚡ 50% HALFWAY SURGE UNLOCKED!', `Halfway mark achieved! Floor momentum is flying!`);
    }
  }, [targetProgress, DAILY_TARGET, todaySales, formatCurrency, triggerCelebration]);

  // Canvas particle engine
  useEffect(() => {
    if (!activeCelebration || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = [
      '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
      '#ec4899', '#f59e0b', '#fbbf24', '#ffffff'
    ];

    // Spawn 140 particles from left and right corners
    const particles = [];
    const count = 140;

    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      particles.push({
        x: isLeft ? width * 0.15 + (Math.random() * 80 - 40) : width * 0.85 + (Math.random() * 80 - 40),
        y: height * 0.85 + Math.random() * 40,
        vx: isLeft ? Math.random() * 14 + 4 : -(Math.random() * 14 + 4),
        vy: -(Math.random() * 18 + 10),
        size: Math.random() * 9 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        gravity: 0.42,
        drag: 0.98,
        opacity: 1,
        shape: Math.random() > 0.35 ? 'rect' : 'circle'
      });
    }

    let startTime = Date.now();
    const duration = 5000;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const elapsed = Date.now() - startTime;

      particles.forEach((p) => {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        if (elapsed > 2800) {
          p.opacity = Math.max(0, p.opacity - 0.02);
        }

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
      });

      if (elapsed < duration) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    // Auto dismiss modal banner after 6.5s
    const timer = setTimeout(() => {
      setActiveCelebration(null);
    }, 6500);

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeCelebration]);

  if (!activeCelebration) return null;

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none flex flex-col items-center justify-start pt-16 sm:pt-20 px-4">
      {/* Background Canvas Particles */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[121]"
      />

      {/* Frosted Glass Celebration Card */}
      <div className="relative z-[122] pointer-events-auto max-w-lg w-full animate-in fade-in slide-in-from-top-6 duration-300">
        <div className="glass-card-obsidian p-4 sm:p-5 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-amber-500/40 relative overflow-hidden text-center">
          {/* Subtle Cyber Glowing Background Flare */}
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => setActiveCelebration(null)}
            className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge & Icon */}
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-500/30 mb-2.5">
            <Trophy className="w-7 h-7" />
          </div>

          <div className="inline-block px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-1.5 ml-2">
            {activeCelebration.badge}
          </div>

          <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-1">
            {activeCelebration.title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto font-medium">
            {activeCelebration.subtitle}
          </p>

          <div className="mt-3.5 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCelebration(null)}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              Keep Hustling 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
