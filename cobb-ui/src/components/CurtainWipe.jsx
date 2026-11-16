import React, { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Prismatic glass shards that scatter in 3D space as the logo zooms toward the user.
 */
const PRISMATIC_SHARDS = [
  { id: 1, x: '-420px', y: '-320px', z: '260px', rx: '135deg', ry: '-95deg', rz: '-50deg', clip: 'polygon(0% 0%, 100% 0%, 70% 75%, 0% 100%)', delay: '0ms', size: 'w-14 h-14' },
  { id: 2, x: '-160px', y: '-390px', z: '320px', rx: '95deg', ry: '50deg', rz: '20deg', clip: 'polygon(20% 0%, 100% 15%, 80% 90%, 0% 80%)', delay: '30ms', size: 'w-16 h-12' },
  { id: 3, x: '170px', y: '-380px', z: '310px', rx: '120deg', ry: '-65deg', rz: '-30deg', clip: 'polygon(0% 15%, 80% 0%, 100% 80%, 20% 90%)', delay: '20ms', size: 'w-16 h-12' },
  { id: 4, x: '440px', y: '-310px', z: '270px', rx: '145deg', ry: '100deg', rz: '55deg', clip: 'polygon(0% 0%, 100% 0%, 100% 100%, 30% 75%)', delay: '50ms', size: 'w-14 h-14' },
  { id: 5, x: '-310px', y: '-150px', z: '360px', rx: '-65deg', ry: '-115deg', rz: '-35deg', clip: 'polygon(10% 0%, 90% 20%, 85% 85%, 0% 70%)', delay: '70ms', size: 'w-14 h-16' },
  { id: 6, x: '0px', y: '-260px', z: '400px', rx: '85deg', ry: '0deg', rz: '25deg', clip: 'polygon(50% 0%, 100% 60%, 50% 100%, 0% 60%)', delay: '25ms', size: 'w-14 h-14' },
  { id: 7, x: '320px', y: '-140px', z: '350px', rx: '-75deg', ry: '105deg', rz: '40deg', clip: 'polygon(10% 20%, 90% 0%, 100% 70%, 15% 85%)', delay: '65ms', size: 'w-14 h-16' },
  { id: 8, x: '-460px', y: '30px', z: '340px', rx: '-50deg', ry: '-140deg', rz: '-20deg', clip: 'polygon(0% 25%, 75% 0%, 100% 100%, 25% 100%)', delay: '40ms', size: 'w-16 h-14' },
  { id: 9, x: '-180px', y: '40px', z: '420px', rx: '75deg', ry: '125deg', rz: '50deg', clip: 'polygon(20% 20%, 80% 0%, 100% 80%, 0% 100%)', delay: '80ms', size: 'w-16 h-16' },
  { id: 10, x: '190px', y: '-30px', z: '430px', rx: '-90deg', ry: '-100deg', rz: '-65deg', clip: 'polygon(0% 0%, 80% 20%, 100% 100%, 20% 80%)', delay: '75ms', size: 'w-16 h-16' },
  { id: 11, x: '470px', y: '20px', z: '350px', rx: '60deg', ry: '130deg', rz: '30deg', clip: 'polygon(25% 0%, 100% 25%, 75% 100%, 0% 100%)', delay: '35ms', size: 'w-16 h-14' },
  { id: 12, x: '-390px', y: '320px', z: '270px', rx: '-135deg', ry: '-80deg', rz: '60deg', clip: 'polygon(0% 0%, 75% 25%, 100% 100%, 0% 100%)', delay: '55ms', size: 'w-14 h-14' },
  { id: 13, x: '-160px', y: '400px', z: '330px', rx: '-110deg', ry: '70deg', rz: '-40deg', clip: 'polygon(20% 10%, 100% 0%, 80% 100%, 0% 90%)', delay: '70ms', size: 'w-16 h-12' },
  { id: 14, x: '170px', y: '390px', z: '340px', rx: '-120deg', ry: '-90deg', rz: '45deg', clip: 'polygon(0% 0%, 80% 10%, 100% 90%, 20% 100%)', delay: '60ms', size: 'w-16 h-12' },
  { id: 15, x: '410px', y: '310px', z: '280px', rx: '-140deg', ry: '95deg', rz: '-65deg', clip: 'polygon(25% 25%, 100% 0%, 100% 100%, 0% 100%)', delay: '75ms', size: 'w-14 h-14' },
  { id: 16, x: '0px', y: '300px', z: '390px', rx: '-95deg', ry: '0deg', rz: '-20deg', clip: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', delay: '85ms', size: 'w-14 h-14' },
];

/**
 * CurtainWipe: Ultra-Cinematic Luxury Showroom Curtain Opening with Forward Logo Drift & Prismatic Shard Scatter
 * 
 * Choreography:
 * 1. Staged Dramatic Hold (0ms - 800ms):
 *    Closed velvet curtains & glowing AUTHENTICATED Cobb seal hold steady for 800ms.
 * 2. Forward Drift Towards User (800ms - 1800ms):
 *    - Curtains start slowly parting left and right (-translate-x-full / +translate-x-full).
 *    - The emblem drifts smoothly FORWARD towards the user (scale 2.4x in 3D perspective).
 * 3. Prismatic Glass Fracture & Scatter (1800ms - 3800ms):
 *    - The logo fractures into 16 luxury prismatic glass shards that tumble outward in 3D perspective.
 *    - The live POS Command Center dashboard is unveiled directly behind the dispersing shards.
 * 4. 1-Tap / Key Skip:
 *    Tapping or pressing any key immediately skips into the Command Center.
 * 5. Completely silent (zero audio).
 */
const CurtainWipe = ({ onComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isForward, setIsForward] = useState(false);
  const [isScattered, setIsScattered] = useState(false);
  const completedRef = useRef(false);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (onComplete) onComplete();
  }, [onComplete]);

  useEffect(() => {
    // 800ms dramatic hold: then curtains begin parting and logo drifts towards user
    const forwardTimer = setTimeout(() => {
      setIsOpen(true);
      setIsForward(true);
    }, 800);

    // 1800ms: logo reaches foreground and fractures into tumbling prismatic shards
    const scatterTimer = setTimeout(() => {
      setIsScattered(true);
    }, 1800);

    // 3800ms total duration
    const finishTimer = setTimeout(() => {
      handleComplete();
    }, 3800);

    const handleKeyDown = () => {
      handleComplete();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(forwardTimer);
      clearTimeout(scatterTimer);
      clearTimeout(finishTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleComplete]);

  return (
    <div
      onClick={handleComplete}
      className="fixed inset-0 z-[9999] overflow-hidden select-none cursor-pointer"
      style={{ perspective: '1200px' }}
      aria-hidden="true"
      title="Click or press any key to enter Command Center"
    >
      {/* LEFT DRAPE PANEL */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-[#030303] via-[#090304] to-[#140507] border-r border-amber-500/40 shadow-[30px_0_60px_rgba(0,0,0,0.98)] transition-transform duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-end ${
          isOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.04)_20px,rgba(255,255,255,0.04)_21px)] pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-amber-400 via-red-500 to-amber-500 shadow-[0_0_25px_#ef4444]" />
      </div>

      {/* RIGHT DRAPE PANEL */}
      <div
        className={`absolute top-0 bottom-0 right-0 w-1/2 bg-gradient-to-l from-[#030303] via-[#090304] to-[#140507] border-l border-amber-500/40 shadow-[-30px_0_60px_rgba(0,0,0,0.98)] transition-transform duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-start ${
          isOpen ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.04)_20px,rgba(255,255,255,0.04)_21px)] pointer-events-none" />
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-amber-400 via-red-500 to-amber-500 shadow-[0_0_25px_#ef4444]" />
      </div>

      {/* CENTER STAGE: FORWARD DRIFTING LOGO CONTAINER */}
      <div
        className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Ambient crimson flare that blooms as logo approaches */}
        <div
          className={`absolute rounded-full bg-red-600/25 blur-[140px] pointer-events-none transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isForward ? 'w-[750px] h-[750px] opacity-80' : 'w-[420px] h-[420px] opacity-40'
          }`}
        />

        {/* SOLID EMBLEM (DRIFTS FORWARD TOWARDS USER, THEN HIDES ON SCATTER) */}
        <div
          className={`flex flex-col items-center relative z-20 transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isScattered
              ? 'opacity-0 scale-[2.7] pointer-events-none'
              : isForward
              ? 'opacity-100 scale-[2.35]'
              : 'opacity-100 scale-100'
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-black/95 border-2 border-red-500/70 p-2 flex items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.6)] backdrop-blur-md">
            <img src="/cobb-logo.png" alt="Cobb Italy" className="w-full h-full object-contain" />
            <span className="absolute -bottom-2.5 px-3.5 py-1 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5 border border-red-400/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AUTHENTICATED
            </span>
          </div>

          <div className="mt-5 text-center space-y-1">
            <h2 className="text-white font-black tracking-widest text-base uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              COBB SHOWROOM POS
            </h2>
            <p className="text-red-400 text-[11px] font-mono tracking-widest uppercase">
              ENTERING COMMAND CENTER
            </p>
          </div>

          <div className="w-36 h-1 bg-white/10 rounded-full overflow-hidden mt-3 shadow-inner">
            <div className="w-full h-full bg-gradient-to-r from-red-600 via-amber-400 to-red-600 animate-pulse" />
          </div>
        </div>

        {/* PRISMATIC GLASS SHARDS (SCATTER OUTWARD IN 3D PERSPECTIVE ONCE REACHING USER) */}
        {isScattered && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {PRISMATIC_SHARDS.map((shard) => (
              <div
                key={shard.id}
                className={`absolute ${shard.size} transition-all duration-[1900ms] ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center`}
                style={{
                  clipPath: shard.clip,
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(220, 38, 38, 0.45) 50%, rgba(10, 10, 15, 0.85) 100%)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(254, 202, 202, 0.6)',
                  boxShadow: '0 0 30px rgba(239, 68, 68, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.3)',
                  transform: `translate3d(${shard.x}, ${shard.y}, ${shard.z}) rotateX(${shard.rx}) rotateY(${shard.ry}) rotateZ(${shard.rz}) scale(1.3)`,
                  opacity: 0,
                  transitionDelay: shard.delay
                }}
              >
                {/* Refractive prismatic sheen line */}
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-amber-300 to-transparent opacity-80" />
              </div>
            ))}
          </div>
        )}
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
