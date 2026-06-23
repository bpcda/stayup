/**
 * Edge Function `send-email`
 *
 * Invio email operative via Resend con logging su `public.email_logs`.
 *
 * Comportamento:
 *   - Valida l'input (template, destinatario, payload).
 *   - Renderizza il template bilingue (IT/EN) da `_shared/emails.ts`.
 *   - Se `RESEND_API_KEY` NON è presente (es. ambiente dev), salta l'invio
 *     reale e registra la riga in `email_logs` con status='queued' e una
 *     `error_message` esplicativa. Restituisce HTTP 200 con `skipped: true`.
 *   - Se la chiave è presente, invia via Resend REST API e registra l'esito
 *     (`sent` con `provider_id`, oppure `failed` con `error_message`).
 *
 * Body atteso:
 * {
 *   "template": "registration-confirmation" | "booking-confirmation"
 *             | "event-reminder" | "booking-qr-code",
 *   "to": "user@example.com" | ["a@x", "b@y"],
 *   "locale": "it" | "en",            // opzionale, default "it"
 *   "data": { ... },                  // payload del template
 *   "from": "StayUp <notify@dom>",    // opzionale, override di RESEND_FROM_EMAIL
 *   "related": {                      // opzionale, per il log
 *     "user_id": "...", "event_id": "...", "booking_id": "..."
 *   }
 * }
 *
 * Secrets richiesti (in Supabase → Edge Functions → Secrets):
 *   - SUPABASE_URL              (auto-iniettata)
 *   - SUPABASE_SERVICE_ROLE_KEY (auto-iniettata)
 *   - RESEND_API_KEY            (richiesta solo per inviare davvero)
 *   - RESEND_FROM_EMAIL         (es: "StayUp <notify@dominio.tld>")
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { renderTemplate, type Locale, type TemplateName } from "../_shared/emails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  template: TemplateName;
  to: string | string[];
  locale?: Locale;
  data?: Record<string, unknown>;
  from?: string;
  related?: {
    user_id?: string;
    event_id?: string;
    booking_id?: string;
  };
}

const TEMPLATES: ReadonlyArray<TemplateName> = [
  "registration-confirmation",
  "booking-confirmation",
  "event-reminder",
  "booking-qr-code",
];

const RESEND_API_URL = "https://api.resend.com/emails";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validate(body: unknown): { ok: true; value: RequestBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON body" };
  const b = body as Record<string, unknown>;

  if (typeof b.template !== "string" || !TEMPLATES.includes(b.template as TemplateName)) {
    return { ok: false, error: `template must be one of ${TEMPLATES.join(", ")}` };
  }

  const tos = Array.isArray(b.to) ? b.to : [b.to];
  if (tos.length === 0 || !tos.every(isEmail)) {
    return { ok: false, error: "`to` must be an email or array of emails" };
  }

  if (b.locale !== undefined && b.locale !== "it" && b.locale !== "en") {
    return { ok: false, error: "locale must be 'it' or 'en'" };
  }

  if (b.data !== undefined && (typeof b.data !== "object" || b.data === null)) {
    return { ok: false, error: "data must be an object" };
  }

  return {
    ok: true,
    value: {
      template: b.template as TemplateName,
      to: tos as string[],
      locale: (b.locale as Locale | undefined) ?? "it",
      data: (b.data as Record<string, unknown>) ?? {},
      from: typeof b.from === "string" ? b.from : undefined,
      related: (b.related as RequestBody["related"]) ?? undefined,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const parsed = validate(rawBody);
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, 400);
  const { template, to, locale, data, from, related } = parsed.value;

  // Render
  let rendered: { subject: string; html: string; text: string };
  try {
    rendered = renderTemplate(template, { ...data, locale });
  } catch (e) {
    return jsonResponse(
      { error: `Failed to render template: ${(e as Error).message}` },
      500,
    );
  }

  // Supabase service-role client per scrivere su email_logs.
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAdmin =
    SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const RESEND_FROM_EMAIL =
    from ?? Deno.env.get("RESEND_FROM_EMAIL") ?? undefined;

  const recipients = Array.isArray(to) ? to : [to];
  const primaryRecipient = recipients[0];

  // Helper di logging — non rompe il flusso se il logging fallisce.
  const log = async (
    status: "queued" | "sent" | "failed",
    extras: { provider_id?: string; error_message?: string } = {},
  ) => {
    if (!supabaseAdmin) {
      console.warn("[send-email] no service-role client, skipping email_logs insert");
      return;
    }
    const { error } = await supabaseAdmin.from("email_logs").insert({
      to_email: primaryRecipient,
      from_email: RESEND_FROM_EMAIL ?? null,
      subject: rendered.subject,
      template,
      status,
      provider_id: extras.provider_id ?? null,
      error_message: extras.error_message ?? null,
      related_user_id: related?.user_id ?? null,
      related_event_id: related?.event_id ?? null,
      related_booking_id: related?.booking_id ?? null,
      payload: { locale, recipients, data: data ?? {} },
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });
    if (error) {
      console.error("[send-email] email_logs insert failed:", error.message);
    }
  };

  // Dev mode: nessuna RESEND_API_KEY → non inviamo, ma logghiamo.
  if (!RESEND_API_KEY) {
    await log("queued", {
      error_message: "skipped: RESEND_API_KEY not configured (dev mode)",
    });
    return jsonResponse({
      skipped: true,
      reason: "RESEND_API_KEY not configured",
      template,
      to: recipients,
      subject: rendered.subject,
    });
  }

  if (!RESEND_FROM_EMAIL) {
    await log("failed", { error_message: "RESEND_FROM_EMAIL not configured" });
    return jsonResponse({ error: "RESEND_FROM_EMAIL not configured" }, 500);
  }

  // Invio reale via Resend REST API.
  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: recipients,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      const msg = json?.message ?? json?.name ?? `HTTP ${res.status}`;
      await log("failed", { error_message: `Resend ${res.status}: ${msg}` });
      return jsonResponse({ error: msg }, 502);
    }

    await log("sent", { provider_id: json?.id });
    return jsonResponse({ ok: true, id: json?.id, template, to: recipients });
  } catch (e) {
    const msg = (e as Error).message ?? "Unknown error";
    await log("failed", { error_message: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
