import React, { useEffect, useState } from 'react';
import { playCheckoutChime } from '../utils/sound';

/**
 * CurtainWipe: Luxury Showroom Fabric Curtain Unfurl Wipe
 * Plays a bespoke showroom drapery transition parting open into the POS Command Center
 * with cubic-bezier(0.77, 0, 0.175, 1) and harmonic audio chime.
 */
const CurtainWipe = ({ onComplete }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Play the luxury showroom chime
    playCheckoutChime();

    // Trigger curtain separation after brief paint cycle
    const openTimer = setTimeout(() => {
      setIsOpen(true);
    }, 40);

    // Call completion callback once transition finishes
    const finishTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 850);

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
        className={`absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-[#030303] via-[#090304] to-[#140507] border-r border-amber-500/40 shadow-[20px_0_40px_rgba(0,0,0,0.9)] transition-transform duration-750 ease-[cubic-bezier(0.77,0,0.175,1)] flex items-center justify-end ${
          isOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Fabric vertical weave texture lines */}
        <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.04)_20px,rgba(255,255,255,0.04)_21px)]" />
        {/* Subtle crimson seam glow on right edge */}
        <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-amber-400 via-red-500 to-amber-500 shadow-[0_0_15px_#ef4444]" />
      </div>

      {/* RIGHT DRAPE PANEL */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-1/2 bg-gradient-to-l from-[#030303] via-[#090304] to-[#140507] border-l border-amber-500/40 shadow-[-20px_0_40px_rgba(0,0,0,0.9)] transition-transform duration-750 ease-[cubic-bezier(0.77,0,0.175,1)] flex items-center justify-start ${
          isOpen ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Fabric vertical weave texture lines */}
        <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.04)_20px,rgba(255,255,255,0.04)_21px)]" />
        {/* Subtle crimson seam glow on left edge */}
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-amber-400 via-red-500 to-amber-500 shadow-[0_0_15px_#ef4444]" />
      </div>

      {/* CENTER SEAL & EMBLEM */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-600 ease-out z-10 ${
          isOpen ? 'opacity-0 scale-125' : 'opacity-100 scale-100'
        }`}
      >
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 rounded-3xl bg-black/90 border-2 border-amber-400/60 p-2 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.35)]">
            <img src="/cobb-logo.png" alt="Cobb Italy" className="w-full h-full object-contain" />
            <span className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-widest shadow-md">
              AUTHENTICATED
            </span>
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-white font-black tracking-widest text-sm uppercase">COBB SHOWROOM</h2>
            <p className="text-amber-400 text-[10px] font-mono tracking-wider">ENTERING COMMAND CENTER</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurtainWipe;
