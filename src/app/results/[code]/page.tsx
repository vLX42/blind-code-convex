"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../components/providers";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Playback } from "@/components/playback";
import { InlinePlayback } from "@/components/playback/inline-playback";

type ViewMode = "submissions" | "voting" | "leaderboard" | "reveal";

export default function ResultsPage() {
  const params = useParams();
  const { user } = useAuth();
  const code = params.code as string;

  const [viewMode, setViewMode] = useState<ViewMode>("submissions");
  const [selectedEntry, setSelectedEntry] = useState<Id<"entries"> | null>(null);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [isRevealing, setIsRevealing] = useState(false);
  const [playbackEntry, setPlaybackEntry] = useState<{ id: Id<"entries">; playerName: string; autoPlay?: boolean } | null>(null);

  const game = useQuery(api.games.getGameByShortCode, { shortCode: code });
  const leaderboard = useQuery(
    api.votes.getLeaderboard,
    game?._id ? { gameId: game._id } : "skip"
  );
  const entries = useQuery(
    api.entries.getGameEntries,
    game?._id ? { gameId: game._id } : "skip"
  );
  const myVotes = useQuery(
    api.votes.getUserVotesForGame,
    game?._id && user?.id
      ? { gameId: game._id, userId: user.id as Id<"users"> }
      : "skip"
  );

  const castVote = useMutation(api.votes.castVote);
  const selectWinner = useMutation(api.votes.selectWinner);

  const isCreator = user?.id === game?.creatorId;

  // Helper to get user's vote for an entry
  const getMyVoteForEntry = (entryId: Id<"entries">) => {
    return myVotes?.find((v) => v.entryId === entryId);
  };

  // Start reveal animation
  const startReveal = () => {
    if (!leaderboard || leaderboard.length === 0) return;
    setViewMode("reveal");
    setIsRevealing(true);
    setRevealIndex(leaderboard.length);
  };

  // Reveal next position
  useEffect(() => {
    if (!isRevealing || revealIndex <= 0) return;

    const timer = setTimeout(() => {
      setRevealIndex((prev) => prev - 1);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isRevealing, revealIndex]);

  // Handle voting
  const handleVote = async (entryId: Id<"entries">, score: number) => {
    if (!game?._id || !user?.id) return;
    await castVote({
      gameId: game._id,
      entryId,
      judgeId: user.id as Id<"users">,
      score,
    });
  };

  // Handle selecting winner
  const handleSelectWinner = async (entryId: Id<"entries">) => {
    if (!game?._id || !user?.id) return;
    await selectWinner({
      gameId: game._id,
      entryId,
      judgeId: user.id as Id<"users">,
    });
  };

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  // Render HTML preview in iframe
  const renderPreview = (html: string) => {
    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background: white; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;
    return `data:text/html;charset=utf-8,${encodeURIComponent(doc)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b-4 border-[#3a9364] bg-[#0a0a12] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-['Press_Start_2P'] text-[#4ade80]"
            style={{ textShadow: '2px 2px 0 #2d7a50' }}
          >
            BLIND CODE
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-['Press_Start_2P'] text-[#ff6b6b]">{game.title}</span>
            {isCreator && (
              <Link
                href={`/game/manage/${game._id}`}
                className="text-[10px] font-['Press_Start_2P'] text-[#4ade80] hover:text-white transition"
              >
                Manage
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* View Mode Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setViewMode("submissions")}
            className={`px-4 py-2 font-['Press_Start_2P'] text-[8px] uppercase transition ${
              viewMode === "submissions"
                ? "bg-[#3a9364] text-white"
                : "bg-[#1a1a2e] hover:bg-[#2a2a4e] border-2 border-[#3a9364]"
            }`}
            style={viewMode === "submissions" ? { boxShadow: '3px 3px 0 0 #2d7a50' } : {}}
          >
            Submissions
          </button>
          {user && (
            <button
              onClick={() => setViewMode("voting")}
              className={`px-4 py-2 font-['Press_Start_2P'] text-[8px] uppercase transition ${
                viewMode === "voting"
                  ? "bg-purple-600 text-white"
                  : "bg-[#1a1a2e] hover:bg-[#2a2a4e] border-2 border-purple-600"
              }`}
              style={viewMode === "voting" ? { boxShadow: '3px 3px 0 0 #553399' } : {}}
            >
              Vote
            </button>
          )}
          <button
            onClick={() => setViewMode("leaderboard")}
            className={`px-4 py-2 font-['Press_Start_2P'] text-[8px] uppercase transition ${
              viewMode === "leaderboard"
                ? "bg-yellow-600 text-[#0a0a12]"
                : "bg-[#1a1a2e] hover:bg-[#2a2a4e] border-2 border-yellow-600"
            }`}
            style={viewMode === "leaderboard" ? { boxShadow: '3px 3px 0 0 #997700' } : {}}
          >
            Leaderboard
          </button>
          {isCreator && leaderboard && leaderboard.length > 0 && (
            <button
              onClick={startReveal}
              className="px-4 py-2 font-['Press_Start_2P'] text-[8px] uppercase bg-gradient-to-r from-[#ff6b6b] to-[#0df] hover:from-[#ff8888] hover:to-[#66ffff] transition text-[#0a0a12]"
              style={{ boxShadow: '3px 3px 0 0 #993333' }}
            >
              Reveal
            </button>
          )}
        </div>

        {/* Submissions View */}
        {viewMode === "submissions" && (
          <div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Reference */}
              <div className="bg-[#0a0a12] border-4 border-[#ff6b6b] p-6"
                style={{ boxShadow: '6px 6px 0 0 #993333' }}>
                <h2 className="text-sm font-['Press_Start_2P'] text-[#ff6b6b] mb-4">{">> Target"}</h2>
                <div className="aspect-video bg-[#1a1a2e] border-2 border-[#3a9364] overflow-hidden">
                  <img
                    src={game.referenceImageUrl}
                    alt="Target"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Entries */}
              {entries && entries.length > 0 ? (
                entries.map((entry) => (
                  <div key={entry._id} className="bg-[#0a0a12] border-4 border-[#3a9364] p-6"
                    style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-['Press_Start_2P'] text-[#4ade80]">{entry.player?.handle}</h3>
                      <div className="text-[8px] font-['Press_Start_2P'] text-gray-400">
                        Score: <span className="text-[#0df]">{entry.totalScore}</span>
                      </div>
                    </div>
                    <InlinePlayback
                      entryId={entry._id}
                      finalHtml={entry.html || ""}
                      targetDuration={15}
                    />
                    <div className="mt-4 flex items-center gap-4">
                      <button
                        onClick={() => setSelectedEntry(entry._id)}
                        className="text-[10px] font-['Press_Start_2P'] text-[#4ade80] hover:text-white transition"
                      >
                        Code
                      </button>
                      <button
                        onClick={() => setPlaybackEntry({ id: entry._id, playerName: entry.player?.handle || "Unknown" })}
                        className="text-[10px] font-['Press_Start_2P'] text-[#0df] hover:text-white transition"
                      >
                        Playback
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-6 flex items-center justify-center"
                  style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
                  <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">No submissions yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voting View */}
        {viewMode === "voting" && user && (
          <div className="space-y-6">
            <p className="text-[10px] font-['Press_Start_2P'] text-gray-400">
              Rate each submission 1-10.{isCreator && " Select a winner!"}
            </p>
            {entries && entries.length === 0 && (
              <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-8 text-center"
                style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
                <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">No submissions to vote on yet</p>
              </div>
            )}
            {entries?.map((entry) => {
              const myVote = getMyVoteForEntry(entry._id);
              const isSelectedWinner = myVote?.isWinner;

              return (
                <div
                  key={entry._id}
                  className={`bg-[#0a0a12] border-4 p-6 transition ${
                    isSelectedWinner
                      ? "border-yellow-500"
                      : "border-[#3a9364]"
                  }`}
                  style={{ boxShadow: isSelectedWinner ? '6px 6px 0 0 #997700' : '6px 6px 0 0 #2d7a50' }}
                >
                  {isSelectedWinner && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">👑</span>
                      <span className="text-[10px] font-['Press_Start_2P'] text-yellow-400">Your Winner</span>
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    <div className="flex-1 w-full">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-['Press_Start_2P'] text-[#4ade80]">{entry.player?.handle}</h3>
                        <div className="text-[8px] font-['Press_Start_2P'] text-gray-400">
                          Score: <span className="text-[#0df]">{entry.totalScore}</span> | Streak: <span className="text-[#ff6b6b]">{entry.maxStreak}</span>
                        </div>
                      </div>
                      <div className="aspect-video bg-white border-4 border-[#1a1a2e] overflow-hidden mb-4">
                        <iframe
                          src={renderPreview(entry.html || "")}
                          className="w-full h-full border-0"
                          sandbox="allow-same-origin"
                          title={`Submission by ${entry.player?.handle}`}
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-48 flex flex-col items-center gap-4">
                      <div className="text-[8px] font-['Press_Start_2P'] text-gray-400">Rate this</div>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                          <button
                            key={score}
                            onClick={() => handleVote(entry._id, score)}
                            className={`w-8 h-8 text-xs font-['Press_Start_2P'] transition ${
                              myVote?.score === score
                                ? "bg-[#4ade80] text-[#0a0a12] border-2 border-white"
                                : "bg-[#1a1a2e] hover:bg-[#2a2a4e] border-2 border-[#3a9364]"
                            }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                      {myVote && (
                        <div className="text-[8px] font-['Press_Start_2P'] text-[#4ade80]">
                          {myVote.score}/10
                        </div>
                      )}
                      <button
                        onClick={() => setPlaybackEntry({ id: entry._id, playerName: entry.player?.handle || "Unknown" })}
                        className="px-4 py-2 bg-[#0df] text-[#0a0a12] font-['Press_Start_2P'] text-[8px] uppercase hover:bg-white transition"
                        style={{ boxShadow: '3px 3px 0 0 #0099aa' }}
                      >
                        Playback
                      </button>
                      {isCreator && (
                        <button
                          onClick={() => handleSelectWinner(entry._id)}
                          className={`px-4 py-2 font-['Press_Start_2P'] text-[8px] uppercase transition ${
                            isSelectedWinner
                              ? "bg-yellow-500 text-[#0a0a12]"
                              : "bg-gradient-to-r from-yellow-500 to-[#ff6b6b] hover:from-yellow-400 hover:to-[#ff8888] text-[#0a0a12]"
                          }`}
                          style={{ boxShadow: '3px 3px 0 0 #997700' }}
                        >
                          {isSelectedWinner ? "Winner!" : "Select"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard View */}
        {viewMode === "leaderboard" && (
          <div className="bg-[#0a0a12] border-4 border-[#3a9364] overflow-hidden"
            style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
            {leaderboard && leaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-4 border-[#3a9364] bg-[#1a1a2e]">
                      <th className="px-4 py-4 text-left text-[8px] font-['Press_Start_2P'] text-[#ff6b6b]">#</th>
                      <th className="px-4 py-4 text-left text-[8px] font-['Press_Start_2P'] text-[#ff6b6b]">Player</th>
                      <th className="px-4 py-4 text-right text-[8px] font-['Press_Start_2P'] text-[#ff6b6b]">Type</th>
                      <th className="px-4 py-4 text-right text-[8px] font-['Press_Start_2P'] text-[#ff6b6b]">Votes</th>
                      <th className="px-4 py-4 text-right text-[8px] font-['Press_Start_2P'] text-[#ff6b6b]">Total</th>
                      <th className="px-4 py-4 text-center text-[8px] font-['Press_Start_2P'] text-[#ff6b6b]">👑</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((item, index) => (
                      <tr
                        key={item.entry._id}
                        className={`border-b-2 border-[#1a1a2e] ${
                          item.isWinner ? "bg-yellow-900/20" : index % 2 === 0 ? "" : "bg-[#1a1a2e]/30"
                        }`}
                      >
                        <td className="px-4 py-4">
                          {index === 0 && <span className="text-xl">🥇</span>}
                          {index === 1 && <span className="text-xl">🥈</span>}
                          {index === 2 && <span className="text-xl">🥉</span>}
                          {index > 2 && <span className="text-[10px] font-['Press_Start_2P'] text-gray-500">{index + 1}</span>}
                        </td>
                        <td className="px-4 py-4 text-xs font-['Press_Start_2P'] text-[#4ade80]">{item.player?.handle}</td>
                        <td className="px-4 py-4 text-right text-[10px] font-['Press_Start_2P'] text-gray-400">{item.entry.totalScore}</td>
                        <td className="px-4 py-4 text-right text-[10px] font-['Press_Start_2P'] text-purple-400">{item.totalVoteScore}</td>
                        <td className="px-4 py-4 text-right text-xs font-['Press_Start_2P'] text-[#0df]">{item.combinedScore}</td>
                        <td className="px-4 py-4 text-center">
                          {item.isWinner && <span className="text-xl">👑</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">No entries yet</p>
              </div>
            )}
          </div>
        )}

        {/* Reveal Animation */}
        {viewMode === "reveal" && leaderboard && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {revealIndex > 0 ? (
                <motion.div
                  key={`countdown-${revealIndex}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  className="text-center"
                >
                  <div className="text-6xl font-['Press_Start_2P'] text-[#ff6b6b] mb-6"
                    style={{ textShadow: '4px 4px 0 #993333, 0 0 40px rgba(255, 107, 107, 0.5)' }}>
                    #{revealIndex}
                  </div>
                  {leaderboard[revealIndex - 1] && (
                    <motion.div
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-[#0a0a12] border-4 border-[#3a9364] p-8"
                      style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}
                    >
                      <div className="text-2xl font-['Press_Start_2P'] text-[#4ade80] mb-4"
                        style={{ textShadow: '2px 2px 0 #2d7a50' }}>
                        {leaderboard[revealIndex - 1]?.player?.handle}
                      </div>
                      <div className="text-sm font-['Press_Start_2P'] text-[#0df]">
                        {leaderboard[revealIndex - 1]?.combinedScore} pts
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                    className="text-8xl mb-8"
                  >
                    👑
                  </motion.div>
                  <div className="text-sm font-['Press_Start_2P'] text-[#ff6b6b] mb-6">THE WINNER IS</div>
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-4xl md:text-6xl font-['Press_Start_2P'] text-[#4ade80]"
                    style={{ textShadow: '4px 4px 0 #2d7a50, 0 0 40px rgba(74, 222, 128, 0.6)' }}
                  >
                    {leaderboard[0]?.player?.handle}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-8 text-lg font-['Press_Start_2P'] text-[#0df]"
                  >
                    {leaderboard[0]?.combinedScore} pts
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="mt-12"
                  >
                    <button
                      onClick={() => setViewMode("leaderboard")}
                      className="px-6 py-3 bg-[#1a1a2e] hover:bg-[#2a2a4e] font-['Press_Start_2P'] text-[10px] uppercase border-2 border-[#3a9364] transition"
                    >
                      Full Leaderboard
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Code Modal */}
        {selectedEntry && (
          <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedEntry(null)}
          >
            <div
              className="bg-[#0a0a12] border-4 border-[#3a9364] max-w-4xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
              style={{ boxShadow: '8px 8px 0 0 #2d7a50' }}
            >
              <div className="p-4 border-b-4 border-[#3a9364] flex items-center justify-between bg-[#1a1a2e]">
                <h2 className="text-sm font-['Press_Start_2P'] text-[#4ade80]">{">> Code"}</h2>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-[#ff6b6b] hover:text-white font-['Press_Start_2P'] text-sm px-3 py-1 bg-[#0a0a12] border-2 border-[#ff6b6b] hover:bg-[#ff6b6b] transition"
                >
                  X
                </button>
              </div>
              <pre className="p-6 text-sm overflow-auto font-mono text-[#4ade80]">
                <code>
                  {entries?.find((e) => e._id === selectedEntry)?.html || ""}
                </code>
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Playback Modal */}
      {playbackEntry && (
        <Playback
          entryId={playbackEntry.id}
          playerName={playbackEntry.playerName}
          onClose={() => setPlaybackEntry(null)}
          autoPlay={playbackEntry.autoPlay}
          targetDuration={15}
        />
      )}
    </div>
  );
}
