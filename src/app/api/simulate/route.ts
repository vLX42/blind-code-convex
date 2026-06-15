import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

// Test/demo endpoint: spins up a full game, has N simulated clients join and
// "type" + submit entries, then runs a participant voting round. Returns a JSON
// summary with links you can open to watch the result.
//
//   GET/POST /api/simulate?players=10&advance=reveal[&key=<SIMULATE_SECRET>]
//
//   players  2..50   how many simulated clients (default 10)
//   advance  voting | reveal | finished   how far to take it (default reveal)
//
// If SIMULATE_SECRET is set in the environment, ?key= must match it.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HANDLES = [
  "Ada", "Linus", "Grace", "Dennis", "Margaret", "Alan", "Katherine",
  "Tim", "Barbara", "Guido", "Radia", "Bjarne", "Hedy", "Donald", "Anita",
  "Ken", "Brian", "Joan", "James", "Shafi",
];

// A few distinct mini-pages so each client "enters" something different.
function entryHtml(i: number, handle: string): string {
  const hues = [210, 12, 140, 280, 45, 330, 190, 95, 260, 20];
  const hue = hues[i % hues.length];
  return [
    `<div style="font-family:sans-serif;background:hsl(${hue},60%,12%);color:#fff;padding:40px;text-align:center">`,
    `<h1 style="margin:0;color:hsl(${hue},80%,70%)">${handle}'s Page</h1>`,
    `<p style="opacity:.8">Recreated in the dark · entry #${i + 1}</p>`,
    `<button style="background:hsl(${hue},70%,55%);border:0;color:#000;padding:10px 18px;border-radius:6px">Get started</button>`,
    `</div>`,
  ].join("");
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}

async function run(req: NextRequest) {
  const url = new URL(req.url);
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CONVEX_URL is not set" },
      { status: 500 }
    );
  }

  // Optional shared-secret guard.
  const secret = process.env.SIMULATE_SECRET;
  if (secret && url.searchParams.get("key") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const players = clamp(parseInt(url.searchParams.get("players") || "10", 10), 2, 50);
  const advance = (url.searchParams.get("advance") || "reveal") as
    | "voting"
    | "reveal"
    | "finished";

  const c = new ConvexHttpClient(convexUrl);

  try {
    // --- Host creates and starts the event ---
    const hostId = (await c.mutation(api.auth.upsertUser, {
      githubId: `sim-host-${Date.now()}`,
      username: "SimHost",
    })) as Id<"users">;

    const gameId = (await c.mutation(api.games.createGame, {
      creatorId: hostId,
      title: "Simulated Showdown",
      description: "Auto-generated game from /api/simulate",
      referenceImageUrl: "https://placehold.co/600x400/png",
      hexColors: [{ name: "Background", hex: "#0a0a12" }],
    })) as Id<"games">;

    await c.mutation(api.games.openLobby, { gameId, creatorId: hostId });
    await c.mutation(api.games.startGame, { gameId, creatorId: hostId });

    // --- N simulated clients join, "type", and submit ---
    const playerIds: Id<"players">[] = [];
    const entryIds: Id<"entries">[] = [];
    for (let i = 0; i < players; i++) {
      const handle = `${HANDLES[i % HANDLES.length]}${i >= HANDLES.length ? i : ""}`;
      const playerId = (await c.mutation(api.players.joinGame, {
        gameId,
        handle,
      })) as Id<"players">;
      playerIds.push(playerId);

      const entry = await c.query(api.entries.getPlayerEntry, { playerId });
      const entryId = entry!._id as Id<"entries">;
      entryIds.push(entryId);

      // Simulate typing by saving a few progress snapshots, then submit.
      const html = entryHtml(i, handle);
      const keystrokes = 80 + i * 12;
      for (let s = 1; s <= 3; s++) {
        await c.mutation(api.entries.saveProgressSnapshot, {
          entryId,
          html: html.slice(0, Math.floor((html.length * s) / 3)),
          streak: s * 8,
          powerMode: s === 3,
          keystrokeCount: Math.floor((keystrokes * s) / 3),
          timestamp: s * 4000,
        });
      }
      await c.mutation(api.entries.submitEntry, {
        entryId,
        html,
        totalScore: keystrokes + i * 3,
        maxStreak: 20 + i,
        totalKeystrokes: keystrokes,
      });
    }

    // --- Host ends the round and opens participant voting ---
    await c.mutation(api.games.endGame, { gameId, creatorId: hostId });
    await c.mutation(api.games.setVotingMode, {
      gameId,
      creatorId: hostId,
      mode: "participant",
    });
    await c.mutation(api.games.setVotingPhase, {
      gameId,
      creatorId: hostId,
      phase: "voting",
    });

    // --- Everyone votes (deterministic pattern -> clear winner, no self-votes) ---
    // i=0: 1st->entry1, 2nd->entry2 ; i=1: 1st->entry0, 2nd->entry2 ;
    // i>=2: 1st->entry0, 2nd->entry1.
    for (let i = 0; i < players; i++) {
      const first = i === 0 ? entryIds[1]! : entryIds[0]!;
      const second = i === 0 || i === 1 ? entryIds[2]! : entryIds[1]!;
      await c.mutation(api.participantVotes.setVote, {
        gameId,
        voterPlayerId: playerIds[i]!,
        entryId: first,
        rank: 1,
      });
      await c.mutation(api.participantVotes.setVote, {
        gameId,
        voterPlayerId: playerIds[i]!,
        entryId: second,
        rank: 2,
      });
    }

    // --- Advance as requested ---
    if (advance === "reveal" || advance === "finished") {
      await c.mutation(api.games.setVotingPhase, {
        gameId,
        creatorId: hostId,
        phase: "reveal",
      });
    }
    if (advance === "finished") {
      await c.mutation(api.games.finishGame, { gameId, creatorId: hostId });
    }

    // --- Gather results for the response ---
    const [game, status, results] = await Promise.all([
      c.query(api.games.getGame, { gameId }),
      c.query(api.participantVotes.getParticipantVoteStatus, { gameId }),
      c.query(api.participantVotes.getParticipantResults, { gameId }),
    ]);

    const origin = `${req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "")}://${
      req.headers.get("x-forwarded-host") || req.headers.get("host")
    }`;
    const shortCode = game?.shortCode;

    return NextResponse.json({
      ok: true,
      players,
      advancedTo: advance,
      game: {
        id: gameId,
        shortCode,
        status: game?.status,
        votingPhase: game?.votingPhase,
      },
      voteStatus: status,
      standings: results.map((r, i) => ({
        place: i + 1,
        handle: r.player?.handle ?? "Unknown",
        points: r.points,
        firstPlaceVotes: r.firstPlaceVotes,
        secondPlaceVotes: r.secondPlaceVotes,
      })),
      winner: results[0]?.player?.handle ?? null,
      links: {
        results: shortCode ? `${origin}/results/${shortCode}` : null,
        manage: `${origin}/game/manage/${gameId}`,
        play: shortCode ? `${origin}/play/${shortCode}` : null,
      },
      hint:
        advance === "reveal"
          ? "Open the results link as the host and click through the reveal."
          : advance === "voting"
          ? "Votes are cast; open results as host to close voting & reveal."
          : "Game finished — open the results link to see the final standings.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}
