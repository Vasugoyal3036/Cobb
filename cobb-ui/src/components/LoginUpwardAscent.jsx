import React, { useEffect, useState } from 'react';

/**
 * LoginUpwardAscent: Luxury Showroom Stage Ascent Transition
 * When the user logs in, the showroom login layer slowly and smoothly
 * drifts upward (-translate-y-full) over 1500ms with cubic-bezier(0.16, 1, 0.3, 1),
 * revealing the POS Command Center underneath in complete silence.
 */
const LoginUpwardAscent = ({ onComplete }) => {
  const [isAscending, setIsAscending] = useState(false);

  useEffect(() => {
    // Trigger the slow upward drift after initial paint
    const startTimer = setTimeout(() => {
      setIsAscending(true);
    }, 40);

    // Unmount once the relaxed upward glide finishes (1500ms + buffer)
    const finishTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1550);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Ascending Stage Curtain Layer */}
      <div
        className={`absolute inset-0 bg-[#050505] flex flex-col items-center justify-between py-6 px-4 sm:px-6 transition-all duration-[1500ms] ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
          isAscending ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Ambient deep crimson glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-600/15 blur-[150px] pointer-events-none" />

        {/* Top Header Placeholder */}
        <div className="w-full max-w-md mx-auto text-center pt-2 sm:pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/90 border border-white/10 mb-3 text-[10px] font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AUTHENTICATED • ACCESS GRANTED</span>
          </div>
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-2xl bg-black border border-red-600/50 p-1 flex items-center justify-center shadow-xl shadow-red-600/25">
              <img src="/cobb-logo.png" alt="COBB ITALY" className="w-full h-full object-contain" />
            </div>
          </div>
          <h2 className="text-sm font-black tracking-widest text-white uppercase">COBB SHOWROOM POS</h2>
          <p className="text-[10px] font-mono tracking-wider text-red-500 uppercase">Entering Command Center...</p>
        </div>

        {/* Card Silhouette */}
        <div className="w-full max-w-md mx-auto my-auto p-8 rounded-3xl bg-[#0c0d12]/90 border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
            ✓
          </div>
          <p className="text-xs font-bold text-zinc-300">Welcome to Cobb Retail OS</p>
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-red-600 to-amber-500 animate-pulse" />
          </div>
        </div>

        <div className="h-10" />

        {/* Laser-thin crimson bottom edge seam that glides up with the curtain */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_20px_#ef4444]" />
      </div>
    </div>
  );
};

export default LoginUpwardAscent;
