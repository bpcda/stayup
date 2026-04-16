import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_ANDATA_TIMES: Record<string, string[]> = {
  "Università Cattolica": ["12:30", "14:00", "15:30", "17:00", "18:30", "21:00"],
  "Cheope": ["12:45", "14:15", "15:45", "17:15", "18:45", "21:15"],
};
const VALID_RETURN_TIMES = ["17:45", "19:15", "21:45", "23:00", "00:30", "2:00"];
const VALID_DAYS = ["25 Aprile", "26 Aprile"];
const VALID_STOPS = ["Università Cattolica", "Cheope"];
const VALID_TYPES = ["andata", "ritorno", "andata_ritorno"];
const SLOT_CAPACITY = 50;

const PAYPAL_LINK = Deno.env.get("PAYPAL_LINK") || "https://paypal.me/stayup";

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h < 6 ? (h + 24) * 60 + m : h * 60 + m;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { nome, email, telefono, tipo_viaggio, giorno, fermata, orario, orario_ritorno } = body;

    // --- Basic validation ---
    if (!nome || typeof nome !== "string" || nome.trim().length === 0) {
      return jsonError("Nome obbligatorio", 400);
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return jsonError("Email non valida", 400);
    }
    if (!telefono || typeof telefono !== "string") {
      return jsonError("Telefono obbligatorio", 400);
    }
    if (!VALID_TYPES.includes(tipo_viaggio)) {
      return jsonError("Tipo viaggio non valido", 400);
    }

    const needsAndata = tipo_viaggio === "andata" || tipo_viaggio === "andata_ritorno";
    const needsRitorno = tipo_viaggio === "ritorno" || tipo_viaggio === "andata_ritorno";

    if (!giorno || !VALID_DAYS.includes(giorno)) {
      return jsonError("Giorno non valido", 400);
    }

    // --- Validate andata ---
    let finalOrario = orario;
    let andataBumped = false;

    if (needsAndata) {
      if (!fermata || !VALID_STOPS.includes(fermata)) {
        return jsonError("Fermata non valida", 400);
      }
      const validTimes = VALID_ANDATA_TIMES[fermata];
      if (!orario || !validTimes.includes(orario)) {
        return jsonError("Orario di andata non valido per questa fermata", 400);
      }

      // Check capacity from shuttle_slots + bookings count
      const slotIdx = validTimes.indexOf(orario);
      const { count: andataCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("giorno", giorno)
        .eq("fermata", fermata)
        .eq("orario", orario);

      if ((andataCount || 0) >= SLOT_CAPACITY) {
        // Try to bump to next available slot
        let bumped = false;
        for (let i = slotIdx + 1; i < validTimes.length; i++) {
          const { count: nextCount } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("giorno", giorno)
            .eq("fermata", fermata)
            .eq("orario", validTimes[i]);
          if ((nextCount || 0) < SLOT_CAPACITY) {
            finalOrario = validTimes[i];
            andataBumped = true;
            bumped = true;
            break;
          }
        }
        if (!bumped) {
          return jsonError("Tutti gli slot di andata da questa fermata sono pieni", 400);
        }
      }
    }

    // --- Validate ritorno ---
    let finalOrarioRitorno = orario_ritorno;
    let ritornoBumped = false;

    if (needsRitorno) {
      if (!orario_ritorno || !VALID_RETURN_TIMES.includes(orario_ritorno)) {
        return jsonError("Orario di ritorno non valido", 400);
      }

      // Check andata < ritorno for andata_ritorno
      if (needsAndata && finalOrario) {
        if (timeToMinutes(orario_ritorno) <= timeToMinutes(finalOrario)) {
          return jsonError("L'orario di ritorno deve essere successivo a quello di andata", 400);
        }
      }

      const returnIdx = VALID_RETURN_TIMES.indexOf(orario_ritorno);
      const { count: returnCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("giorno", giorno)
        .eq("orario_ritorno", orario_ritorno)
        .in("tipo_viaggio", ["ritorno", "andata_ritorno"]);

      if ((returnCount || 0) >= SLOT_CAPACITY) {
        let bumped = false;
        for (let i = returnIdx + 1; i < VALID_RETURN_TIMES.length; i++) {
          const candidate = VALID_RETURN_TIMES[i];
          // Ensure still after andata
          if (needsAndata && finalOrario && timeToMinutes(candidate) <= timeToMinutes(finalOrario)) {
            continue;
          }
          const { count: nextCount } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("giorno", giorno)
            .eq("orario_ritorno", candidate)
            .in("tipo_viaggio", ["ritorno", "andata_ritorno"]);
          if ((nextCount || 0) < SLOT_CAPACITY) {
            finalOrarioRitorno = candidate;
            ritornoBumped = true;
            bumped = true;
            break;
          }
        }
        if (!bumped) {
          return jsonError("Tutti gli slot di ritorno sono pieni", 400);
        }
      }
    }

    // --- Insert booking ---
    const bookingData = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono.trim(),
      tipo_viaggio,
      giorno,
      fermata: needsAndata ? fermata : null,
      orario: needsAndata ? finalOrario : null,
      orario_ritorno: needsRitorno ? finalOrarioRitorno : null,
      stato: "pending",
      pagato: false,
    };

    const { error: insertError } = await supabase.from("bookings").insert(bookingData);
    if (insertError) {
      console.error("Insert error:", insertError);
      return jsonError("Errore durante il salvataggio della prenotazione", 500);
    }

    // --- Send email ---
    const wasBumped = andataBumped || ritornoBumped;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      let bumpNotice = "";
      if (andataBumped) {
        bumpNotice += `<p style="color: #f59e0b; font-weight: 600;">⚠️ Lo slot di andata delle ${orario} era pieno. Sei stato/a spostato/a alle <strong>${finalOrario}</strong>.</p>`;
      }
      if (ritornoBumped) {
        bumpNotice += `<p style="color: #f59e0b; font-weight: 600;">⚠️ Lo slot di ritorno delle ${orario_ritorno} era pieno. Sei stato/a spostato/a alle <strong>${finalOrarioRitorno}</strong>.</p>`;
      }

      const htmlContent = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f5f5f5; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: #0a0a0a; font-weight: 700;">StayUp</h1>
          </div>
          <div style="padding: 32px 24px;">
            <h2 style="color: #f59e0b; margin: 0 0 20px; font-size: 20px;">Completa il pagamento</h2>
            <p style="color: #a3a3a3; line-height: 1.6; margin: 0 0 16px;">
              Ciao <strong style="color: #f5f5f5;">${nome}</strong>, ecco il riepilogo della tua prenotazione navetta:
            </p>
            ${bumpNotice}
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0 24px;">
              <tr><td style="padding: 8px 0; color: #a3a3a3;">Giorno</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${giorno}</td></tr>
              <tr><td style="padding: 8px 0; color: #a3a3a3;">Fermata</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${needsAndata ? fermata : "/"}</td></tr>
              <tr><td style="padding: 8px 0; color: #a3a3a3;">Orario Andata</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${needsAndata ? finalOrario : "/"}</td></tr>
              <tr><td style="padding: 8px 0; color: #a3a3a3;">Orario Ritorno</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${needsRitorno ? finalOrarioRitorno : "/"}</td></tr>
              <tr><td style="padding: 8px 0; color: #a3a3a3;">Email</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${email}</td></tr>
              <tr><td style="padding: 8px 0; color: #a3a3a3;">Telefono</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${telefono}</td></tr>
            </table>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${PAYPAL_LINK}" style="background: #f59e0b; color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
                Paga con PayPal
              </a>
            </div>
            <p style="color: #737373; font-size: 13px; text-align: center; line-height: 1.5;">
              La tua iscrizione sarà confermata manualmente dopo verifica del pagamento.
            </p>
          </div>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "StayUp <onboarding@resend.dev>",
          to: [email.trim().toLowerCase()],
          subject: wasBumped
            ? "Prenotazione confermata (orario modificato) - StayUp"
            : "Completa il pagamento - StayUp",
          html: htmlContent,
        }),
      }).catch((err) => console.warn("Email send failed:", err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        bumped: wasBumped,
        finalOrario: needsAndata ? finalOrario : null,
        finalOrarioRitorno: needsRitorno ? finalOrarioRitorno : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in create-booking:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
