import { createClient } from "@supabase/supabase-js";

// Server-side only — never exposed to the browser
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
