import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./config";

let client: SupabaseClient | null = null;

/** Server-only client. Uses the secret key, so it must never reach the browser. */
export function db(): SupabaseClient {
  if (!client) {
    const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("SUPABASE_SECRET_KEY is not configured.");
    client = createClient(requireEnv("SUPABASE_URL"), key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
