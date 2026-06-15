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
      "A simplified 2008 Danish ferry company website with its period look: the original DFDS Seaways logo banner (no top nav), a cream left-hand side menu, and a white content area with an orange 'Om bord' breadcrumb, an 'OM BORD' intro, and a 2x2 grid of route cards (pale-blue label bar matched to the image width, with a single caption line under each photo). No footer.",
    logoUrl: "/templates/dfds-seaways/logo.png",
    referenceImageUrl: "/templates/dfds-seaways/reference.png",
    colors: [
      { name: "DFDS Blue", hex: "#002D83" },
      { name: "Navy", hex: "#00466B" },
      { name: "Card Label", hex: "#B8CFDE" },
      { name: "Light Blue", hex: "#B6D2E2" },
      { name: "Cream Sidebar", hex: "#EFECE2" },
      { name: "Sidebar Hover", hex: "#DAD4B5" },
      { name: "Tan Active", hex: "#DDC89D" },
      { name: "Accent Orange", hex: "#CC8A1E" },
      { name: "Body Gray", hex: "#666666" },
    ],
    fonts: ["Verdana", "Arial"],
    images: [
      { name: "København–Oslo photo", url: "/templates/dfds-seaways/kobenhavn-oslo.jpg" },
      { name: "Esbjerg–Harwich photo", url: "/templates/dfds-seaways/esbjerg-harwich.jpg" },
      { name: "Sommerliv photo", url: "/templates/dfds-seaways/sommerliv.jpg" },
      { name: "Amsterdam–Newcastle photo", url: "/templates/dfds-seaways/amsterdam-newcastle.jpg" },
    ],
    requirements: `FONTS
Verdana, with Arial fallback, small sizes (~11px). Keep the dated 2008 look: flat colours, low contrast, tight spacing — don't over-polish it.

LAYOUT
Logo banner on top, then a side menu. No top navigation.

Header
- The original DFDS Seaways logo banner, full width. No nav, no search.

Side menu (cream #EFECE2)
- Items: Forside, Bestil online, Rejser og priser, Om bord, Ruter og destinationer, Sejlplan, Konference, Job
- "Om bord" is active (navy #002D83) with sub-items: København–Oslo, Esbjerg–Harwich (highlighted), Amsterdam–Newcastle
- Hover background #DAD4B5. Active sub-item tan #DDC89D.

Main content (white)
- Orange "Om bord" breadcrumb (#CC8A1E)
- Pale-blue "Velkommen om bord store og små" bar (#B6D2E2, muted steel-blue text)
- Intro paragraph, then a bold italic note (#00466B)
- A 2×2 grid of route cards. Each card is the image width (200px): a pale steel-blue label bar (#B8CFDE, white text) the same width as the photo, then the photo, then one caption line. No link lists.
- No footer.

ASSETS
The 4 route-card photos are provided — embed them with /a/<code>.`,
    structure: [
      "Logo header (no top nav)",
      "Left sidebar menu (cream)",
      "Main: OM BORD intro + note",
      "2x2 route cards (label = image width, one caption line)",
    ],
  },
];
