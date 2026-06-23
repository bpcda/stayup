/**
 * Events CRUD against `public.events`. Mirrors the operations currently
 * performed against Appwrite in `src/hooks/useAdminEvents.ts` and
 * `src/hooks/useEventDetail.ts`. Not yet wired into the UI.
 */
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

export type EventRow = Tables<"events">;

export async function listEvents(opts?: { onlyActive?: boolean }) {
  const supabase = getSupabaseBrowser();
  let q = supabase.from("events").select("*").order("starts_at", { ascending: true });
  if (opts?.onlyActive) q = q.eq("is_active", true);
  return q;
}

export async function getEventBySlug(slug: string) {
  const supabase = getSupabaseBrowser();
  return supabase.from("events").select("*").eq("slug", slug).maybeSingle();
}

export async function getEventById(id: string) {
  const supabase = getSupabaseBrowser();
  return supabase.from("events").select("*").eq("id", id).maybeSingle();
}

export async function createEvent(input: TablesInsert<"events">) {
  const supabase = getSupabaseBrowser();
  return supabase.from("events").insert(input).select().single();
}

export async function updateEvent(id: string, patch: TablesUpdate<"events">) {
  const supabase = getSupabaseBrowser();
  return supabase.from("events").update(patch).eq("id", id).select().single();
}

export async function deleteEvent(id: string) {
  const supabase = getSupabaseBrowser();
  return supabase.from("events").delete().eq("id", id);
}
