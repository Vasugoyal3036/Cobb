import React from 'react';

/**
 * COBB ITALY — Official Showroom Brand Logo & Emblem
 * Pure Jet Black background, vivid Cobb Red accents, and authentic leaf & bird emblem.
 */
export default function OrsLogo({ size = 44, className = '', showGlow = true, showWordmark = false }) {
  if (showWordmark) {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        <div
          className="rounded-xl bg-black border border-red-600/40 overflow-hidden flex items-center justify-center shrink-0"
          style={{
            width: size,
            height: size,
            boxShadow: showGlow ? '0 0 16px rgba(220, 38, 38, 0.4)' : 'none'
          }}
        >
          <img src="/cobb-logo.png" alt="COBB ITALY" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline tracking-wider">
            <span className="text-xl font-black text-white">COB</span>
            <span className="text-xl font-black text-red-600">B</span>
            <span className="ml-2 text-[10px] font-black text-red-500 uppercase tracking-widest border-l border-red-900/60 pl-2">ITALY</span>
          </div>
          <span className="text-[9px] text-zinc-400 font-semibold tracking-tight">flying colors of fashion</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl bg-black border border-red-600/40 overflow-hidden flex items-center justify-center shrink-0 select-none ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: showGlow ? '0 0 14px rgba(220, 38, 38, 0.4)' : 'none'
      }}
    >
      <img src="/cobb-logo.png" alt="COBB ITALY" className="w-full h-full object-contain" />
    </div>
  );
}
