"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../components/providers";
import { Id } from "../../../../convex/_generated/dataModel";
import { Streak } from "@/components/streak/streak";
import { Modal } from "@/components/modal";
import { Button } from "@/components/button";
import useInterval from "@/hooks/useInterval";
import dynamic from "next/dynamic";
import type { EditorProps } from "@/components/editor";

const Editor = dynamic<EditorProps>(
  () => import("@/components/editor").then((mod) => mod.Editor),
  { ssr: false, loading: () => <div className="h-screen flex items-center justify-center">Loading editor...</div> }
);

const STREAK_TIMEOUT = 10 * 1000;
const POWER_MODE_ACTIVATION_THRESHOLD = 200;
const SNAPSHOT_INTERVAL = 20000; // Save progress every 20 seconds for playback
const SLIDESHOW_INTERVAL = 5000; // Switch submission every 5 seconds

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const code = params.code as string;

  const [html, setHtml] = useState("");
  const [streak, setStreak] = useState(0);
  const [powerMode, setPowerMode] = useState(false);
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [guestPlayerId, setGuestPlayerId] = useState<Id<"players"> | null>(null);

  const streakTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartedAtRef = useRef<number | null>(null);

  // Check for guest player ID in localStorage
  useEffect(() => {
    const storedPlayerId = localStorage.getItem(`blindcode_player_${code}`);
    if (storedPlayerId) {
      setGuestPlayerId(storedPlayerId as Id<"players">);
    }
  }, [code]);

  const game = useQuery(api.games.getGameByShortCode, { shortCode: code });
  const assets = useQuery(
    api.assets.getGameAssets,
    game?._id ? { gameId: game._id } : "skip"
  );

  // Get player by user ID (for logged-in users)
  const playerByUser = useQuery(
    api.players.getPlayerByUserAndGame,
    game?._id && user?.id
      ? { userId: user.id as Id<"users">, gameId: game._id }
      : "skip"
  );

  // Get player by stored ID (for guest users)
  const playerById = useQuery(
    api.players.getPlayerById,
    guestPlayerId && !user?.id
      ? { playerId: guestPlayerId }
      : "skip"
  );

  // Use whichever player we found
  const player = playerByUser || playerById;

  const entry = useQuery(
    api.entries.getPlayerEntry,
    player?._id ? { playerId: player._id } : "skip"
  );

  const updateEntry = useMutation(api.entries.updateEntry);
  const saveSnapshot = useMutation(api.entries.saveProgressSnapshot);
  const submitEntry = useMutation(api.entries.submitEntry);

  // Get all submitted entries for the waiting slideshow
  const allEntries = useQuery(
    api.entries.getGameEntries,
    game?._id ? { gameId: game._id } : "skip"
  );
  const submittedEntries = allEntries?.filter(e => e.isSubmitted) || [];

  // Initialize HTML from entry
  useEffect(() => {
    if (entry?.html && !html) {
      setHtml(entry.html);
    }
  }, [entry, html]);

  // Track game start time
  useEffect(() => {
    if (game?.startedAt && !gameStartedAtRef.current) {
      gameStartedAtRef.current = game.startedAt;
    }
  }, [game?.startedAt]);

  // Check if entry is already submitted or time already expired on load
  useEffect(() => {
    if (entry?.isSubmitted) {
      setHasSubmitted(true);
    }
  }, [entry?.isSubmitted]);

  // Check if time already expired when opening the page
  useEffect(() => {
    if (!game?.startedAt || !game?.durationMinutes || hasSubmitted) return;

    const elapsed = Date.now() - game.startedAt;
    const total = game.durationMinutes * 60 * 1000;
    const remaining = Math.max(0, total - elapsed);

    // If time already expired when page loads, auto-submit immediately
    if (remaining <= 0 && !isSubmitting && entry?._id) {
      handleSubmit();
    }
  }, [game?.startedAt, game?.durationMinutes, entry?._id, hasSubmitted]);

  // Update time remaining
  useEffect(() => {
    if (!game?.startedAt || !game?.durationMinutes || hasSubmitted) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - game.startedAt!;
      const total = game.durationMinutes * 60 * 1000;
      const remaining = Math.max(0, total - elapsed);
      setTimeRemaining(remaining);

      // Auto-submit when time is up
      if (remaining <= 0 && !isSubmitting) {
        handleSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.startedAt, game?.durationMinutes, isSubmitting, hasSubmitted]);

  // Redirect if game status changes
  useEffect(() => {
    if (game?.status === "voting" || game?.status === "finished") {
      router.push(`/results/${code}`);
    }
    if (game?.status === "lobby" || game?.status === "draft") {
      router.push(`/game/${code}`);
    }
  }, [game?.status, code, router]);

  // Handle editor changes
  const handleChange = useCallback((newValue: string) => {
    setHtml(newValue);
    setKeystrokeCount((prev) => prev + 1);

    // Update streak
    setStreak((prevStreak) => {
      const newStreak = prevStreak + 1;
      if (newStreak > maxStreak) {
        setMaxStreak(newStreak);
      }
      if (newStreak >= POWER_MODE_ACTIVATION_THRESHOLD) {
        setPowerMode(true);
      }
      return newStreak;
    });

    // Reset streak timeout
    if (streakTimeoutRef.current) {
      clearTimeout(streakTimeoutRef.current);
    }
    streakTimeoutRef.current = setTimeout(() => {
      setStreak(0);
      setPowerMode(false);
    }, STREAK_TIMEOUT);
  }, [maxStreak]);

  // Save progress snapshot periodically
  useInterval(() => {
    if (entry?._id && game?.startedAt) {
      const timestamp = Date.now() - game.startedAt;

      // Update entry
      updateEntry({
        entryId: entry._id,
        html,
        streak,
        keystrokeCount,
      });

      // Save snapshot for playback
      saveSnapshot({
        entryId: entry._id,
        html,
        streak,
        powerMode,
        keystrokeCount,
        timestamp,
      });
    }
  }, SNAPSHOT_INTERVAL);

  // Calculate score
  const calculateScore = () => {
    // Base score from keystrokes
    const keystrokePoints = keystrokeCount;
    // Streak bonus
    const streakBonus = Math.floor(maxStreak * 1.5);
    // Power mode bonus (simplified - just add if reached)
    const powerModeBonus = maxStreak >= POWER_MODE_ACTIVATION_THRESHOLD ? 100 : 0;

    return keystrokePoints + streakBonus + powerModeBonus;
  };

  // Submit entry
  const handleSubmit = async () => {
    if (!entry?._id || isSubmitting || hasSubmitted) return;

    setIsSubmitting(true);
    try {
      await submitEntry({
        entryId: entry._id,
        html,
        totalScore: calculateScore(),
        maxStreak,
        totalKeystrokes: keystrokeCount,
      });
      setHasSubmitted(true);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Failed to submit:", error);
      setIsSubmitting(false);
    }
  };

  // Slideshow interval for waiting screen
  useEffect(() => {
    if (!hasSubmitted || submittedEntries.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % submittedEntries.length);
    }, SLIDESHOW_INTERVAL);

    return () => clearInterval(interval);
  }, [hasSubmitted, submittedEntries.length]);

  // Render HTML preview in iframe
  const renderPreview = (htmlContent: string) => {
    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background: white; }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `;
    return `data:text/html;charset=utf-8,${encodeURIComponent(doc)}`;
  };

  // Format time
  const formatTime = (ms: number | null) => {
    if (ms === null) return "--:--";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!game || !player || !entry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-xl animate-pulse">Loading game...</div>
      </div>
    );
  }

  if (game.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Game Not Active</h1>
          <p className="text-gray-400 mb-6">This game is not currently running.</p>
        </div>
      </div>
    );
  }

  // Waiting screen after submission
  if (hasSubmitted) {
    const currentEntry = submittedEntries[currentSlideIndex];
    const totalSubmitted = submittedEntries.length;

    return (
      <div className="h-screen bg-[#0a0a12] font-['Press_Start_2P'] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-4 border-[#3a9364] flex items-center justify-between">
          <h1 className="text-lg text-[#4ade80]" style={{ textShadow: '2px 2px 0 #2d7a50' }}>
            Blind Code
          </h1>
          <div className="text-[10px] text-[#ff6b6b]">
            Waiting for results...
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {/* Status Message */}
          <div className="text-center mb-8">
            <h2 className="text-xl text-[#4ade80] mb-4" style={{ textShadow: '2px 2px 0 #2d7a50' }}>
              Code Submitted!
            </h2>
            <p className="text-[10px] text-gray-400 mb-2">
              Waiting for other players to finish...
            </p>
            <p className="text-[8px] text-[#ff6b6b]">
              {totalSubmitted} submission{totalSubmitted !== 1 ? 's' : ''} so far
            </p>
          </div>

          {/* Submission Slideshow */}
          {currentEntry && (
            <div className="w-full max-w-4xl">
              <div className="text-[10px] text-[#4ade80] mb-3 text-center">
                {">> Submission"} {currentSlideIndex + 1} of {totalSubmitted}
              </div>
              <div className="bg-[#1a1a2e] border-4 border-[#3a9364] p-2" style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
                <div className="aspect-video bg-white">
                  <iframe
                    src={renderPreview(currentEntry.html || "")}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin"
                    title={`Submission ${currentSlideIndex + 1}`}
                  />
                </div>
              </div>

              {/* Slideshow Indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {submittedEntries.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`w-3 h-3 border-2 transition-all ${
                      index === currentSlideIndex
                        ? 'bg-[#4ade80] border-[#4ade80]'
                        : 'bg-transparent border-[#3a9364] hover:border-[#4ade80]'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No submissions yet */}
          {totalSubmitted === 0 && (
            <div className="text-center">
              <div className="text-[40px] mb-4 animate-pulse">...</div>
              <p className="text-[10px] text-gray-500">
                No other submissions yet
              </p>
            </div>
          )}

          {/* Reference Image */}
          <div className="mt-8 text-center">
            <p className="text-[8px] text-[#ff6b6b] mb-2">{">> Target"}</p>
            <div className="w-48 h-36 border-2 border-[#3a9364] mx-auto overflow-hidden"
              style={{ boxShadow: '4px 4px 0 0 #2d7a50' }}>
              <img
                src={game.referenceImageUrl}
                alt="Target"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-4 border-[#3a9364] text-center">
          <p className="text-[8px] text-gray-500">
            Results will appear automatically when voting begins
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-screen relative font-['Press_Start_2P'] overflow-hidden ${
        powerMode ? "power-mode" : ""
      }`}
    >
      {/* Instructions Modal */}
      <Modal show={showInstructions} setShow={setShowInstructions}>
        <div className="p-4 text-[10px] leading-relaxed">
          <h2 className="text-lg text-[#4ade80] mb-4 uppercase tracking-wider">{game.title}</h2>
          <p className="text-[#e0e0e0] mb-6 whitespace-pre-wrap">{game.description}</p>

          {game.requirements && (
            <div className="mb-6">
              <h3 className="text-[#ff6b6b] mb-3 uppercase">{">> Requirements"}</h3>
              <p className="text-[#b0b0b0] whitespace-pre-wrap pl-4 border-l-4 border-[#3a9364]">{game.requirements}</p>
            </div>
          )}

          {game.hexColors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[#ff6b6b] mb-3 uppercase">{">> Colors"}</h3>
              <div className="flex flex-wrap gap-3">
                {game.hexColors.map((color, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#1a1a2e] px-3 py-2 border-2 border-[#3a9364]"
                    style={{ boxShadow: '3px 3px 0 0 #2d7a50' }}>
                    <div
                      className="w-6 h-6 border-2 border-white"
                      style={{ backgroundColor: color.hex, imageRendering: 'pixelated' }}
                    />
                    <div className="flex flex-col">
                      <span className="text-[#4ade80] uppercase">{color.name}</span>
                      <code className="text-[#ffffff] font-bold text-xs tracking-wider">{color.hex}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assets && assets.length > 0 && (
            <div>
              <h3 className="text-[#ff6b6b] mb-3 uppercase">{">> Assets"}</h3>
              <div className="space-y-2 bg-[#1a1a2e] p-3 border-2 border-[#3a9364]"
                style={{ boxShadow: '4px 4px 0 0 #2d7a50' }}>
                {assets.map((asset) => (
                  <div key={asset._id} className="flex items-center gap-3">
                    <code className="text-[#4ade80] font-bold">/a/{asset.shortCode}</code>
                    <span className="text-[#ff6b6b]">&gt;</span>
                    <span className="text-[#ffffff]">{asset.name}</span>
                    <span className="text-[#666] uppercase">({asset.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Reference Modal */}
      <Modal show={showReference} setShow={setShowReference}>
        <img
          src={game.referenceImageUrl}
          className="max-w-full max-h-[80vh]"
          alt="Reference"
        />
      </Modal>

      {/* Streak Counter */}
      <Streak streak={streak} powerMode={powerMode} />

      {/* Background */}
      <div
        className={`absolute w-full h-full bg-center bg-no-repeat bg-fixed pointer-events-none ${
          powerMode
            ? "bg-[url('/powermode.png')] animate-pulse"
            : "bg-[url('/codeinthedark.png')]"
        }`}
      />

      {/* Background Watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 select-none">
        <div className="text-[8vw] font-['Press_Start_2P'] text-[#252538] uppercase tracking-widest opacity-60"
          style={{ textShadow: '0 0 40px rgba(58, 147, 100, 0.15)' }}>
          Blind Code
        </div>
      </div>

      {/* Editor */}
      <Editor
        onChange={handleChange}
        className="opacity-70 overscroll-none"
        defaultValue={html}
      />

      {/* Right Side Panel - Combo at top (via Streak component), then Timer, Stats, Reference, Instructions, Player */}
      <div className="fixed right-4 top-4 bottom-4 z-40 flex flex-col justify-between pointer-events-none">
        {/* Top Section: Spacer for Combo (rendered by Streak component) + Timer + Stats */}
        <div className="pointer-events-auto text-right">
          {/* Spacer for Combo counter */}
          <div className="h-24 mb-3"></div>

          {/* Timer */}
          <div className={`inline-block text-xl font-['Press_Start_2P'] px-3 py-2 bg-[#0a0a12] border-3 border-[#3a9364] mb-2 ${
            timeRemaining !== null && timeRemaining < 60000
              ? "text-[#ff6b6b] border-[#ff6b6b] animate-pulse"
              : "text-[#4ade80]"
          }`}
            style={{
              boxShadow: timeRemaining !== null && timeRemaining < 60000
                ? '3px 3px 0 0 #cc4444'
                : '3px 3px 0 0 #2d7a50',
              textShadow: '0 0 8px currentColor'
            }}>
            {formatTime(timeRemaining)}
          </div>

          {/* Stats */}
          <div className="text-[8px] font-['Press_Start_2P'] text-[#4ade80] bg-[#0a0a12]/90 p-2 border-2 border-[#3a9364] text-left ml-auto w-fit"
            style={{ boxShadow: '2px 2px 0 0 #2d7a50' }}>
            <div><span className="text-[#ff6b6b]">Keys:</span> {keystrokeCount}</div>
            <div><span className="text-[#ff6b6b]">Best:</span> {maxStreak}</div>
            <div><span className="text-[#ff6b6b]">Score:</span> {calculateScore()}</div>
          </div>
        </div>

        {/* Bottom Section: Reference, Instructions, Player */}
        <div className="pointer-events-auto text-right">
          {/* Reference Image */}
          <div className="mb-3 text-[10px] font-['Press_Start_2P'] text-[#4ade80] cursor-pointer uppercase">
            {">> Reference"}
            <div
              onClick={() => setShowReference(true)}
              className="w-[180px] h-[140px] mt-2 ml-auto bg-center bg-no-repeat bg-cover border-3 border-[#3a9364]"
              style={{
                backgroundImage: `url(${game.referenceImageUrl})`,
                boxShadow: '4px 4px 0 0 #2d7a50',
                imageRendering: 'pixelated'
              }}
            />
          </div>

          {/* Instructions Button */}
          <Button
            onClick={() => setShowInstructions(true)}
            className="block ml-auto mb-3"
          >
            Instructions
          </Button>

          {/* Player Name */}
          <div className="text-[10px] font-['Press_Start_2P'] text-[#4ade80] bg-[#0a0a12] px-3 py-2 border-2 border-[#3a9364] uppercase ml-auto w-fit"
            style={{ boxShadow: '3px 3px 0 0 #2d7a50' }}>
            <span className="text-[#ff6b6b]">&gt;</span> {player.handle}
          </div>
        </div>
      </div>
    </div>
  );
}
