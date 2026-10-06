import { useEffect, useRef } from 'react';

/**
 * Cinematic AI background:
 *  - neural network canvas (nodes + connections + pulses)
 *  - optical flare beam + aurora + grid + noise
 *  - cursor aura that follows mouse (desktop only)
 */
export default function BackgroundFX({ density = 1, interactive = true }) {
  const canvasRef = useRef(null);
  const auraRef = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let w = 0;
    let h = 0;
    let nodes = [];
    let pulses = [];
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const parent = canvas.parentElement;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
    };

    const seed = () => {
      const count = Math.floor(((w * h) / 22000) * density);
      const n = Math.max(28, Math.min(count, 110));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
        hue: Math.random() > 0.5 ? 265 : 190, // violet / cyan
      }));
      pulses = [];
      for (let i = 0; i < 7; i++) spawnPulse();
    };

    const spawnPulse = () => {
      if (nodes.length < 2) return;
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      // find a neighbour
      let best = null;
      let bestD = Infinity;
      for (const b of nodes) {
        if (a === b) continue;
        const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (d < bestD) { bestD = d; best = b; }
      }
      if (!best) return;
      pulses.push({ a, b: best, t: 0, speed: 0.012 + Math.random() * 0.02 });
    };

    const step = () => {
      ctx.clearRect(0, 0, w, h);

      // move nodes, gentle mouse repel
      for (const p of nodes) {
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const d2 = dx * dx + dy * dy;
        if (interactive && d2 < 140 * 140) {
          const d = Math.sqrt(d2) || 1;
          p.vx += (dx / d) * 0.02;
          p.vy += (dy / d) * 0.02;
        }
        p.vx *= 0.985;
        p.vy *= 0.985;
        // keep minimum drift
        if (Math.abs(p.vx) < 0.08) p.vx += (Math.random() - 0.5) * 0.02;
        if (Math.abs(p.vy) < 0.08) p.vy += (Math.random() - 0.5) * 0.02;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
      }

      // connections
      const LINK = 150;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            const alpha = (1 - d / LINK) * 0.22;
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, `hsla(${a.hue}, 90%, 65%, ${alpha})`);
            grad.addColorStop(1, `hsla(${b.hue}, 90%, 60%, ${alpha})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // pulses travelling along edges
      for (const pu of pulses) {
        pu.t += pu.speed;
        if (pu.t >= 1) {
          pu.t = 0;
          const next = nodes[Math.floor(Math.random() * nodes.length)];
          pu.a = pu.b;
          pu.b = next;
        }
        const x = pu.a.x + (pu.b.x - pu.a.x) * pu.t;
        const y = pu.a.y + (pu.b.y - pu.a.y) * pu.t;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 10);
        glow.addColorStop(0, 'rgba(255,120,40,0.9)');
        glow.addColorStop(0.4, 'rgba(139,92,246,0.5)');
        glow.addColorStop(1, 'rgba(139,92,246,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // nodes
      for (const p of nodes) {
        ctx.fillStyle = `hsla(${p.hue}, 95%, 70%, 0.85)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(step);
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
      if (auraRef.current) {
        auraRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }
    };

    resize();
    step();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, [density, interactive]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* base vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.14),transparent_60%),radial-gradient(ellipse_60%_50%_at_80%_10%,rgba(6,182,212,0.08),transparent_60%),radial-gradient(ellipse_70%_60%_at_20%_90%,rgba(255,85,0,0.06),transparent_60%)]" />
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.22) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 20%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 20%, black 30%, transparent 75%)',
        }}
      />
      {/* neural canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* optical flare beam */}
      <div className="optical-flare-beam animate-beam-drift" />
      <div className="secondary-haze" />
      {/* aurora */}
      <div className="absolute left-1/2 top-[-220px] h-[480px] w-[820px] -translate-x-1/2 animate-aurora-pulse rounded-full bg-[conic-gradient(from_90deg,rgba(139,92,246,0.22),rgba(6,182,212,0.16),rgba(255,85,0,0.14),rgba(139,92,246,0.22))] blur-[110px]" />
      {/* noise */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* cursor aura */}
      <div
        ref={auraRef}
        id="cursor-light-aura"
        className="fixed left-0 top-0 hidden md:block"
        style={{ transform: 'translate(-9999px, -9999px)' }}
      />
      {/* bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />
    </div>
  );
}
