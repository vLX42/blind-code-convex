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
  {
    id: "dfds-seaways",
    name: "DFDS Seaways",
    description:
      "A classic 2008 Danish ferry company website. Navy header with logo and search, a cream left-hand nav menu, a white content area with an 'OM BORD' intro and a 2x2 grid of route cards, and a navy footer with a ship silhouette.",
    logoUrl: "/templates/dfds-seaways/logo.png",
    referenceImageUrl: "/templates/dfds-seaways/reference.png",
    colors: [
      { name: "DFDS Blue", hex: "#002D83" },
      { name: "Header Navy", hex: "#00466B" },
      { name: "Light Blue", hex: "#B6D2E2" },
      { name: "Cream Sidebar", hex: "#EFECE2" },
      { name: "Tan Highlight", hex: "#DDC89D" },
      { name: "Body Gray", hex: "#666666" },
      { name: "White", hex: "#FFFFFF" },
    ],
    fonts: ["Verdana", "Arial"],
    requirements: `Fonts:
- Verdana (with Arial fallback) — small body text, the 2008 corporate look

Layout (fixed width, centred on a light-blue page):
1. Header — navy band with the DFDS Seaways logo (left) and a search box (right)
2. Secondary nav bar (light blue) with top links
3. Left sidebar (cream) — vertical menu: Forside, Bestil online, Rejser og priser,
   Om bord (active, with sub-items), Ruter og destinationer, Sejlplan, Konference, Job
4. Main content (white):
   • Blue bar heading "OM BORD" + "Velkommen om bord store og små"
   • Intro paragraph + a bold italic note
   • A 2x2 grid of route cards, each with a light-blue label bar, a photo, a
     heading, and links (Kahytter, Shopping, Underholdning, Sjov for børn, Spisning)
5. Footer — navy band with "Tlf: +45 3342 3082" and a ship silhouette

Colours:
• DFDS Blue (#002D83) — logo, links, headings
• Header/Footer Navy (#00466B)
• Light Blue (#B6D2E2) — card / section label bars
• Cream (#EFECE2) — left sidebar
• Tan (#DDC89D) — active sub-nav item
• Body text gray (#666666)`,
    structure: [
      "Header (logo + search)",
      "Secondary nav bar",
      "Left sidebar menu (cream)",
      "Main: OM BORD intro",
      "2x2 grid of route cards",
      "Footer (phone + ship)",
    ],
  },
];
