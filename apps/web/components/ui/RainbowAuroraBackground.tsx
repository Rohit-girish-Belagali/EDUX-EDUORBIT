"use client";

import { useEffect, useRef } from "react";

export default function RainbowAuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let scrollY = window.scrollY;
    let targetScrollY = window.scrollY;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const handleScroll = () => {
      targetScrollY = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Render loop creating fluid rainbow aurora waves
    const render = () => {
      time += 0.012;
      scrollY += (targetScrollY - scrollY) * 0.1;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Scroll-influenced hue offset
      const hueShift = (time * 25 + scrollY * 0.15) % 360;

      // Draw multiple fluid organic rainbow blobs/ribbons
      const blobCount = 5;
      for (let i = 0; i < blobCount; i++) {
        const angle = time * 0.7 + (i * Math.PI * 2) / blobCount;
        const scrollFactor = scrollY * 0.002;

        // Dynamic center position reacting to scroll & mouse
        const cx =
          width * (0.5 + 0.25 * Math.sin(angle + scrollFactor)) +
          (mouseX - width / 2) * 0.15 * (i % 2 === 0 ? 1 : -1);
        const cy =
          height * (0.5 + 0.25 * Math.cos(angle * 0.8 + scrollFactor)) +
          (mouseY - height / 2) * 0.15 * (i % 2 === 0 ? -1 : 1);

        const radius = Math.min(width, height) * (0.35 + 0.1 * Math.sin(time + i));

        const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);

        // Rainbow HSL colors shifting dynamically
        const h1 = (hueShift + i * 65) % 360;
        const h2 = (h1 + 60) % 360;

        gradient.addColorStop(0, `hsla(${h1}, 85%, 60%, 0.35)`);
        gradient.addColorStop(0.4, `hsla(${h2}, 80%, 50%, 0.2)`);
        gradient.addColorStop(0.8, `hsla(${(h2 + 60) % 360}, 75%, 40%, 0.08)`);
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dynamic swirling rainbow wave lines (matching PEC HACKS fluid ribbons)
      ctx.lineWidth = 120;
      ctx.filter = "blur(60px)";

      for (let wave = 0; wave < 3; wave++) {
        const waveHue = (hueShift + wave * 120) % 360;
        ctx.strokeStyle = `hsla(${waveHue}, 90%, 55%, 0.22)`;
        ctx.beginPath();

        for (let x = 0; x < width; x += 40) {
          const y =
            height / 2 +
            Math.sin(x * 0.003 + time * 1.5 + wave + scrollY * 0.003) * 180 +
            Math.cos(x * 0.002 - time + wave) * 100;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
      }

      ctx.filter = "none";
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 mix-blend-screen opacity-90 transition-opacity duration-500"
    />
  );
}
