const PAYPAL_LINK = process.env.PAYPAL_LINK || "https://paypal.me/stayup";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export default async ({ req, res, log, error }) => {
  if (req.method !== "POST") {
    return res.json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { nome, email, telefono, giorno, fermata, orario_andata, orario_ritorno, confirmed, spostamento, testMode, event_title, price_paid } = body;

    if (testMode === true) {
      log("[TEST MODE] Email NOT sent. Payload: " + JSON.stringify({ nome, email, confirmed, spostamento }));
      return res.json({ success: true, testMode: true, skipped: true }, 200);
    }

    if (!nome || !email) {
      return res.json({ error: "Missing required fields" }, 400);
    }

    const isConfirmed = confirmed === true;
    const isSpostamento = spostamento === true;

    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f5f5f5; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; text-align: center;">
          <img src="https://drebkzidqxekaepjpsmc.supabase.co/storage/v1/object/public/misc/stayup.png" alt="StayUp" width="120" style="display: inline-block; max-width: 120px; height: auto;" />
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #f59e0b; margin: 0 0 20px; font-size: 20px;">${isSpostamento ? "Orario modificato ⚠️" : isConfirmed ? "Prenotazione confermata ✅" : "Completa il pagamento"}</h2>
          <p style="color: #a3a3a3; line-height: 1.6; margin: 0 0 24px;">
            Ciao <strong style="color: #f5f5f5;">${nome}</strong>, ${isSpostamento ? "la tua prenotazione navetta è stata modificata. Ecco i nuovi dettagli:" : "ecco il riepilogo della tua prenotazione navetta:"}
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            ${event_title ? `<tr><td style="padding: 8px 0; color: #a3a3a3;">Evento</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${event_title}</td></tr>` : ""}
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Giorno</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${giorno || "/"}</td></tr>
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Fermata</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${fermata || "/"}</td></tr>
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Orario Andata</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${orario_andata || "/"}</td></tr>
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Orario Ritorno</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${orario_ritorno || "/"}</td></tr>
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Importo</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #f59e0b;">€ ${Number(price_paid || 0).toFixed(2)}</td></tr>
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Email</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${email}</td></tr>
            <tr><td style="padding: 8px 0; color: #a3a3a3;">Telefono</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${telefono || "/"}</td></tr>
          </table>
          ${isSpostamento ? (isConfirmed ? `
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #f59e0b; font-size: 16px; font-weight: 600;">⚠️ I tuoi orari sono stati aggiornati. Controlla i dettagli qui sopra.</p>
            <p style="color: #22c55e; font-size: 14px; margin-top: 8px;">Il tuo pagamento è già stato registrato — non devi fare nulla! 🎉</p>
          </div>
          ` : `
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #f59e0b; font-size: 16px; font-weight: 600;">⚠️ I tuoi orari sono stati aggiornati. Controlla i dettagli qui sopra.</p>
            <a href="${PAYPAL_LINK}" style="background: #f59e0b; color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; margin-top: 16px;">
              Paga con PayPal
            </a>
            <p style="color: #f59e0b; font-size: 13px; line-height: 1.5; margin-top: 12px; font-weight: 600;">
              ⚠️ Nella causale del pagamento inserisci il tuo nome e quello degli amici per cui paghi (se prenoti per più persone).
            </p>
            <p style="color: #737373; font-size: 13px; text-align: center; line-height: 1.5; margin-top: 8px;">
              La tua iscrizione sarà confermata manualmente dopo verifica del pagamento.
            </p>
          </div>
          `) : isConfirmed ? `
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #22c55e; font-size: 16px; font-weight: 600;">Pagamento ricevuto — ci vediamo alla fermata! 🎉</p>
          </div>
          ` : `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${PAYPAL_LINK}" style="background: #f59e0b; color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
              Paga con PayPal
            </a>
          </div>
          <p style="color: #f59e0b; font-size: 13px; text-align: center; line-height: 1.5; margin: 0 0 12px; font-weight: 600;">
            ⚠️ Nella causale del pagamento inserisci il tuo nome e quello degli amici per cui paghi (se prenoti per più persone).
          </p>
          <p style="color: #737373; font-size: 13px; text-align: center; line-height: 1.5;">
            La tua iscrizione sarà confermata manualmente dopo verifica del pagamento.
          </p>
          `}
        </div>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "StayUp <noreply@stayupallnight.it>",
        to: [email],
        subject: isSpostamento ? "Orario modificato - StayUp" : isConfirmed ? "Pagamento confermato - StayUp" : "Completa il pagamento - StayUp",
        html: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Resend API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    return res.json({ success: true }, 200);
  } catch (err) {
    error("Error sending email: " + err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.json({ error: message }, 500);
  }
};
