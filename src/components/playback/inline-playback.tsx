"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface InlinePlaybackProps {
  entryId: Id<"entries">;
  finalHtml: string;
  targetDuration?: number; // Target playback duration in seconds
}

export function InlinePlayback({ entryId, finalHtml, targetDuration = 15 }: InlinePlaybackProps) {
  const snapshots = useQuery(api.entries.getProgressSnapshots, { entryId });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 means show final result
  const [hasPlayed, setHasPlayed] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sortedSnapshots = useMemo(() =>
    snapshots?.sort((a, b) => a.timestamp - b.timestamp) || [],
    [snapshots]
  );

  // Calculate speed to play all snapshots in targetDuration seconds
  const intervalMs = useMemo(() => {
    if (sortedSnapshots.length <= 1) return 1000;
    // Total time = snapshots.length * intervalMs / 1000 = targetDuration
    // intervalMs = targetDuration * 1000 / snapshots.length
    return (targetDuration * 1000) / sortedSnapshots.length;
  }, [sortedSnapshots.length, targetDuration]);

  const currentHtml = currentIndex === -1
    ? finalHtml
    : (sortedSnapshots[currentIndex]?.html || "");

  // Playback logic
  useEffect(() => {
    if (isPlaying && sortedSnapshots.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= sortedSnapshots.length - 1) {
            setIsPlaying(false);
            setHasPlayed(true);
            return -1; // Back to final result
          }
          return prev + 1;
        });
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, intervalMs, sortedSnapshots.length]);

  const handlePlay = useCallback(() => {
    if (sortedSnapshots.length === 0) return;
    setCurrentIndex(0);
    setIsPlaying(true);
    setHasPlayed(false);
  }, [sortedSnapshots.length]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(-1);
  }, []);

  // Progress percentage
  const progress = isPlaying && sortedSnapshots.length > 0
    ? ((currentIndex + 1) / sortedSnapshots.length) * 100
    : hasPlayed ? 100 : 0;

  // Render HTML in iframe
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

  const hasSnapshots = sortedSnapshots.length > 0;

  return (
    <div className="relative aspect-video bg-white rounded-lg overflow-hidden group">
      {/* Preview iframe */}
      <iframe
        src={renderPreview(currentHtml)}
        className="w-full h-full border-0"
        sandbox="allow-same-origin"
        title="Submission preview"
      />

      {/* Play/Stop overlay */}
      {hasSnapshots && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
        }`}>
          {!isPlaying ? (
            <button
              onClick={handlePlay}
              className="w-16 h-16 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-full transition group-hover:scale-110"
            >
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="w-16 h-16 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-full transition"
            >
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      {(isPlaying || hasPlayed) && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <div
            className="h-full bg-green-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Playing indicator */}
      {isPlaying && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Playing...
        </div>
      )}

      {/* No snapshots message */}
      {!hasSnapshots && snapshots !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="text-white/70 text-sm">No playback data</span>
        </div>
      )}
    </div>
  );
}
