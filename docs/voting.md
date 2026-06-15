# Voting — How It Works (Current Implementation)

This document describes, in detail, how the voting / judging system works today in
Blind Code. It is intended as a reference baseline before any redesign.

> **Two modes now exist.** Sections 1–11 below describe the original **classic**
> mode (judge tokens + 1–10 scoring), which is still fully available. Section 12
> describes the newer **participant** (blind peer voting) mode. The host chooses
> between them at vote time on the results page (`votingMode` on the game).

---

## 1. Where voting sits in the game lifecycle

A game (`games` table) moves through these statuses:

```
draft → lobby → active → voting → finished
```

- `active` — players are coding their entries.
- `voting` — judging is meant to happen.
- `finished` — winner revealed / game closed.

Voting itself is **not strictly gated by status in the backend** — the mutations that
cast votes (`castVote`, `selectWinner`) do not check `game.status`. The status mainly
drives the **UI** (which tabs/labels show) and is surfaced informationally on the judge
invite page. In practice voting happens on the **results page** (`/results/[code]`),
which is reachable regardless of status.

---

## 2. The two ways to participate as a voter

Voting permission is decided by `canUserVoteOnGame` (in `convex/votes.ts`) and mirrored
by the public `canUserVote` query (in `convex/voteTokens.ts`). There are exactly two
ways to be allowed to vote:

1. **Game creator** — `game.creatorId === userId`. The creator can always vote, with no
   token needed.
2. **Guest judge with a claimed vote token** — anyone else must hold an active vote
   token (`voteTokens` table) that has been claimed (`usedBy`) by their own user id.

Everyone else (logged-in users without a token, players who competed, anonymous
visitors) can **view** submissions and the leaderboard, but the "Vote" tab does not
appear for them.

> Note: voting requires a logged-in **GitHub user** (`judgeId` is a `users` id). Guest
> players who joined a game without an account cannot vote.

---

## 3. Vote tokens (the judge-invite system)

Vote tokens let the creator invite outside judges via a shareable link.

**Data model — `voteTokens` table** (`convex/schema.ts`):

| field       | type                  | meaning                                        |
|-------------|-----------------------|------------------------------------------------|
| `gameId`    | id<games>             | which game this token judges                    |
| `token`     | string                | random 12-char code, used in the URL            |
| `label`     | optional string       | e.g. "Judge 1" — shown to the invitee           |
| `createdAt` | number                | timestamp                                       |
| `usedBy`    | optional id<users>    | the user who claimed it (set on first claim)    |
| `isActive`  | boolean               | creator can deactivate without deleting         |

Indexes: `by_game`, `by_token`.

**Lifecycle of a token** (`convex/voteTokens.ts`):

- `createVoteToken` — creator-only. Generates a random token and inserts it as active.
- `getGameVoteTokens` — creator-only list of a game's tokens (for the manage screen).
- `getTokenInfo` — **public** query used by the `/vote/[token]` page. Returns game
  title/status, the label, and whether the token is already claimed. Returns `null` if
  the token doesn't exist or is inactive.
- `claimVoteToken` — binds the token to a user:
  - Rejects if token is missing or `isActive === false`.
  - If already claimed by **another** user → throws ("already been claimed by another
    user").
  - If unclaimed → sets `usedBy` to this user.
  - If already claimed by **the same** user → succeeds (idempotent re-entry).
  - Returns `{ gameId, label }`.
- `deactivateVoteToken` — creator-only. Sets `isActive = false` (token stops working but
  is kept for the record).
- `deleteVoteToken` — creator-only. Hard-deletes the token.

**Key property:** a token is **single-judge** — it locks to the first user who claims it.
It is **not** a one-vote-per-token; once claimed, that judge can cast/update as many
entry scores as they like.

**Claim flow on `/vote/[token]`** (`src/app/vote/[token]/page.tsx`):

1. Page loads token info publicly.
2. If not logged in → shows a "Judge Invite" card with game info and a GitHub login
   button.
3. Once logged in, it **auto-claims** the token and redirects to
   `/results/<shortCode>`. If the token was already taken by someone else, it shows an
   error instead.

---

## 4. The vote data model

**`votes` table** (`convex/schema.ts`):

| field      | type          | meaning                                  |
|------------|---------------|------------------------------------------|
| `gameId`   | id<games>     | the game                                 |
| `entryId`  | id<entries>   | which submission this vote is about      |
| `judgeId`  | id<users>     | the voting user                          |
| `score`    | number        | a 1–10 rating                            |
| `isWinner` | boolean       | this judge's personal "winner" flag      |

Indexes: `by_game`, `by_entry`, `by_judge_and_game`.

**One vote row = one (judge, entry) pair.** A judge has at most one row per entry.

---

## 5. Casting votes

Two mutations write to the `votes` table. Both call `canUserVoteOnGame` first and throw
`"You are not authorized to vote on this game"` if the caller isn't the creator or a
valid token-holder.

### `castVote({ gameId, entryId, judgeId, score })`

- Looks up an existing vote by this judge for this entry.
- If one exists → **patches** its `score` (overwrite — no history kept).
- If not → inserts a new vote row with `isWinner: false`.

So scoring is idempotent per (judge, entry): re-clicking a different number just updates
the stored score.

### `selectWinner({ gameId, entryId, judgeId })`

- First clears any existing `isWinner: true` rows by this judge for this game (a judge
  can only crown **one** entry — selecting a new winner un-crowns the previous one).
- Then, for the chosen entry:
  - If a vote row already exists → patches `isWinner: true` on it (keeps its score).
  - If not → inserts a new row with `score: 10` and `isWinner: true`.

**Important consequence:** "Select Winner" forces a score of 10 if the judge hadn't
already rated that entry. That 10 then feeds into the leaderboard totals (see §7).

---

## 6. Reading votes (queries)

- `getGameVotes({ gameId })` — all vote rows for a game.
- `getEntryVotes({ entryId })` — all votes for a single entry.
- `getUserVotesForGame({ gameId, userId })` — one judge's votes (used by the UI to
  highlight what the current judge already picked).
- `getWinners({ gameId })` — all rows where `isWinner === true`, joined with entry +
  player. (Note: this returns *every* judge's crowned pick, so multiple "winners" can
  appear if multiple judges vote.)

---

## 7. The leaderboard & scoring formula

`getLeaderboard({ gameId })` builds the ranking:

1. Loads **all** entries for the game (submitted or not).
2. For each entry, sums up its votes:
   - `totalVoteScore = Σ score` across all judges' votes for that entry.
   - `isWinner = any vote on the entry has isWinner === true`.
3. Computes a blended score:

   ```
   combinedScore = entry.totalScore + (totalVoteScore × 10)
   ```

   - `entry.totalScore` is the **typing-performance** score earned while coding
     (speed / streak / keystrokes — computed elsewhere, in the play flow).
   - `totalVoteScore` is the **sum** of judge ratings (each 1–10), multiplied by 10.

4. Sorts descending by `combinedScore`.

### What this means in practice

- Judge votes are **additive and summed**, not averaged. More judges → more points. An
  entry rated 8 by three judges contributes `(8+8+8) × 10 = 240` points; rated 8 by one
  judge contributes `80`.
- A single judge's 1–10 rating is worth 10–100 leaderboard points before typing score is
  even considered, so with few judges the **vote term tends to dominate** the typing
  score — but with an uneven number of judges the math can swing heavily.
- The `isWinner` crown is **cosmetic** for ranking — it does not add points by itself
  (beyond the score: 10 it may have implicitly set). Ranking is purely `combinedScore`.

---

## 8. The voting UI (`/results/[code]`)

`src/app/results/[code]/page.tsx` is the hub. It has four view modes (tabs):

- **Submissions** — everyone. Reference image + each entry's inline playback, code, and
  full playback.
- **Vote** — only shown when `user && canVote`. For each entry: a live iframe preview, a
  1–10 number pad (calls `castVote`), a "Select / Winner!" button (calls
  `selectWinner`), and a playback button. The current judge's existing picks are
  highlighted.
- **Leaderboard** — everyone. Table of rank, player, typing score (`Type`), summed votes
  (`Votes`), `Total` (= combinedScore), and a 👑 if the entry was anyone's winner.
- **Reveal** — creator-only button. A Kahoot-style countdown animation that reveals the
  ranking bottom-to-top and ends on the #1 `combinedScore` player.

The page reactively re-renders as votes change (Convex live queries). If a user loses
voting permission or logs out while on the Vote tab, it falls back to Submissions.

---

## 9. Summary of the current model in one paragraph

The game creator is always a judge; additional judges are invited via single-claim
shareable **vote-token** links and must log in with GitHub. Each judge independently
rates **every** submission on a **1–10** scale (re-ratable, last value wins) and may
optionally crown **one** personal **winner** (which also sets a score of 10 if unrated).
Rankings are computed by **summing** all judges' 1–10 scores per entry, multiplying that
sum by 10, and **adding the entry's typing-performance score**; the highest combined
total wins. Winner crowns are visual only and don't directly add points.

---

## 10. Files involved

| File                                   | Responsibility                                   |
|----------------------------------------|--------------------------------------------------|
| `convex/schema.ts`                     | `votes` and `voteTokens` table definitions       |
| `convex/votes.ts`                      | cast/update votes, winner select, leaderboard    |
| `convex/voteTokens.ts`                 | create/claim/deactivate/delete tokens, permission |
| `src/app/vote/[token]/page.tsx`        | judge-invite landing + auto-claim flow           |
| `src/app/results/[code]/page.tsx`      | submissions, voting UI, leaderboard, reveal       |
| `src/app/game/manage/[id]/page.tsx`    | creator dashboard (token management lives here)   |
| `convex/entries.ts`                    | entries + `totalScore` (typing performance)       |

---

## 11. Notable edge cases / quirks (relevant for a redesign)

- **No `game.status` check** on `castVote` / `selectWinner` — votes can technically be
  cast outside the `voting` phase.
- **Players can't vote** unless they're the creator or hold a token; competing in a game
  grants no voting rights.
- **Votes are summed, not averaged** — fairness depends on every judge rating every
  entry; partial voting skews totals.
- **"Select Winner" silently writes a score of 10** for unrated entries, coupling the
  crown to the numeric ranking.
- **`getWinners` can return multiple winners** (one per judge) — there is no notion of a
  single consensus/official winner in the data; the leaderboard's `isWinner` is just
  "someone crowned this".
- **Tokens are single-user** but allow unlimited re-voting; there's no per-token vote
  limit or anonymity.
- **`combinedScore` weighting is hard-coded** (`votes × 10 + typingScore`) with no
  configurability.

---

## 12. Participant (blind peer) voting mode

A second voting system added alongside classic. The host enables it from the
results page (`Voting mode → Participant`), which sets `games.votingMode =
"participant"` and starts the host-driven sub-phase machine `games.votingPhase`.

### 12.1 Who votes & how they're identified
- **Voters are players**, identified by their `players` row — resolved by `userId`
  for logged-in users or the `blindcode_player_<code>` localStorage id for guests
  (same identity the play page uses). No GitHub login is required to vote.
- A voter **cannot vote for their own** submission.
- The **host** also gets the same votes. If the host competed they vote via their
  player row; if they only hosted, the **`Join Voting`** button calls
  `players.joinAsVoter` to create a voter-only player (no blank submission).

### 12.2 The votes
- Each voter casts up to **two ranked votes**: 🥇 **1st choice = 2 pts**, 🥈 **2nd
  choice = 1 pt**. The two choices must be **distinct** entries.
- The per-voter cap adapts: `votesAllowed = min(2, number of other submitted
  entries)`. With only one rival a voter gets a single vote; with no rivals, none.
- Votes are **re-assignable** and **clearable** (click an active rank to toggle it
  off) so a voter may deliberately use fewer votes.
- Stored in the **`participantVotes`** table: one row per `(voterPlayerId, rank)`,
  indexed `by_game`, `by_entry`, `by_voter_and_game`.

### 12.3 Host-driven phases (`votingPhase`)
1. **`presentation`** — anonymized walkthrough of every submission. The code
   **animates from start to finish** (progress snapshots), a **Preview/Code** toggle
   shows a big readable code view, and a validation bar at the bottom highlights the
   **single biggest HTML mistake** (`src/lib/html-validate.ts`). Host navigates
   submissions; everyone may view it (no names, no scores).
2. **`voting`** — participants cast their ranked votes on anonymized submissions
   ("Submission 1/2/…"). The host sees a **live `Voted: x/y` counter**
   (`getParticipantVoteStatus`).
3. **`reveal`** — host-only screen that reveals the podium **3rd → 2nd → 1st**, one
   place per click, each entering from an **alternating** direction. Non-hosts see a
   "watch the main screen" holding screen. Names are revealed here.

The host advances phases (and can step back) from the control bar; **`Finish Game`**
sets `status = "finished"`, after which everyone sees the **final standings** table.

### 12.4 Scoring & tie-breaks
`getParticipantResults` sums points per entry (rank1 = 2, rank2 = 1) and sorts by:
points → number of 1st-place votes → typing `totalScore`. Typing score is **only a
tie-breaker** here (unlike classic, where it's added in).

### 12.5 Key files (participant mode)
| File | Responsibility |
|------|----------------|
| `convex/schema.ts` | `votingMode`/`votingPhase` on games; `participantVotes` table |
| `convex/participantVotes.ts` | cast/clear ranked votes, vote status, results |
| `convex/games.ts` | `setVotingMode`, `setVotingPhase` (host controls) |
| `convex/players.ts` | `joinAsVoter` (host voter-only join) |
| `src/lib/html-validate.ts` | lightweight "biggest mistake" HTML checker |
| `src/components/participant/presentation.tsx` | animated presentation + code + validation |
| `src/components/participant/voting.tsx` | ranked 1st/2nd voting UI |
| `src/components/participant/reveal.tsx` | host-stepped 3→1 reveal |
| `src/app/results/[code]/page.tsx` | mode toggle, phase control, branches classic/participant |

---

## 13. Automated tests

`convex/participantVotes.test.ts` is an in-memory integration test of the full
participant-voting flow, run with **Vitest** + **convex-test** (no live backend
needed). Run it with:

```bash
npm test           # one-shot
npm run test:watch # watch mode
```

It builds a game, runs it to the voting stage, and asserts: ranked scoring &
ordering (with tie-breaks), live vote-status counts, no-self-vote, rank
validation, the distinct-entries rule, `clearVote`, the adaptive vote cap,
`joinAsVoter` for the host, phase-gating of votes, the reveal→finish transition,
and creator-only mode/phase control.
