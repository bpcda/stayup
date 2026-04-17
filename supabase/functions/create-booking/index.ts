import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_DAYS = ["25 Aprile", "26 Aprile"];
const VALID_TYPES = ["andata", "ritorno", "andata_ritorno"];

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
    const { nome, email, telefono, tipo_viaggio, giorno, fermata, orario, orario_ritorno, testMode } = body;

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

    // --- Validate andata using shuttle_slots from DB ---
    let finalOrario = orario;
    let andataBumped = false;

    if (needsAndata) {
      if (!fermata || typeof fermata !== "string") {
        return jsonError("Fermata non valida", 400);
      }

      const { data: dbSlots, error: slotsError } = await supabase
        .from("shuttle_slots")
        .select("orario, capienza")
        .eq("giorno", giorno)
        .eq("fermata", fermata)
        .order("orario", { ascending: true });

      if (slotsError || !dbSlots || dbSlots.length === 0) {
        return jsonError("Nessuno slot disponibile per questa fermata/giorno", 400);
      }

      const validTimes = dbSlots.map((s: { orario: string }) => s.orario);
      const capacityMap: Record<string, number> = {};
      dbSlots.forEach((s: { orario: string; capienza: number }) => {
        capacityMap[s.orario] = s.capienza;
      });

      if (!orario || !validTimes.includes(orario)) {
        return jsonError("Orario di andata non valido per questa fermata", 400);
      }

      // Count only PAID bookings for capacity check
      const { data: paidBookings } = await supabase
        .from("bookings")
        .select("orario")
        .eq("giorno", giorno)
        .eq("fermata", fermata)
        .eq("pagato", true)
        .in("orario", validTimes);

      const paidCounts: Record<string, number> = {};
      (paidBookings || []).forEach((b: { orario: string }) => {
        paidCounts[b.orario] = (paidCounts[b.orario] || 0) + 1;
      });

      const slotIdx = validTimes.indexOf(orario);
      if ((paidCounts[orario] || 0) >= capacityMap[orario]) {
        let bumped = false;
        for (let i = slotIdx + 1; i < validTimes.length; i++) {
          const t = validTimes[i];
          if ((paidCounts[t] || 0) < capacityMap[t]) {
            finalOrario = t;
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

    // --- Validate ritorno using shuttle_return_slots from DB ---
    let finalOrarioRitorno = orario_ritorno;
    let ritornoBumped = false;

    if (needsRitorno) {
      const { data: dbReturnSlots, error: returnSlotsError } = await supabase
        .from("shuttle_return_slots")
        .select("orario, capienza")
        .eq("giorno", giorno)
        .order("orario", { ascending: true });

      if (returnSlotsError || !dbReturnSlots || dbReturnSlots.length === 0) {
        return jsonError("Nessuno slot di ritorno disponibile per questo giorno", 400);
      }

      const validReturnTimes = dbReturnSlots.map((s: { orario: string }) => s.orario);
      const returnCapacityMap: Record<string, number> = {};
      dbReturnSlots.forEach((s: { orario: string; capienza: number }) => {
        returnCapacityMap[s.orario] = s.capienza;
      });

      if (!orario_ritorno || !validReturnTimes.includes(orario_ritorno)) {
        return jsonError("Orario di ritorno non valido", 400);
      }

      // Check andata < ritorno for andata_ritorno
      if (needsAndata && finalOrario) {
        if (timeToMinutes(orario_ritorno) <= timeToMinutes(finalOrario)) {
          return jsonError("L'orario di ritorno deve essere successivo a quello di andata", 400);
        }
      }

      // Count only PAID return bookings
      const { data: paidReturnBookings } = await supabase
        .from("bookings")
        .select("orario_ritorno")
        .eq("giorno", giorno)
        .eq("pagato", true)
        .in("tipo_viaggio", ["ritorno", "andata_ritorno"])
        .in("orario_ritorno", validReturnTimes);

      const paidReturnCounts: Record<string, number> = {};
      (paidReturnBookings || []).forEach((b: { orario_ritorno: string }) => {
        if (b.orario_ritorno) paidReturnCounts[b.orario_ritorno] = (paidReturnCounts[b.orario_ritorno] || 0) + 1;
      });

      const returnIdx = validReturnTimes.indexOf(orario_ritorno);
      if ((paidReturnCounts[orario_ritorno] || 0) >= returnCapacityMap[orario_ritorno]) {
        let bumped = false;
        for (let i = returnIdx + 1; i < validReturnTimes.length; i++) {
          const candidate = validReturnTimes[i];
          if (needsAndata && finalOrario && timeToMinutes(candidate) <= timeToMinutes(finalOrario)) {
            continue;
          }
          if ((paidReturnCounts[candidate] || 0) < returnCapacityMap[candidate]) {
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

    // --- Send email (skipped in test mode) ---
    const wasBumped = andataBumped || ritornoBumped;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (testMode === true) {
      console.log("[TEST MODE] create-booking: email NOT sent for", email);
    } else if (RESEND_API_KEY) {
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
            <img src="https://drebkzidqxekaepjpsmc.supabase.co/storage/v1/object/public/misc/stayup.png" alt="StayUp" width="120" style="display: inline-block; max-width: 120px; height: auto;" />
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
          from: "StayUp <noreply@stayupallnight.it>",
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
