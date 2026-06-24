// supabase/functions/join-waitlist/index.ts
// Iscrive l'utente loggato alla waitlist di un evento sold-out e gli invia
// la mail di conferma con la posizione.
//
// Body: { event_id: uuid }
// Risposta OK: { ok: true, position, status, event: { id, title, slug } }
// Errori controllati (HTTP 4xx): { error: string, message?: string }

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
  unauthorized:        { status: 401, message: "Devi accedere per entrare in lista." },
  event_not_found:     { status: 404, message: "Evento non trovato." },
  event_not_available: { status: 400, message: "Evento non disponibile." },
  no_capacity_limit:   { status: 400, message: "Evento senza limite di capienza." },
  not_sold_out:        { status: 400, message: "Ci sono ancora posti disponibili." },
  already_booked:      { status: 400, message: "Sei già iscritto/a a questo evento." },
  already_in_waitlist: { status: 400, message: "Sei già in lista d'attesa." },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_KEY) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: { event_id?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const eventId = body.event_id;
  if (typeof eventId !== "string" || !/^[0-9a-f-]{36}$/i.test(eventId)) {
    return json({ error: "invalid_event_id" }, 400);
  }

  const { data: u } = await userClient.auth.getUser();
  if (!u.user) return json({ error: "unauthorized", message: ERROR_MAP.unauthorized.message }, 401);

  const { data: row, error } = await userClient.rpc("join_waitlist", { _event_id: eventId });
  if (error) {
    const code = (error.message || "").trim();
    const mapped = ERROR_MAP[code];
    if (mapped) return json({ error: code, message: mapped.message }, mapped.status);
    console.error("[join-waitlist] rpc error:", error);
    return json({ error: "rpc_failed", message: error.message }, 500);
  }

  const { data: ev } = await admin
    .from("events").select("id, title, slug").eq("id", eventId).maybeSingle();

  // Email di conferma (best-effort, non fa fallire l'iscrizione).
  try {
    const SITE_URL = Deno.env.get("SITE_URL") ?? Deno.env.get("VITE_SITE_URL") ?? "";
    await admin.functions.invoke("send-email", {
      body: {
        template: "waitlist-joined",
        to: u.user.email,
        data: {
          nome: u.user.user_metadata?.first_name ?? null,
          eventTitle: ev?.title ?? "Evento StayUp",
          position: (row as { position: number }).position,
          eventUrl: SITE_URL && ev?.slug ? `${SITE_URL.replace(/\/$/, "")}/eventi/${ev.slug}` : undefined,
        },
        related: { user_id: u.user.id, event_id: eventId },
      },
    });
  } catch (e) {
    console.warn("[join-waitlist] email send failed:", (e as Error).message);
  }

  return json({
    ok: true,
    position: (row as { position: number }).position,
    status: (row as { status: string }).status,
    event: ev ?? null,
  });
});
