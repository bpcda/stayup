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
 * Single source of truth for the Supabase browser client.
 * Auth, database, storage and edge-function calls all share this instance.
 */
export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (null as unknown as SupabaseClient<Database>);

/**
 * Strict accessor: throws when the client is not configured.
 * Prefer this in code paths that must not run without Supabase.
 */
export function getSupabaseBrowser(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}
