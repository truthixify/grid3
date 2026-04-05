import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/leaderboard
export async function GET() {
  if (!supabase) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
