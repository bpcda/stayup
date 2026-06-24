// supabase/functions/process-waitlist-outbox/index.ts
//
// Worker email per la waitlist. Esegue, in quest'ordine:
//   1) expire_and_repromote_all() → scade offerte stantie + promuove i prossimi.
//   2) Legge le righe waitlist con status='offered' e offer_email_sent_at IS NULL.
//      Per ciascuna: incrementa `offer_email_attempts`, tenta l'invio via
//      `send-email`, registra `offer_email_last_attempt_at` e
//      `offer_email_last_error`. Su successo marca `offer_email_sent_at`.
//      Skip delle righe che hanno superato MAX_ATTEMPTS (default 5).
//   3) check_waitlist_outbox_health(300, 5) → popola `waitlist_alerts` per
//      offerte stale > 5 min o oltre la soglia di tentativi.
//
// Schedulabile via:
//   - Supabase Scheduled Functions (dashboard → Edge Functions → Schedules)
//   - pg_cron + pg_net (vedi migrations/20260628_waitlist_outbox_hardening.sql)
//
// Auth: service-role only (header `Authorization: Bearer <SERVICE_ROLE_KEY>`)
// oppure invocato internamente (functions.invoke da altre edge functions).
//
// Idempotente. Risposta JSON con `processed`, `sent`, `skipped`, `failed`,
// `health`, `errors[]`, `duration_ms`, `request_id`.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_ATTEMPTS = Number(Deno.env.get("WAITLIST_OUTBOX_MAX_ATTEMPTS") ?? "5");
const BATCH_LIMIT  = Number(Deno.env.get("WAITLIST_OUTBOX_BATCH_LIMIT")  ?? "50");
const STALE_SECS   = Number(Deno.env.get("WAITLIST_OUTBOX_STALE_SECS")   ?? "300");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  const log = (level: "info" | "warn" | "error", msg: string, extra?: unknown) => {
    const payload = { request_id: requestId, msg, ...(extra ? { extra } : {}) };
    if (level === "error") console.error("[waitlist-outbox]", payload);
    else if (level === "warn") console.warn("[waitlist-outbox]", payload);
    else console.log("[waitlist-outbox]", payload);
  };

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    log("error", "server_misconfigured");
    return json({ error: "server_misconfigured", request_id: requestId }, 500);
  }

  // Solo service role (protezione dall'esecuzione lato client).
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token !== SERVICE_KEY) {
    log("warn", "forbidden", { has_auth: Boolean(auth) });
    return json({ error: "forbidden", request_id: requestId }, 403);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1) expire + ri-promozione ──────────────────────────────────────────────
  let promoted = 0;
  try {
    const { data, error } = await admin.rpc("expire_and_repromote_all");
    if (error) log("warn", "expire_and_repromote_all error", { error: error.message });
    else promoted = typeof data === "number" ? data : 0;
    log("info", "expire_and_repromote_all done", { promoted });
  } catch (e) {
    log("warn", "expire_and_repromote_all exception", { error: (e as Error).message });
  }

  // ── 2) Outbox email con retry tracking ─────────────────────────────────────
  const { data: pending, error: pendErr } = await admin
    .from("waitlist")
    .select(
      "id, user_id, event_id, offer_token, offer_expires_at, offer_email_attempts, event:events(id, title, slug)",
    )
    .eq("status", "offered")
    .is("offer_email_sent_at", null)
    .not("offer_token", "is", null)
    .lt("offer_email_attempts", MAX_ATTEMPTS)
    .order("offered_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (pendErr) {
    log("error", "read pending failed", { error: pendErr.message });
    return json({ ok: false, request_id: requestId, promoted, sent: 0, error: pendErr.message }, 500);
  }

  const SITE_URL = (Deno.env.get("SITE_URL") ?? Deno.env.get("VITE_SITE_URL") ?? "").replace(/\/$/, "");
  if (!SITE_URL) {
    log("error", "SITE_URL not configured — accept links would be broken; aborting send");
    return json({ ok: false, request_id: requestId, error: "site_url_missing" }, 500);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors: Array<{ id: string; attempts: number; error: string }> = [];

  for (const row of pending ?? []) {
    const id = row.id as string;
    const attempts = (row.offer_email_attempts as number) + 1;
    const nowIso = new Date().toISOString();

    try {
      const { data: u, error: uErr } = await admin.auth.admin.getUserById(row.user_id as string);
      if (uErr || !u?.user?.email) {
        const err = uErr?.message ?? "no_email";
        await admin.from("waitlist").update({
          offer_email_attempts: attempts,
          offer_email_last_attempt_at: nowIso,
          offer_email_last_error: err,
        }).eq("id", id);
        failed += 1;
        errors.push({ id, attempts, error: err });
        log("warn", "user email missing", { waitlist_id: id, attempts, error: err });
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
        await admin.from("waitlist").update({
          offer_email_attempts: attempts,
          offer_email_last_attempt_at: nowIso,
          offer_email_last_error: mailErr.message,
        }).eq("id", id);
        failed += 1;
        errors.push({ id, attempts, error: mailErr.message });
        log("warn", "send-email failed", { waitlist_id: id, attempts, error: mailErr.message });
        continue;
      }

      const { error: updErr } = await admin.from("waitlist").update({
        offer_email_attempts: attempts,
        offer_email_last_attempt_at: nowIso,
        offer_email_last_error: null,
        offer_email_sent_at: nowIso,
      }).eq("id", id).is("offer_email_sent_at", null); // safety: non sovrascrivere
      if (updErr) {
        failed += 1;
        errors.push({ id, attempts, error: `mark_sent: ${updErr.message}` });
        log("error", "mark_sent failed", { waitlist_id: id, error: updErr.message });
        continue;
      }
      sent += 1;
      log("info", "email sent", { waitlist_id: id, attempts, to: u.user.email });
    } catch (e) {
      const err = (e as Error).message;
      await admin.from("waitlist").update({
        offer_email_attempts: attempts,
        offer_email_last_attempt_at: nowIso,
        offer_email_last_error: err,
      }).eq("id", id);
      failed += 1;
      errors.push({ id, attempts, error: err });
      log("error", "send loop exception", { waitlist_id: id, error: err });
    }
  }

  // Riga "skipped" = righe già al max attempts che NON sono entrate nel batch
  try {
    const { count } = await admin
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .eq("status", "offered")
      .is("offer_email_sent_at", null)
      .gte("offer_email_attempts", MAX_ATTEMPTS);
    skipped = count ?? 0;
  } catch (e) {
    log("warn", "skipped count failed", { error: (e as Error).message });
  }

  // ── 3) Health check ────────────────────────────────────────────────────────
  let health: { stale_count: number; max_attempts_count: number } | null = null;
  try {
    const { data, error } = await admin.rpc("check_waitlist_outbox_health", {
      _threshold_seconds: STALE_SECS,
      _max_attempts: MAX_ATTEMPTS,
    });
    if (error) log("warn", "health check error", { error: error.message });
    else {
      const row = Array.isArray(data) ? data[0] : data;
      health = row
        ? {
            stale_count: Number((row as { stale_count: number }).stale_count) || 0,
            max_attempts_count: Number((row as { max_attempts_count: number }).max_attempts_count) || 0,
          }
        : null;
      if (health && (health.stale_count > 0 || health.max_attempts_count > 0)) {
        log("warn", "outbox health alert", health);
      }
    }
  } catch (e) {
    log("warn", "health check exception", { error: (e as Error).message });
  }

  const duration = Date.now() - t0;
  log("info", "run complete", {
    processed: pending?.length ?? 0, sent, failed, skipped, promoted, duration_ms: duration,
  });

  return json({
    ok: true,
    request_id: requestId,
    processed: pending?.length ?? 0,
    promoted, sent, failed, skipped,
    health,
    errors,
    duration_ms: duration,
  });
});
