import { escapeHtml, renderLayout } from "../_layout";

export interface BookingConfirmationData {
  nome: string;
  eventTitle: string;
  tipoViaggio: "andata" | "ritorno" | "andata_ritorno";
  giorno?: string;
  fermata?: string;
  orario?: string;
  orarioRitorno?: string;
  pricePaid?: number;
}

export function bookingConfirmationEmail(data: BookingConfirmationData) {
  const subject = `Prenotazione confermata — ${data.eventTitle}`;
  const rows: Array<[string, string | undefined]> = [
    ["Evento", data.eventTitle],
    ["Tipo viaggio", data.tipoViaggio.replace("_", " + ")],
    ["Giorno", data.giorno],
    ["Fermata", data.fermata],
    ["Orario andata", data.orario],
    ["Orario ritorno", data.orarioRitorno],
    [
      "Totale pagato",
      data.pricePaid !== undefined ? `${data.pricePaid.toFixed(2)} €` : undefined,
    ],
  ];
  const rowsHtml = rows
    .filter(([, v]) => !!v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#555">${escapeHtml(k)}</td><td style="padding:6px 0;text-align:right"><strong>${escapeHtml(String(v))}</strong></td></tr>`,
    )
    .join("");

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px">Ciao ${escapeHtml(data.nome)},</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">la tua prenotazione è confermata. Ecco il riepilogo:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rowsHtml}</table>
    <p style="margin:24px 0 0;font-size:14px;color:#555">Ci vediamo presto!</p>
  `;
  const html = renderLayout(body, {
    preheader: `Prenotazione confermata per ${data.eventTitle}`,
    title: subject,
  });
  const text = rows
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return { subject, html, text: `Ciao ${data.nome},\n\n${text}` };
}
