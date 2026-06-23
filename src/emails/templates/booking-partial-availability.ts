import { escapeHtml, renderLayout } from "../_layout";

export interface BookingPartialAvailabilityData {
  nome: string;
  eventTitle: string;
  /** Which leg is still available for this booking. */
  available: "andata" | "ritorno";
  giorno?: string;
  orario?: string;
  fermata?: string;
}

export function bookingPartialAvailabilityEmail(
  data: BookingPartialAvailabilityData,
) {
  const legLabel = data.available === "andata" ? "solo andata" : "solo ritorno";
  const subject = `Aggiornamento prenotazione — ${data.eventTitle} (${legLabel})`;
  const detailRows = [
    ["Evento", data.eventTitle],
    ["Servizio disponibile", legLabel],
    ["Giorno", data.giorno],
    ["Fermata", data.fermata],
    ["Orario", data.orario],
  ]
    .filter(([, v]) => !!v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#555">${escapeHtml(String(k))}</td><td style="padding:6px 0;text-align:right"><strong>${escapeHtml(String(v))}</strong></td></tr>`,
    )
    .join("");

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px">Ciao ${escapeHtml(data.nome)},</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">per ragioni di disponibilità navette, la tua prenotazione per <strong>${escapeHtml(data.eventTitle)}</strong> sarà servita <strong>${escapeHtml(legLabel)}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${detailRows}</table>
    <p style="margin:24px 0 0;font-size:14px;color:#555">Se hai dubbi, rispondi a questa email o contattaci sui nostri canali.</p>
  `;
  const html = renderLayout(body, {
    preheader: `La tua prenotazione sarà ${legLabel}`,
    title: subject,
  });
  return {
    subject,
    html,
    text: `Ciao ${data.nome}, la tua prenotazione per ${data.eventTitle} sarà ${legLabel}.`,
  };
}
