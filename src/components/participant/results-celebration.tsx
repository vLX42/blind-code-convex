"use client";

import { motion } from "framer-motion";
import { Id } from "../../../convex/_generated/dataModel";
import { Confetti } from "./confetti";
import type { RevealResult } from "./reveal";

interface ResultsCelebrationProps {
  results: RevealResult[]; // sorted best-first
  myEntryId: Id<"entries"> | null; // the viewer's own entry, if they competed
}

const PLACE = [
  { medal: "🥇", color: "#ffd700", glow: "rgba(255,215,0,0.55)", height: "h-40" },
  { medal: "🥈", color: "#c0c0c0", glow: "rgba(192,192,192,0.45)", height: "h-28" },
  { medal: "🥉", color: "#cd7f32", glow: "rgba(205,127,50,0.45)", height: "h-20" },
];

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || "th");
};

// The celebratory end screen every participant sees once the host finishes the
// game: their own placement, an animated podium, confetti, and the full board.
export function ResultsCelebration({ results, myEntryId }: ResultsCelebrationProps) {
  if (results.length === 0) {
    return (
      <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-10 text-center"
        style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}>
        <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">
          No votes were cast.
        </p>
      </div>
    );
  }

  const myIndex = myEntryId
    ? results.findIndex((r) => r.entryId === myEntryId)
    : -1;
  const mine = myIndex >= 0 ? results[myIndex] : null;
  const iWon = myIndex === 0;

  // Podium display order: 2nd, 1st, 3rd (classic staging).
  const podium = results.slice(0, 3);
  const stageOrder = [1, 0, 2].filter((i) => i < podium.length);

  return (
    <div className="relative">
      <Confetti count={70} loop />

      {/* Personal result card */}
      {mine && (
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 13 }}
          className="bg-[#0a0a12] border-4 p-8 mb-8 text-center"
          style={{
            borderColor: iWon ? "#ffd700" : "#3a9364",
            boxShadow: iWon
              ? "8px 8px 0 0 #997700, 0 0 50px rgba(255,215,0,0.5)"
              : "8px 8px 0 0 #2d7a50",
          }}
        >
          {iWon ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 6, -6, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                👑
              </motion.div>
              <div className="text-lg md:text-2xl font-['Press_Start_2P'] text-[#ffd700] mb-3"
                style={{ textShadow: "2px 2px 0 #997700" }}>
                YOU WON!
              </div>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">
                {myIndex === 1 ? "🥈" : myIndex === 2 ? "🥉" : "🎉"}
              </div>
              <div className="text-base md:text-xl font-['Press_Start_2P'] text-[#4ade80] mb-3"
                style={{ textShadow: "2px 2px 0 #2d7a50" }}>
                You placed {ordinal(myIndex + 1)}!
              </div>
            </>
          )}
          <div className="text-[10px] font-['Press_Start_2P'] text-[#0df]">
            {mine.points} pts · 🥇{mine.firstPlaceVotes} 🥈{mine.secondPlaceVotes}
          </div>
        </motion.div>
      )}

      {/* Podium */}
      <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-6 md:p-10 mb-8"
        style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}>
        <h2 className="text-sm font-['Press_Start_2P'] text-[#ff6b6b] mb-8 text-center"
          style={{ textShadow: "2px 2px 0 #993333" }}>
          🏆 PODIUM 🏆
        </h2>
        <div className="flex items-end justify-center gap-3 md:gap-6">
          {stageOrder.map((rankIdx, n) => {
            const r = podium[rankIdx];
            if (!r) return null;
            const meta = PLACE[rankIdx]!;
            const isMine = mine?.entryId === r.entryId;
            return (
              <motion.div
                key={r.entryId}
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + n * 0.25, type: "spring", stiffness: 120, damping: 14 }}
                className="flex flex-col items-center w-24 md:w-36"
              >
                <div className="text-3xl md:text-5xl mb-2">{meta.medal}</div>
                <div
                  className={`text-[8px] md:text-[10px] font-['Press_Start_2P'] mb-1 text-center truncate w-full ${
                    isMine ? "text-[#ffd700]" : "text-[#4ade80]"
                  }`}
                >
                  {r.playerHandle}
                  {isMine && " (you)"}
                </div>
                <div className="text-[8px] font-['Press_Start_2P'] text-[#0df] mb-2">
                  {r.points} pts
                </div>
                <div
                  className={`w-full ${meta.height} border-x-4 border-t-4 flex items-start justify-center pt-2`}
                  style={{
                    borderColor: meta.color,
                    background: `linear-gradient(180deg, ${meta.color}22, transparent)`,
                    boxShadow: `0 0 30px ${meta.glow}`,
                  }}
                >
                  <span className="text-lg md:text-2xl font-['Press_Start_2P']"
                    style={{ color: meta.color }}>
                    {rankIdx + 1}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Full standings */}
      <div className="bg-[#0a0a12] border-4 border-[#3a9364] overflow-hidden"
        style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}>
        <h2 className="text-sm font-['Press_Start_2P'] text-[#ff6b6b] p-4 border-b-4 border-[#3a9364] bg-[#1a1a2e]">
          {">> Final Standings"}
        </h2>
        <table className="w-full">
          <tbody>
            {results.map((r, index) => {
              const isMine = mine?.entryId === r.entryId;
              return (
                <tr
                  key={r.entryId}
                  className={`border-b-2 border-[#1a1a2e] ${
                    isMine ? "bg-yellow-900/20" : ""
                  }`}
                >
                  <td className="px-4 py-4 w-12">
                    {index === 0 && <span className="text-xl">🥇</span>}
                    {index === 1 && <span className="text-xl">🥈</span>}
                    {index === 2 && <span className="text-xl">🥉</span>}
                    {index > 2 && (
                      <span className="text-[10px] font-['Press_Start_2P'] text-gray-500">
                        {index + 1}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-4 text-xs font-['Press_Start_2P'] ${
                    isMine ? "text-[#ffd700]" : "text-[#4ade80]"
                  }`}>
                    {r.playerHandle}
                    {isMine && (
                      <span className="text-[8px] text-gray-400"> (you)</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right text-[8px] font-['Press_Start_2P'] text-gray-500">
                    🥇{r.firstPlaceVotes} 🥈{r.secondPlaceVotes}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-['Press_Start_2P'] text-[#0df]">
                    {r.points} pts
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
