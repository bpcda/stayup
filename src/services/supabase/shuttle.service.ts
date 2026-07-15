/**
 * Shuttle slots + bookings service. Replaces the previous legacy calls in
 * `src/hooks/useShuttleForm.ts` and `src/hooks/useAdminShuttleData.ts`.
 */
import { getSupabaseBrowser } from "@/integrations/supabase/client";
import { createBooking } from "@/services/supabase/functions.service";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

export type ShuttleSlot = Tables<"shuttle_slots">;
export type ShuttleReturnSlot = Tables<"shuttle_return_slots">;
export type Booking = Tables<"bookings">;

// ---------- Slots (andata) ----------

export async function listAndataSlots(eventId: string) {
  const supabase = getSupabaseBrowser();
  return supabase
    .from("shuttle_slots")
    .select("*")
    .eq("event_id", eventId)
    .order("giorno", { ascending: true })
    .order("orario", { ascending: true });
}

export async function listAndataSlotsByStop(eventId: string, fermata: string, giorno: string) {
  const supabase = getSupabaseBrowser();
  return supabase
    .from("shuttle_slots")
    .select("*")
    .eq("event_id", eventId)
    .eq("fermata", fermata)
    .eq("giorno", giorno)
    .order("orario", { ascending: true });
}

export async function createAndataSlot(input: TablesInsert<"shuttle_slots">) {
  const supabase = getSupabaseBrowser();
  return supabase.from("shuttle_slots").insert(input).select().single();
}

export async function updateAndataSlot(
  id: string,
  patch: TablesUpdate<"shuttle_slots">,
) {
  const supabase = getSupabaseBrowser();
  return supabase.from("shuttle_slots").update(patch).eq("id", id);
}

export async function deleteAndataSlot(id: string) {
  const supabase = getSupabaseBrowser();
  return supabase.from("shuttle_slots").delete().eq("id", id);
}

// ---------- Slots (ritorno) ----------

export async function listRitornoSlots(eventId: string) {
  const supabase = getSupabaseBrowser();
  return supabase
    .from("shuttle_return_slots")
    .select("*")
    .eq("event_id", eventId)
    .order("giorno", { ascending: true })
    .order("orario", { ascending: true });
}

export async function createRitornoSlot(
  input: TablesInsert<"shuttle_return_slots">,
) {
  const supabase = getSupabaseBrowser();
  return supabase.from("shuttle_return_slots").insert(input).select().single();
}

export async function updateRitornoSlot(
  id: string,
  patch: TablesUpdate<"shuttle_return_slots">,
) {
  const supabase = getSupabaseBrowser();
  return supabase.from("shuttle_return_slots").update(patch).eq("id", id);
}

export async function deleteRitornoSlot(id: string) {
  const supabase = getSupabaseBrowser();
  return supabase.from("shuttle_return_slots").delete().eq("id", id);
}

// ---------- Bookings ----------

export async function listBookings(eventId?: string) {
  const supabase = getSupabaseBrowser();
  let q = supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (eventId) q = q.eq("event_id", eventId);
  return q;
}

export async function updateBooking(
  id: string,
  patch: TablesUpdate<"bookings">,
) {
  const supabase = getSupabaseBrowser();
  return supabase.from("bookings").update(patch).eq("id", id).select().single();
}

export async function deleteBooking(id: string) {
  const supabase = getSupabaseBrowser();
  return supabase.from("bookings").delete().eq("id", id);
}

/**
 * Triggers the `create-booking` Edge Function (server-side capacity check +
 * booking insert). Payload shape mirrors the create-booking Edge Function.
 */
export async function invokeCreateBooking(payload: Record<string, unknown>) {
  return createBooking(payload);
}
