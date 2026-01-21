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
      <header className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold font-['Press_Start_2P'] text-green-400"
          >
            BLIND CODE
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{game.title}</span>
            {isCreator && (
              <Link
                href={`/game/manage/${game._id}`}
                className="text-sm text-gray-400 hover:text-white"
              >
                Manage
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* View Mode Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setViewMode("submissions")}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === "submissions"
                ? "bg-green-600"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            Submissions
          </button>
          {user && (
            <button
              onClick={() => setViewMode("voting")}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === "voting"
                  ? "bg-purple-600"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              Vote
            </button>
          )}
          <button
            onClick={() => setViewMode("leaderboard")}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === "leaderboard"
                ? "bg-yellow-600"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            Leaderboard
          </button>
          {isCreator && leaderboard && leaderboard.length > 0 && (
            <button
              onClick={startReveal}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 transition font-semibold"
            >
              Reveal Winner
            </button>
          )}
        </div>

        {/* Submissions View */}
        {viewMode === "submissions" && (
          <div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Reference */}
              <div className="bg-gray-900 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Target</h2>
                <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
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
                  <div key={entry._id} className="bg-gray-900 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{entry.player?.handle}</h3>
                      <div className="text-sm text-gray-400">
                        Score: {entry.totalScore}
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
                        className="text-sm text-green-400 hover:text-green-300"
                      >
                        View Code
                      </button>
                      <button
                        onClick={() => setPlaybackEntry({ id: entry._id, playerName: entry.player?.handle || "Unknown" })}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Full Playback
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-900 rounded-xl p-6 flex items-center justify-center">
                  <p className="text-gray-500">No submissions yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voting View */}
        {viewMode === "voting" && user && (
          <div className="space-y-6">
            <p className="text-gray-400">
              Rate each submission from 1-10.{isCreator && " As the creator, you can also select a winner."}
            </p>
            {entries && entries.length === 0 && (
              <div className="bg-gray-900 rounded-xl p-8 text-center">
                <p className="text-gray-500">No submissions to vote on yet</p>
              </div>
            )}
            {entries?.map((entry) => {
              const myVote = getMyVoteForEntry(entry._id);
              const isSelectedWinner = myVote?.isWinner;

              return (
                <div
                  key={entry._id}
                  className={`bg-gray-900 rounded-xl p-6 transition ${
                    isSelectedWinner
                      ? "ring-2 ring-yellow-500 bg-gradient-to-r from-yellow-900/20 to-orange-900/20"
                      : ""
                  }`}
                >
                  {isSelectedWinner && (
                    <div className="flex items-center gap-2 mb-4 text-yellow-400">
                      <span className="text-2xl">👑</span>
                      <span className="font-semibold">Your Winner Pick</span>
                    </div>
                  )}
                  <div className="flex items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">{entry.player?.handle}</h3>
                        <div className="text-sm text-gray-400">
                          Typing Score: {entry.totalScore} | Streak: {entry.maxStreak}
                        </div>
                      </div>
                      <div className="aspect-video bg-white rounded-lg overflow-hidden mb-4">
                        <iframe
                          src={renderPreview(entry.html || "")}
                          className="w-full h-full border-0"
                          sandbox="allow-same-origin"
                          title={`Submission by ${entry.player?.handle}`}
                        />
                      </div>
                    </div>
                    <div className="w-48 flex flex-col items-center gap-4">
                      <div className="text-sm text-gray-400">Rate this submission</div>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                          <button
                            key={score}
                            onClick={() => handleVote(entry._id, score)}
                            className={`w-8 h-8 rounded text-sm font-semibold transition ${
                              myVote?.score === score
                                ? "bg-green-600 text-white ring-2 ring-green-400"
                                : "bg-gray-800 hover:bg-gray-700"
                            }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                      {myVote && (
                        <div className="text-sm text-green-400">
                          Your rating: {myVote.score}/10
                        </div>
                      )}
                      <button
                        onClick={() => setPlaybackEntry({ id: entry._id, playerName: entry.player?.handle || "Unknown" })}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition"
                      >
                        View Playback
                      </button>
                      {isCreator && (
                        <button
                          onClick={() => handleSelectWinner(entry._id)}
                          className={`px-4 py-2 rounded-lg font-semibold transition ${
                            isSelectedWinner
                              ? "bg-yellow-500 text-black"
                              : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400"
                          }`}
                        >
                          {isSelectedWinner ? "Selected as Winner" : "Select as Winner"}
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
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            {leaderboard && leaderboard.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-6 py-4 text-left">Rank</th>
                    <th className="px-6 py-4 text-left">Player</th>
                    <th className="px-6 py-4 text-right">Typing Score</th>
                    <th className="px-6 py-4 text-right">Vote Score</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-center">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item, index) => (
                    <tr
                      key={item.entry._id}
                      className={`border-b border-gray-800 ${
                        item.isWinner ? "bg-gradient-to-r from-yellow-900/20 to-orange-900/20" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        {index === 0 && <span className="text-2xl">🥇</span>}
                        {index === 1 && <span className="text-2xl">🥈</span>}
                        {index === 2 && <span className="text-2xl">🥉</span>}
                        {index > 2 && <span className="text-gray-400">{index + 1}</span>}
                      </td>
                      <td className="px-6 py-4 font-semibold">{item.player?.handle}</td>
                      <td className="px-6 py-4 text-right text-gray-400">{item.entry.totalScore}</td>
                      <td className="px-6 py-4 text-right text-purple-400">{item.totalVoteScore}</td>
                      <td className="px-6 py-4 text-right font-bold text-green-400">{item.combinedScore}</td>
                      <td className="px-6 py-4 text-center">
                        {item.isWinner && <span className="text-2xl">👑</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">No entries yet</p>
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
                  <div className="text-6xl font-bold mb-4">#{revealIndex}</div>
                  {leaderboard[revealIndex - 1] && (
                    <motion.div
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gray-900 rounded-xl p-8"
                    >
                      <div className="text-3xl font-bold mb-2">
                        {leaderboard[revealIndex - 1].player?.handle}
                      </div>
                      <div className="text-xl text-gray-400">
                        Score: {leaderboard[revealIndex - 1].combinedScore}
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
                  <div className="text-2xl text-gray-400 mb-4">THE WINNER IS</div>
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent"
                  >
                    {leaderboard[0]?.player?.handle}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-8 text-xl text-gray-400"
                  >
                    Final Score: {leaderboard[0]?.combinedScore}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="mt-12"
                  >
                    <button
                      onClick={() => setViewMode("leaderboard")}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                    >
                      View Full Leaderboard
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
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedEntry(null)}
          >
            <div
              className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold">Code View</h2>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  &times;
                </button>
              </div>
              <pre className="p-6 text-sm overflow-auto">
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
