import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_LINK = Deno.env.get("PAYPAL_LINK") || "https://paypal.me/stayup";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { nome, email, telefono, giorno, fermata, orario_andata, orario_ritorno, confirmed, spostamento } = await req.json();

    if (!nome || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isConfirmed = confirmed === true;
    const isSpostamento = spostamento === true;

    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f5f5f5; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: #0a0a0a; font-weight: 700;">StayUp</h1>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #f59e0b; margin: 0 0 20px; font-size: 20px;">${isSpostamento ? "Orario modificato ⚠️" : isConfirmed ? "Prenotazione confermata ✅" : "Completa il pagamento"}</h2>
          <p style="color: #a3a3a3; line-height: 1.6; margin: 0 0 24px;">
            Ciao <strong style="color: #f5f5f5;">${nome}</strong>, ${isSpostamento ? "la tua prenotazione navetta è stata modificata. Ecco i nuovi dettagli:" : "ecco il riepilogo della tua prenotazione navetta:"}
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Giorno</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${giorno || "/"}</td></tr>
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Fermata</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${fermata || "/"}</td></tr>
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Orario Andata</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${orario_andata || "/"}</td></tr>
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Orario Ritorno</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${orario_ritorno || "/"}</td></tr>
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Email</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${email}</td></tr>
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Telefono</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${telefono || "/"}</td></tr>
          </table>
          ${isSpostamento ? `
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #f59e0b; font-size: 16px; font-weight: 600;">I tuoi orari sono stati aggiornati. Controlla i dettagli qui sopra.</p>
          </div>
          ` : isConfirmed ? `
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #22c55e; font-size: 16px; font-weight: 600;">Pagamento ricevuto — ci vediamo alla fermata! 🎉</p>
          </div>
          ` : `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${PAYPAL_LINK}" style="background: #f59e0b; color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
              Paga con PayPal
            </a>
          </div>
          <p style="color: #737373; font-size: 13px; text-align: center; line-height: 1.5;">
            La tua iscrizione sarà confermata manualmente dopo verifica del pagamento.
          </p>
          `}
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "StayUp <onboarding@resend.dev>",
        to: [email],
        subject: isSpostamento ? "Orario modificato - StayUp" : isConfirmed ? "Prenotazione confermata - StayUp" : "Completa il pagamento - StayUp",
        html: htmlContent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
