import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/games — record a game event
export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "create": {
      const { txHash, playerXLock, stakeAmount } = body;
      const { error } = await supabase.from("games").insert({
        tx_hash: txHash,
        player_x_lock: playerXLock,
        stake_amount: stakeAmount,
        status: "waiting",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "join": {
      // Look up by playerXLock + waiting status (tx_hash changes on every move)
      const { playerXLock, playerOLock } = body;
      const { error } = await supabase
        .from("games")
        .update({ player_o_lock: playerOLock, status: "active" })
        .ilike("player_x_lock", playerXLock)
        .eq("status", "waiting");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "finish": {
      // Look up by playerXLock + active status
      const { playerXLock, winner } = body;
      const { error } = await supabase
        .from("games")
        .update({ winner, status: "finished", finished_at: new Date().toISOString() })
        .ilike("player_x_lock", playerXLock)
        .eq("status", "active");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "cancel": {
      const { playerXLock } = body;
      const { error } = await supabase
        .from("games")
        .update({ status: "cancelled", finished_at: new Date().toISOString() })
        .ilike("player_x_lock", playerXLock)
        .eq("status", "waiting");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "forfeit": {
      const { playerXLock, forfeitedBy } = body;
      // Determine winner: if X forfeited, winner is O, and vice versa
      const winner =
        playerXLock.toLowerCase() === forfeitedBy?.toLowerCase() ? "o" : "x";
      const { error } = await supabase
        .from("games")
        .update({ winner, status: "finished", finished_at: new Date().toISOString() })
        .ilike("player_x_lock", playerXLock)
        .eq("status", "active");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
