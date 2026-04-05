// Client-side helpers to call the API routes (Supabase stays server-side)

export async function recordGameCreated(
  txHash: string,
  playerXLock: string,
  stakeAmount: string
) {
  try {
    await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        txHash,
        playerXLock,
        stakeAmount,
      }),
    });
  } catch {
    // Non-critical — don't block gameplay if DB is down
  }
}

export async function recordGameJoined(playerXLock: string, playerOLock: string) {
  try {
    await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", playerXLock, playerOLock }),
    });
  } catch {}
}

export async function recordGameFinished(
  playerXLock: string,
  winner: "x" | "o" | "draw"
) {
  try {
    await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finish", playerXLock, winner }),
    });
  } catch {}
}

export async function recordGameCancelled(playerXLock: string) {
  try {
    await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", playerXLock }),
    });
  } catch {}
}

export async function recordGameForfeited(
  playerXLock: string,
  forfeitedBy: string
) {
  try {
    await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forfeit", playerXLock, forfeitedBy }),
    });
  } catch {}
}

export interface LeaderboardEntry {
  lock_hash: string;
  wins: number;
  losses: number;
  draws: number;
  total_games: number;
  total_staked: number;
  win_rate: number;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch("/api/leaderboard");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export interface HistoryEntry {
  id: string;
  txHash: string;
  opponent: string;
  result: "win" | "loss" | "draw";
  stakeAmount: number;
  finishedAt: string;
}

export async function fetchHistory(lockHash: string): Promise<HistoryEntry[]> {
  try {
    const res = await fetch(`/api/history?lock=${encodeURIComponent(lockHash)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
  totalStaked: number;
}

export async function fetchPlayerStats(lockHash: string): Promise<PlayerStats> {
  try {
    const res = await fetch(`/api/stats?lock=${encodeURIComponent(lockHash)}`);
    if (!res.ok) return { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0, totalStaked: 0 };
    return await res.json();
  } catch {
    return { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0, totalStaked: 0 };
  }
}
