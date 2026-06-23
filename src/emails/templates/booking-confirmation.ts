import { escapeHtml, renderLayout, renderRows, type Locale } from "../_layout";

export interface BookingConfirmationData {
  nome: string;
  eventTitle: string;
  tipoViaggio?: "andata" | "ritorno" | "andata_ritorno";
  giorno?: string;
  fermata?: string;
  orario?: string;
  orarioRitorno?: string;
  pricePaid?: number;
  referenceCode?: string;
  locale?: Locale;
}

const STRINGS = {
  it: {
    subject: (e: string) => `Prenotazione confermata — ${e}`,
    preheader: (e: string) => `Prenotazione confermata per ${e}`,
    hi: (n: string) => `Ciao ${n},`,
    intro: "la tua prenotazione è confermata. Ecco il riepilogo:",
    bye: "Ci vediamo presto!",
    labels: {
      event: "Evento",
      tipo: "Tipo viaggio",
      ref: "Codice prenotazione",
      day: "Giorno",
      stop: "Fermata",
      out: "Orario andata",
      ret: "Orario ritorno",
      total: "Totale pagato",
    },
    tipo: {
      andata: "Solo andata",
      ritorno: "Solo ritorno",
      andata_ritorno: "Andata + Ritorno",
    } as Record<string, string>,
  },
  en: {
    subject: (e: string) => `Booking confirmed — ${e}`,
    preheader: (e: string) => `Booking confirmed for ${e}`,
    hi: (n: string) => `Hi ${n},`,
    intro: "your booking is confirmed. Here's the summary:",
    bye: "See you soon!",
    labels: {
      event: "Event",
      tipo: "Trip type",
      ref: "Booking code",
      day: "Day",
      stop: "Pickup stop",
      out: "Outbound time",
      ret: "Return time",
      total: "Total paid",
    },
    tipo: {
      andata: "Outbound only",
      ritorno: "Return only",
      andata_ritorno: "Outbound + Return",
    } as Record<string, string>,
  },
} as const;

export function bookingConfirmationEmail(data: BookingConfirmationData) {
  const locale: Locale = data.locale ?? "it";
  const s = STRINGS[locale];
  const subject = s.subject(data.eventTitle);

  const rows: Array<[string, string | undefined]> = [
    [s.labels.event, data.eventTitle],
    [s.labels.ref, data.referenceCode],
    [s.labels.tipo, data.tipoViaggio ? s.tipo[data.tipoViaggio] : undefined],
    [s.labels.day, data.giorno],
    [s.labels.stop, data.fermata],
    [s.labels.out, data.orario],
    [s.labels.ret, data.orarioRitorno],
    [
      s.labels.total,
      data.pricePaid !== undefined ? `${data.pricePaid.toFixed(2)} €` : undefined,
    ],
  ];

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(s.hi(data.nome))}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapeHtml(s.intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${renderRows(rows)}</table>
    <p style="margin:24px 0 0;font-size:14px;color:#555">${escapeHtml(s.bye)}</p>
  `;

  const html = renderLayout(body, {
    preheader: s.preheader(data.eventTitle),
    title: subject,
    locale,
  });
  const text =
    `${s.hi(data.nome)}\n\n${s.intro}\n\n` +
    rows
      .filter(([, v]) => !!v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n") +
    `\n\n${s.bye}`;

  return { subject, html, text };
}
