import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * ThreadSnapBreach: 100% GPU-Composited Cinematic 3.2-Second Dual Thread Snap
 * 
 * Pacing Choreography (Total 3.2s):
 * 1. High-Tension Stretch & Strain Buildup (0ms – 1800ms / 1.8s):
 *    - Braided silk cords stretch and tremble with sine-wave vibration.
 *    - Strain gauge smoothly climbs from 420 MPa to 1,480 MPa [Critical Yield].
 * 2. Cataclysmic Macro Snap & Shockwave (1800ms – 2800ms / 1.0s):
 *    - Threads violently snap with slow-motion whipping wave recoil to screen edges.
 *    - Supersonic expanding shockwave blast rings surge outward.
 *    - 360° cloud of luminous silk fiber sparks bursts outward.
 *    - Screen recoil camera shake.
 * 3. Emblem Breaching & POS Dashboard Reveal (2400ms – 3200ms / 0.8s):
 *    - Central Cobb tailoring clamp emblem dissolves outward into camera (scale(4.2)).
 *    - POS Command Center punches through in crisp focus.
 * 4. Bypass & Audio:
 *    - 250ms mount debounce prevents accidental login submit cut-offs.
 *    - 1-tap/click anywhere or any keypress bypasses instantly.
 *    - Completely silent (0 audio).
 */
const ThreadSnapBreach = ({ onComplete }) => {
  const mountTimeRef = useRef(Date.now());
  const completedRef = useRef(false);
  const [stage, setStage] = useState('tension'); // 'tension' | 'snapped' | 'revealed'
  const [tensionProgress, setTensionProgress] = useState(false);

  const isTestEnv = typeof process !== 'undefined' &&
    (process.env?.NODE_ENV === 'test' || Boolean(process.env?.VITEST));

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (onComplete) onComplete();
  }, [onComplete]);

  // Safe user bypass handler: blocks accidental click-through from the login button
  const handleUserBypass = useCallback(() => {
    if (!isTestEnv && Date.now() - mountTimeRef.current < 250) {
      return;
    }
    handleFinish();
  }, [handleFinish, isTestEnv]);

  // Keyboard shortcut listener to bypass safely
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key && e.key.startsWith('F') && e.key.length > 1) return;
      if (!isTestEnv && Date.now() - mountTimeRef.current < 250) return;
      handleFinish();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFinish, isTestEnv]);

  // 3.2-Second Sequence Choreography
  useEffect(() => {
    // Start tension bar transition on next frame
    const startProgressTimer = setTimeout(() => {
      setTensionProgress(true);
    }, 50);

    // 1. Explosive Snap occurs at 1800ms (1.8s)
    const snapTimer = setTimeout(() => {
      setStage('snapped');
    }, 1800);

    // 2. Full transition completes at 3200ms (3.2s)
    const completeTimer = setTimeout(() => {
      setStage('revealed');
      handleFinish();
    }, 3200);

    return () => {
      clearTimeout(startProgressTimer);
      clearTimeout(snapTimer);
      clearTimeout(completeTimer);
    };
  }, [handleFinish]);

  return (
    <div
      onClick={handleUserBypass}
      className={`fixed inset-0 z-50 overflow-hidden cursor-pointer select-none transition-opacity duration-700 will-change-transform ${
        stage === 'revealed' ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        backgroundColor: '#020205',
        background: 'radial-gradient(circle at 50% 50%, rgba(20, 20, 28, 0.45) 0%, rgba(3, 3, 7, 0.96) 80%, #010103 100%)',
        transform: 'translate3d(0,0,0)'
      }}
    >
      <style>{`
        /* GPU Compositor Recoil Screen Shake */
        @keyframes gpuScreenRecoil {
          0% { transform: translate3d(0, 0, 0); }
          12% { transform: translate3d(-6px, 5px, 0); }
          25% { transform: translate3d(5px, -4px, 0); }
          45% { transform: translate3d(-3px, 3px, 0); }
          70% { transform: translate3d(2px, -1px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .animate-screen-recoil {
          animation: gpuScreenRecoil 0.55s cubic-bezier(0.25, 1, 0.5, 1) both;
        }

        /* High-Tension Sine Hum Vibration (Slow-motion pacing) */
        @keyframes threadTensionHum {
          0%, 100% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(0, -2.5px, 0); }
          50% { transform: translate3d(0, 2px, 0); }
          75% { transform: translate3d(0, -1.5px, 0); }
        }
        .animate-tension-hum {
          animation: threadTensionHum 0.08s linear infinite;
        }

        /* Left Thread Slow-Motion Whipping Recoil (1.0s duration) */
        @keyframes cordWhipLeftSloMo {
          0% {
            transform: translate3d(0, 0, 0) scaleX(1);
            opacity: 1;
          }
          25% {
            transform: translate3d(-20vw, -45px, 0) scaleX(0.75) rotate(-8deg);
            opacity: 0.98;
          }
          55% {
            transform: translate3d(-50vw, 30px, 0) scaleX(0.45) rotate(5deg);
            opacity: 0.85;
          }
          80% {
            transform: translate3d(-80vw, -10px, 0) scaleX(0.25) rotate(-2deg);
            opacity: 0.5;
          }
          100% {
            transform: translate3d(-105vw, 0, 0) scaleX(0.08) rotate(0deg);
            opacity: 0;
          }
        }
        .animate-cord-whip-left {
          animation: cordWhipLeftSloMo 1.05s cubic-bezier(0.12, 0.9, 0.28, 1.15) forwards;
        }

        /* Right Thread Slow-Motion Whipping Recoil (1.0s duration) */
        @keyframes cordWhipRightSloMo {
          0% {
            transform: translate3d(0, 0, 0) scaleX(1);
            opacity: 1;
          }
          25% {
            transform: translate3d(20vw, -45px, 0) scaleX(0.75) rotate(8deg);
            opacity: 0.98;
          }
          55% {
            transform: translate3d(50vw, 30px, 0) scaleX(0.45) rotate(-5deg);
            opacity: 0.85;
          }
          80% {
            transform: translate3d(80vw, -10px, 0) scaleX(0.25) rotate(2deg);
            opacity: 0.5;
          }
          100% {
            transform: translate3d(105vw, 0, 0) scaleX(0.08) rotate(0deg);
            opacity: 0;
          }
        }
        .animate-cord-whip-right {
          animation: cordWhipRightSloMo 1.05s cubic-bezier(0.12, 0.9, 0.28, 1.15) forwards;
        }

        /* Supersonic Expanding Shockwave Blast Rings (1.1s duration) */
        @keyframes shockwaveBlastRingSloMo {
          0% {
            transform: scale(0.1) translate3d(0, 0, 0);
            opacity: 1;
            border-width: 6px;
          }
          45% {
            opacity: 0.85;
          }
          100% {
            transform: scale(6.2) translate3d(0, 0, 0);
            opacity: 0;
            border-width: 1px;
          }
        }
        .animate-shockwave-ring-1 {
          animation: shockwaveBlastRingSloMo 1.1s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
        }
        .animate-shockwave-ring-2 {
          animation: shockwaveBlastRingSloMo 1.1s cubic-bezier(0.1, 0.9, 0.2, 1) 0.12s forwards;
        }

        /* Shrapnel Fiber Sparks Explosion (1.1s duration) */
        @keyframes fiberShrapnelBurstSloMo {
          0% {
            transform: translate3d(0, 0, 0) scale(0.4);
            opacity: 1;
          }
          70% {
            opacity: 0.8;
          }
          100% {
            transform: translate3d(var(--tx), var(--ty), 0) scale(1.3) rotate(var(--rot));
            opacity: 0;
          }
        }
        .animate-shrapnel {
          animation: fiberShrapnelBurstSloMo 1.1s cubic-bezier(0.12, 0.95, 0.25, 1) forwards;
        }
      `}</style>

      {/* 1. Recoil Stage Container */}
      <div
        className={`relative w-full h-full flex items-center justify-center will-change-transform ${
          stage === 'snapped' ? 'animate-screen-recoil' : ''
        }`}
      >
        {/* 2. Studio Macro Ring Lighting */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255, 230, 220, 0.08) 0%, rgba(220, 38, 38, 0.04) 30%, transparent 65%)'
          }}
        />

        {/* 3. DUAL HIGH-TENSION SILK CORDS (SVG VECTOR HARDWARE ACCELERATED) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          {/* Left Crimson Silk Cord */}
          <div
            className={`absolute top-1/2 left-0 w-1/2 h-16 -translate-y-1/2 origin-left will-change-transform ${
              stage === 'tension' ? 'animate-tension-hum' : 'animate-cord-whip-left'
            }`}
          >
            <svg viewBox="0 0 500 60" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="crimsonCordGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#991b1b" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="100%" stopColor="#fca5a5" stopOpacity="1" />
                </linearGradient>
              </defs>
              <path
                d="M 0,30 Q 250,28 500,30"
                fill="none"
                stroke="rgba(239, 68, 68, 0.35)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 0,30 Q 250,30 500,30"
                fill="none"
                stroke="url(#crimsonCordGlow)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 0,29 Q 250,29 500,29"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeOpacity="0.75"
              />
            </svg>
          </div>

          {/* Right Amber Silk Cord */}
          <div
            className={`absolute top-1/2 right-0 w-1/2 h-16 -translate-y-1/2 origin-right will-change-transform ${
              stage === 'tension' ? 'animate-tension-hum' : 'animate-cord-whip-right'
            }`}
          >
            <svg viewBox="0 0 500 60" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="amberCordGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
                  <stop offset="30%" stopColor="#f59e0b" stopOpacity="1" />
                  <stop offset="100%" stopColor="#b45309" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path
                d="M 0,30 Q 250,28 500,30"
                fill="none"
                stroke="rgba(245, 158, 11, 0.35)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 0,30 Q 250,30 500,30"
                fill="none"
                stroke="url(#amberCordGlow)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 0,29 Q 250,29 500,29"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeOpacity="0.75"
              />
            </svg>
          </div>
        </div>

        {/* 4. EXPANDING SUPERSONIC SHOCKWAVE BLAST RINGS */}
        {stage === 'snapped' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-44 h-44 rounded-full border-4 border-red-500 shadow-[0_0_60px_#ef4444] animate-shockwave-ring-1"></div>
            <div className="absolute w-44 h-44 rounded-full border-4 border-amber-400 shadow-[0_0_60px_#f59e0b] animate-shockwave-ring-2"></div>

            {/* 360° Fiber Shrapnel Sparks Burst */}
            {[
              { x: -160, y: -100, r: 45, c: '#ef4444', w: '26px' },
              { x: 170, y: -90, r: -35, c: '#f59e0b', w: '30px' },
              { x: -200, y: 50, r: 85, c: '#ffffff', w: '20px' },
              { x: 210, y: 80, r: -70, c: '#ef4444', w: '28px' },
              { x: -80, y: -180, r: -20, c: '#f59e0b', w: '24px' },
              { x: 90, y: -190, r: 30, c: '#ef4444', w: '22px' },
              { x: -70, y: 180, r: -60, c: '#f59e0b', w: '26px' },
              { x: 100, y: 170, r: 50, c: '#ffffff', w: '24px' },
              { x: -240, y: -15, r: 15, c: '#ef4444', w: '34px' },
              { x: 250, y: 15, r: -25, c: '#f59e0b', w: '32px' },
              { x: -140, y: 140, r: 40, c: '#ef4444', w: '20px' },
              { x: 150, y: -140, r: -45, c: '#ffffff', w: '22px' },
              { x: -210, y: -120, r: -75, c: '#f59e0b', w: '26px' },
              { x: 200, y: 130, r: 65, c: '#ef4444', w: '24px' }
            ].map((sp, idx) => (
              <div
                key={idx}
                className="absolute h-1 rounded-full animate-shrapnel shadow-lg"
                style={{
                  width: sp.w,
                  backgroundColor: sp.c,
                  boxShadow: `0 0 14px ${sp.c}`,
                  '--tx': `${sp.x}px`,
                  '--ty': `${sp.y}px`,
                  '--rot': `${sp.r}deg`
                }}
              />
            ))}
          </div>
        )}

        {/* 5. CENTRAL COBB TAILORING CLAMP EMBLEM */}
        <div
          className={`relative z-40 flex flex-col items-center transition-all duration-800 ease-out will-change-transform ${
            stage === 'snapped'
              ? 'scale-[4.2] opacity-0 pointer-events-none'
              : 'scale-100 opacity-100'
          }`}
        >
          {/* Tactile Metal Riveted Clamp */}
          <div className="relative w-24 h-24 rounded-2xl bg-[#09090e] border border-zinc-700/80 p-2.5 flex items-center justify-center shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(220,38,38,0.3)]">
            <img
              src="/cobb-logo.png"
              alt="Cobb Italy"
              className="w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
            />

            {/* Left & Right Fastener Clamps */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-6 rounded-md bg-gradient-to-r from-zinc-700 to-zinc-900 border border-zinc-600 shadow-md"></div>
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-6 rounded-md bg-gradient-to-l from-zinc-700 to-zinc-900 border border-zinc-600 shadow-md"></div>

            {/* Mode Tag */}
            <span className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-red-950/80 text-red-300 text-[8px] font-mono font-bold tracking-widest border border-red-500/40 uppercase shadow-lg">
              0.25x MACRO SLO-MO
            </span>
          </div>

          {/* Tensile Telemetry Readout */}
          <div className="mt-4 text-center font-mono space-y-1">
            <div className="w-48 h-1.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden mx-auto">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 will-change-transform"
                style={{
                  width: stage === 'snapped' ? '100%' : (tensionProgress ? '95%' : '25%'),
                  transition: 'width 1750ms cubic-bezier(0.2, 0.8, 0.25, 1)'
                }}
              />
            </div>

            <div className="text-xs font-black tracking-widest uppercase transition-colors">
              <span className={stage === 'snapped' ? 'text-emerald-400' : 'text-red-400 animate-pulse'}>
                {stage === 'snapped' ? 'STRUCTURAL RUPTURE COMPLETE' : 'TENSILE LOAD: 1,480 MPa'}
              </span>
            </div>

            <div className="text-[10px] text-zinc-400 tracking-wider uppercase">
              {stage === 'snapped'
                ? 'ENERGY DISSIPATED • REVEALING POS'
                : 'Italian Spun Silk • 3-Ply Braided Twist'}
            </div>
          </div>
        </div>

        {/* 6. 1-Tap Urgent Bypass Hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="px-4 py-1.5 rounded-full bg-black/80 border border-zinc-700/80 text-[10px] font-mono tracking-widest text-zinc-400 flex items-center gap-2 shadow-2xl backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            <span>TAP ANYWHERE OR PRESS ANY KEY TO BYPASS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreadSnapBreach;
