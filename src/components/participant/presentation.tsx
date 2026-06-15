"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { biggestHtmlIssue } from "@/lib/html-validate";

export interface AnonymousEntry {
  entryId: Id<"entries">;
  label: string; // e.g. "Submission 1" (no player name)
  finalHtml: string;
}

interface PresentationProps {
  entries: AnonymousEntry[];
  gameId: Id<"games">;
  targetDuration?: number;
}

// Host presentation screen: walks through each (anonymous) submission with the
// code animating from start to finish, a toggle to a big readable code view,
// and an HTML-validation bar highlighting the biggest mistake.
export function Presentation({
  entries,
  gameId,
  targetDuration = 15,
}: PresentationProps) {
  const [index, setIndex] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [snapIndex, setSnapIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const current = entries[index];

  const assets = useQuery(api.assets.getGameAssets, { gameId });
  const snapshots = useQuery(
    api.entries.getProgressSnapshots,
    current ? { entryId: current.entryId } : "skip"
  );

  const sortedSnapshots = useMemo(
    () => (snapshots ? [...snapshots].sort((a, b) => a.timestamp - b.timestamp) : []),
    [snapshots]
  );

  const googleFontLinks = useMemo(() => {
    if (!assets) return "";
    return assets
      .filter(
        (a) => a.type === "font" && a.url.includes("fonts.googleapis.com")
      )
      .map((a) => `<link href="${a.url}" rel="stylesheet">`)
      .join("\n");
  }, [assets]);

  const intervalMs = useMemo(() => {
    if (sortedSnapshots.length <= 1) return 1000;
    return (targetDuration * 1000) / sortedSnapshots.length;
  }, [sortedSnapshots.length, targetDuration]);

  // Reset animation whenever we switch submissions.
  useEffect(() => {
    setSnapIndex(0);
    setIsPlaying(true);
  }, [index]);

  // Drive the code-progression animation (loops).
  useEffect(() => {
    if (!isPlaying || sortedSnapshots.length === 0) return;
    intervalRef.current = setInterval(() => {
      setSnapIndex((prev) => (prev + 1) % sortedSnapshots.length);
    }, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, intervalMs, sortedSnapshots.length]);

  if (!current) {
    return (
      <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-8 text-center"
        style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}>
        <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">
          No submissions to present
        </p>
      </div>
    );
  }

  const hasSnapshots = sortedSnapshots.length > 0;
  const currentHtml = hasSnapshots
    ? sortedSnapshots[snapIndex]?.html || ""
    : current.finalHtml;
  const displayHtml = isPlaying && hasSnapshots ? currentHtml : current.finalHtml;

  const renderPreview = (html: string) => {
    const doc = `<!DOCTYPE html><html><head>${googleFontLinks}<style>body{margin:0;padding:0;background:white;}</style></head><body>${html}</body></html>`;
    return `data:text/html;charset=utf-8,${encodeURIComponent(doc)}`;
  };

  const issue = biggestHtmlIssue(current.finalHtml);
  const issueColor =
    issue.severity === "error"
      ? "text-[#ff6b6b] border-[#ff6b6b]"
      : issue.severity === "warning"
      ? "text-yellow-400 border-yellow-500"
      : "text-[#4ade80] border-[#3a9364]";

  const progress = hasSnapshots
    ? ((snapIndex + 1) / sortedSnapshots.length) * 100
    : 100;

  return (
    <div className="bg-[#0a0a12] border-4 border-[#3a9364] overflow-hidden"
      style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}>
      {/* Header / controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b-4 border-[#3a9364] bg-[#1a1a2e]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-['Press_Start_2P'] text-[#4ade80]">
            {current.label}
          </span>
          <span className="text-[8px] font-['Press_Start_2P'] text-gray-500">
            {index + 1} / {entries.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            disabled={!hasSnapshots}
            className="px-3 py-2 font-['Press_Start_2P'] text-[8px] uppercase bg-[#0df] text-[#0a0a12] hover:bg-white transition disabled:opacity-40"
          >
            {isPlaying ? "Pause" : "Replay"}
          </button>
          <button
            onClick={() => setShowCode((s) => !s)}
            className={`px-3 py-2 font-['Press_Start_2P'] text-[8px] uppercase transition ${
              showCode
                ? "bg-[#4ade80] text-[#0a0a12]"
                : "bg-[#0a0a12] text-[#4ade80] border-2 border-[#3a9364]"
            }`}
          >
            {showCode ? "Preview" : "Code"}
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="bg-black">
        {showCode ? (
          <div className="h-[58vh] overflow-auto bg-[#05050a] p-6">
            <pre className="text-[15px] leading-relaxed font-mono text-[#4ade80] whitespace-pre-wrap break-words">
              <code>{displayHtml || "(empty)"}</code>
            </pre>
          </div>
        ) : (
          <div className="h-[58vh] bg-white">
            <iframe
              src={renderPreview(displayHtml)}
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
              title={current.label}
            />
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-black/40">
        <div
          className="h-full bg-[#4ade80] transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* HTML validation bar — biggest mistake */}
      <div className={`flex items-center gap-3 p-4 border-t-4 bg-[#0a0a12] ${issueColor}`}>
        <span className="text-base">
          {issue.severity === "error"
            ? "❌"
            : issue.severity === "warning"
            ? "⚠️"
            : "✅"}
        </span>
        <div className="flex flex-col">
          <span className="text-[7px] font-['Press_Start_2P'] uppercase opacity-70">
            HTML Check — biggest issue
          </span>
          <span className="text-[10px] font-['Press_Start_2P']">
            {issue.message}
          </span>
        </div>
      </div>

      {/* Submission navigation */}
      <div className="flex items-center justify-between gap-3 p-4 border-t-4 border-[#3a9364] bg-[#1a1a2e]">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="px-4 py-2 font-['Press_Start_2P'] text-[8px] uppercase bg-[#0a0a12] border-2 border-[#3a9364] text-[#4ade80] hover:bg-[#3a9364] hover:text-[#0a0a12] transition disabled:opacity-40"
        >
          {"<- Prev"}
        </button>
        <div className="flex gap-2">
          {entries.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-3 h-3 border-2 transition ${
                i === index
                  ? "bg-[#4ade80] border-[#4ade80]"
                  : "bg-transparent border-[#3a9364] hover:border-[#4ade80]"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setIndex((i) => Math.min(entries.length - 1, i + 1))}
          disabled={index === entries.length - 1}
          className="px-4 py-2 font-['Press_Start_2P'] text-[8px] uppercase bg-[#0a0a12] border-2 border-[#3a9364] text-[#4ade80] hover:bg-[#3a9364] hover:text-[#0a0a12] transition disabled:opacity-40"
        >
          {"Next ->"}
        </button>
      </div>
    </div>
  );
}
