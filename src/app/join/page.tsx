"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError("Please enter a valid game code");
      return;
    }
    router.push(`/game/${code.trim().toLowerCase()}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-[#3a9364] bg-[#0a0a12]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-['Press_Start_2P'] text-[#4ade80]"
            style={{ textShadow: '2px 2px 0 #2d7a50' }}>
            BLIND CODE
          </Link>
        </div>
      </header>

      {/* Join Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-[#0a0a12] border-4 border-[#3a9364] p-8 max-w-md w-full"
          style={{ boxShadow: '8px 8px 0 0 #2d7a50, -4px -4px 0 0 #4ade80' }}>
          <h1 className="text-xl font-['Press_Start_2P'] mb-8 text-center text-[#4ade80]"
            style={{ textShadow: '2px 2px 0 #2d7a50' }}>
            {">> Join Game"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-['Press_Start_2P'] mb-3 text-[#ff6b6b]">
                Game Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                className="w-full bg-[#1a1a2e] border-4 border-[#3a9364] px-4 py-4 text-2xl text-center font-['Press_Start_2P'] tracking-widest focus:outline-none focus:border-[#4ade80] uppercase text-[#4ade80]"
                style={{ boxShadow: 'inset 4px 4px 0 0 #0a0a12' }}
                placeholder="ABC123"
                maxLength={10}
                autoFocus
              />
              {error && (
                <p className="mt-3 text-[10px] font-['Press_Start_2P'] text-[#ff6b6b]">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full px-4 py-4 bg-[#3a9364] hover:bg-[#4ade80] hover:text-[#0a0a12] font-['Press_Start_2P'] text-xs uppercase transition-all"
              style={{ boxShadow: '4px 4px 0 0 #2d7a50, -2px -2px 0 0 #4ade80' }}
            >
              Enter
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[8px] font-['Press_Start_2P'] text-gray-500">
              Enter the code shared by host
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
