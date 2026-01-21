# Blind Code - Code in the Dark

A multiplayer coding game where players have 15 minutes to recreate a website using only HTML and CSS - without seeing any preview! Inspired by [Code in the Dark](http://codeinthedark.com/).

## Features

- **GitHub Authentication** - Login with GitHub to create and manage games
- **Game Creation** - Upload reference images, provide color palettes, add asset URLs
- **Real-time Lobby** - Players join via short code, see who else is waiting
- **Blind Coding** - Pure HTML/CSS editor with streak counter and power mode
- **Progress Tracking** - Snapshots saved every 15 seconds for playback
- **Scoring System** - Points based on typing speed and streak combos
- **Voting & Results** - Judge submissions and reveal winners Kahoot-style!

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Backend**: Convex (real-time database)
- **Styling**: Tailwind CSS
- **Authentication**: GitHub OAuth
- **Editor**: Ace Editor

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- A Convex account (free at [convex.dev](https://convex.dev))
- A GitHub OAuth App

### Setup

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd blind-code-convex
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a Convex project:
   ```bash
   npx convex dev
   ```
   This will prompt you to create a new project and set up the database.

4. Set up GitHub OAuth:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create a new OAuth App
   - Set the callback URL to `http://localhost:3000/api/auth/callback`
   - Copy the Client ID and Client Secret

5. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in:
   - `NEXT_PUBLIC_CONVEX_URL` - From your Convex dashboard
   - `NEXT_PUBLIC_GITHUB_CLIENT_ID` - From GitHub OAuth App
   - `GITHUB_CLIENT_SECRET` - From GitHub OAuth App

6. Run the development server:
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## How to Play

### Creating a Game

1. Login with GitHub
2. Click "Create a Game"
3. Fill in the game details:
   - Title and description
   - Reference image URL (the target design)
   - Hex colors (hints for players)
   - Requirements (optional)
   - Duration (default 15 minutes)
4. Add any assets (images, fonts) players can use
5. Open the lobby and share the game code

### Joining a Game

1. Enter the game code at `/join`
2. Choose a display name
3. Wait in the lobby for the game to start

### Playing

1. When the game starts, you have the set duration to code
2. Write HTML and CSS to recreate the reference image
3. Build up streaks by typing without breaks
4. Reach 200+ streak for POWER MODE!
5. Click "Submit" when done (or auto-submit at time's up)

### Judging & Results

1. Game creator can view all submissions
2. Rate each submission 1-10
3. Select a winner
4. Reveal results Kahoot-style!

## Project Structure

```
blind-code-convex/
├── convex/           # Convex backend functions
│   ├── schema.ts     # Database schema
│   ├── auth.ts       # User authentication
│   ├── games.ts      # Game management
│   ├── players.ts    # Player management
│   ├── entries.ts    # Submissions & progress
│   ├── assets.ts     # Game assets
│   └── votes.ts      # Voting system
├── src/
│   ├── app/          # Next.js App Router pages
│   │   ├── page.tsx          # Home page
│   │   ├── join/             # Join game page
│   │   ├── game/[code]/      # Game lobby
│   │   ├── game/manage/[id]/ # Game management
│   │   ├── play/[code]/      # Game editor
│   │   └── results/[code]/   # Results page
│   ├── components/   # Reusable components
│   └── hooks/        # Custom React hooks
└── public/           # Static assets
```

## License

MIT
