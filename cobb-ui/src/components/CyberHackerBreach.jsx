import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * CyberHackerBreach: "Coming Towards Me Like Hacking" Login Transition
 * 
 * Choreography:
 * 1. Initial Telemetry Lock (0ms - 500ms):
 *    - 3D perspective cyberspace grid floor and data waterfall stream.
 *    - Dual-ring rotating radar reticles lock onto the central Cobb HUD core.
 * 2. Hyperspace Data Warp Acceleration (500ms - 1500ms):
 *    - Starfield warp particles rush forward directly out of the screen toward the user.
 *    - Core emblem glitches with chromatic aberration and accelerates forward.
 * 3. Supersonic Zoom-Through (1500ms - 1900ms):
 *    - The central cyber emblem rushes directly at the user (scale(18) / translateZ(600px))
 *      breaching past the camera and shattering the hacker veil to unveil the live POS.
 * 4. 1-Tap / Key Instant Bypass:
 *    - Tapping/clicking anywhere or pressing any key immediately completes the transition.
 * 5. Audio: Silent.
 */
const CyberHackerBreach = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const completedRef = useRef(false);
  const [isWarping, setIsWarping] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (onComplete) onComplete();
  }, [onComplete]);

  // Canvas Warp Tunnel Engine (3D Data Particles Rushing Forward Toward User)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const numStars = 180;
    const stars = [];
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: Math.random() * width,
        prevZ: 0
      });
    }

    let speed = 4.5;
    let speedTarget = 4.5;

    const render = () => {
      ctx.fillStyle = 'rgba(3, 4, 6, 0.28)';
      ctx.fillRect(0, 0, width, height);

      speed += (speedTarget - speed) * 0.1;
      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.prevZ = star.z;
        star.z -= speed;

        if (star.z <= 0) {
          star.z = width;
          star.prevZ = width;
          star.x = (Math.random() - 0.5) * width * 2;
          star.y = (Math.random() - 0.5) * height * 2;
        }

        const k = 180 / star.z;
        const px = star.x * k + cx;
        const py = star.y * k + cy;

        const prevK = 180 / star.prevZ;
        const prevPx = star.x * prevK + cx;
        const prevPy = star.y * prevK + cy;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const alpha = Math.min(1, (1 - star.z / width) * 1.6);
          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
          ctx.lineWidth = Math.max(1, (1 - star.z / width) * 3);
          ctx.beginPath();
          ctx.moveTo(prevPx, prevPy);
          ctx.lineTo(px, py);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    // Trigger Hyperspace acceleration
    const accelTimer = setTimeout(() => {
      speedTarget = 36;
    }, 550);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(accelTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Sequence Timing
  useEffect(() => {
    // 350ms: Digital Glitch pulses on the core
    const glitchTimer = setTimeout(() => {
      setIsGlitching(true);
    }, 350);

    // 650ms: Supersonic Zoom-Through Rushes directly forward towards user
    const warpTimer = setTimeout(() => {
      setIsWarping(true);
    }, 650);

    // 1900ms: Transition finishes, reveals POS Command Center
    const finishTimer = setTimeout(() => {
      handleFinish();
    }, 1900);

    // Keyboard instant bypass
    const handleKeyDown = () => {
      handleFinish();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(glitchTimer);
      clearTimeout(warpTimer);
      clearTimeout(finishTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleFinish]);

  return (
    <div
      onClick={handleFinish}
      className={`fixed inset-0 z-[9999] overflow-hidden select-none cursor-pointer bg-[#030406] transition-opacity duration-700 ease-out ${
        isWarping ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ perspective: '800px', perspectiveOrigin: '50% 50%' }}
      aria-hidden="true"
      title="Click or press any key to bypass hacker breach"
    >
      {/* 1. 3D Stars Warp Canvas (Accelerates Toward Camera) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* 2. Perspective 3D Cyberspace Grid Floor */}
      <div
        className="absolute -bottom-28 left-0 right-0 h-[380px] pointer-events-none opacity-45 animate-grid-rush"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage:
            'linear-gradient(to right, rgba(239, 68, 68, 0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(239, 68, 68, 0.28) 1px, transparent 1px)',
          transform: 'rotateX(68deg)',
          transformOrigin: '50% 100%'
        }}
      />

      {/* 3. Terminal Telemetry Streams (Left & Right Flanks) */}
      <div className="absolute top-6 left-6 z-20 text-[10px] font-mono text-red-400/80 space-y-1 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)] pointer-events-none hidden sm:block">
        <div>[KERNEL] 0x7FFF004B2... VERIFIED</div>
        <div>[BYPASS] SSL_PINNING: DEFEATED</div>
        <div>[SOCKET] 127.0.0.1:5000 HOOKED</div>
        <div>[STORE] COBB_PUNDRI_SQL DECRYPTED</div>
        <div>[MEMORY] BUFFER_ALLOC: 4096MB</div>
        <div className="text-amber-400 font-bold">&gt;&gt; PENETRATION_VECTOR: LIVE</div>
      </div>

      <div className="absolute top-6 right-6 z-20 text-[10px] font-mono text-red-400/80 space-y-1 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)] text-right pointer-events-none hidden sm:block">
        <div>PAYLOAD: COBB_ROOT_V4</div>
        <div>NODE_STATUS: ONLINE</div>
        <div>FIREWALL_STATE: OVERRIDDEN</div>
        <div>HASH: sha256_e4b10...</div>
        <div className="text-emerald-400 font-bold">[ACCESS_GRANTED: 100%]</div>
      </div>

      {/* 4. Concentric Shockwave Rings Rushing Forward Toward User */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-[260px] h-[260px] rounded-full border-2 border-red-500/40 animate-cyber-shockwave-1" />
        <div className="absolute w-[260px] h-[260px] rounded-full border-2 border-amber-500/40 animate-cyber-shockwave-2" />
        <div className="absolute w-[260px] h-[260px] rounded-full border-2 border-red-500/40 animate-cyber-shockwave-3" />
      </div>

      {/* 5. Central Cobb Cyber Emblem (Rushes Directly Towards Camera) */}
      <div
        className={`absolute inset-0 flex items-center justify-center z-30 pointer-events-none transition-all duration-[1100ms] ${
          isGlitching ? 'animate-cyber-glitch' : ''
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.7, 0, 0.2, 1)',
          transform: isWarping ? 'translateZ(600px) scale(18)' : 'translateZ(0) scale(1)',
          opacity: isWarping ? 0 : 1
        }}
      >
        {/* Outer Dual-Ring Rotating Radar HUD */}
        <div className="absolute w-[270px] h-[270px] rounded-full border border-dashed border-red-500/50 animate-reticle-slow pointer-events-none" />
        <div className="absolute w-[220px] h-[220px] rounded-full border border-dotted border-amber-400/60 animate-reticle-rev pointer-events-none" />

        {/* Ambient Subtle Crimson Glow */}
        <div className="absolute w-[440px] h-[440px] rounded-full bg-red-600/30 blur-[120px] pointer-events-none" />

        {/* Central Core Emblem Card */}
        <div className="relative z-40 flex flex-col items-center">
          <div className="relative w-28 h-28 rounded-3xl bg-black border-2 border-red-500 p-2 flex items-center justify-center shadow-[0_0_65px_rgba(239,68,68,0.7)] backdrop-blur-md">
            <img src="/cobb-logo.png" alt="Cobb Italy" className="w-full h-full object-contain" />

            {/* Corner Cyber Brackets */}
            <span className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-red-400" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-red-400" />
            <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-red-400" />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-red-400" />

            {/* Status Badge */}
            <span className="absolute -bottom-3 px-3 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5 border border-red-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>ROOT_OVERRIDE</span>
            </span>
          </div>

          {/* Terminal Breach Typography */}
          <div className="mt-6 text-center space-y-1 font-mono">
            <div className="text-xs text-red-500 font-bold tracking-widest uppercase flex items-center justify-center gap-2">
              <span>&lt;COBB_BREACH_PROTOCOL&gt;</span>
            </div>
            <h2 className="text-white font-black tracking-widest text-base uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]">
              WARPING INTO COMMAND DECK
            </h2>
            <p className="text-amber-400 text-[11px] tracking-wider uppercase">
              INCOMING VELOCITY: MACH 4.8
            </p>
          </div>

          {/* Streaming Decryption Progress Bar */}
          <div className="w-44 h-1.5 bg-black/80 rounded-full border border-red-500/40 overflow-hidden mt-3 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
            <div className="w-full h-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 6. Subtle 1-Tap Bypass Hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div className="px-3.5 py-1 rounded-full bg-black/80 border border-red-500/30 text-[10px] font-mono tracking-widest text-zinc-400 flex items-center gap-2 backdrop-blur-md shadow-lg opacity-70">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          <span>TAP ANYWHERE TO BYPASS WARP STREAM</span>
        </div>
      </div>
    </div>
  );
};

export default CyberHackerBreach;
