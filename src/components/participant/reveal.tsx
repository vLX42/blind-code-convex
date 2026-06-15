"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Id } from "../../../convex/_generated/dataModel";
import { Confetti } from "./confetti";

export interface RevealResult {
  entryId: Id<"entries">;
  playerHandle: string;
  points: number;
  firstPlaceVotes: number;
  secondPlaceVotes: number;
}

interface ParticipantRevealProps {
  results: RevealResult[]; // already sorted best-first
  // How many podium places are revealed so far (synced via game.revealStep).
  revealedCount: number;
  isHost: boolean;
  // Host-only: advance the synced reveal to `step` places shown.
  onAdvance?: (step: number) => void;
}

// Synced podium reveal. The host advances it; every participant's screen mirrors
// the same `revealedCount`, so the 3->2->1 countdown plays in lockstep.
export function ParticipantReveal({
  results,
  revealedCount,
  isHost,
  onAdvance,
}: ParticipantRevealProps) {
  const podium = useMemo(() => results.slice(0, 3), [results]);
  // Reveal order: 3rd, then 2nd, then 1st (indices into `podium`).
  const revealOrder = useMemo(
    () => podium.map((_, i) => podium.length - 1 - i),
    [podium]
  );

  const shown = Math.max(0, Math.min(revealedCount, revealOrder.length));
  const done = shown >= revealOrder.length && podium.length > 0;
  const nextPlaceIndex = !done ? revealOrder[shown] ?? 0 : -1;

  const placeMeta = (rankIndex: number) => {
    if (rankIndex === 0)
      return { medal: "🥇", label: "1st Place", color: "#ffd700", glow: "rgba(255,215,0,0.6)" };
    if (rankIndex === 1)
      return { medal: "🥈", label: "2nd Place", color: "#c0c0c0", glow: "rgba(192,192,192,0.5)" };
    return { medal: "🥉", label: "3rd Place", color: "#cd7f32", glow: "rgba(205,127,50,0.5)" };
  };

  const enterFor = (step: number) => {
    if (step === 0) return { x: -320, opacity: 0 }; // 3rd from the left
    if (step === 1) return { x: 320, opacity: 0 }; // 2nd from the right
    return { scale: 0.2, opacity: 0, y: -40 }; // 1st pops in
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

  // --- Anticipation screen: nothing revealed yet ---
  if (shown === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8 py-10">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-7xl"
        >
          🥁
        </motion.div>
        <motion.h2
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="text-sm md:text-lg font-['Press_Start_2P'] text-[#4ade80] text-center"
          style={{ textShadow: "2px 2px 0 #2d7a50" }}
        >
          The votes are in...
        </motion.h2>
        <p className="text-[10px] font-['Press_Start_2P'] text-gray-400">
          {isHost ? "Reveal the podium when you're ready" : "Get ready! 🏆"}
        </p>
        {isHost && onAdvance && (
          <RevealButton
            label="Start the reveal →"
            onClick={() => onAdvance(1)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-10 py-10 relative">
      {done && <Confetti count={120} />}

      <h2
        className="text-sm md:text-xl font-['Press_Start_2P'] text-[#ff6b6b]"
        style={{ textShadow: "2px 2px 0 #993333" }}
      >
        {done ? "🏆 THE PODIUM 🏆" : ">> AND THE RESULTS ARE..."}
      </h2>

      <div className="w-full max-w-2xl space-y-5">
        <AnimatePresence>
          {revealOrder.slice(0, shown).map((rankIndex, step) => {
            const result = podium[rankIndex];
            if (!result) return null;
            const meta = placeMeta(rankIndex);
            const isWinner = rankIndex === 0;
            return (
              <motion.div
                key={result.entryId}
                initial={enterFor(step)}
                animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 130, damping: 14 }}
                className="bg-[#0a0a12] border-4 p-6 flex items-center justify-between gap-4 relative"
                style={{
                  borderColor: meta.color,
                  boxShadow: `8px 8px 0 0 ${meta.color}55, 0 0 ${isWinner ? 60 : 30}px ${meta.glow}`,
                }}
              >
                <div className="flex items-center gap-4">
                  <motion.span
                    className="text-4xl md:text-6xl"
                    animate={isWinner ? { scale: [1, 1.25, 1] } : {}}
                    transition={{ duration: 0.8, repeat: isWinner ? Infinity : 0 }}
                  >
                    {meta.medal}
                  </motion.span>
                  <div>
                    <div
                      className="text-[8px] font-['Press_Start_2P'] uppercase mb-2"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </div>
                    <div
                      className="text-lg md:text-3xl font-['Press_Start_2P'] text-[#4ade80]"
                      style={{ textShadow: "2px 2px 0 #2d7a50" }}
                    >
                      {result.playerHandle}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl md:text-4xl font-['Press_Start_2P'] text-[#0df]">
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

      {/* Host control (synced) */}
      {isHost && onAdvance && !done && (
        <RevealButton
          label={
            nextPlaceIndex === 0
              ? "Reveal the winner 👑"
              : `Reveal ${placeMeta(nextPlaceIndex).label} →`
          }
          onClick={() => onAdvance(shown + 1)}
        />
      )}

      {/* Participant waiting hint between reveals */}
      {!isHost && !done && (
        <p className="text-[9px] font-['Press_Start_2P'] text-gray-500 animate-pulse">
          waiting for the next reveal...
        </p>
      )}
    </div>
  );
}

function RevealButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      key={label}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={onClick}
      className="px-8 py-4 font-['Press_Start_2P'] text-[10px] uppercase bg-gradient-to-r from-[#ff6b6b] to-[#0df] text-[#0a0a12] hover:from-[#ff8888] hover:to-[#66ffff] transition"
      style={{ boxShadow: "4px 4px 0 0 #993333" }}
    >
      {label}
    </motion.button>
  );
}
