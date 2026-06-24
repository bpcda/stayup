// supabase/functions/accept-waitlist-offer/index.ts
// Accetta un'offerta di waitlist (token monouso, scadenza 24h).
//
// Body: { token: uuid }
// OK: { ok: true, booking_id, event_id, event_slug }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const ERROR_MAP: Record<string, { status: number; message: string }> = {
  unauthorized:    { status: 401, message: "Devi accedere per accettare l'offerta." },
  invalid_token:   { status: 404, message: "Link non valido." },
  forbidden:       { status: 403, message: "Questo link è di un altro utente." },
  not_offered:     { status: 400, message: "Offerta non più disponibile." },
  expired:         { status: 410, message: "Offerta scaduta." },
  event_cancelled: { status: 410, message: "Evento annullato." },
  no_more_slots:   { status: 409, message: "Posti esauriti, l'offerta non è più valida." },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ error: "server_misconfigured" }, 500);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: { token?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const token = body.token;
  if (typeof token !== "string" || !/^[0-9a-f-]{36}$/i.test(token)) {
    return json({ error: "invalid_token", message: ERROR_MAP.invalid_token.message }, 400);
  }

  const { data: u } = await userClient.auth.getUser();
  if (!u.user) return json({ error: "unauthorized", message: ERROR_MAP.unauthorized.message }, 401);

  const { data, error } = await userClient.rpc("accept_waitlist_offer", { _token: token });
  if (error) {
    const code = (error.message || "").trim();
    const mapped = ERROR_MAP[code];
    if (mapped) return json({ error: code, message: mapped.message }, mapped.status);
    // 23505 = unique_violation sull'indice bookings_event_user_active_uq
    // (race estrema: l'utente ha appena ottenuto un booking attivo per altra via).
    if ((error as { code?: string }).code === "23505") {
      return json({ error: "already_booked", message: "Hai già una prenotazione attiva per questo evento." }, 409);
    }
    console.error("[accept-waitlist-offer] rpc error:", error);
    return json({ error: "rpc_failed", message: error.message }, 500);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return json({
    ok: true,
    booking_id: (row as { booking_id: string }).booking_id,
    event_id:   (row as { event_id: string }).event_id,
    event_slug: (row as { event_slug: string }).event_slug,
  });
});
