"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../components/providers";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";

export default function GameLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { user, login } = useAuth();
  const code = params.code as string;

  const [handle, setHandle] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const game = useQuery(api.games.getGameByShortCode, { shortCode: code });
  const players = useQuery(
    api.players.getGamePlayers,
    game?._id ? { gameId: game._id } : "skip"
  );
  const assets = useQuery(
    api.assets.getGameAssets,
    game?._id ? { gameId: game._id } : "skip"
  );

  const joinGame = useMutation(api.players.joinGame);

  // Check if user already joined
  const existingPlayer = players?.find(
    (p) => p.userId === (user?.id as Id<"users">)
  );

  useEffect(() => {
    if (existingPlayer) {
      setHasJoined(true);
      setHandle(existingPlayer.handle);
    }
  }, [existingPlayer]);

  // Redirect to play page when game starts
  useEffect(() => {
    if (game?.status === "active" && hasJoined) {
      router.push(`/play/${code}`);
    }
    if (game?.status === "voting" || game?.status === "finished") {
      router.push(`/results/${code}`);
    }
  }, [game?.status, hasJoined, code, router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game?._id || !handle.trim()) return;

    setIsJoining(true);
    try {
      const playerId = await joinGame({
        gameId: game._id,
        userId: user?.id as Id<"users"> | undefined,
        handle: handle.trim(),
      });
      // Store playerId as backup (works even if user logs out later)
      if (playerId) {
        localStorage.setItem(`blindcode_player_${code}`, playerId);
      }
      setHasJoined(true);
    } catch (error) {
      console.error("Failed to join game:", error);
    } finally {
      setIsJoining(false);
    }
  };

  if (game === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (game === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a12]">
        <div className="text-center p-8 border-4 border-[#ff6b6b]"
          style={{ boxShadow: '6px 6px 0 0 #993333' }}>
          <h1 className="text-lg font-['Press_Start_2P'] mb-4 text-[#ff6b6b]">Game Not Found</h1>
          <p className="text-[10px] font-['Press_Start_2P'] text-gray-400 mb-6">
            Code "{code}" not found
          </p>
          <Link
            href="/join"
            className="inline-block px-6 py-3 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] font-['Press_Start_2P'] text-[10px] uppercase transition-all"
            style={{ boxShadow: '4px 4px 0 0 #2d7a50' }}
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  const isCreator = user?.id === game.creatorId;

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Header */}
      <header className="border-b-4 border-[#3a9364] bg-[#0a0a12]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-['Press_Start_2P'] text-[#4ade80]"
            style={{ textShadow: '2px 2px 0 #2d7a50' }}
          >
            BLIND CODE
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-['Press_Start_2P'] text-gray-400">
              Code: <span className="text-[#4ade80]">{code}</span>
            </span>
            {isCreator && (
              <Link
                href={`/game/manage/${game._id}`}
                className="text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] hover:text-white uppercase"
              >
                Manage
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Game Info */}
        <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-6 mb-6"
          style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-sm font-['Press_Start_2P'] text-[#4ade80]">{game.title}</h1>
            <span
              className={`px-3 py-1 text-[8px] font-['Press_Start_2P'] uppercase ${
                game.status === "lobby"
                  ? "bg-yellow-600 text-black"
                  : game.status === "draft"
                    ? "bg-gray-600"
                    : "bg-[#3a9364]"
              }`}
            >
              {game.status === "lobby" ? "Waiting..." : game.status}
            </span>
          </div>
          <p className="text-gray-400 text-xs mb-4 whitespace-pre-wrap">{game.description}</p>
          <div className="flex items-center gap-6 text-[10px] font-['Press_Start_2P'] text-gray-500">
            <span><span className="text-[#ff6b6b]">Time:</span> {game.durationMinutes}min</span>
            <span><span className="text-[#ff6b6b]">Players:</span> {players?.filter((p) => p.isActive).length || 0}</span>
          </div>
        </div>

        {/* Join Section - Moved to top for visibility */}
        {game.status === "lobby" && !hasJoined && (
          <div className="bg-[#0a0a12] border-4 border-[#4ade80] p-6 mb-8"
            style={{ boxShadow: '6px 6px 0 0 #2d7a50, 0 0 20px rgba(74, 222, 128, 0.3)' }}>
            <h2 className="text-sm font-['Press_Start_2P'] mb-4 text-[#4ade80]">{">> Enter Your Name"}</h2>
            <form onSubmit={handleJoin} className="flex gap-4 mb-4">
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="Your name"
                required
                autoFocus
                className="flex-1 bg-[#1a1a2e] border-4 border-[#3a9364] px-4 py-3 focus:outline-none focus:border-[#4ade80] font-['Press_Start_2P'] text-sm text-[#4ade80]"
                style={{ boxShadow: 'inset 3px 3px 0 0 #0a0a12' }}
              />
              <button
                type="submit"
                disabled={isJoining || !handle.trim()}
                className="px-8 py-3 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] font-['Press_Start_2P'] text-xs uppercase transition-all disabled:opacity-50"
                style={{ boxShadow: '4px 4px 0 0 #2d7a50' }}
              >
                {isJoining ? "..." : "Join"}
              </button>
            </form>
            {!user && (
              <div className="flex items-center gap-3 text-[8px] text-gray-500">
                <span>Optional:</span>
                <button
                  onClick={login}
                  className="flex items-center gap-2 hover:text-[#4ade80] transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Login with GitHub to save progress
                </button>
              </div>
            )}
          </div>
        )}

        {/* Waiting Room */}
        {hasJoined && game.status === "lobby" && (
          <div className="bg-[#0a0a12] border-4 border-[#4ade80] p-6 mb-8 text-center"
            style={{ boxShadow: '6px 6px 0 0 #2d7a50, 0 0 30px rgba(74, 222, 128, 0.3)' }}>
            <div className="text-2xl font-['Press_Start_2P'] mb-4 text-[#4ade80] arcade-flicker">...</div>
            <h2 className="text-sm font-['Press_Start_2P'] mb-3 text-[#4ade80]">
              Ready!
            </h2>
            <p className="text-[10px] font-['Press_Start_2P'] text-gray-400">
              Playing as <span className="text-[#4ade80]">{handle}</span>
            </p>
          </div>
        )}

        {/* Reference Image Preview - Hidden until game starts */}
        <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-6 mb-8"
          style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
          <h2 className="text-xs font-['Press_Start_2P'] mb-4 text-[#ff6b6b]">{">> Target"}</h2>
          <div className="aspect-video bg-[#1a1a2e] border-4 border-[#3a9364] overflow-hidden flex items-center justify-center"
            style={{ boxShadow: 'inset 4px 4px 0 0 #0a0a12' }}>
            {game.status === "active" ? (
              <img
                src={game.referenceImageUrl}
                alt="Target"
                className="max-w-full max-h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="text-center p-8">
                <div className="text-4xl mb-4">🔒</div>
                <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">
                  Revealed when game starts
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Colors & Assets - Only shown after game starts */}
        {game.status === "active" && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Colors */}
            <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-6"
              style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
              <h2 className="text-xs font-['Press_Start_2P'] mb-4 text-[#ff6b6b]">{">> Colors"}</h2>
              <div className="flex flex-wrap gap-3">
                {game.hexColors.map((color, index) => (
                  <div key={index} className="flex items-center gap-3 bg-[#1a1a2e] px-3 py-2 border-2 border-[#3a9364]"
                    style={{ boxShadow: '3px 3px 0 0 #2d7a50' }}>
                    <div
                      className="w-6 h-6 border-2 border-white"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-['Press_Start_2P'] text-[#4ade80]">{color.name}</span>
                      <code className="text-[10px] font-bold text-white">{color.hex}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assets */}
            <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-6"
              style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
              <h2 className="text-xs font-['Press_Start_2P'] mb-4 text-[#ff6b6b]">{">> Assets"}</h2>
              {assets && assets.length > 0 ? (
                <div className="space-y-2">
                  {assets.map((asset) => (
                    <div
                      key={asset._id}
                      className="flex items-center justify-between bg-[#1a1a2e] px-3 py-2 border-2 border-[#3a9364]"
                    >
                      <span className="text-xs text-white">{asset.name}</span>
                      {asset.type === "font" ? (
                        <span className="text-[8px] font-['Press_Start_2P'] text-purple-400">
                          Auto-loaded
                        </span>
                      ) : (
                        <code className="text-[10px] font-['Press_Start_2P'] text-[#4ade80]">
                          /a/{asset.shortCode}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">No assets</p>
              )}
            </div>
          </div>
        )}

        {/* Requirements */}
        {game.requirements && (
          <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-6 mb-8"
            style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
            <h2 className="text-xs font-['Press_Start_2P'] mb-4 text-[#ff6b6b]">{">> Requirements"}</h2>
            <p className="text-gray-400 text-xs whitespace-pre-wrap pl-4 border-l-4 border-[#3a9364]">
              {game.requirements}
            </p>
          </div>
        )}

        {/* Players List */}
        <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-6"
          style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
          <h2 className="text-xs font-['Press_Start_2P'] mb-4 text-[#ff6b6b]">
            {">> Players"} <span className="text-[#4ade80]">({players?.filter((p) => p.isActive).length || 0})</span>
          </h2>
          {players && players.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {players
                .filter((p) => p.isActive)
                .map((player) => (
                  <div
                    key={player._id}
                    className={`bg-[#1a1a2e] px-4 py-3 flex items-center gap-3 border-2 ${
                      player.userId === (user?.id as Id<"users">)
                        ? "border-[#4ade80]"
                        : "border-[#3a9364]"
                    }`}
                    style={{ boxShadow: '3px 3px 0 0 #2d7a50' }}
                  >
                    {player.user?.avatarUrl ? (
                      <img
                        src={player.user.avatarUrl}
                        alt={player.handle}
                        className="w-8 h-8 border-2 border-[#3a9364]"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="w-8 h-8 bg-[#3a9364] flex items-center justify-center text-xs font-['Press_Start_2P'] text-[#0a0a12]">
                        {player.handle[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10px] font-['Press_Start_2P'] truncate text-white">{player.handle}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-[10px] font-['Press_Start_2P'] text-gray-500">No players yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
