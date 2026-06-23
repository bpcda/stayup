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

  // 2) Tenta di promuovere il primo in lista (service role).
  let promoted: { user_email: string; expires_at: string } | null = null;
  try {
    const { data: rows, error: promErr } = await admin
      .rpc("promote_next_waitlist", { _event_id: eventId });
    if (promErr) {
      console.warn("[cancel-event-booking] promote rpc error:", promErr.message);
    } else if (Array.isArray(rows) && rows.length > 0) {
      const r = rows[0] as {
        waitlist_id: string;
        user_id: string;
        user_email: string;
        offer_token: string;
        offer_expires_at: string;
        event_id: string;
        event_title: string;
        event_slug: string;
      };
      const SITE_URL = Deno.env.get("SITE_URL") ?? Deno.env.get("VITE_SITE_URL") ?? "";
      const acceptUrl = `${(SITE_URL || "").replace(/\/$/, "")}/waitlist/accept?token=${r.offer_token}`;
      try {
        await admin.functions.invoke("send-email", {
          body: {
            template: "waitlist-offer",
            to: r.user_email,
            data: {
              eventTitle: r.event_title,
              acceptUrl,
              expiresAt: r.offer_expires_at,
            },
            related: { user_id: r.user_id, event_id: r.event_id },
          },
        });
      } catch (e) {
        console.warn("[cancel-event-booking] offer email failed:", (e as Error).message);
      }
      promoted = { user_email: r.user_email, expires_at: r.offer_expires_at };
    }
  } catch (e) {
    console.warn("[cancel-event-booking] promote exception:", (e as Error).message);
  }

  return json({ ok: true, promoted });
});
