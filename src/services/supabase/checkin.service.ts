import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * Risultato strutturato di validateAndCheckInByQrToken.
 * Tutti i campi opzionali sono presenti solo quando disponibili dal DB.
 */
export interface CheckinScanEvent {
  id: string;
  title: string;
  starts_at: string | null;
  status: string;
}
export interface CheckinScanBooking {
  id: string;
  reference_code: string | null;
  status: string;
}
export interface CheckinScanProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export type CheckinScanCode =
  | "checked_in"        // OK appena registrato
  | "already_used"      // QR già usato (idempotente)
  | "not_found"         // QR non riconosciuto
  | "invalid_token"     // Token vuoto / formato errato
  | "event_cancelled"   // Evento annullato
  | "booking_cancelled" // Prenotazione annullata
  | "event_missing"     // Evento eliminato
  | "forbidden"         // Caller non admin né organizer
  | "forbidden_event"   // Organizer ma non di questo evento
  | "unauthorized"      // Non autenticato
  | "server_error";     // Errore RPC / rete

export interface CheckinScanResult {
  ok: boolean;
  code: CheckinScanCode;
  message: string;
  previous_status?: string;
  new_status?: string;
  checked_in_at?: string;
  event?: CheckinScanEvent;
  booking?: CheckinScanBooking;
  profile?: CheckinScanProfile;
}

/**
 * Valida un QR e, se valido, esegue il check-in in modo idempotente.
 *
 * Il frontend invia SOLO il qr_token. Tutto il resto (event_id, user_id,
 * permessi, stato evento/prenotazione) è validato server-side dalla RPC
 * public.checkin_by_qr_token (SECURITY DEFINER).
 */
export async function validateAndCheckInByQrToken(
  qrToken: string,
): Promise<CheckinScanResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, code: "server_error", message: "Supabase non configurato" };
  }
  const token = (qrToken ?? "").trim();
  if (!token) {
    return { ok: false, code: "invalid_token", message: "QR non valido" };
  }

  const { data, error } = await supabase.rpc("checkin_by_qr_token", {
    _qr_token: token,
  });

  if (error) {
    return {
      ok: false,
      code: "server_error",
      message: error.message || "Errore di rete",
    };
  }

  // La RPC restituisce direttamente l'oggetto JSON strutturato.
  const result = data as unknown as CheckinScanResult | null;
  if (!result || typeof result !== "object") {
    return { ok: false, code: "server_error", message: "Risposta non valida" };
  }
  return result;
}
