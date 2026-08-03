"use client";

import { useEffect, useRef } from "react";

interface TrailPoint {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  hue: number;
  size: number;
  vx: number;
  vy: number;
}

export default function RainbowCursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let points: TrailPoint[] = [];
    let hueCounter = 0;

    let prevMouseX = -1000;
    let prevMouseY = -1000;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      const dx = x - (prevMouseX === -1000 ? x : prevMouseX);
      const dy = y - (prevMouseY === -1000 ? y : prevMouseY);

      prevMouseX = x;
      prevMouseY = y;

      // Ultra-fast rainbow color hue cycle
      hueCounter = (hueCounter + 25) % 360;

      // Spawn high-speed short-lived rainbow sparks
      const speed = Math.hypot(dx, dy);
      const count = Math.min(speed / 2, 16) + 3;

      for (let i = 0; i < count; i++) {
        points.push({
          x: x + (Math.random() - 0.5) * 14,
          y: y + (Math.random() - 0.5) * 14,
          age: 0,
          maxAge: 10 + Math.random() * 8, // Super short lifespan - vanishes almost instantly!
          hue: (hueCounter + i * 25) % 360,
          size: 45 + Math.random() * 25,
          vx: dx * 0.35 + (Math.random() - 0.5) * 4, // Ultra-fast velocity
          vy: dy * 0.35 + (Math.random() - 0.5) * 4,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Render loop creating rapid-dissipating rainbow cursor flash
    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Render rainbow fluid glow points in cursor path
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        p.age++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.85;
        p.vy *= 0.85;

        if (p.age >= p.maxAge) {
          points.splice(i, 1);
          continue;
        }

        const lifeRatio = 1 - p.age / p.maxAge;
        const currentRadius = p.size * lifeRatio;
        const alpha = Math.sin(lifeRatio * Math.PI) * 0.8;

        const gradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          currentRadius
        );

        const colorInner = `hsla(${p.hue}, 100%, 75%, ${alpha})`;
        const colorMid = `hsla(${(p.hue + 50) % 360}, 100%, 60%, ${alpha * 0.7})`;
        const colorOuter = `hsla(${(p.hue + 100) % 360}, 95%, 50%, 0)`;

        gradient.addColorStop(0, colorInner);
        gradient.addColorStop(0.45, colorMid);
        gradient.addColorStop(1, colorOuter);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw fast-fading connected rainbow ribbon path following cursor
      if (points.length > 2) {
        ctx.lineWidth = 32;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.filter = "blur(10px)";

        for (let i = 1; i < points.length; i++) {
          const p1 = points[i - 1];
          const p2 = points[i];

          const life = 1 - p2.age / p2.maxAge;
          ctx.strokeStyle = `hsla(${p2.hue}, 100%, 70%, ${life * 0.7})`;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        ctx.filter = "none";
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-10 mix-blend-screen transition-opacity duration-300"
    />
  );
}
