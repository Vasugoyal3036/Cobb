import React, { useEffect, useRef } from 'react';

/**
 * FabricConstellation: Interactive HTML5 Canvas background
 * Simulates floating luxury Italian tailoring fibers and embers that form
 * dynamic connecting hairline seams when nearby, reacting organically to mouse cursor movement.
 */
const FabricConstellation = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return; // Graceful fallback in jsdom or browsers without 2D canvas

    let animationFrameId;
    let isTabVisible = true;

    // Canvas sizing
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth || window.innerWidth;
        canvas.height = parent.clientHeight || window.innerHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle nodes configuration
    const PARTICLE_COUNT = 48;
    const MAX_DISTANCE = 115;
    const MOUSE_REPEL_RADIUS = 135;

    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const isRed = Math.random() > 0.35;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.55,
        vy: (Math.random() - 0.5) * 0.55,
        fiberLength: Math.random() * 14 + 6,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 0.015,
        color: isRed ? 'rgba(239, 68, 68, 0.75)' : 'rgba(255, 255, 255, 0.55)',
        lineColor: isRed ? '239, 68, 68' : '255, 255, 255',
        radius: isRed ? Math.random() * 1.5 + 1.0 : Math.random() * 1.2 + 0.8,
      });
    }

    // Cursor tracking
    let mouse = { x: -9999, y: -9999 };
    const handlePointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handlePointerLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);

    // Tab visibility handling (0% CPU when tab is hidden)
    const handleVisibilityChange = () => {
      isTabVisible = document.visibilityState === 'visible';
      if (isTabVisible) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Main animation loop
    const render = () => {
      if (!isTabVisible) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // 1. Update and draw connecting seams between nodes
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Position update
        p1.x += p1.vx;
        p1.y += p1.vy;
        p1.angle += p1.angularSpeed;

        // Wrap boundaries
        if (p1.x < -20) p1.x = w + 20;
        if (p1.x > w + 20) p1.x = -20;
        if (p1.y < -20) p1.y = h + 20;
        if (p1.y > h + 20) p1.y = -20;

        // Mouse cursor repel physics
        const dxm = p1.x - mouse.x;
        const dym = p1.y - mouse.y;
        const distMouse = Math.sqrt(dxm * dxm + dym * dym);

        if (distMouse < MOUSE_REPEL_RADIUS && distMouse > 0) {
          const force = (1 - distMouse / MOUSE_REPEL_RADIUS) * 2.2;
          p1.x += (dxm / distMouse) * force;
          p1.y += (dym / distMouse) * force;

          // Connect cursor to nearby fiber with faint golden/crimson thread
          const mouseAlpha = (1 - distMouse / MOUSE_REPEL_RADIUS) * 0.35;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(239, 68, 68, ${mouseAlpha})`;
          ctx.lineWidth = 0.85;
          ctx.stroke();
        }

        // Connect nearby fibers with tailoring seam threads
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_DISTANCE) {
            const alpha = (1 - dist / MAX_DISTANCE) * 0.28;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${p1.lineColor}, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      // 2. Render particle nodes & micro-fibers
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Micro-fiber line
        ctx.beginPath();
        ctx.moveTo(-p.fiberLength / 2, 0);
        ctx.lineTo(p.fiberLength / 2, 0);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.radius;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Node center ember glow
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};

export default FabricConstellation;
