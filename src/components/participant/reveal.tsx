"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Id } from "../../../convex/_generated/dataModel";

export interface RevealResult {
  entryId: Id<"entries">;
  playerHandle: string;
  points: number;
  firstPlaceVotes: number;
  secondPlaceVotes: number;
}

interface ParticipantRevealProps {
  results: RevealResult[]; // already sorted best-first
}

// Host reveal screen. Reveals the podium from 3rd up to 1st, one place per
// click, with each place entering from an alternating direction for drama.
export function ParticipantReveal({ results }: ParticipantRevealProps) {
  // Podium positions we will reveal, in click order: 3rd, then 2nd, then 1st.
  // (If there are fewer than 3 entries we reveal whatever exists.)
  const podium = useMemo(() => results.slice(0, 3), [results]);
  const revealOrder = useMemo(
    () => podium.map((_, i) => podium.length - 1 - i), // indices: 2,1,0 -> 3rd,2nd,1st
    [podium]
  );

  // How many places have been revealed so far.
  const [revealedCount, setRevealedCount] = useState(0);

  const done = revealedCount >= revealOrder.length;
  const nextPlaceIndex = !done ? revealOrder[revealedCount] ?? 0 : -1; // 0-based rank

  const placeMeta = (rankIndex: number) => {
    if (rankIndex === 0)
      return { medal: "🥇", label: "1st Place", color: "#ffd700", glow: "rgba(255,215,0,0.6)" };
    if (rankIndex === 1)
      return { medal: "🥈", label: "2nd Place", color: "#c0c0c0", glow: "rgba(192,192,192,0.5)" };
    return { medal: "🥉", label: "3rd Place", color: "#cd7f32", glow: "rgba(205,127,50,0.5)" };
  };

  // Direction alternates: 3rd from the left, 2nd from the right, 1st zooms in.
  const enterFor = (step: number) => {
    if (step === 0) return { x: -300, opacity: 0 }; // 3rd
    if (step === 1) return { x: 300, opacity: 0 }; // 2nd
    return { scale: 0.3, opacity: 0 }; // 1st
  };

  if (podium.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">
          No results to reveal yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-10 py-10">
      <h2
        className="text-sm md:text-base font-['Press_Start_2P'] text-[#ff6b6b]"
        style={{ textShadow: "2px 2px 0 #993333" }}
      >
        {done ? "FINAL PODIUM" : ">> AND THE RESULTS ARE..."}
      </h2>

      {/* Revealed places, biggest at the bottom so 1st lands last on top */}
      <div className="w-full max-w-2xl space-y-5">
        <AnimatePresence>
          {revealOrder.slice(0, revealedCount).map((rankIndex, step) => {
            const result = podium[rankIndex];
            if (!result) return null;
            const meta = placeMeta(rankIndex);
            return (
              <motion.div
                key={result.entryId}
                initial={enterFor(step)}
                animate={{ x: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 14 }}
                className="bg-[#0a0a12] border-4 p-6 flex items-center justify-between gap-4"
                style={{
                  borderColor: meta.color,
                  boxShadow: `8px 8px 0 0 ${meta.color}55, 0 0 40px ${meta.glow}`,
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl md:text-5xl">{meta.medal}</span>
                  <div>
                    <div
                      className="text-[8px] font-['Press_Start_2P'] uppercase mb-2"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </div>
                    <div className="text-lg md:text-2xl font-['Press_Start_2P'] text-[#4ade80]"
                      style={{ textShadow: "2px 2px 0 #2d7a50" }}>
                      {result.playerHandle}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl md:text-3xl font-['Press_Start_2P'] text-[#0df]">
                    {result.points}
                  </div>
                  <div className="text-[7px] font-['Press_Start_2P'] text-gray-500 mt-1">
                    pts
                  </div>
                  <div className="text-[7px] font-['Press_Start_2P'] text-gray-500 mt-2">
                    🥇{result.firstPlaceVotes} 🥈{result.secondPlaceVotes}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Host control */}
      {!done && (
        <motion.button
          key={revealedCount}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => setRevealedCount((c) => c + 1)}
          className="px-8 py-4 font-['Press_Start_2P'] text-[10px] uppercase bg-gradient-to-r from-[#ff6b6b] to-[#0df] text-[#0a0a12] hover:from-[#ff8888] hover:to-[#66ffff] transition"
          style={{ boxShadow: "4px 4px 0 0 #993333" }}
        >
          {nextPlaceIndex === 0
            ? "Reveal the Winner 👑"
            : `Reveal ${placeMeta(nextPlaceIndex).label}`}
        </motion.button>
      )}
    </div>
  );
}
