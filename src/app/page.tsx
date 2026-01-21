"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./components/providers";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import Link from "next/link";
import { ImageUpload } from "@/components/upload";
import { useUploadThing } from "@/lib/uploadthing-client";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, login, logout } = useAuth();
  const [showCreateGame, setShowCreateGame] = useState(false);

  // Handle auth callback
  useEffect(() => {
    const authSuccess = searchParams.get("auth_success");
    const userData = searchParams.get("user");

    if (authSuccess && userData) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(userData));
        localStorage.setItem("blindcode_user", JSON.stringify(parsedUser));
        window.location.href = "/";
      } catch {
        console.error("Failed to parse user data");
      }
    }
  }, [searchParams]);

  // Get user's games if logged in
  const myGames = useQuery(
    api.games.getMyGames,
    user?.id ? { creatorId: user.id as Id<"users"> } : "skip"
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b-4 border-[#3a9364] bg-[#0a0a12] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-['Press_Start_2P'] text-[#4ade80]"
            style={{ textShadow: '2px 2px 0 #2d7a50' }}>
            BLIND CODE
          </h1>
          {user ? (
            <div className="flex items-center gap-4">
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-8 h-8 border-2 border-[#3a9364]"
                  style={{ imageRendering: 'pixelated' }}
                />
              )}
              <span className="text-[10px] font-['Press_Start_2P'] text-[#4ade80]">@{user.username}</span>
              <button
                onClick={logout}
                className="text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] hover:text-white transition uppercase"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#3a9364] px-4 py-2 border-2 border-[#3a9364] font-['Press_Start_2P'] text-[8px] uppercase transition-all"
              style={{ boxShadow: '3px 3px 0 0 #2d7a50' }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Login
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-6xl mx-auto px-4 py-20 text-center overflow-hidden">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        {/* Floating code snippets decoration */}
        <div className="absolute top-10 left-10 text-[#3a9364] opacity-20 font-mono text-xs hidden md:block animate-pulse">
          &lt;div class="hero"&gt;
        </div>
        <div className="absolute bottom-20 right-10 text-[#3a9364] opacity-20 font-mono text-xs hidden md:block animate-pulse">
          &lt;/div&gt;
        </div>
        <div className="absolute top-1/3 right-20 text-[#ff6b6b] opacity-15 font-mono text-xs hidden lg:block">
          color: ???;
        </div>

        <div className="relative z-10">
          {/* Tagline */}
          <p className="text-[8px] md:text-[10px] font-['Press_Start_2P'] text-[#0df] mb-6 tracking-widest uppercase arcade-flicker">
            The Ultimate Frontend Challenge
          </p>

          <h2 className="text-4xl md:text-6xl lg:text-7xl font-['Press_Start_2P'] mb-4 text-[#4ade80] leading-tight"
            style={{ textShadow: '6px 6px 0 #2d7a50, 0 0 40px rgba(74, 222, 128, 0.6)' }}>
            Blind Code
          </h2>

          <p className="text-[10px] md:text-xs font-['Press_Start_2P'] text-[#ff6b6b] mb-10">
            Inspired by Code in the Dark
          </p>

          {/* Main pitch */}
          <div className="max-w-3xl mx-auto mb-12">
            <p className="text-lg md:text-xl text-white mb-6 leading-relaxed">
              Can you recreate a website <span className="text-[#ff6b6b] font-bold">without seeing your code render?</span>
            </p>
            <p className="text-gray-400 leading-relaxed">
              Write HTML & CSS from a reference image. No preview. No dev tools. No peeking.
              <br className="hidden md:block" />
              Just raw coding skill under pressure.
            </p>
          </div>

          {/* Key stats/highlights */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-['Press_Start_2P'] text-[#0df]" style={{ textShadow: '0 0 20px rgba(0, 221, 255, 0.5)' }}>15</div>
              <div className="text-[8px] font-['Press_Start_2P'] text-gray-500 mt-1">MINUTES</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-['Press_Start_2P'] text-[#ff6b6b]" style={{ textShadow: '0 0 20px rgba(255, 107, 107, 0.5)' }}>0</div>
              <div className="text-[8px] font-['Press_Start_2P'] text-gray-500 mt-1">PREVIEWS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-['Press_Start_2P'] text-[#4ade80]" style={{ textShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}>∞</div>
              <div className="text-[8px] font-['Press_Start_2P'] text-gray-500 mt-1">FUN</div>
            </div>
          </div>

          {user ? (
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button
                onClick={() => setShowCreateGame(true)}
                className="group relative px-10 py-5 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] font-['Press_Start_2P'] text-xs uppercase transition-all"
                style={{ boxShadow: '6px 6px 0 0 #2d7a50, -3px -3px 0 0 #4ade80' }}
              >
                <span className="relative z-10">Create Game</span>
                <span className="absolute inset-0 bg-[#4ade80] opacity-0 group-hover:opacity-20 transition-opacity" />
              </button>
              <Link
                href="/join"
                className="px-10 py-5 bg-[#1a1a2e] hover:bg-[#2a2a4e] font-['Press_Start_2P'] text-xs uppercase border-2 border-[#3a9364] transition-all text-center hover:border-[#4ade80]"
                style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}
              >
                Join Game
              </Link>
            </div>
          ) : (
            <button
              onClick={login}
              className="group relative px-10 py-5 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] font-['Press_Start_2P'] text-sm uppercase transition-all"
              style={{ boxShadow: '6px 6px 0 0 #2d7a50, -3px -3px 0 0 #4ade80' }}
            >
              <span className="relative z-10">Start Playing</span>
            </button>
          )}
        </div>
      </section>

      {/* Perfect For Section */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#0a0a12] to-[#1a1a2e] border-y-4 border-[#3a9364] py-10 px-6">
          <h3 className="text-xs font-['Press_Start_2P'] text-center text-[#0df] mb-8">{">> Perfect For"}</h3>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {[
              { icon: "🎉", label: "Team Events" },
              { icon: "🏢", label: "Company Hackathons" },
              { icon: "🎓", label: "Coding Bootcamps" },
              { icon: "👥", label: "Meetups" },
              { icon: "🏆", label: "Competitions" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 bg-[#0a0a12] px-4 py-2 border border-[#3a9364]">
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-['Press_Start_2P'] text-gray-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* My Games Section */}
      {user && myGames && myGames.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h3 className="text-lg font-['Press_Start_2P'] mb-8 text-[#ff6b6b]"
            style={{ textShadow: '2px 2px 0 #993333' }}>
            {">> My Games"}
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {myGames.map((game) => (
              <div
                key={game._id}
                className="bg-[#0a0a12] border-4 border-[#3a9364] p-5 hover:border-[#4ade80] transition-all"
                style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-['Press_Start_2P'] text-xs text-[#4ade80]">{game.title}</h4>
                  <span
                    className={`font-['Press_Start_2P'] text-[8px] px-2 py-1 uppercase ${
                      game.status === "draft"
                        ? "bg-gray-700 text-gray-300"
                        : game.status === "lobby"
                          ? "bg-yellow-600 text-black"
                          : game.status === "active"
                            ? "bg-green-600 text-white"
                            : game.status === "voting"
                              ? "bg-purple-600 text-white"
                              : "bg-gray-600 text-white"
                    }`}
                  >
                    {game.status}
                  </span>
                </div>
                <p className="text-gray-400 text-xs line-clamp-2 mb-4">
                  {game.description}
                </p>
                <div className="text-[10px] text-gray-500 mb-4 font-['Press_Start_2P']">
                  Code: <span className="text-[#4ade80]">{game.shortCode}</span>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/game/manage/${game._id}`}
                    className="flex-1 text-center px-3 py-2 bg-[#1a1a2e] hover:bg-[#2a2a4e] text-[10px] font-['Press_Start_2P'] uppercase transition border border-[#3a9364]"
                  >
                    Manage
                  </Link>
                  {game.status === "draft" || game.status === "lobby" ? (
                    <Link
                      href={`/game/${game.shortCode}`}
                      className="flex-1 text-center px-3 py-2 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] text-[10px] font-['Press_Start_2P'] uppercase transition"
                    >
                      Open
                    </Link>
                  ) : game.status === "voting" || game.status === "finished" ? (
                    <Link
                      href={`/results/${game.shortCode}`}
                      className="flex-1 text-center px-3 py-2 bg-purple-600 hover:bg-purple-500 text-[10px] font-['Press_Start_2P'] uppercase transition"
                    >
                      Results
                    </Link>
                  ) : (
                    <Link
                      href={`/game/${game.shortCode}`}
                      className="flex-1 text-center px-3 py-2 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] text-[10px] font-['Press_Start_2P'] uppercase transition"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How it Works */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h3 className="text-lg font-['Press_Start_2P'] mb-4 text-center text-[#ff6b6b]"
          style={{ textShadow: '2px 2px 0 #993333' }}>
          {">> How it Works"}
        </h3>
        <p className="text-center text-gray-500 text-sm mb-12">Host your own blind coding competition in 3 simple steps</p>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="group text-center p-6 bg-[#0a0a12] border-4 border-[#3a9364] hover:border-[#4ade80] transition-all"
            style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
            <div className="w-20 h-20 bg-[#1a1a2e] border-4 border-[#4ade80] flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform"
              style={{ boxShadow: '4px 4px 0 0 #2d7a50' }}>
              <span className="text-2xl font-['Press_Start_2P'] text-[#4ade80]">1</span>
            </div>
            <h4 className="font-['Press_Start_2P'] text-sm mb-4 text-[#4ade80]">Create</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Upload a reference image of the design to recreate. Add color palettes and assets.
            </p>
            <p className="text-[10px] font-['Press_Start_2P'] text-[#0df]">Share the game code</p>
          </div>
          <div className="group text-center p-6 bg-[#0a0a12] border-4 border-[#3a9364] hover:border-[#ff6b6b] transition-all"
            style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
            <div className="w-20 h-20 bg-[#1a1a2e] border-4 border-[#ff6b6b] flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform"
              style={{ boxShadow: '4px 4px 0 0 #993333' }}>
              <span className="text-2xl font-['Press_Start_2P'] text-[#ff6b6b]">2</span>
            </div>
            <h4 className="font-['Press_Start_2P'] text-sm mb-4 text-[#ff6b6b]">Code Blind</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              15 minutes. Pure HTML & CSS. No preview allowed. Just you and your mental CSS rendering engine.
            </p>
            <p className="text-[10px] font-['Press_Start_2P'] text-[#ff6b6b]">The pressure is real</p>
          </div>
          <div className="group text-center p-6 bg-[#0a0a12] border-4 border-[#3a9364] hover:border-[#0df] transition-all"
            style={{ boxShadow: '6px 6px 0 0 #2d7a50' }}>
            <div className="w-20 h-20 bg-[#1a1a2e] border-4 border-[#0df] flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform"
              style={{ boxShadow: '4px 4px 0 0 #0099aa' }}>
              <span className="text-2xl font-['Press_Start_2P'] text-[#0df]">3</span>
            </div>
            <h4 className="font-['Press_Start_2P'] text-sm mb-4 text-[#0df]">Vote & Win</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Reveal all submissions. Vote for the best. Crown the winner Kahoot-style on the big screen!
            </p>
            <p className="text-[10px] font-['Press_Start_2P'] text-[#4ade80]">Epic moments guaranteed</p>
          </div>
        </div>
      </section>

      {/* Features/Why Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-sm font-['Press_Start_2P'] mb-6 text-[#ff6b6b]"
              style={{ textShadow: '2px 2px 0 #993333' }}>
              {">> Why Blind Code?"}
            </h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#3a9364] flex items-center justify-center shrink-0" style={{ boxShadow: '3px 3px 0 0 #2d7a50' }}>
                  <span className="text-lg">⚡</span>
                </div>
                <div>
                  <h4 className="font-['Press_Start_2P'] text-[10px] text-[#4ade80] mb-2">Test Real Skills</h4>
                  <p className="text-gray-400 text-sm">No copy-paste from StackOverflow. Pure CSS knowledge under pressure.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#3a9364] flex items-center justify-center shrink-0" style={{ boxShadow: '3px 3px 0 0 #2d7a50' }}>
                  <span className="text-lg">🎮</span>
                </div>
                <div>
                  <h4 className="font-['Press_Start_2P'] text-[10px] text-[#4ade80] mb-2">Addictively Fun</h4>
                  <p className="text-gray-400 text-sm">Combo streaks, power mode, live competition. Coding has never been this exciting.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#3a9364] flex items-center justify-center shrink-0" style={{ boxShadow: '3px 3px 0 0 #2d7a50' }}>
                  <span className="text-lg">🏆</span>
                </div>
                <div>
                  <h4 className="font-['Press_Start_2P'] text-[10px] text-[#4ade80] mb-2">Perfect for Events</h4>
                  <p className="text-gray-400 text-sm">Built for big screens. Live voting. Crowd cheering. Unforgettable moments.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-6" style={{ boxShadow: '8px 8px 0 0 #2d7a50' }}>
              <div className="text-[8px] font-['Press_Start_2P'] text-[#ff6b6b] mb-2">// Live from a Blind Code session</div>
              <div className="font-mono text-sm text-gray-300 space-y-1">
                <p><span className="text-[#ff6b6b]">&lt;div</span> <span className="text-[#4ade80]">class</span>=<span className="text-[#0df]">"container"</span><span className="text-[#ff6b6b]">&gt;</span></p>
                <p className="pl-4"><span className="text-[#ff6b6b]">&lt;h1&gt;</span>Wait, was it flex or grid?<span className="text-[#ff6b6b]">&lt;/h1&gt;</span></p>
                <p className="pl-4"><span className="text-gray-500">/* I think margin: auto works... */</span></p>
                <p className="pl-4"><span className="text-[#ff6b6b]">&lt;p&gt;</span>Please be centered...<span className="text-[#ff6b6b]">&lt;/p&gt;</span></p>
                <p><span className="text-[#ff6b6b]">&lt;/div&gt;</span></p>
              </div>
              <div className="mt-4 text-right">
                <span className="text-[8px] font-['Press_Start_2P'] text-[#4ade80] animate-pulse">█ Cursor blinking</span>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#ff6b6b]" style={{ boxShadow: '2px 2px 0 0 #993333' }} />
            <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-[#4ade80]" style={{ boxShadow: '2px 2px 0 0 #2d7a50' }} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#0a0a12] mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[8px] font-['Press_Start_2P'] text-gray-600">
            Built for fun by Peter Biro
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/vLX42/blind-code-convex"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-xs hidden sm:inline">Source</span>
            </a>
            <a
              href="https://www.linkedin.com/in/vlx42/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-500 hover:text-[#0077b5] transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              <span className="text-xs hidden sm:inline">LinkedIn</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Create Game Modal */}
      {showCreateGame && (
        <CreateGameModal onClose={() => setShowCreateGame(false)} />
      )}
    </div>
  );
}

type PendingAsset = {
  name: string;
  url: string;
  type: "image" | "font" | "other";
};

function CreateGameModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const createGame = useMutation(api.games.createGame);
  const addAsset = useMutation(api.assets.addAsset);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [hexColors, setHexColors] = useState<{ name: string; hex: string }[]>([
    { name: "", hex: "" },
  ]);
  const [requirements, setRequirements] = useState("");
  const [duration, setDuration] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Asset upload state
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] = useState<"image" | "font" | "other">("image");
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const assetFileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload: startAssetUpload } = useUploadThing("gameAsset", {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.url) {
        handleAssetUploaded(res[0].url);
      }
      setIsUploadingAsset(false);
    },
    onUploadError: (error) => {
      alert(`Upload failed: ${error.message}`);
      setIsUploadingAsset(false);
    },
  });

  const handleAssetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newAssetName.trim()) {
      alert("Please enter an asset name first");
      if (assetFileInputRef.current) {
        assetFileInputRef.current.value = "";
      }
      return;
    }

    setIsUploadingAsset(true);
    await startAssetUpload([file]);

    if (assetFileInputRef.current) {
      assetFileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!referenceImageUrl) {
      alert("Please upload a reference image");
      return;
    }

    setIsSubmitting(true);
    try {
      const gameId = await createGame({
        creatorId: user.id as Id<"users">,
        title,
        description,
        referenceImageUrl,
        hexColors: hexColors.filter((c) => c.name.trim() !== "" && c.hex.trim() !== ""),
        requirements: requirements || undefined,
        durationMinutes: duration,
      });

      // Add all pending assets
      for (const asset of pendingAssets) {
        await addAsset({
          gameId,
          name: asset.name,
          url: asset.url,
          type: asset.type,
        });
      }

      router.push(`/game/manage/${gameId}`);
    } catch (error) {
      console.error("Failed to create game:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssetUploaded = (url: string) => {
    if (!newAssetName.trim()) return;
    setPendingAssets([
      ...pendingAssets,
      { name: newAssetName.trim(), url, type: newAssetType },
    ]);
    setNewAssetName("");
  };

  const removeAsset = (index: number) => {
    setPendingAssets(pendingAssets.filter((_, i) => i !== index));
  };

  const addColor = () => setHexColors([...hexColors, { name: "", hex: "" }]);
  const updateColorName = (index: number, name: string) => {
    const newColors = [...hexColors];
    const color = newColors[index];
    if (color) {
      newColors[index] = { ...color, name };
      setHexColors(newColors);
    }
  };
  const updateColorHex = (index: number, hex: string) => {
    const newColors = [...hexColors];
    const color = newColors[index];
    if (color) {
      newColors[index] = { ...color, hex };
      setHexColors(newColors);
    }
  };
  const removeColor = (index: number) => {
    setHexColors(hexColors.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a12] max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-[#3a9364]"
        style={{ boxShadow: '8px 8px 0 0 #2d7a50, -4px -4px 0 0 #4ade80' }}>
        <div className="p-6 border-b-4 border-[#3a9364] flex items-center justify-between bg-[#1a1a2e]">
          <h2 className="text-sm font-['Press_Start_2P'] text-[#4ade80]">{">> New Game"}</h2>
          <button
            onClick={onClose}
            className="text-[#ff6b6b] hover:text-white font-['Press_Start_2P'] text-sm px-3 py-1 bg-[#0a0a12] border-2 border-[#ff6b6b] hover:bg-[#ff6b6b] transition-all"
          >
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] mb-3">Game Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
              placeholder="My Awesome Challenge"
            />
          </div>

          <div>
            <label className="block text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] mb-3">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
              placeholder="Describe what players need to recreate..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] mb-3">
              Reference Image
            </label>
            <ImageUpload
              endpoint="referenceImage"
              onUploadComplete={setReferenceImageUrl}
              currentImage={referenceImageUrl}
            />
          </div>

          <div>
            <label className="block text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] mb-3">
              Color Palette
            </label>
            <div className="space-y-3">
              {hexColors.map((color, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={color.name}
                    onChange={(e) => updateColorName(index, e.target.value)}
                    className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    placeholder="Background"
                  />
                  <input
                    type="text"
                    value={color.hex}
                    onChange={(e) => updateColorHex(index, e.target.value)}
                    className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-500"
                    placeholder="#FF5733"
                  />
                  {color.hex && (
                    <div
                      className="w-10 h-10 rounded border border-gray-700 shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                  )}
                  {hexColors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeColor(index)}
                      className="text-red-400 hover:text-red-300 px-2 shrink-0"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addColor}
                className="text-sm text-green-400 hover:text-green-300"
              >
                + Add Color
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] mb-3">
              Requirements
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
              placeholder="Must include a header, nav, and footer..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] mb-3">
              Assets
            </label>
            <p className="text-[8px] text-gray-500 mb-3 font-['Press_Start_2P']">
              Upload images/fonts for players
            </p>

            {/* Pending assets list */}
            {pendingAssets.length > 0 && (
              <div className="space-y-2 mb-4">
                {pendingAssets.map((asset, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{asset.name}</span>
                      <span className="text-xs text-gray-500">{asset.type}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAsset(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add asset form */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="Asset name"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
              <select
                value={newAssetType}
                onChange={(e) => setNewAssetType(e.target.value as "image" | "font" | "other")}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                <option value="image">Image</option>
                <option value="font">Font</option>
                <option value="other">Other</option>
              </select>
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg cursor-pointer text-sm transition">
                <input
                  ref={assetFileInputRef}
                  type="file"
                  onChange={handleAssetFileChange}
                  className="hidden"
                  disabled={isUploadingAsset}
                />
                {isUploadingAsset ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Choose File</span>
                )}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-['Press_Start_2P'] text-[#ff6b6b] mb-3">
              Duration (min)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={5}
              max={60}
              className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500"
            />
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-[#1a1a2e] hover:bg-[#2a2a4e] font-['Press_Start_2P'] text-[10px] uppercase transition border-2 border-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] font-['Press_Start_2P'] text-[10px] uppercase transition disabled:opacity-50 disabled:hover:bg-[#3a9364] disabled:hover:text-white"
              style={{ boxShadow: '4px 4px 0 0 #2d7a50' }}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-xl animate-pulse">Loading...</div></div>}>
      <HomeContent />
    </Suspense>
  );
}
