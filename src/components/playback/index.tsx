"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface PlaybackProps {
  entryId: Id<"entries">;
  playerName: string;
  onClose: () => void;
  autoPlay?: boolean; // Start playing automatically
  targetDuration?: number; // Target playback duration in seconds (e.g., 15 for 15 seconds)
}

export function Playback({ entryId, playerName, onClose, autoPlay = false, targetDuration = 15 }: PlaybackProps) {
  const snapshots = useQuery(api.entries.getProgressSnapshots, { entryId });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number | "auto">("auto");
  const [showCode, setShowCode] = useState(true);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sortedSnapshots = useMemo(() =>
    snapshots?.sort((a, b) => a.timestamp - b.timestamp) || [],
    [snapshots]
  );
  const currentSnapshot = sortedSnapshots[currentIndex];

  // Calculate auto speed: play all snapshots in targetDuration seconds
  const autoSpeed = useMemo(() => {
    if (sortedSnapshots.length <= 1) return 1;
    // We want to show all snapshots in targetDuration seconds
    // Each snapshot advances every (1000 / speed) ms
    // Total time = snapshots.length * (1000 / speed) / 1000 = snapshots.length / speed seconds
    // We want: snapshots.length / speed = targetDuration
    // So: speed = snapshots.length / targetDuration
    return Math.max(1, sortedSnapshots.length / targetDuration);
  }, [sortedSnapshots.length, targetDuration]);

  const effectiveSpeed = playbackSpeed === "auto" ? autoSpeed : playbackSpeed;

  // Auto-start playback if requested
  useEffect(() => {
    if (autoPlay && sortedSnapshots.length > 0 && !hasAutoStarted) {
      setHasAutoStarted(true);
      setIsPlaying(true);
    }
  }, [autoPlay, sortedSnapshots.length, hasAutoStarted]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && sortedSnapshots.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= sortedSnapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / effectiveSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, effectiveSpeed, sortedSnapshots.length]);

  const handlePlayPause = useCallback(() => {
    if (currentIndex >= sortedSnapshots.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentIndex, sortedSnapshots.length]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIndex(Number(e.target.value));
    setIsPlaying(false);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!snapshots) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-xl animate-pulse">Loading playback...</div>
      </div>
    );
  }

  if (sortedSnapshots.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">No Playback Data</h2>
          <p className="text-gray-400 mb-6">
            No progress snapshots were recorded for this submission.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Playback: {playerName}</h2>
          <span className="text-sm text-gray-400">
            Snapshot {currentIndex + 1} of {sortedSnapshots.length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowCode(!showCode)}
            className={`px-3 py-1 rounded text-sm ${
              showCode ? "bg-green-600" : "bg-gray-700"
            }`}
          >
            {showCode ? "Code" : "Preview"}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code/Preview panel */}
        <div className="flex-1 flex">
          {showCode ? (
            <div className="flex-1 overflow-auto bg-gray-950 p-4">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {currentSnapshot?.html || "(empty)"}
              </pre>
            </div>
          ) : (
            <div className="flex-1 bg-white">
              <iframe
                srcDoc={currentSnapshot?.html || ""}
                className="w-full h-full border-0"
                title="Preview"
                sandbox="allow-scripts"
              />
            </div>
          )}

          {/* Side-by-side on larger screens */}
          <div className="hidden lg:flex flex-1 border-l border-gray-800">
            {showCode ? (
              <div className="flex-1 bg-white">
                <iframe
                  srcDoc={currentSnapshot?.html || ""}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <div className="flex-1 overflow-auto bg-gray-950 p-4">
                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                  {currentSnapshot?.html || "(empty)"}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="w-48 bg-gray-900 border-l border-gray-800 p-4">
          <h3 className="font-semibold mb-4 text-sm">Stats at this point</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">Time</span>
              <div className="text-lg font-mono">
                {formatTime(currentSnapshot?.timestamp || 0)}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Keystrokes</span>
              <div className="text-lg font-mono">
                {currentSnapshot?.keystrokeCount || 0}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Streak</span>
              <div className="text-lg font-mono">
                {currentSnapshot?.streak || 0}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Power Mode</span>
              <div className={`text-lg font-mono ${currentSnapshot?.powerMode ? "text-yellow-400" : "text-gray-600"}`}>
                {currentSnapshot?.powerMode ? "ACTIVE" : "OFF"}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Code Length</span>
              <div className="text-lg font-mono">
                {currentSnapshot?.html?.length || 0} chars
              </div>
            </div>
          </div>

          {/* Suspicious activity indicators */}
          <div className="mt-6 pt-4 border-t border-gray-800">
            <h3 className="font-semibold mb-3 text-sm text-yellow-400">Review Notes</h3>
            {currentIndex > 0 && currentSnapshot && sortedSnapshots[currentIndex - 1] && (
              <div className="space-y-2 text-xs">
                {(() => {
                  const prevSnapshot = sortedSnapshots[currentIndex - 1];
                  if (!prevSnapshot) return null;
                  const charDiff = (currentSnapshot.html?.length || 0) - (prevSnapshot.html?.length || 0);
                  const timeDiff = currentSnapshot.timestamp - prevSnapshot.timestamp;
                  const charsPerSecond = charDiff / (timeDiff / 1000);

                  return (
                    <>
                      <div className="text-gray-400">
                        +{charDiff} chars in {Math.round(timeDiff / 1000)}s
                      </div>
                      {charDiff > 500 && (
                        <div className="text-red-400 bg-red-900/20 px-2 py-1 rounded">
                          Large paste detected ({charDiff} chars)
                        </div>
                      )}
                      {charsPerSecond > 20 && charDiff > 100 && (
                        <div className="text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
                          Fast input: {Math.round(charsPerSecond)} chars/sec
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 flex items-center justify-center bg-green-600 hover:bg-green-500 rounded-full transition"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Timeline slider */}
          <div className="flex-1 flex items-center gap-4">
            <span className="text-sm font-mono w-12">
              {formatTime(currentSnapshot?.timestamp || 0)}
            </span>
            <input
              type="range"
              min="0"
              max={sortedSnapshots.length - 1}
              value={currentIndex}
              onChange={handleSliderChange}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <span className="text-sm font-mono w-12">
              {formatTime(sortedSnapshots[sortedSnapshots.length - 1]?.timestamp || 0)}
            </span>
          </div>

          {/* Speed controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Speed:</span>
            <button
              onClick={() => setPlaybackSpeed("auto")}
              className={`px-2 py-1 text-xs rounded ${
                playbackSpeed === "auto"
                  ? "bg-green-600"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              title={`Auto: ${autoSpeed.toFixed(1)}x (${targetDuration}s playback)`}
            >
              Auto
            </button>
            {[1, 2, 4, 10].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 text-xs rounded ${
                  playbackSpeed === speed
                    ? "bg-green-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {speed}x
              </button>
            ))}
            {playbackSpeed === "auto" && (
              <span className="text-xs text-gray-500">
                ({autoSpeed.toFixed(1)}x)
              </span>
            )}
          </div>

          {/* Step controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &larr;
            </button>
            <button
              onClick={() => setCurrentIndex(Math.min(sortedSnapshots.length - 1, currentIndex + 1))}
              disabled={currentIndex === sortedSnapshots.length - 1}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
