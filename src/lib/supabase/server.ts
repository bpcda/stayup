/**
 * Supabase server-side helpers.
 *
 * NOTE: Vite is a client bundler. This file must only be imported from:
 *   - Supabase Edge Functions (Deno) — adapt the imports there, see
 *     `supabase/functions/_shared/supabase.ts`.
 *   - Node scripts run with `--env-file` (one-off migration / data scripts).
 *
 * Never import this from `src/components/**` or `src/pages/**`: the service
 * role key would leak into the browser bundle.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type ServerEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

function readEnv(): ServerEnv {
  // Works in Node and in Deno (Deno exposes process.env via the compatibility layer).
  const env = (globalThis as { process?: { env?: ServerEnv } }).process?.env;
  return {
    SUPABASE_URL: env?.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env?.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/**
 * Build a service-role Supabase client. Bypasses RLS — use with care and only
 * inside trusted server contexts.
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = readEnv();
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment",
    );
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
