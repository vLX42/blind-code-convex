"use client";

import { useEffect, useState } from "react";

interface AssetRefProps {
  shortCode: string;
  url: string;
  type: string;
}

// Shows an asset's "/a/<code>" reference as a click-to-copy chip, plus an (i)
// info icon that reveals the image's pixel resolution on hover.
export function AssetRef({ shortCode, url, type }: AssetRefProps) {
  const path = `/a/${shortCode}`;
  const [copied, setCopied] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // Load the image once to read its natural resolution.
  useEffect(() => {
    if (type !== "image") return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url, type]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable (e.g. insecure context) — ignore
    }
  };

  return (
    <span className="inline-flex items-center gap-2 align-middle">
      <button
        type="button"
        onClick={copy}
        title="Click to copy"
        className="group inline-flex items-center gap-1 text-[10px] font-['Press_Start_2P'] text-[#0df] bg-[#0a0a12] px-2 py-1 border border-[#0df] hover:bg-[#0df] hover:text-[#0a0a12] transition"
      >
        <code>{path}</code>
        <span className="opacity-70 group-hover:opacity-100">
          {copied ? "✓" : "⧉"}
        </span>
      </button>
      {copied && (
        <span className="text-[8px] font-['Press_Start_2P'] text-[#4ade80]">
          Copied!
        </span>
      )}
      {type === "image" && (
        <span className="relative group inline-flex">
          <span className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-gray-500 text-gray-400 text-[9px] cursor-help leading-none">
            i
          </span>
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block whitespace-nowrap bg-[#0a0a12] border border-[#3a9364] text-[#4ade80] text-[8px] font-['Press_Start_2P'] px-2 py-1 z-50">
            {dims ? `${dims.w} × ${dims.h}px` : "loading…"}
          </span>
        </span>
      )}
    </span>
  );
}
