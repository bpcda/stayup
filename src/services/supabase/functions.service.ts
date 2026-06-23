/**
 * Typed wrappers around `supabase.functions.invoke(...)` for the project's
 * Edge Functions. Centralising the names here keeps callers free of magic
 * strings.
 */
import { getSupabaseBrowser } from "@/integrations/supabase/client";

export type EdgeFunctionName =
  | "create-booking"
  | "delete-account"
  | "send-booking-email";

export async function invokeEdgeFunction<TResponse = unknown>(
  name: EdgeFunctionName,
  body?: Record<string, unknown>,
) {
  const supabase = getSupabaseBrowser();
  return supabase.functions.invoke<TResponse>(name, { body });
}

export const deleteCurrentAccount = () => invokeEdgeFunction("delete-account");

export const sendBookingEmail = (payload: Record<string, unknown>) =>
  invokeEdgeFunction("send-booking-email", payload);
