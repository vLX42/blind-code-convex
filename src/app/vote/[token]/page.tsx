"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../components/providers";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();
  const token = params.token as string;

  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedClaim, setHasAttemptedClaim] = useState(false);

  const tokenInfo = useQuery(api.voteTokens.getTokenInfo, { token });
  const claimToken = useMutation(api.voteTokens.claimVoteToken);

  // Get game info for redirect
  const game = useQuery(
    api.games.getGame,
    tokenInfo?.gameId ? { gameId: tokenInfo.gameId } : "skip"
  );

  // Auto-claim token when user is logged in
  useEffect(() => {
    const claim = async () => {
      // Wait for auth to load and user to be logged in
      if (authLoading || !user?.id || !tokenInfo || !game?.shortCode) return;

      // Don't claim twice
      if (isClaiming || hasAttemptedClaim) return;

      // If token is already claimed, just redirect (the claim mutation will handle if it's a different user)
      if (tokenInfo.isClaimed) {
        setIsClaiming(true);
        try {
          // Try to claim - if already claimed by this user, it will succeed
          // If claimed by another user, it will throw an error
          await claimToken({
            token,
            userId: user.id as Id<"users">,
          });
          router.push(`/results/${game.shortCode}`);
        } catch (err: any) {
          // If the token was already claimed by this user, we can still redirect
          if (err.message?.includes("already been claimed by another user")) {
            setError("This invite link has already been used by another judge.");
            setIsClaiming(false);
          } else {
            // Token was claimed by this same user, redirect
            router.push(`/results/${game.shortCode}`);
          }
        }
        setHasAttemptedClaim(true);
        return;
      }

      // Token not claimed yet - claim it
      setIsClaiming(true);
      setHasAttemptedClaim(true);
      try {
        await claimToken({
          token,
          userId: user.id as Id<"users">,
        });
        router.push(`/results/${game.shortCode}`);
      } catch (err: any) {
        setError(err.message || "Failed to claim vote token");
        setIsClaiming(false);
      }
    };

    claim();
  }, [user?.id, tokenInfo, game?.shortCode, authLoading, isClaiming, hasAttemptedClaim, token, claimToken, router]);

  // Loading state - token info or auth loading
  if (tokenInfo === undefined || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a12]">
        <div className="text-xl font-['Press_Start_2P'] text-[#4ade80] animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  // Invalid token
  if (tokenInfo === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a12] p-4">
        <div
          className="bg-[#0a0a12] border-4 border-[#ff6b6b] max-w-md w-full p-8 text-center"
          style={{ boxShadow: "8px 8px 0 0 #993333" }}
        >
          <div className="text-4xl mb-6">❌</div>
          <h1 className="text-sm font-['Press_Start_2P'] text-[#ff6b6b] mb-4">
            Invalid Token
          </h1>
          <p className="text-[10px] font-['Press_Start_2P'] text-gray-400 mb-6">
            This vote link is invalid or has been deactivated.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] font-['Press_Start_2P'] text-[10px] uppercase transition"
            style={{ boxShadow: "4px 4px 0 0 #2d7a50" }}
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a12] p-4">
        <div
          className="bg-[#0a0a12] border-4 border-[#ff6b6b] max-w-md w-full p-8 text-center"
          style={{ boxShadow: "8px 8px 0 0 #993333" }}
        >
          <div className="text-4xl mb-6">⚠️</div>
          <h1 className="text-sm font-['Press_Start_2P'] text-[#ff6b6b] mb-4">
            Error
          </h1>
          <p className="text-[10px] font-['Press_Start_2P'] text-gray-400 mb-6">
            {error}
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] font-['Press_Start_2P'] text-[10px] uppercase transition"
            style={{ boxShadow: "4px 4px 0 0 #2d7a50" }}
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // User is logged in and we're claiming/redirecting
  if (user && isClaiming) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a12]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#4ade80] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-[10px] font-['Press_Start_2P'] text-[#4ade80]">
            Redirecting to vote...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in - show login prompt
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a12] p-4">
      <div
        className="bg-[#0a0a12] border-4 border-[#3a9364] max-w-md w-full p-8"
        style={{ boxShadow: "8px 8px 0 0 #2d7a50" }}
      >
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🗳️</div>
          <h1
            className="text-lg font-['Press_Start_2P'] text-[#4ade80] mb-4"
            style={{ textShadow: "2px 2px 0 #2d7a50" }}
          >
            Judge Invite
          </h1>
          {tokenInfo.label && (
            <p className="text-[10px] font-['Press_Start_2P'] text-gray-400 mb-2">
              {tokenInfo.label}
            </p>
          )}
        </div>

        <div className="bg-[#1a1a2e] border-2 border-[#3a9364] p-4 mb-6">
          <p className="text-[8px] font-['Press_Start_2P'] text-gray-500 mb-2">
            Game
          </p>
          <p className="text-sm font-['Press_Start_2P'] text-[#4ade80]">
            {tokenInfo.gameTitle}
          </p>
          <p className="text-[8px] font-['Press_Start_2P'] text-gray-500 mt-3 mb-1">
            Status
          </p>
          <p
            className={`text-[10px] font-['Press_Start_2P'] ${
              tokenInfo.gameStatus === "voting"
                ? "text-purple-400"
                : tokenInfo.gameStatus === "active"
                ? "text-[#4ade80]"
                : "text-gray-400"
            }`}
          >
            {tokenInfo.gameStatus.toUpperCase()}
          </p>
        </div>

        {tokenInfo.isClaimed && (
          <p className="text-[10px] font-['Press_Start_2P'] text-yellow-400 mb-4 text-center">
            This invite has been claimed. Login to verify it&apos;s yours.
          </p>
        )}

        <p className="text-[10px] font-['Press_Start_2P'] text-gray-400 mb-6 text-center">
          Login with GitHub to vote on submissions
        </p>

        <button
          onClick={login}
          className="w-full px-6 py-4 bg-[#1a1a2e] hover:bg-[#2a2a4e] font-['Press_Start_2P'] text-[10px] uppercase transition border-2 border-gray-600 flex items-center justify-center gap-3"
          style={{ boxShadow: "4px 4px 0 0 #333" }}
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Login with GitHub
        </button>

        <p className="text-[8px] font-['Press_Start_2P'] text-gray-600 mt-6 text-center">
          You need to login to vote
        </p>
      </div>
    </div>
  );
}
