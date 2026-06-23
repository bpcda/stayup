// supabase/functions/create-event-booking/index.ts
// Crea una prenotazione evento confermata (atomica), invia email Resend con QR
// e logga l'invio in email_logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Booking {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  reference_code: string | null;
  qr_token: string | null;
  booked_at: string;
}

interface EventInfo {
  id: string;
  title: string;
  starts_at: string | null;
  location: string | null;
  venue: string | null;
  cover_image_url: string | null;
}

const ERROR_MAP: Record<string, { status: number; message: string }> = {
  event_not_found: { status: 404, message: "Evento non trovato." },
  event_not_bookable: { status: 400, message: "L'evento non è prenotabile." },
  sold_out: { status: 409, message: "Posti esauriti per questo evento." },
  not_authenticated: { status: 401, message: "Sessione non valida." },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "missing_token" }, 401);

  // Client con il JWT dell'utente per richiamare la RPC come quell'utente (RLS attive).
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  // Client service-role per email_logs e fetch utente.
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verifica sessione
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData.user) return json({ error: "invalid_token" }, 401);
  const userEmail = userData.user.email ?? "";
  const userName = (userData.user.user_metadata?.full_name as string | undefined) ?? userEmail;

  let body: { event_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const eventId = body.event_id;
  if (!eventId || typeof eventId !== "string") {
    return json({ error: "missing_event_id" }, 400);
  }

  // Chiama la RPC atomica (capienza + insert in transazione)
  const { data: bookingData, error: rpcErr } = await supabaseUser.rpc("create_event_booking", {
    p_event_id: eventId,
  });

  if (rpcErr) {
    const msg = rpcErr.message ?? "";
    for (const code of Object.keys(ERROR_MAP)) {
      if (msg.includes(code)) {
        const { status, message } = ERROR_MAP[code];
        return json({ error: code, message }, status);
      }
    }
    console.error("[create-event-booking] RPC error:", rpcErr);
    return json({ error: "booking_failed", message: msg || "Errore durante la prenotazione." }, 500);
  }

  const booking = bookingData as Booking | null;
  if (!booking) return json({ error: "booking_failed" }, 500);

  // Recupera info evento per l'email
  const { data: ev } = await supabaseAdmin
    .from("events")
    .select("id, title, starts_at, location, venue, cover_image_url")
    .eq("id", eventId)
    .maybeSingle();
  const event = (ev ?? null) as EventInfo | null;

  // Invia email (best-effort: non fa fallire la prenotazione)
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "StayUp <onboarding@resend.dev>";

  let emailStatus: "sent" | "failed" | "queued" = "queued";
  let emailError: string | null = null;
  let messageId: string | null = null;

  if (RESEND_API_KEY && userEmail && booking.qr_token) {
    try {
      const html = renderEmail({
        name: userName,
        event,
        booking,
      });
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM,
          to: [userEmail],
          subject: event?.title
            ? `Prenotazione confermata: ${event.title}`
            : "Prenotazione confermata",
          html,
          tags: [{ name: "type", value: "event_booking_confirmation" }],
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        emailStatus = "failed";
        emailError = typeof payload?.message === "string" ? payload.message : `HTTP ${res.status}`;
      } else {
        emailStatus = "sent";
        messageId = (payload?.id as string | undefined) ?? null;
      }
    } catch (e) {
      emailStatus = "failed";
      emailError = e instanceof Error ? e.message : String(e);
    }
  } else if (!RESEND_API_KEY) {
    emailStatus = "queued";
    emailError = "RESEND_API_KEY non configurata";
  }

  // Log email (best-effort)
  try {
    await supabaseAdmin.from("email_logs").insert({
      to_email: userEmail,
      template: "event_booking_confirmation",
      status: emailStatus,
      provider: "resend",
      message_id: messageId,
      error: emailError,
      related_event_id: eventId,
      related_booking_id: booking.id,
      payload: { reference_code: booking.reference_code },
    });
  } catch (e) {
    console.warn("[create-event-booking] email_logs insert failed:", e);
  }

  return json({
    ok: true,
    booking,
    email: { status: emailStatus, error: emailError },
  });
});

function renderEmail(opts: {
  name: string;
  event: EventInfo | null;
  booking: Booking;
}) {
  const { name, event, booking } = opts;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
    booking.qr_token ?? booking.id,
  )}`;
  const when = event?.starts_at
    ? new Date(event.starts_at).toLocaleString("it-IT", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const where = [event?.venue, event?.location].filter(Boolean).join(" · ") || "—";

  return `<!doctype html>
<html><body style="margin:0;background:#0a0a0a;font-family:Inter,Arial,sans-serif;color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#0a0a0a;">
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px;text-align:center;">
      <h1 style="margin:0;font-size:22px;color:#0a0a0a;">Prenotazione confermata ✅</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="margin:0 0 16px;line-height:1.6;">
        Ciao <strong>${escapeHtml(name)}</strong>, la tua prenotazione è confermata.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0 24px;">
        <tr><td style="padding:8px 0;color:#a3a3a3;">Evento</td><td style="padding:8px 0;text-align:right;font-weight:600;">${escapeHtml(event?.title ?? "—")}</td></tr>
        <tr><td style="padding:8px 0;color:#a3a3a3;">Quando</td><td style="padding:8px 0;text-align:right;font-weight:600;">${escapeHtml(when)}</td></tr>
        <tr><td style="padding:8px 0;color:#a3a3a3;">Dove</td><td style="padding:8px 0;text-align:right;font-weight:600;">${escapeHtml(where)}</td></tr>
        <tr><td style="padding:8px 0;color:#a3a3a3;">Codice</td><td style="padding:8px 0;text-align:right;font-weight:600;letter-spacing:1px;">${escapeHtml(booking.reference_code ?? "—")}</td></tr>
      </table>
      <div style="text-align:center;background:#ffffff;border-radius:12px;padding:20px;">
        <img src="${qrUrl}" alt="QR Code" width="240" height="240" style="display:block;margin:0 auto;" />
        <p style="margin:12px 0 0;color:#0a0a0a;font-size:12px;">Mostra questo QR all'ingresso</p>
      </div>
      <p style="margin:24px 0 0;color:#a3a3a3;font-size:12px;line-height:1.6;">
        Conserva questa email: trovi la tua prenotazione anche nella sezione "I miei eventi" del tuo profilo.
      </p>
    </div>
  </div>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));
}
