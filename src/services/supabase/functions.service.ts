/**
 * Typed wrappers around `supabase.functions.invoke(...)` for the project's
 * Edge Functions. Centralising the names here keeps callers free of magic
 * strings.
 */
import { getSupabaseBrowser } from "@/integrations/supabase/client";

export type EdgeFunctionName =
  | "accept-waitlist-offer"
  | "cancel-event-booking"
  | "create-booking"
  | "create-event-booking"
  | "delete-account"
  | "send-booking-email"
  | "send-email"
  | "join-waitlist";

export async function invokeEdgeFunction<TResponse = unknown>(
  name: EdgeFunctionName,
  body?: Record<string, unknown>,
) {
  const supabase = getSupabaseBrowser();
  return supabase.functions.invoke<TResponse>(name, { body });
}

export const deleteCurrentAccount = () => invokeEdgeFunction("delete-account");

export const sendBookingEmail = (payload: Record<string, unknown>) =>
  invokeEdgeFunction("send-booking-email", payload); // Proviene dal vecchio Grill Contest

export const createBooking = (payload: Record<string, unknown>) =>
  invokeEdgeFunction("create-booking", payload);

export const createEventBooking = (payload: Record<string, unknown>) =>
  invokeEdgeFunction("create-event-booking", payload);

export const cancelEventBooking = (payload: Record<string, unknown>) =>
  invokeEdgeFunction("cancel-event-booking", payload);

export const joinWaitlist = (payload: Record<string, unknown>) =>
  invokeEdgeFunction("join-waitlist", payload);

export const sendEmail = (payload: Record<string, unknown>) =>
  invokeEdgeFunction("send-email", payload);

export const acceptWaitlistOffer = (payload: Record<string, unknown>) =>
  invokeEdgeFunction("accept-waitlist-offer", payload);
