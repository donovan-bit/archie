import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

/**
 * Service-role Supabase client for trusted server-side code only
 * (Route Handlers, Server Actions, cron jobs). Bypasses RLS -- every
 * query here MUST filter by the current user's id explicitly.
 */
export function supabaseAdmin() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
    );
  }

  client = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return client;
}
