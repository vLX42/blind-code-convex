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
  // Extra image assets bundled with the template (besides the logo). Each is
  // uploaded and added as a game asset players can embed via /a/<code>.
  images?: Array<{
    name: string;
    url: string;
  }>;
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
      "A simplified 2008 Danish ferry company website. A logo header (no top navigation), a cream left-hand side menu, a white content area with an 'OM BORD' intro and a 2x2 grid of route cards (label bar matched to the image width), and a navy footer with a ship silhouette.",
    logoUrl: "/templates/dfds-seaways/logo.png",
    referenceImageUrl: "/templates/dfds-seaways/reference.png",
    colors: [
      { name: "DFDS Blue", hex: "#002D83" },
      { name: "Header Navy", hex: "#00466B" },
      { name: "Card Blue", hex: "#2A539D" },
      { name: "Light Blue", hex: "#B6D2E2" },
      { name: "Cream Sidebar", hex: "#EFECE2" },
      { name: "Sidebar Hover", hex: "#DAD4B5" },
      { name: "Tan Active", hex: "#DDC89D" },
      { name: "Body Gray", hex: "#666666" },
    ],
    fonts: ["Verdana", "Arial"],
    images: [
      { name: "København–Oslo photo", url: "/templates/dfds-seaways/kobenhavn-oslo.jpg" },
      { name: "Esbjerg–Harwich photo", url: "/templates/dfds-seaways/esbjerg-harwich.jpg" },
      { name: "Sommerliv photo", url: "/templates/dfds-seaways/sommerliv.jpg" },
      { name: "Amsterdam–Newcastle photo", url: "/templates/dfds-seaways/amsterdam-newcastle.jpg" },
    ],
    requirements: `Fonts:
- Verdana (with Arial fallback) — small body text, the 2008 corporate look

Layout (logo header, then side menu — no top navigation):
0. Header — just the DFDS Seaways logo on white, with a navy bottom border
1. Left sidebar (cream #EFECE2) — vertical menu: Forside, Bestil online, Rejser og
   priser, Om bord (active, navy), with sub-items København–Oslo,
   Esbjerg–Harwich (highlighted), Amsterdam–Newcastle, then Ruter og
   destinationer, Sejlplan, Konference, Job.
   Hover state: background #DAD4B5. Active item: navy #002D83 with white text.
2. Main content (white):
   • Navy "OM BORD" crumb bar + light-blue "Velkommen om bord store og små" bar
   • Intro paragraph + a bold italic note
   • A 2x2 grid of route cards — each card is the image width (200px): a blue
     label bar the SAME width as the photo, the photo, a heading, and links
     (Kahytter, Shopping, Underholdning, Sjov for børn, Spisning)
3. Footer — navy band with "Tlf: +45 3342 3082" and a ship silhouette

Colours:
• DFDS Blue (#002D83) — links, headings, active nav
• Footer Navy (#00466B)
• Card label blue (#2A539D)
• Light Blue (#B6D2E2) — welcome bar
• Cream (#EFECE2) — sidebar · Hover (#DAD4B5) · Active sub-item tan (#DDC89D)

Provided images: the 4 route-card photos are included as assets — embed with /a/<code>.`,
    structure: [
      "Logo header (no top nav)",
      "Left sidebar menu (cream)",
      "Main: OM BORD intro + note",
      "2x2 route cards (label = image width)",
      "Footer (phone + ship)",
    ],
  },
];
