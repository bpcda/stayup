import { escapeHtml, renderLayout, renderRows, type Locale } from "../_layout";

export interface BookingQrCodeData {
  nome: string;
  eventTitle: string;
  referenceCode: string;
  /**
   * Data URL del QR code (es. `data:image/png;base64,...`).
   * Generato dal chiamante (Edge Function) usando una libreria QR.
   */
  qrDataUrl: string;
  /** Fallback testuale: payload del QR (URL o stringa) per i client che bloccano le immagini. */
  qrPayload?: string;
  startsAt?: string;
  location?: string;
  locale?: Locale;
}

const STRINGS = {
  it: {
    subject: (e: string) => `Il tuo QR per ${e}`,
    preheader: "Mostra questo QR all'ingresso",
    hi: (n: string) => `Ciao ${n},`,
    intro:
      "questo è il tuo QR code di accesso. Mostralo allo staff all'ingresso dell'evento.",
    altQr: "QR code di accesso",
    fallback: "Se non vedi l'immagine, usa questo codice:",
    bye: "Buon divertimento!",
    labels: { event: "Evento", ref: "Codice", when: "Quando", where: "Dove" },
  },
  en: {
    subject: (e: string) => `Your QR ticket for ${e}`,
    preheader: "Show this QR at the entrance",
    hi: (n: string) => `Hi ${n},`,
    intro:
      "here is your access QR code. Show it to the staff at the event entrance.",
    altQr: "Access QR code",
    fallback: "If you can't see the image, use this code:",
    bye: "Have fun!",
    labels: { event: "Event", ref: "Code", when: "When", where: "Where" },
  },
} as const;

export function bookingQrCodeEmail(data: BookingQrCodeData) {
  const locale: Locale = data.locale ?? "it";
  const s = STRINGS[locale];
  const subject = s.subject(data.eventTitle);

  const rows: Array<[string, string | undefined]> = [
    [s.labels.event, data.eventTitle],
    [s.labels.ref, data.referenceCode],
    [s.labels.when, data.startsAt],
    [s.labels.where, data.location],
  ];

  const qrBlock = `
    <div style="text-align:center;margin:24px 0">
      <img src="${escapeHtml(data.qrDataUrl)}" alt="${escapeHtml(s.altQr)}" width="220" height="220"
        style="display:inline-block;border:8px solid #ffffff;border-radius:8px;background:#ffffff;max-width:220px;height:auto" />
    </div>
    ${
      data.qrPayload
        ? `<p style="margin:0;font-size:12px;color:#555;text-align:center">${escapeHtml(s.fallback)}<br/><span style="font-family:monospace;word-break:break-all">${escapeHtml(data.qrPayload)}</span></p>`
        : ""
    }
  `;

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(s.hi(data.nome))}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapeHtml(s.intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${renderRows(rows)}</table>
    ${qrBlock}
    <p style="margin:24px 0 0;font-size:14px;color:#555">${escapeHtml(s.bye)}</p>
  `;

  const html = renderLayout(body, { preheader: s.preheader, title: subject, locale });
  const text =
    `${s.hi(data.nome)}\n\n${s.intro}\n\n` +
    rows
      .filter(([, v]) => !!v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n") +
    (data.qrPayload ? `\n\n${s.fallback} ${data.qrPayload}` : "") +
    `\n\n${s.bye}`;

  return { subject, html, text };
}
