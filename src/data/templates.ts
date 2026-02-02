export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  referenceImageUrl: string;
  colors: Array<{
    name: string;
    hex: string;
  }>;
  fonts: string[];
  requirements?: string;
  structure: string[];
}

export const gameTemplates: GameTemplate[] = [
  {
    id: "woodman-inc",
    name: "Woodman Inc.",
    description: "A classic woodworking company website with warm brown tones and elegant typography. Features a hero section, service cards with emojis, and a professional layout.",
    logoUrl: "/templates/woodman-inc/logo.png",
    referenceImageUrl: "/templates/woodman-inc/reference.png",
    colors: [
      { name: "Cream", hex: "#FDF8F3" },
      { name: "Dark Brown", hex: "#5C3D2E" },
      { name: "Medium Brown", hex: "#8B5E3C" },
      { name: "White", hex: "#FFFFFF" },
    ],
    fonts: ["Georgia"],
    requirements: `Emojis Used:
• Custom Furniture: 🪑 (chair)
• Home Repairs: 🔨 (hammer)
• Restoration: ✨ (sparkles)

Structure:
1. Header (logo + nav)
2. Hero (headline + 2 buttons)
3. Services (3 cards with emojis)
4. Footer`,
    structure: [
      "Header (logo + nav)",
      "Hero (headline + 2 buttons)",
      "Services (3 cards with emojis)",
      "Footer",
    ],
  },
];
