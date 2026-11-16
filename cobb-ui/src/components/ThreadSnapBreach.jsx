import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * ThreadSnapBreach: Photorealistic Textile Physics Login Transition (0.25x Macro Slo-Mo)
 * 
 * Choreography:
 * 1. Tensile Strain Escalation (0ms - 2200ms):
 *    - Two braided 3-ply twisted spun silk cords (Crimson & Amber) stretch across the display.
 *    - High-frequency micro-strain vibration and dynamic necking (cord thinning under tension).
 *    - Real-time strain telemetry climbing from 420 MPa to 1,400 MPa [Critical Yielding].
 * 2. Cataclysmic Macro Snap (at 2200ms):
 *    - 36-segment Verlet rope physics releases tension shockwaves with transverse whip-cracks.
 *    - 32 frayed filament brush fibers whip and fan out at the broken tips.
 *    - 280 organic micro-fiber lint particles burst outward with aerodynamic air drag and spin.
 *    - Camera recoil screen shake and chromatic lens kick on the Cobb tailoring clamp emblem.
 * 3. Emblem Breaching & Dashboard Reveal (2200ms - 3600ms):
 *    - Central logo clamp dissolves outward into the camera (scale(4.5)), cleanly unveiling
 *      the live POS Command Center dashboard.
 * 4. 1-Tap / Key Instant Bypass:
 *    - Urgent counter bypass: click/tap anywhere or press any key to enter the POS instantly.
 * 5. Audio Constraint:
 *    - Completely silent (0 sound effects).
 */
const ThreadSnapBreach = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const completedRef = useRef(false);
  const [playSpeed] = useState(0.25); // Default to 0.25x Macro Slo-Mo per user instruction
  const [stageState, setStageState] = useState('tension'); // 'tension' | 'snapped' | 'revealed'
  const [tensionPhase, setTensionPhase] = useState(0); // 0 to 1
  const [tensileLoad, setTensileLoad] = useState(420);
  const [isCameraRecoil, setIsCameraRecoil] = useState(false);
  const [isChromatic, setIsChromatic] = useState(false);

  const stageStateRef = useRef('tension');
  const tensionPhaseRef = useRef(0);

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (onComplete) onComplete();
  }, [onComplete]);

  // Keyboard shortcut listener to bypass instantly
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept function keys (F1-F12)
      if (e.key && e.key.startsWith('F') && e.key.length > 1) return;
      handleFinish();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFinish]);

  // 1. Sequence Lifecycle Timers (Independent of canvas/DOM context for robust test & headless support)
  useEffect(() => {
    let p = 0;
    const tensionInterval = setInterval(() => {
      p += 0.025;
      const phaseVal = Math.min(1, p);
      tensionPhaseRef.current = phaseVal;
      setTensionPhase(phaseVal);
      setTensileLoad(Math.floor(420 + phaseVal * 980));

      if (p >= 1) {
        clearInterval(tensionInterval);
      }
    }, 45);

    // Cataclysmic Snap occurs at 2200ms
    const snapTimeout = setTimeout(() => {
      clearInterval(tensionInterval);
      stageStateRef.current = 'snapped';
      setStageState('snapped');
      setIsCameraRecoil(true);
      setIsChromatic(true);

      setTimeout(() => setIsChromatic(false), 450);
      setTimeout(() => setIsCameraRecoil(false), 550);
    }, 2200);

    // Reveal and complete at 3600ms
    const completeTimeout = setTimeout(() => {
      stageStateRef.current = 'revealed';
      setStageState('revealed');
      handleFinish();
    }, 3600);

    return () => {
      clearInterval(tensionInterval);
      clearTimeout(snapTimeout);
      clearTimeout(completeTimeout);
    };
  }, [handleFinish]);

  // 2. Canvas Textile Physics Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // Graceful fallback in jsdom or headless environments

    let animId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Verlet Physics Rope Points
    const SEGMENTS = 36;
    let ropeLeft = [];
    let ropeRight = [];

    // Frayed Filament Brush Tips
    let leftBrushFibers = [];
    let rightBrushFibers = [];

    // Organic Micro-Fiber Lint Shrapnel
    let microFibers = [];
    const NUM_MICRO_FIBERS = 280;
    let spawnedShrapnel = false;

    class RopePoint {
      constructor(x, y, pinned = false) {
        this.x = x;
        this.y = y;
        this.oldX = x;
        this.oldY = y;
        this.pinned = pinned;
      }
    }

    const initRopes = () => {
      ropeLeft = [];
      ropeRight = [];
      const cy = height / 2;
      const midX = width / 2;

      // Left rope: pinned at wall x=0, stretches to midX - 45
      const leftTargetX = midX - 45;
      for (let i = 0; i <= SEGMENTS; i++) {
        const x = (leftTargetX * i) / SEGMENTS;
        ropeLeft.push(new RopePoint(x, cy, i === 0));
      }

      // Right rope: starts at midX + 45, stretches to width (pinned)
      const rightStartX = midX + 45;
      const rightLen = width - rightStartX;
      for (let i = 0; i <= SEGMENTS; i++) {
        const x = rightStartX + (rightLen * i) / SEGMENTS;
        ropeRight.push(new RopePoint(x, cy, i === SEGMENTS));
      }

      // Initialize frayed filament tips
      leftBrushFibers = [];
      rightBrushFibers = [];
      for (let i = 0; i < 32; i++) {
        leftBrushFibers.push({
          len: 12 + Math.random() * 26,
          curlAngle: (Math.random() - 0.5) * 1.8,
          wobbleOffset: Math.random() * 10,
          color: Math.random() > 0.3 ? '#dc2626' : (Math.random() > 0.5 ? '#f59e0b' : '#ef4444'),
          width: 0.8 + Math.random() * 1.2
        });
        rightBrushFibers.push({
          len: 12 + Math.random() * 26,
          curlAngle: (Math.random() - 0.5) * 1.8,
          wobbleOffset: Math.random() * 10,
          color: Math.random() > 0.3 ? '#b91c1c' : (Math.random() > 0.5 ? '#d97706' : '#ea580c'),
          width: 0.8 + Math.random() * 1.2
        });
      }
    };

    const spawnOrganicMicroFibers = (cx, cy) => {
      microFibers = [];
      for (let i = 0; i < NUM_MICRO_FIBERS; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (Math.random() > 0.8 ? 24 : 14) + 3;
        const isCurlyThread = Math.random() > 0.5;

        microFibers.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.8,
          length: isCurlyThread ? (5 + Math.random() * 18) : (1.5 + Math.random() * 3),
          angle: Math.random() * Math.PI * 2,
          spinSpeed: (Math.random() - 0.5) * 0.35,
          color: Math.random() > 0.35 ? '#ef4444' : (Math.random() > 0.4 ? '#f59e0b' : '#ffffff'),
          alpha: 0.95,
          decay: Math.random() * 0.012 + 0.007,
          curliness: Math.random() * 1.5,
          drag: 0.94 + Math.random() * 0.04,
          weight: Math.random() * 0.25 + 0.08
        });
      }
    };

    const updateVerletRope = (rope, recoilDir, dt) => {
      for (let i = 0; i < rope.length; i++) {
        const pt = rope[i];
        if (pt.pinned) continue;

        let vx = (pt.x - pt.oldX) * 0.96;
        let vy = (pt.y - pt.oldY) * 0.96;

        pt.oldX = pt.x;
        pt.oldY = pt.y;

        const anchorDistFactor = (rope.length - i) / rope.length;
        if (recoilDir === 'left') {
          vx -= 4.2 * anchorDistFactor * dt;
        } else {
          vx += 4.2 * (i / rope.length) * dt;
        }

        vy += Math.sin(Date.now() * 0.02 + i * 0.6) * 1.8 * dt;

        pt.x += vx * dt;
        pt.y += vy * dt;
      }

      const iterations = 5;
      const targetLen = (width / 2) / SEGMENTS;
      for (let it = 0; it < iterations; it++) {
        for (let i = 0; i < rope.length - 1; i++) {
          const p1 = rope[i];
          const p2 = rope[i + 1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.hypot(dx, dy);
          if (dist === 0) continue;
          const diff = (dist - targetLen) / dist;

          const offsetX = dx * 0.5 * diff;
          const offsetY = dy * 0.5 * diff;

          if (!p1.pinned && !p2.pinned) {
            p1.x += offsetX;
            p1.y += offsetY;
            p2.x -= offsetX;
            p2.y -= offsetY;
          } else if (!p1.pinned) {
            p1.x += offsetX * 2;
            p1.y += offsetY * 2;
          } else if (!p2.pinned) {
            p2.x -= offsetX * 2;
            p2.y -= offsetY * 2;
          }
        }
      }
    };

    const renderBraidedCord = (rope, isSnapping, side, t, curTensionPhase, curStageState) => {
      if (rope.length < 2) return;

      const numPts = rope.length;
      const cordBaseColor = side === 'left' ? '#dc2626' : '#b91c1c';
      const cordHighlight = side === 'left' ? '#fca5a5' : '#fed7aa';
      const cordShadow = '#450a0a';

      const neckFactor = curStageState === 'tension' ? (1 - curTensionPhase * 0.35) : 0.85;
      const numPlies = 3;

      for (let p = 0; p < numPlies; p++) {
        const plyPhase = (p * Math.PI * 2) / numPlies;

        ctx.beginPath();
        for (let i = 0; i < numPts; i++) {
          const pt = rope[i];
          let vib = 0;
          if (curStageState === 'tension') {
            const edgeRatio = side === 'left' ? (i / numPts) : (1 - i / numPts);
            vib = Math.sin(t * 0.08 + i * 0.8) * (curTensionPhase * 4) * edgeRatio;
          }

          const braidDist = (Math.sin(i * 0.65 + plyPhase + (curStageState === 'snapped' ? t * 0.01 : 0)) * 2.8) * neckFactor;
          const drawY = pt.y + vib + braidDist;

          if (i === 0) {
            ctx.moveTo(pt.x, drawY);
          } else {
            const prev = rope[i - 1];
            const midX = (prev.x + pt.x) / 2;
            const midY = (prev.y + pt.y) / 2 + vib + braidDist;
            ctx.quadraticCurveTo(prev.x, prev.y + vib + braidDist, midX, midY);
          }
        }

        ctx.strokeStyle = p === 1 ? cordHighlight : (p === 0 ? cordBaseColor : cordShadow);
        ctx.lineWidth = Math.max(1.2, (2.6 * neckFactor));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = side === 'left' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.3)';
        ctx.stroke();
      }

      if (curStageState === 'snapped') {
        const tipPt = side === 'left' ? rope[rope.length - 1] : rope[0];
        const fibers = side === 'left' ? leftBrushFibers : rightBrushFibers;
        const dir = side === 'left' ? 1 : -1;

        ctx.save();
        ctx.translate(tipPt.x, tipPt.y);

        for (let f = 0; f < fibers.length; f++) {
          const fib = fibers[f];
          const wobble = Math.sin(t * 0.04 + fib.wobbleOffset) * 4;

          ctx.beginPath();
          ctx.moveTo(0, 0);
          const cpX = (fib.len * 0.5 * dir) + Math.cos(fib.curlAngle) * 5;
          const cpY = (Math.sin(fib.curlAngle) * fib.len * 0.6) + wobble;
          const endX = (fib.len * dir) + Math.cos(fib.curlAngle) * 8;
          const endY = (Math.sin(fib.curlAngle) * fib.len) + wobble * 1.5;

          ctx.quadraticCurveTo(cpX, cpY, endX, endY);
          ctx.strokeStyle = fib.color;
          ctx.lineWidth = fib.width;
          ctx.shadowBlur = 4;
          ctx.shadowColor = fib.color;
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    initRopes();

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      const dt = playSpeed;
      const curStage = stageStateRef.current;
      const curPhase = tensionPhaseRef.current;

      if (curStage === 'snapped') {
        if (!spawnedShrapnel) {
          spawnedShrapnel = true;
          spawnOrganicMicroFibers(width / 2, height / 2);
        }
        updateVerletRope(ropeLeft, 'left', dt);
        updateVerletRope(ropeRight, 'right', dt);
      }

      renderBraidedCord(ropeLeft, curStage === 'snapped', 'left', now, curPhase, curStage);
      renderBraidedCord(ropeRight, curStage === 'snapped', 'right', now, curPhase, curStage);

      if (curStage === 'snapped' && microFibers.length > 0) {
        for (let i = 0; i < microFibers.length; i++) {
          const mf = microFibers[i];
          mf.vx *= Math.pow(mf.drag, dt);
          mf.vy *= Math.pow(mf.drag, dt);
          mf.vy += mf.weight * dt;
          mf.x += mf.vx * dt;
          mf.y += mf.vy * dt;
          mf.angle += mf.spinSpeed * dt;
          mf.alpha -= mf.decay * dt;

          if (mf.alpha > 0) {
            ctx.save();
            ctx.translate(mf.x, mf.y);
            ctx.rotate(mf.angle);
            ctx.globalAlpha = Math.max(0, mf.alpha);

            ctx.beginPath();
            ctx.moveTo(-mf.length / 2, 0);
            ctx.quadraticCurveTo(0, mf.curliness * 2, mf.length / 2, 0);
            ctx.strokeStyle = mf.color;
            ctx.lineWidth = 1.2;
            ctx.shadowBlur = 6;
            ctx.shadowColor = mf.color;
            ctx.stroke();

            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      initRopes();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [playSpeed]);

  return (
    <div
      onClick={handleFinish}
      className={`fixed inset-0 z-50 overflow-hidden cursor-pointer select-none transition-opacity duration-700 ${
        stageState === 'revealed' ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        backgroundColor: '#020205',
        background: 'radial-gradient(circle at 50% 50%, rgba(20, 20, 28, 0.4) 0%, rgba(2, 2, 5, 0.95) 80%, #010103 100%)'
      }}
    >
      {/* 1. Camera Recoil Container */}
      <div
        className={`relative w-full h-full flex items-center justify-center transition-transform ${
          isCameraRecoil ? 'scale-[1.015] translate-x-[-4px] translate-y-[3px]' : 'scale-100 translate-x-0 translate-y-0'
        }`}
      >
        {/* 2. Macro Ring Light Specular Glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255, 230, 220, 0.08) 0%, rgba(220, 38, 38, 0.05) 30%, transparent 65%)'
          }}
        />

        {/* 3. Textile Physics Canvas (Verlet Ropes, Frayed Tips, Micro-Fibers) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* 4. Central Cobb Tailoring Clamp Emblem */}
        <div
          className={`relative z-40 flex flex-col items-center transition-all duration-700 ease-out ${
            stageState === 'snapped'
              ? 'scale-[4.5] opacity-0 pointer-events-none'
              : 'scale-100 opacity-100'
          } ${isChromatic ? 'filter drop-shadow-[-3px_0_0_rgba(239,68,68,0.8)] drop-shadow-[3px_0_0_rgba(59,130,246,0.8)]' : ''}`}
        >
          {/* Tactile Metal Riveted Emblem */}
          <div className="relative w-24 h-24 rounded-2xl bg-[#09090e] border border-zinc-700/80 p-2.5 flex items-center justify-center shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(220,38,38,0.3)]">
            <img src="/cobb-logo.png" alt="Cobb Italy" className="w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" />

            {/* Fastener Clamps */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-6 rounded-md bg-gradient-to-r from-zinc-700 to-zinc-900 border border-zinc-600 shadow-md"></div>
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-6 rounded-md bg-gradient-to-l from-zinc-700 to-zinc-900 border border-zinc-600 shadow-md"></div>

            {/* Mode Tag */}
            <span className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-red-950/80 text-red-300 text-[8px] font-mono font-bold tracking-widest border border-red-500/40 uppercase shadow-lg">
              0.25x MACRO SLO-MO
            </span>
          </div>

          {/* Tensile Telemetry HUD */}
          <div className="mt-4 text-center font-mono space-y-1">
            <div className="w-48 h-1.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden mx-auto">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 transition-all duration-75"
                style={{ width: `${Math.min(100, 25 + tensionPhase * 75)}%` }}
              />
            </div>

            <div className="text-xs font-black tracking-widest uppercase transition-colors">
              <span className={tensionPhase > 0.75 ? 'text-red-500 animate-pulse' : 'text-zinc-200'}>
                TENSILE LOAD: {tensileLoad} MPa
              </span>
            </div>

            <div className="text-[10px] text-zinc-400 tracking-wider uppercase">
              {stageState === 'snapped'
                ? 'STRUCTURAL RUPTURE COMPLETE • REVEALING POS'
                : 'Italian Spun Silk • 3-Ply Braided Twist'}
            </div>
          </div>
        </div>

        {/* 5. 1-Tap Urgent Bypass Hint */}
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
