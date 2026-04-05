import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/history?lock=0x...
export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json([]);
  }

  const lock = req.nextUrl.searchParams.get("lock");
  if (!lock) {
    return NextResponse.json({ error: "Missing lock param" }, { status: 400 });
  }

  const lockLower = lock.toLowerCase();

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .or(`player_x_lock.ilike.${lockLower},player_o_lock.ilike.${lockLower}`)
    .eq("status", "finished")
    .order("finished_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Annotate each game with the player's perspective
  const history = (data || []).map((game) => {
    const isX = game.player_x_lock?.toLowerCase() === lockLower;
    const opponent = isX ? game.player_o_lock : game.player_x_lock;
    let result: "win" | "loss" | "draw" = "draw";
    if (game.winner === "x") result = isX ? "win" : "loss";
    else if (game.winner === "o") result = isX ? "loss" : "win";
    else if (game.winner === "draw") result = "draw";

    return {
      id: game.id,
      txHash: game.tx_hash,
      opponent,
      result,
      stakeAmount: game.stake_amount,
      finishedAt: game.finished_at,
    };
  });

  return NextResponse.json(history);
}
