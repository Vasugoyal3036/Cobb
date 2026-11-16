import React, { useEffect, useState } from 'react';

/**
 * CurtainWipe: Bespoke Luxury Showroom Theater Curtain Wipe with Upward Logo Drift
 * When the user logs in:
 * 1. The left and right velvet showroom curtains part open smoothly from center to sides (-translate-x-full / +translate-x-full).
 * 2. Simultaneously, the central Cobb Italy logo and authentication seal slowly drifts UPWARD (-translate-y-52)
 *    and dissolves gracefully, revealing the live POS Command Center underneath in complete silence.
 * 3. Relaxed luxury duration of 1700ms with cubic-bezier(0.16, 1, 0.3, 1).
 */
const CurtainWipe = ({ onComplete }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Trigger curtain separation and upward logo drift after brief initial paint cycle
    const openTimer = setTimeout(() => {
      setIsOpen(true);
    }, 50);

    // Call completion callback once the relaxed, slow transition finishes
    const finishTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1750);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* LEFT DRAPE PANEL */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-[#030303] via-[#090304] to-[#140507] border-r border-amber-500/40 shadow-[25px_0_50px_rgba(0,0,0,0.95)] transition-transform duration-[1700ms] ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-end ${
          isOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Fabric vertical weave texture lines */}
        <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.04)_20px,rgba(255,255,255,0.04)_21px)]" />
        {/* Subtle crimson & amber seam glow on right edge */}
        <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-amber-400 via-red-500 to-amber-500 shadow-[0_0_20px_#ef4444]" />
      </div>

      {/* RIGHT DRAPE PANEL */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-1/2 bg-gradient-to-l from-[#030303] via-[#090304] to-[#140507] border-l border-amber-500/40 shadow-[-25px_0_50px_rgba(0,0,0,0.95)] transition-transform duration-[1700ms] ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-start ${
          isOpen ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Fabric vertical weave texture lines */}
        <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.04)_20px,rgba(255,255,255,0.04)_21px)]" />
        {/* Subtle crimson & amber seam glow on left edge */}
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-amber-400 via-red-500 to-amber-500 shadow-[0_0_20px_#ef4444]" />
      </div>

      {/* CENTER SEAL & EMBLEM WITH SLOW UPWARD DRIFT */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] z-10 ${
          isOpen ? '-translate-y-48 sm:-translate-y-64 opacity-0 scale-90' : 'translate-y-0 opacity-100 scale-100'
        }`}
      >
        {/* Ambient subtle crimson halo */}
        <div className="absolute w-[450px] h-[450px] rounded-full bg-red-600/20 blur-[120px] pointer-events-none" />

        <div className="flex flex-col items-center relative z-20">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-black/95 border-2 border-red-500/60 p-2 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.45)]">
            <img src="/cobb-logo.png" alt="Cobb Italy" className="w-full h-full object-contain" />
            <span className="absolute -bottom-2.5 px-3.5 py-1 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 border border-red-400/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AUTHENTICATED
            </span>
          </div>

          <div className="mt-5 text-center space-y-1">
            <h2 className="text-white font-black tracking-widest text-base uppercase drop-shadow-md">
              COBB SHOWROOM POS
            </h2>
            <p className="text-red-400 text-[11px] font-mono tracking-widest uppercase">
              ENTERING COMMAND CENTER
            </p>
          </div>

          {/* Luxury shimmer loading seam */}
          <div className="w-36 h-1 bg-white/10 rounded-full overflow-hidden mt-3 shadow-inner">
            <div className="w-full h-full bg-gradient-to-r from-red-600 via-amber-400 to-red-600 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurtainWipe;
