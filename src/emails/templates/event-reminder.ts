import { escapeHtml, renderButton, renderLayout, renderRows, type Locale } from "../_layout";

export interface EventReminderData {
  nome: string;
  eventTitle: string;
  /** ISO timestamp dell'inizio evento, in fuso del server. */
  startsAt: string;
  location?: string;
  venue?: string;
  eventUrl?: string;
  locale?: Locale;
}

const STRINGS = {
  it: {
    subject: (e: string) => `Promemoria — ${e}`,
    preheader: (e: string) => `Manca poco a ${e}`,
    hi: (n: string) => `Ciao ${n},`,
    intro: "ti ricordiamo l'evento a cui ti sei iscritto. Salvalo nel calendario!",
    cta: "Vedi dettagli evento",
    bye: "A presto,\nIl team StayUp",
    labels: { event: "Evento", when: "Quando", where: "Dove", venue: "Luogo" },
  },
  en: {
    subject: (e: string) => `Reminder — ${e}`,
    preheader: (e: string) => `${e} is coming up`,
    hi: (n: string) => `Hi ${n},`,
    intro: "a quick reminder of the event you signed up for. Save it in your calendar!",
    cta: "View event details",
    bye: "See you soon,\nThe StayUp team",
    labels: { event: "Event", when: "When", where: "Where", venue: "Venue" },
  },
} as const;

function formatWhen(iso: string, locale: Locale): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(locale === "it" ? "it-IT" : "en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function eventReminderEmail(data: EventReminderData) {
  const locale: Locale = data.locale ?? "it";
  const s = STRINGS[locale];
  const subject = s.subject(data.eventTitle);

  const rows: Array<[string, string | undefined]> = [
    [s.labels.event, data.eventTitle],
    [s.labels.when, formatWhen(data.startsAt, locale)],
    [s.labels.where, data.location],
    [s.labels.venue, data.venue],
  ];

  const cta = data.eventUrl ? renderButton(data.eventUrl, s.cta) : "";

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(s.hi(data.nome))}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapeHtml(s.intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${renderRows(rows)}</table>
    ${cta}
    <p style="margin:24px 0 0;font-size:14px;color:#555;white-space:pre-line">${escapeHtml(s.bye)}</p>
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
    (data.eventUrl ? `\n\n${s.cta}: ${data.eventUrl}` : "") +
    `\n\n${s.bye}`;

  return { subject, html, text };
}
