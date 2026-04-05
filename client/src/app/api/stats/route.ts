import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/stats?lock=0x...
export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0, totalStaked: 0 });
  }

  const lock = req.nextUrl.searchParams.get("lock");
  if (!lock) {
    return NextResponse.json({ error: "Missing lock param" }, { status: 400 });
  }

  const lockLower = lock.toLowerCase();

  const { data } = await supabase
    .from("leaderboard")
    .select("*")
    .ilike("lock_hash", lockLower)
    .single();

  if (!data) {
    return NextResponse.json({
      wins: 0,
      losses: 0,
      draws: 0,
      totalGames: 0,
      winRate: 0,
      totalStaked: 0,
    });
  }

  return NextResponse.json({
    wins: data.wins || 0,
    losses: data.losses || 0,
    draws: data.draws || 0,
    totalGames: data.total_games || 0,
    winRate: data.win_rate || 0,
    totalStaked: data.total_staked || 0,
  });
}
