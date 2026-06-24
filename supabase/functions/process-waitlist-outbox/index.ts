// supabase/functions/process-waitlist-outbox/index.ts
//
// Worker email per la waitlist. Esegue, in quest'ordine:
//   1) expire_and_repromote_all()  → scade offerte stantie + promuove i prossimi
//   2) legge tutte le righe waitlist con status='offered' e
//      offer_email_sent_at IS NULL → invia l'email "waitlist-offer" via Resend
//      (template registrato in send-email) e segna offer_email_sent_at.
//
// Schedulabile via:
//   - Supabase Scheduled Functions (dashboard → Edge Functions → Schedules)
//   - oppure pg_cron + pg_net dal DB (vedi migrations/README.md)
//
// È sicuro chiamare manualmente: idempotente, niente effetti collaterali oltre
// alle email per le offerte ancora non notificate.
//
// Auth: service-role only (header `Authorization: Bearer <SERVICE_ROLE_KEY>`)
// oppure invocato internamente (functions.invoke da altre edge functions).

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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server_misconfigured" }, 500);

  // Solo service role (proteggiamo dall'esecuzione dal client).
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token !== SERVICE_KEY) return json({ error: "forbidden" }, 403);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) expire + ri-promozione
  let promoted = 0;
  try {
    const { data, error } = await admin.rpc("expire_and_repromote_all");
    if (error) console.warn("[waitlist-outbox] expire_and_repromote_all:", error.message);
    else promoted = typeof data === "number" ? data : 0;
  } catch (e) {
    console.warn("[waitlist-outbox] expire_and_repromote_all exception:", (e as Error).message);
  }

  // 2) outbox email
  const { data: pending, error: pendErr } = await admin
    .from("waitlist")
    .select("id, user_id, event_id, offer_token, offer_expires_at, event:events(id, title, slug)")
    .eq("status", "offered")
    .is("offer_email_sent_at", null)
    .not("offer_token", "is", null)
    .limit(50);

  if (pendErr) {
    console.error("[waitlist-outbox] read pending failed:", pendErr);
    return json({ ok: false, promoted, sent: 0, error: pendErr.message }, 500);
  }

  const SITE_URL = (Deno.env.get("SITE_URL") ?? Deno.env.get("VITE_SITE_URL") ?? "").replace(/\/$/, "");
  let sent = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const row of pending ?? []) {
    try {
      // Email destinatario via auth.users (admin.getUserById)
      const { data: u, error: uErr } = await admin.auth.admin.getUserById(row.user_id as string);
      if (uErr || !u?.user?.email) {
        errors.push({ id: row.id as string, error: uErr?.message ?? "no_email" });
        continue;
      }

      const ev = (row as { event: { title: string; slug: string } | null }).event;
      const acceptUrl = `${SITE_URL}/waitlist/accept?token=${row.offer_token}`;
      const { error: mailErr } = await admin.functions.invoke("send-email", {
        body: {
          template: "waitlist-offer",
          to: u.user.email,
          data: {
            eventTitle: ev?.title ?? "Evento StayUp",
            acceptUrl,
            expiresAt: row.offer_expires_at,
          },
          related: { user_id: row.user_id, event_id: row.event_id },
        },
      });
      if (mailErr) {
        errors.push({ id: row.id as string, error: mailErr.message });
        continue;
      }
      const { error: updErr } = await admin
        .from("waitlist")
        .update({ offer_email_sent_at: new Date().toISOString() })
        .eq("id", row.id as string);
      if (updErr) {
        errors.push({ id: row.id as string, error: `mark_sent: ${updErr.message}` });
        continue;
      }
      sent += 1;
    } catch (e) {
      errors.push({ id: row.id as string, error: (e as Error).message });
    }
  }

  return json({ ok: true, promoted, sent, errors });
});
