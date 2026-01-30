"use client";

import { useState, useMemo } from "react";

// Popular Google Fonts list
const POPULAR_FONTS = [
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Source Sans Pro",
  "Raleway",
  "PT Sans",
  "Merriweather",
  "Roboto Condensed",
  "Ubuntu",
  "Playfair Display",
  "Poppins",
  "Noto Sans",
  "Rubik",
  "Inter",
  "Work Sans",
  "Nunito",
  "Cabin",
  "Quicksand",
  "Karla",
  "Bebas Neue",
  "Josefin Sans",
  "Pacifico",
  "Dancing Script",
  "Lobster",
  "Press Start 2P",
  "Courier Prime",
  "Space Mono",
  "JetBrains Mono",
  "Fira Code",
  "Source Code Pro",
  "Inconsolata",
  "IBM Plex Mono",
].sort();

interface GoogleFontSelectorProps {
  onSelect: (fontName: string, fontUrl: string) => void;
  disabled?: boolean;
}

export function GoogleFontSelector({ onSelect, disabled }: GoogleFontSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFont, setSelectedFont] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredFonts = useMemo(() => {
    return POPULAR_FONTS.filter((font) =>
      font.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleFontSelect = (fontName: string) => {
    setSelectedFont(fontName);
    setSearchTerm(fontName);
    setIsOpen(false);

    // Generate Google Fonts URL
    const fontFamily = fontName.replace(/ /g, "+");
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;700&display=swap`;

    onSelect(fontName, fontUrl);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search Google Fonts..."
          disabled={disabled}
          className="flex-1 bg-[#1a1a2e] border-2 border-[#3a9364] px-4 py-2 text-sm focus:outline-none focus:border-[#4ade80] disabled:opacity-50"
        />
        {selectedFont && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedFont("");
              setIsOpen(false);
            }}
            disabled={disabled}
            className="px-3 py-2 bg-[#ff6b6b] hover:bg-[#ff5252] text-white text-xs disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && filteredFonts.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-[#1a1a2e] border-2 border-[#3a9364] max-h-60 overflow-y-auto">
          {filteredFonts.map((font) => (
            <button
              key={font}
              onClick={() => handleFontSelect(font)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-[#3a9364] transition"
              style={{ fontFamily: font }}
            >
              {font}
            </button>
          ))}
        </div>
      )}

      {/* Preview */}
      {selectedFont && (
        <div className="mt-2 p-3 bg-[#1a1a2e] border border-[#3a9364]">
          <link
            href={`https://fonts.googleapis.com/css2?family=${selectedFont.replace(/ /g, "+")}&display=swap`}
            rel="stylesheet"
          />
          <p className="text-xs text-gray-400 mb-1">Preview:</p>
          <p
            className="text-lg"
            style={{ fontFamily: selectedFont }}
          >
            The quick brown fox jumps over the lazy dog
          </p>
          <p
            className="text-sm text-gray-400"
            style={{ fontFamily: selectedFont }}
          >
            ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
          </p>
        </div>
      )}
    </div>
  );
}
