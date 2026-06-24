// supabase/functions/cancel-event-booking/index.ts
// Cancella la prenotazione dell'utente loggato e, se l'evento aveva un sold-out,
// promuove il primo in lista d'attesa inviandogli l'email di offerta 24h.
//
// Body: { event_id: uuid }
// OK: { ok: true, promoted?: { user_email, expires_at } }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

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
  if (!u.user) return json({ error: "unauthorized" }, 401);

  // 1) Cancella la prenotazione (RLS impone user_id = auth.uid()).
  const { error: updErr } = await userClient
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("user_id", u.user.id)
    .in("status", ["pending", "confirmed"]);
  if (updErr) {
    console.error("[cancel-event-booking] cancel error:", updErr);
    return json({ error: "cancel_failed", message: updErr.message }, 500);
  }

  // 2) Tenta di promuovere il primo in lista (service role). Il TRIGGER
  //    `bookings_waitlist_auto_promote` ha già fatto la promozione DB-side;
  //    qui chiamiamo `promote_next_waitlist` solo per ottenere i dati della
  //    riga "offered" attuale (se c'è) e mandare l'email subito. Idempotente:
  //    se la riga ha già offer_email_sent_at non manderemo doppie email.
  let promoted: { user_email: string; expires_at: string } | null = null;
  try {
    // Garantisce stato coerente: scade le offerte stantie e (eventualmente)
    // promuove un nuovo utente se serve.
    await admin.rpc("expire_and_repromote_all");

    // Legge l'ultima offerta attiva da notificare.
    const { data: pend } = await admin
      .from("waitlist")
      .select("id, user_id, event_id, offer_token, offer_expires_at, event:events(title, slug)")
      .eq("event_id", eventId)
      .eq("status", "offered")
      .is("offer_email_sent_at", null)
      .order("offered_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pend && pend.offer_token) {
      const { data: u } = await admin.auth.admin.getUserById(pend.user_id as string);
      const email = u?.user?.email;
      if (email) {
        const SITE_URL = (Deno.env.get("SITE_URL") ?? Deno.env.get("VITE_SITE_URL") ?? "").replace(/\/$/, "");
        const acceptUrl = `${SITE_URL}/waitlist/accept?token=${pend.offer_token}`;
        const ev = (pend as { event: { title: string; slug: string } | null }).event;
        try {
          await admin.functions.invoke("send-email", {
            body: {
              template: "waitlist-offer",
              to: email,
              data: {
                eventTitle: ev?.title ?? "Evento StayUp",
                acceptUrl,
                expiresAt: pend.offer_expires_at,
              },
              related: { user_id: pend.user_id, event_id: pend.event_id },
            },
          });
          await admin
            .from("waitlist")
            .update({ offer_email_sent_at: new Date().toISOString() })
            .eq("id", pend.id as string);
          promoted = { user_email: email, expires_at: pend.offer_expires_at as string };
        } catch (e) {
          console.warn("[cancel-event-booking] offer email failed:", (e as Error).message);
        }
      }
    }
  } catch (e) {
    console.warn("[cancel-event-booking] promote exception:", (e as Error).message);
  }


  return json({ ok: true, promoted });
});
