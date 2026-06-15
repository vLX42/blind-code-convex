"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type VotingMode = "classic" | "participant" | undefined;
type VotingPhase = "presentation" | "voting" | "reveal" | undefined;

interface HostVotingPanelProps {
  gameId: Id<"games">;
  shortCode: string;
  status: string;
  votingMode: VotingMode;
  votingPhase: VotingPhase;
  userId: Id<"users">;
  // "manage" shows links that jump to the presenter/results screen;
  // "results" is already on that screen, so it shows fewer links.
  context: "manage" | "results";
}

const STEPS = [
  { key: "presentation", label: "Present" },
  { key: "voting", label: "Vote" },
  { key: "reveal", label: "Reveal" },
  { key: "done", label: "Results" },
] as const;

export function HostVotingPanel({
  gameId,
  shortCode,
  status,
  votingMode,
  votingPhase,
  userId,
  context,
}: HostVotingPanelProps) {
  const setVotingMode = useMutation(api.games.setVotingMode);
  const setVotingPhase = useMutation(api.games.setVotingPhase);
  const finishGame = useMutation(api.games.finishGame);

  const voteStatus = useQuery(
    api.participantVotes.getParticipantVoteStatus,
    votingMode === "participant" ? { gameId } : "skip"
  );

  // Voting controls only make sense once the game has ended.
  if (status !== "voting" && status !== "finished") return null;

  const setMode = (mode: "classic" | "participant") =>
    setVotingMode({ gameId, creatorId: userId, mode });
  const goPhase = (phase: "presentation" | "voting" | "reveal") =>
    setVotingPhase({ gameId, creatorId: userId, phase });
  const finish = () => finishGame({ gameId, creatorId: userId });

  const resultsHref = `/results/${shortCode}`;

  // Which stepper node is active.
  const activeStep =
    status === "finished"
      ? 3
      : votingPhase === "reveal"
      ? 2
      : votingPhase === "voting"
      ? 1
      : 0;

  const wrap =
    "bg-[#0a0a12] border-4 border-purple-600 p-6 mb-8";
  const wrapShadow = { boxShadow: "6px 6px 0 0 #553399" } as const;
  const heading =
    "text-sm font-['Press_Start_2P'] text-purple-400 mb-2";
  const primaryBtn =
    "px-5 py-3 font-['Press_Start_2P'] text-[10px] uppercase bg-gradient-to-r from-purple-500 to-[#0df] text-[#0a0a12] hover:from-purple-400 hover:to-[#66ffff] transition";
  const secondaryBtn =
    "px-4 py-3 font-['Press_Start_2P'] text-[8px] uppercase bg-[#1a1a2e] border-2 border-[#3a9364] text-[#4ade80] hover:bg-[#2a2a4e] transition";
  const linkBtn =
    "px-4 py-3 font-['Press_Start_2P'] text-[8px] uppercase bg-[#1a1a2e] border-2 border-[#0df] text-[#0df] hover:bg-[#0df] hover:text-[#0a0a12] transition text-center";

  // ----- 1) No mode chosen yet: ask the host to pick a voting style. -----
  if (votingMode === undefined && status === "voting") {
    return (
      <div className={wrap} style={wrapShadow}>
        <h2 className={heading}>{">> Choose how to vote"}</h2>
        <p className="text-[10px] font-['Press_Start_2P'] text-gray-400 mb-6">
          The round is over. Pick a voting style to run.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("participant")}
            className="text-left bg-[#1a1a2e] border-2 border-purple-500 hover:border-purple-300 p-5 transition"
            style={{ boxShadow: "4px 4px 0 0 #553399" }}
          >
            <div className="text-2xl mb-2">🗳️</div>
            <div className="text-[11px] font-['Press_Start_2P'] text-purple-300 mb-2">
              Participant voting
            </div>
            <p className="text-[9px] font-['Press_Start_2P'] text-gray-400 leading-relaxed">
              Players rank each other&apos;s work anonymously. Present, vote,
              then reveal 3&rarr;1. Recommended.
            </p>
          </button>
          <button
            onClick={() => setMode("classic")}
            className="text-left bg-[#1a1a2e] border-2 border-[#3a9364] hover:border-[#4ade80] p-5 transition"
            style={{ boxShadow: "4px 4px 0 0 #2d7a50" }}
          >
            <div className="text-2xl mb-2">⚖️</div>
            <div className="text-[11px] font-['Press_Start_2P'] text-[#4ade80] mb-2">
              Classic judging
            </div>
            <p className="text-[9px] font-['Press_Start_2P'] text-gray-400 leading-relaxed">
              Invite judges (or judge yourself) and score each entry 1&ndash;10.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // ----- 2) Classic mode chosen. -----
  if (votingMode === "classic") {
    return (
      <div className={wrap} style={{ boxShadow: "6px 6px 0 0 #2d7a50", borderColor: "#3a9364" } as any}>
        <h2 className="text-sm font-['Press_Start_2P'] text-[#4ade80] mb-2">
          {">> Classic judging"}
        </h2>
        <p className="text-[10px] font-['Press_Start_2P'] text-gray-400 mb-5">
          Score entries 1&ndash;10 and crown a winner. Manage judge invites
          below.
        </p>
        <div className="flex flex-wrap gap-3">
          {context === "manage" && (
            <Link href={resultsHref} className={linkBtn}>
              Open results &amp; voting &rarr;
            </Link>
          )}
          {status === "voting" && (
            <button onClick={finish} className={secondaryBtn}>
              Finish game
            </button>
          )}
          <button
            onClick={() => setMode("participant")}
            className="px-4 py-3 font-['Press_Start_2P'] text-[8px] uppercase text-purple-300 hover:text-purple-200 transition underline"
          >
            Switch to participant voting
          </button>
        </div>
      </div>
    );
  }

  // ----- 3) Participant mode: guided stepper + actions. -----
  return (
    <div className={wrap} style={wrapShadow}>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className={heading + " mb-0"}>{">> Participant voting"}</h2>
        {status === "voting" && (
          <button
            onClick={() => setMode("classic")}
            className="text-[8px] font-['Press_Start_2P'] text-gray-500 hover:text-gray-300 transition underline"
          >
            switch to classic
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center gap-1 flex-1 last:flex-none">
            <div
              className={`px-3 py-2 font-['Press_Start_2P'] text-[8px] uppercase whitespace-nowrap border-2 ${
                i === activeStep
                  ? "bg-purple-600 text-white border-purple-400"
                  : i < activeStep
                  ? "bg-[#1a1a2e] text-[#4ade80] border-[#3a9364]"
                  : "bg-[#1a1a2e] text-gray-600 border-gray-700"
              }`}
            >
              {i < activeStep ? "✓ " : `${i + 1}. `}
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 min-w-[8px] ${
                  i < activeStep ? "bg-[#3a9364]" : "bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Phase: presentation */}
      {status === "voting" && activeStep === 0 && (
        <div>
          <p className="text-[10px] font-['Press_Start_2P'] text-gray-300 mb-5 leading-relaxed">
            Show every submission on the big screen — the code animates as it was
            typed, and you can flip to a large, readable code view.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => goPhase("voting")} className={primaryBtn}>
              Open voting &rarr;
            </button>
            {context === "manage" && (
              <Link href={resultsHref} className={linkBtn}>
                Open presenter view ↗
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Phase: voting */}
      {status === "voting" && activeStep === 1 && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="text-3xl font-['Press_Start_2P'] text-[#4ade80]">
              {voteStatus?.votedCount ?? 0}
              <span className="text-gray-600">/{voteStatus?.eligibleCount ?? 0}</span>
            </div>
            <div className="text-[9px] font-['Press_Start_2P'] text-gray-400 leading-relaxed">
              players have
              <br />
              voted so far
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => goPhase("reveal")} className={primaryBtn}>
              Close voting &amp; reveal &rarr;
            </button>
            <button onClick={() => goPhase("presentation")} className={secondaryBtn}>
              &larr; Back to present
            </button>
            {context === "manage" && (
              <Link href={resultsHref} className={linkBtn}>
                Cast your votes ↗
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Phase: reveal */}
      {status === "voting" && activeStep === 2 && (
        <div>
          <p className="text-[10px] font-['Press_Start_2P'] text-gray-300 mb-5 leading-relaxed">
            Reveal the podium 3&rarr;2&rarr;1 on the big screen, then finish the
            game to lock in the standings.
          </p>
          <div className="flex flex-wrap gap-3">
            {context === "manage" && (
              <Link href={resultsHref} className={primaryBtn + " no-underline"}>
                Open reveal screen ↗
              </Link>
            )}
            <button onClick={finish} className={context === "manage" ? secondaryBtn : primaryBtn}>
              Finish game 🏁
            </button>
            <button onClick={() => goPhase("voting")} className={secondaryBtn}>
              &larr; Reopen voting
            </button>
          </div>
        </div>
      )}

      {/* Finished */}
      {status === "finished" && (
        <div>
          <p className="text-[10px] font-['Press_Start_2P'] text-[#4ade80] mb-5">
            Voting complete — the standings are locked in.
          </p>
          {context === "manage" && (
            <Link href={resultsHref} className={linkBtn + " inline-block"}>
              View standings &rarr;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
