import React, { useEffect, useState, useCallback, useRef } from 'react';

/**
 * CurtainWipe: Ultra-Cinematic Luxury Showroom Theater Curtain Opening with Upward Logo Drift
 * 
 * Choreography:
 * 1. Staged Dramatic Hold (0ms - 800ms):
 *    The closed velvet drapery and illuminated AUTHENTICATED Cobb seal hold steady for 800ms,
 *    giving the user clear, confident visual confirmation of successful session access.
 * 2. Ultra-Slow Majestic Glide (800ms - 3800ms):
 *    - The left and right velvet showroom curtains part slowly from center to sides
 *      (-translate-x-full and +translate-x-full) over 3000ms with cubic-bezier(0.16, 1, 0.3, 1).
 *    - Simultaneously, the central Cobb logo emblem slowly floats UPWARD (-translate-y-64)
 *      and gently dissolves into the ceiling over 2800ms, unveiling the live POS Command Center.
 * 3. 1-Tap / Key Skip:
 *    Tapping/clicking anywhere or pressing any key immediately skips into the Command Center
 *    if staff or the store owner is in a rush.
 * 4. Completely silent (zero sound effects).
 */
const CurtainWipe = ({ onComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const completedRef = useRef(false);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (onComplete) onComplete();
  }, [onComplete]);

  useEffect(() => {
    // 800ms dramatic hold on the authenticated seal before curtains begin opening
    const holdTimer = setTimeout(() => {
      setIsOpen(true);
    }, 800);

    // 3800ms total duration (800ms hold + 3000ms slow glide)
    const finishTimer = setTimeout(() => {
      handleComplete();
    }, 3800);

    const handleKeyDown = () => {
      handleComplete();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(finishTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleComplete]);

  return (
    <div
      onClick={handleComplete}
      className="fixed inset-0 z-[9999] overflow-hidden select-none cursor-pointer"
      aria-hidden="true"
      title="Click or press any key to enter Command Center"
    >
      {/* LEFT DRAPE PANEL */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-[#030303] via-[#090304] to-[#140507] border-r border-amber-500/40 shadow-[30px_0_60px_rgba(0,0,0,0.98)] transition-transform duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-end ${
          isOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Fabric vertical weave texture lines */}
        <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.04)_20px,rgba(255,255,255,0.04)_21px)] pointer-events-none" />
        {/* Subtle crimson & amber seam glow on right edge */}
        <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-amber-400 via-red-500 to-amber-500 shadow-[0_0_25px_#ef4444]" />
      </div>

      {/* RIGHT DRAPE PANEL */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-1/2 bg-gradient-to-l from-[#030303] via-[#090304] to-[#140507] border-l border-amber-500/40 shadow-[-30px_0_60px_rgba(0,0,0,0.98)] transition-transform duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-start ${
          isOpen ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Fabric vertical weave texture lines */}
        <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.04)_20px,rgba(255,255,255,0.04)_21px)] pointer-events-none" />
        {/* Subtle crimson & amber seam glow on left edge */}
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-amber-400 via-red-500 to-amber-500 shadow-[0_0_25px_#ef4444]" />
      </div>

      {/* CENTER SEAL & EMBLEM WITH SLOW UPWARD CEILING DISSOLVE */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] z-10 pointer-events-none ${
          isOpen ? '-translate-y-64 sm:-translate-y-80 opacity-0 scale-90' : 'translate-y-0 opacity-100 scale-100'
        }`}
      >
        {/* Ambient subtle crimson halo */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-red-600/20 blur-[130px] pointer-events-none" />

        <div className="flex flex-col items-center relative z-20">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-black/95 border-2 border-red-500/60 p-2 flex items-center justify-center shadow-[0_0_55px_rgba(239,68,68,0.5)]">
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

      {/* SUBTLE 1-TAP / KEY SKIP HINT */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] font-mono tracking-wider text-zinc-400 flex items-center gap-2 backdrop-blur-sm shadow-lg opacity-60 hover:opacity-100 transition-opacity">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-ping" />
          <span>Tap or press any key to skip</span>
        </div>
      </div>
    </div>
  );
};

export default CurtainWipe;
