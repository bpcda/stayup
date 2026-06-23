/**
 * Supabase browser client (foundation).
 *
 * Lives alongside the existing `src/integrations/supabase/client.ts` and the
 * Appwrite client. Nothing in the UI imports from here yet — this is the new
 * entrypoint that the migration will switch over to, file-by-file.
 *
 * Do NOT use this client from Edge Functions: it ships the anon key and is
 * intended for the browser. For server-side code, see `./server.ts`.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — Supabase features disabled",
  );
}

/**
 * Typed Supabase browser client. When the env vars are missing the export is
 * `null` so callers can branch instead of crashing at import time.
 */
export const supabaseBrowser: SupabaseClient<Database> | null =
  isSupabaseConfigured
    ? createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "stayup.auth.v2",
        },
      })
    : null;

/**
 * Strict accessor: throws when the client is not configured. Prefer this in
 * code paths that should never run without Supabase (e.g. new auth flows).
 */
export function getSupabaseBrowser(): SupabaseClient<Database> {
  if (!supabaseBrowser) {
    throw new Error(
      "Supabase browser client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabaseBrowser;
}
