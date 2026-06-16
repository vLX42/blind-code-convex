"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { AnonymousEntry } from "./presentation";

interface ParticipantVotingProps {
  gameId: Id<"games">;
  voterPlayerId: Id<"players">;
  ownEntryId: Id<"entries"> | null; // the voter's own entry (can't vote for it)
  entries: AnonymousEntry[];
}

// Blind peer voting: each participant assigns a 1st choice (2 pts) and a 2nd
// choice (1 pt) among the anonymized submissions. They can't vote for their own
// and can leave votes unused if there aren't enough rivals.
export function ParticipantVoting({
  gameId,
  voterPlayerId,
  ownEntryId,
  entries,
}: ParticipantVotingProps) {
  const assets = useQuery(api.assets.getGameAssets, { gameId });
  const myVotesResult = useQuery(api.participantVotes.getMyParticipantVotes, {
    gameId,
    voterPlayerId,
  });
  const setVote = useMutation(api.participantVotes.setVote);
  const clearVote = useMutation(api.participantVotes.clearVote);

  const [pending, setPending] = useState(false);

  const myVotes = myVotesResult?.votes ?? [];
  const votesAllowed = myVotesResult?.votesAllowed ?? 0;

  const firstChoice = myVotes.find((v) => v.rank === 1)?.entryId ?? null;
  const secondChoice = myVotes.find((v) => v.rank === 2)?.entryId ?? null;

  const googleFontLinks = useMemo(() => {
    if (!assets) return "";
    return assets
      .filter((a) => a.type === "font" && a.url.includes("fonts.googleapis.com"))
      .map((a) => `<link href="${a.url}" rel="stylesheet">`)
      .join("\n");
  }, [assets]);

  const renderPreview = (html: string) => {
    // srcDoc + <base> so relative asset refs ("/a/<code>") resolve against the
    // app origin; img guard caps oversized images.
    const base =
      typeof window !== "undefined"
        ? `<base href="${window.location.origin}/">`
        : "";
    return `<!DOCTYPE html><html><head>${base}${googleFontLinks}<style>body{margin:0;padding:0;background:white;}img{max-width:100%;height:auto;}</style></head><body>${html}</body></html>`;
  };

  // Entries the voter can actually vote on (everyone but themselves).
  const votableEntries = entries.filter((e) => e.entryId !== ownEntryId);

  const handlePick = async (entryId: Id<"entries">, rank: 1 | 2) => {
    if (pending) return;
    setPending(true);
    try {
      // Clicking the rank a submission already holds toggles it off.
      const alreadyThisRank =
        (rank === 1 && firstChoice === entryId) ||
        (rank === 2 && secondChoice === entryId);
      if (alreadyThisRank) {
        await clearVote({ gameId, voterPlayerId, rank });
      } else {
        await setVote({ gameId, voterPlayerId, entryId, rank });
      }
    } catch (err) {
      console.error("Vote failed:", err);
    } finally {
      setPending(false);
    }
  };

  const usedVotes = (firstChoice ? 1 : 0) + (secondChoice ? 1 : 0);
  const allVotesUsed = votesAllowed > 0 && usedVotes >= votesAllowed;

  const labelFor = (entryId: Id<"entries"> | null) =>
    votableEntries.find((e) => e.entryId === entryId)?.label ?? "—";

  return (
    <div className="space-y-6">
      {/* Confirmation banner once the ballot is complete */}
      {allVotesUsed ? (
        <div
          className="bg-[#0a0a12] border-4 border-[#4ade80] p-5"
          style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">✅</span>
            <p className="text-[11px] font-['Press_Start_2P'] text-[#4ade80]">
              Your votes are in!
            </p>
          </div>
          <p className="text-[9px] font-['Press_Start_2P'] text-gray-400 leading-relaxed mb-3">
            {firstChoice && (
              <>🥇 {labelFor(firstChoice)}</>
            )}
            {secondChoice && (
              <>
                {"   "}🥈 {labelFor(secondChoice)}
              </>
            )}
          </p>
          <p className="text-[8px] font-['Press_Start_2P'] text-gray-500">
            You can still change your picks until the host closes voting.
          </p>
        </div>
      ) : (
        <div className="bg-[#0a0a12] border-4 border-purple-600 p-4 flex flex-wrap items-center justify-between gap-3"
          style={{ boxShadow: "6px 6px 0 0 #553399" }}>
          <p className="text-[10px] font-['Press_Start_2P'] text-purple-300">
            Pick your favourites — 🥇 1st = 2 pts, 🥈 2nd = 1 pt
          </p>
          <p className="text-[10px] font-['Press_Start_2P'] text-[#4ade80]">
            {usedVotes} / {votesAllowed} votes used
          </p>
        </div>
      )}

      {votableEntries.length === 0 && (
        <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-8 text-center"
          style={{ boxShadow: "6px 6px 0 0 #2d7a50" }}>
          <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">
            There are no other submissions for you to vote on.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {votableEntries.map((entry) => {
          const isFirst = firstChoice === entry.entryId;
          const isSecond = secondChoice === entry.entryId;
          const borderClass = isFirst
            ? "border-yellow-400"
            : isSecond
            ? "border-[#0df]"
            : "border-[#3a9364]";
          const shadow = isFirst
            ? "6px 6px 0 0 #997700"
            : isSecond
            ? "6px 6px 0 0 #0099aa"
            : "6px 6px 0 0 #2d7a50";

          return (
            <div
              key={entry.entryId}
              className={`bg-[#0a0a12] border-4 p-4 transition ${borderClass}`}
              style={{ boxShadow: shadow }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-['Press_Start_2P'] text-[#4ade80]">
                  {entry.label}
                </span>
                {isFirst && <span className="text-xl">🥇</span>}
                {isSecond && <span className="text-xl">🥈</span>}
              </div>

              <div className="aspect-video bg-white border-2 border-[#1a1a2e] overflow-hidden mb-4">
                <iframe
                  srcDoc={renderPreview(entry.finalHtml)}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                  title={entry.label}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePick(entry.entryId, 1)}
                  disabled={pending}
                  className={`px-3 py-3 font-['Press_Start_2P'] text-[8px] uppercase transition disabled:opacity-50 ${
                    isFirst
                      ? "bg-yellow-400 text-[#0a0a12]"
                      : "bg-[#1a1a2e] border-2 border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-[#0a0a12]"
                  }`}
                >
                  {isFirst ? "🥇 1st ✓" : "🥇 1st"}
                </button>
                <button
                  onClick={() => handlePick(entry.entryId, 2)}
                  disabled={pending || votesAllowed < 2}
                  className={`px-3 py-3 font-['Press_Start_2P'] text-[8px] uppercase transition disabled:opacity-40 ${
                    isSecond
                      ? "bg-[#0df] text-[#0a0a12]"
                      : "bg-[#1a1a2e] border-2 border-[#0df] text-[#0df] hover:bg-[#0df] hover:text-[#0a0a12]"
                  }`}
                >
                  {isSecond ? "🥈 2nd ✓" : "🥈 2nd"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
