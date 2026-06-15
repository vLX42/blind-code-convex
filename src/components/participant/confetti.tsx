"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#4ade80", "#0df", "#ff6b6b", "#ffd700", "#a78bfa", "#ffffff"];

interface ConfettiProps {
  count?: number;
  // Run the burst once (default) or loop it for a sustained celebration.
  loop?: boolean;
}

// Lightweight, dependency-free confetti: a burst of colored pixels raining down.
// Pure CSS/Framer Motion — no canvas, no extra packages.
export function Confetti({ count = 90, loop = false }: ConfettiProps) {
  // Pre-compute each piece's path. Seeded by index so SSR/CSR stay consistent
  // enough (this is decorative, exact positions don't matter).
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const rand = seed / 233280;
        const rand2 = ((i * 4099 + 7919) % 233280) / 233280;
        const rand3 = ((i * 6151 + 1543) % 233280) / 233280;
        return {
          left: rand * 100,
          delay: rand2 * (loop ? 2.5 : 0.6),
          duration: 2.4 + rand3 * 2.2,
          drift: (rand2 - 0.5) * 160,
          color: COLORS[i % COLORS.length],
          size: 6 + Math.round(rand3 * 8),
          rotate: rand * 720 - 360,
        };
      }),
    [count, loop]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          initial={{ y: "-10vh", x: 0, opacity: 0, rotate: 0 }}
          animate={{
            y: "110vh",
            x: p.drift,
            opacity: [0, 1, 1, 0.9, 0],
            rotate: p.rotate,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: loop ? Infinity : 0,
            ease: "easeIn",
          }}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}
