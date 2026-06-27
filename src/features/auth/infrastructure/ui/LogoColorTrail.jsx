import React, { useEffect, useRef, useCallback } from 'react';
import './LogoColorTrail.css';

/** Paleta extraída del globo aerostático del logo LUXES */
const LOGO_PALETTE = [
  '#F9D423',
  '#4CAF50',
  '#29B6F6',
  '#FF9800',
  '#8BC34A',
  '#E91E63',
  '#00BCD4',
  '#1565C0',
];

const MAX_PARTICLES = 120;
const SPAWN_INTERVAL_MS = 28;

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const drawRoundedRect = (ctx, x, y, w, h, r) => {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const createParticle = (x, y) => {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.6 + Math.random() * 2.4;
  const color = randomFrom(LOGO_PALETTE);

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 0.4,
    width: 3 + Math.random() * 5,
    height: 10 + Math.random() * 16,
    rotation: (Math.random() - 0.5) * 0.8,
    rotationSpeed: (Math.random() - 0.5) * 0.06,
    color,
    life: 1,
    decay: 0.012 + Math.random() * 0.018,
    drag: 0.96 + Math.random() * 0.02,
  };
};

export const LogoColorTrail = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -100, y: -100, active: false });
  const frameRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const reducedMotionRef = useRef(false);

  const drawParticle = useCallback((ctx, p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.life * 0.85;

    const gradient = ctx.createLinearGradient(0, -p.height / 2, 0, p.height / 2);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(0.5, p.color);
    gradient.addColorStop(1, `${p.color}88`);

    ctx.fillStyle = gradient;
    const r = p.width / 2;
    drawRoundedRect(ctx, -p.width / 2, -p.height / 2, p.width, p.height, r);
    ctx.fill();

    ctx.restore();
  }, []);

  const tick = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const mouse = mouseRef.current;
    const particles = particlesRef.current;

    if (
      mouse.active
      && !reducedMotionRef.current
      && timestamp - lastSpawnRef.current > SPAWN_INTERVAL_MS
    ) {
      const burst = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < burst; i += 1) {
        if (particles.length >= MAX_PARTICLES) particles.shift();
        particles.push(
          createParticle(
            mouse.x + (Math.random() - 0.5) * 10,
            mouse.y + (Math.random() - 0.5) * 10,
          ),
        );
      }
      lastSpawnRef.current = timestamp;
    }

    ctx.clearRect(0, 0, width, height);

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += 0.02;
      p.rotation += p.rotationSpeed;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      drawParticle(ctx, p);
    }

    frameRef.current = requestAnimationFrame(tick);
  }, [drawParticle]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = container.clientWidth;
    const h = container.clientHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    const wrap = containerRef.current;
    const canvas = canvasRef.current;
    const page = wrap?.parentElement;
    if (!wrap || !canvas || !page) return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = prefersReduced.matches;

    const handleMotionChange = (e) => {
      reducedMotionRef.current = e.matches;
      if (e.matches) particlesRef.current = [];
    };
    prefersReduced.addEventListener('change', handleMotionChange);

    const handleMouseMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    resizeCanvas();
    frameRef.current = requestAnimationFrame(tick);

    page.addEventListener('mousemove', handleMouseMove);
    page.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      prefersReduced.removeEventListener('change', handleMotionChange);
      page.removeEventListener('mousemove', handleMouseMove);
      page.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', resizeCanvas);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [resizeCanvas, tick]);

  return (
    <div ref={containerRef} className="logo-color-trail-wrap" aria-hidden="true">
      <canvas ref={canvasRef} className="logo-color-trail" />
    </div>
  );
};
