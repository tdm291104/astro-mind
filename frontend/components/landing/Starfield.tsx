"use client";

import { useEffect, useRef } from "react";

const LAYERS = [
  { count: 100, speed: 0.04, sizeMin: 0.4, sizeMax: 1.0, opMin: 0.15, opMax: 0.45 },
  { count: 60, speed: 0.08, sizeMin: 0.8, sizeMax: 1.8, opMin: 0.25, opMax: 0.6 },
  { count: 20, speed: 0.14, sizeMin: 1.4, sizeMax: 2.4, opMin: 0.4, opMax: 0.85 },
];

interface Star {
  x: number;
  y: number;
  r: number;
  op: number;
  speed: number;
  phase: number;
  twinkle: number;
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let rafId = 0;

    function init() {
      if (!canvas) return;
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      stars = [];
      LAYERS.forEach((L) => {
        for (let i = 0; i < L.count; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: rand(L.sizeMin, L.sizeMax),
            op: rand(L.opMin, L.opMax),
            speed: L.speed,
            phase: Math.random() * Math.PI * 2,
            twinkle: rand(0.004, 0.018),
          });
        }
      });
    }

    function frame() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      const accent = [201, 165, 92];
      for (const s of stars) {
        s.phase += s.twinkle;
        const tw = 0.5 + 0.5 * Math.sin(s.phase);
        const a = s.op * (0.55 + 0.45 * tw);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fillStyle = `rgba(237,232,223,${a})`;
        ctx.fill();
        if (s.r > 1.6) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3.5, 0, 6.2832);
          ctx.fillStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},${a * 0.09})`;
          ctx.fill();
        }
        s.y -= s.speed;
        if (s.y < -4) {
          s.y = h + 4;
          s.x = Math.random() * w;
        }
      }
      rafId = requestAnimationFrame(frame);
    }

    function onResize() {
      init();
    }

    window.addEventListener("resize", onResize);
    init();
    rafId = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
