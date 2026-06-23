/**
 * Bundled email templates per le Supabase Edge Functions (Deno).
 *
 * Mirror dei template in `src/emails/` (stessa firma, stesso markup). Vivono
 * dentro `supabase/functions/_shared/` perché il bundler Supabase non
 * raggiunge file fuori da `supabase/functions/`. La fonte di verità per
 * design e copy è `src/emails/`; aggiornare in entrambi i punti quando
 * cambiano i contenuti.
 *
 * Tutti i template sono bilingue IT/EN (parametro `locale`, default "it").
 */

export type Locale = "it" | "en";

const BRAND = {
  bg: "#ffffff",
  surface: "#f7f7f7",
  text: "#111111",
  muted: "#555555",
  accent: "#000000",
};

const FOOTER: Record<Locale, string> = {
  it: "StayUp Piacenza — questa è una comunicazione automatica, non rispondere a questa email.",
  en: "StayUp Piacenza — this is an automated message, please do not reply to this email.",
};

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface LayoutOptions {
  preheader?: string;
  title?: string;
  locale?: Locale;
}

function renderLayout(bodyHtml: string, opts: LayoutOptions = {}): string {
  const locale: Locale = opts.locale ?? "it";
  const preheader = opts.preheader
    ? `<span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(opts.preheader)}</span>`
    : "";
  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(opts.title ?? "StayUp")}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.text}">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.surface};border-radius:12px"><tr><td style="padding:32px">
${bodyHtml}
<hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0" />
<p style="margin:0;font-size:12px;color:${BRAND.muted}">${FOOTER[locale]}</p>
</td></tr></table></td></tr></table></body></html>`;
}

function renderRows(rows: Array<[string, string | undefined | null]>): string {
  return rows
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#555">${escapeHtml(k)}</td><td style="padding:6px 0;text-align:right"><strong>${escapeHtml(String(v))}</strong></td></tr>`,
    )
    .join("");
}

function renderButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:${BRAND.accent};border-radius:8px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(label)}</a></td></tr></table>`;
}

// ============================================================================
// 1) Registration confirmation
// ============================================================================
export interface RegistrationConfirmationData {
  nome?: string;
  confirmUrl?: string;
  locale?: Locale;
}

export function registrationConfirmationEmail(data: RegistrationConfirmationData = {}) {
  const locale: Locale = data.locale ?? "it";
  const S = locale === "it"
    ? {
        subject: "Benvenuto su StayUp — conferma il tuo account",
        preheader: "Conferma la tua email per attivare l'account",
        hi: (n: string) => `Ciao ${n},`,
        intro: "grazie per esserti registrato su StayUp Piacenza. Per completare la registrazione conferma la tua email cliccando sul pulsante qui sotto.",
        cta: "Conferma email",
        fallback: "Se il pulsante non funziona, copia e incolla questo link nel browser:",
        noLink: "L'attivazione del tuo account avverrà al primo accesso. Se non ti sei registrato tu, ignora questa email.",
        bye: "A presto,\nIl team StayUp",
      }
    : {
        subject: "Welcome to StayUp — confirm your account",
        preheader: "Confirm your email to activate your account",
        hi: (n: string) => `Hi ${n},`,
        intro: "thanks for signing up on StayUp Piacenza. To complete the registration please confirm your email by clicking the button below.",
        cta: "Confirm email",
        fallback: "If the button doesn't work, copy and paste this link into your browser:",
        noLink: "Your account will be activated at first sign-in. If you didn't sign up, please ignore this email.",
        bye: "See you soon,\nThe StayUp team",
      };
  const nome = data.nome?.trim() || (locale === "it" ? "iscritto" : "there");
  const ctaBlock = data.confirmUrl
    ? `${renderButton(data.confirmUrl, S.cta)}<p style="margin:0 0 8px;font-size:13px;color:#555">${S.fallback}</p><p style="margin:0;font-size:12px;word-break:break-all"><a href="${escapeHtml(data.confirmUrl)}">${escapeHtml(data.confirmUrl)}</a></p>`
    : `<p style="margin:16px 0 0;font-size:14px;color:#555">${S.noLink}</p>`;
  const body = `<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(S.hi(nome))}</h1><p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapeHtml(S.intro)}</p>${ctaBlock}<p style="margin:24px 0 0;font-size:14px;color:#555;white-space:pre-line">${escapeHtml(S.bye)}</p>`;
  const html = renderLayout(body, { preheader: S.preheader, title: S.subject, locale });
  const text = `${S.hi(nome)}\n\n${S.intro}\n\n` + (data.confirmUrl ? `${S.cta}: ${data.confirmUrl}\n\n` : `${S.noLink}\n\n`) + S.bye;
  return { subject: S.subject, html, text };
}

// ============================================================================
// 2) Booking confirmation
// ============================================================================
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

export function bookingConfirmationEmail(data: BookingConfirmationData) {
  const locale: Locale = data.locale ?? "it";
  const S = locale === "it"
    ? {
        subject: `Prenotazione confermata — ${data.eventTitle}`,
        preheader: `Prenotazione confermata per ${data.eventTitle}`,
        hi: (n: string) => `Ciao ${n},`,
        intro: "la tua prenotazione è confermata. Ecco il riepilogo:",
        bye: "Ci vediamo presto!",
        l: { event: "Evento", tipo: "Tipo viaggio", ref: "Codice prenotazione", day: "Giorno", stop: "Fermata", out: "Orario andata", ret: "Orario ritorno", total: "Totale pagato" },
        tipo: { andata: "Solo andata", ritorno: "Solo ritorno", andata_ritorno: "Andata + Ritorno" } as Record<string, string>,
      }
    : {
        subject: `Booking confirmed — ${data.eventTitle}`,
        preheader: `Booking confirmed for ${data.eventTitle}`,
        hi: (n: string) => `Hi ${n},`,
        intro: "your booking is confirmed. Here's the summary:",
        bye: "See you soon!",
        l: { event: "Event", tipo: "Trip type", ref: "Booking code", day: "Day", stop: "Pickup stop", out: "Outbound time", ret: "Return time", total: "Total paid" },
        tipo: { andata: "Outbound only", ritorno: "Return only", andata_ritorno: "Outbound + Return" } as Record<string, string>,
      };
  const rows: Array<[string, string | undefined]> = [
    [S.l.event, data.eventTitle],
    [S.l.ref, data.referenceCode],
    [S.l.tipo, data.tipoViaggio ? S.tipo[data.tipoViaggio] : undefined],
    [S.l.day, data.giorno],
    [S.l.stop, data.fermata],
    [S.l.out, data.orario],
    [S.l.ret, data.orarioRitorno],
    [S.l.total, data.pricePaid !== undefined ? `${data.pricePaid.toFixed(2)} €` : undefined],
  ];
  const body = `<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(S.hi(data.nome))}</h1><p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapeHtml(S.intro)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${renderRows(rows)}</table><p style="margin:24px 0 0;font-size:14px;color:#555">${escapeHtml(S.bye)}</p>`;
  const html = renderLayout(body, { preheader: S.preheader, title: S.subject, locale });
  const text = `${S.hi(data.nome)}\n\n${S.intro}\n\n` + rows.filter(([, v]) => !!v).map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\n${S.bye}`;
  return { subject: S.subject, html, text };
}

// ============================================================================
// 3) Event reminder
// ============================================================================
export interface EventReminderData {
  nome: string;
  eventTitle: string;
  startsAt: string;
  location?: string;
  venue?: string;
  eventUrl?: string;
  locale?: Locale;
}

function formatWhen(iso: string, locale: Locale): string {
  try {
    return new Date(iso).toLocaleString(locale === "it" ? "it-IT" : "en-GB", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function eventReminderEmail(data: EventReminderData) {
  const locale: Locale = data.locale ?? "it";
  const S = locale === "it"
    ? {
        subject: `Promemoria — ${data.eventTitle}`,
        preheader: `Manca poco a ${data.eventTitle}`,
        hi: (n: string) => `Ciao ${n},`,
        intro: "ti ricordiamo l'evento a cui ti sei iscritto. Salvalo nel calendario!",
        cta: "Vedi dettagli evento",
        bye: "A presto,\nIl team StayUp",
        l: { event: "Evento", when: "Quando", where: "Dove", venue: "Luogo" },
      }
    : {
        subject: `Reminder — ${data.eventTitle}`,
        preheader: `${data.eventTitle} is coming up`,
        hi: (n: string) => `Hi ${n},`,
        intro: "a quick reminder of the event you signed up for. Save it in your calendar!",
        cta: "View event details",
        bye: "See you soon,\nThe StayUp team",
        l: { event: "Event", when: "When", where: "Where", venue: "Venue" },
      };
  const rows: Array<[string, string | undefined]> = [
    [S.l.event, data.eventTitle],
    [S.l.when, formatWhen(data.startsAt, locale)],
    [S.l.where, data.location],
    [S.l.venue, data.venue],
  ];
  const cta = data.eventUrl ? renderButton(data.eventUrl, S.cta) : "";
  const body = `<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(S.hi(data.nome))}</h1><p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapeHtml(S.intro)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${renderRows(rows)}</table>${cta}<p style="margin:24px 0 0;font-size:14px;color:#555;white-space:pre-line">${escapeHtml(S.bye)}</p>`;
  const html = renderLayout(body, { preheader: S.preheader, title: S.subject, locale });
  const text = `${S.hi(data.nome)}\n\n${S.intro}\n\n` + rows.filter(([, v]) => !!v).map(([k, v]) => `${k}: ${v}`).join("\n") + (data.eventUrl ? `\n\n${S.cta}: ${data.eventUrl}` : "") + `\n\n${S.bye}`;
  return { subject: S.subject, html, text };
}

// ============================================================================
// 4) Booking QR code
// ============================================================================
export interface BookingQrCodeData {
  nome: string;
  eventTitle: string;
  referenceCode: string;
  qrDataUrl: string;
  qrPayload?: string;
  startsAt?: string;
  location?: string;
  locale?: Locale;
}

export function bookingQrCodeEmail(data: BookingQrCodeData) {
  const locale: Locale = data.locale ?? "it";
  const S = locale === "it"
    ? {
        subject: `Il tuo QR per ${data.eventTitle}`,
        preheader: "Mostra questo QR all'ingresso",
        hi: (n: string) => `Ciao ${n},`,
        intro: "questo è il tuo QR code di accesso. Mostralo allo staff all'ingresso dell'evento.",
        altQr: "QR code di accesso",
        fallback: "Se non vedi l'immagine, usa questo codice:",
        bye: "Buon divertimento!",
        l: { event: "Evento", ref: "Codice", when: "Quando", where: "Dove" },
      }
    : {
        subject: `Your QR ticket for ${data.eventTitle}`,
        preheader: "Show this QR at the entrance",
        hi: (n: string) => `Hi ${n},`,
        intro: "here is your access QR code. Show it to the staff at the event entrance.",
        altQr: "Access QR code",
        fallback: "If you can't see the image, use this code:",
        bye: "Have fun!",
        l: { event: "Event", ref: "Code", when: "When", where: "Where" },
      };
  const rows: Array<[string, string | undefined]> = [
    [S.l.event, data.eventTitle],
    [S.l.ref, data.referenceCode],
    [S.l.when, data.startsAt],
    [S.l.where, data.location],
  ];
  const qrBlock = `<div style="text-align:center;margin:24px 0"><img src="${escapeHtml(data.qrDataUrl)}" alt="${escapeHtml(S.altQr)}" width="220" height="220" style="display:inline-block;border:8px solid #ffffff;border-radius:8px;background:#ffffff;max-width:220px;height:auto" /></div>${data.qrPayload ? `<p style="margin:0;font-size:12px;color:#555;text-align:center">${escapeHtml(S.fallback)}<br/><span style="font-family:monospace;word-break:break-all">${escapeHtml(data.qrPayload)}</span></p>` : ""}`;
  const body = `<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(S.hi(data.nome))}</h1><p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapeHtml(S.intro)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${renderRows(rows)}</table>${qrBlock}<p style="margin:24px 0 0;font-size:14px;color:#555">${escapeHtml(S.bye)}</p>`;
  const html = renderLayout(body, { preheader: S.preheader, title: S.subject, locale });
  const text = `${S.hi(data.nome)}\n\n${S.intro}\n\n` + rows.filter(([, v]) => !!v).map(([k, v]) => `${k}: ${v}`).join("\n") + (data.qrPayload ? `\n\n${S.fallback} ${data.qrPayload}` : "") + `\n\n${S.bye}`;
  return { subject: S.subject, html, text };
}

// ============================================================================
// Registry
// ============================================================================
export type TemplateName =
  | "registration-confirmation"
  | "booking-confirmation"
  | "event-reminder"
  | "booking-qr-code"
  | "waitlist-joined"
  | "waitlist-offer";

interface WaitlistJoinedData {
  nome?: string;
  eventTitle: string;
  position: number;
  eventUrl?: string;
  locale?: Locale;
}

interface WaitlistOfferData {
  nome?: string;
  eventTitle: string;
  acceptUrl: string;
  expiresAt: string; // ISO
  locale?: Locale;
}

function waitlistJoinedEmail(data: WaitlistJoinedData) {
  const locale: Locale = data.locale ?? "it";
  const S = locale === "en"
    ? {
        subject: `You're on the waitlist — ${data.eventTitle}`,
        preheader: "We'll email you if a spot opens up.",
        hi: (n?: string) => `Hi ${n ? escapeHtml(n) : "there"},`,
        intro: `The event <strong>${escapeHtml(data.eventTitle)}</strong> is sold out, but you're now on the waitlist.`,
        pos: (n: number) => `Your current position: <strong>#${n}</strong>.`,
        explain: "If a spot opens up we'll email you an offer link valid for 24 hours.",
        cta: "View event",
        bye: "Thanks for staying with us!",
      }
    : {
        subject: `Sei in lista d'attesa — ${data.eventTitle}`,
        preheader: "Ti avviseremo via email se si libera un posto.",
        hi: (n?: string) => `Ciao ${n ? escapeHtml(n) : ""}`.trim() + ",",
        intro: `L'evento <strong>${escapeHtml(data.eventTitle)}</strong> è al completo, ma sei stato/a aggiunto/a alla lista d'attesa.`,
        pos: (n: number) => `La tua posizione attuale: <strong>#${n}</strong>.`,
        explain: "Se si libera un posto ti invieremo un link di offerta valido per 24 ore.",
        cta: "Vai all'evento",
        bye: "A presto!",
      };
  const ctaBtn = data.eventUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(data.eventUrl)}" style="display:inline-block;background:${BRAND.accent};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${S.cta}</a></p>`
    : "";
  const body = `<h1 style="margin:0 0 16px;font-size:22px">${S.hi(data.nome)}</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.5">${S.intro}</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.5">${S.pos(data.position)}</p>
    <p style="margin:0 0 12px;font-size:14px;color:${BRAND.muted};line-height:1.5">${S.explain}</p>
    ${ctaBtn}
    <p style="margin:24px 0 0;font-size:14px;color:#555">${S.bye}</p>`;
  return {
    subject: S.subject,
    html: renderLayout(body, { preheader: S.preheader, title: S.subject, locale }),
    text: `${S.hi(data.nome)}\n\n${S.intro}\n${S.pos(data.position).replace(/<[^>]+>/g, "")}\n\n${S.explain}\n${data.eventUrl ?? ""}\n\n${S.bye}`,
  };
}

function waitlistOfferEmail(data: WaitlistOfferData) {
  const locale: Locale = data.locale ?? "it";
  const expires = new Date(data.expiresAt).toLocaleString(locale === "en" ? "en-GB" : "it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const S = locale === "en"
    ? {
        subject: `A spot opened up — ${data.eventTitle}`,
        preheader: "Confirm your spot within 24 hours.",
        hi: (n?: string) => `Hi ${n ? escapeHtml(n) : "there"},`,
        intro: `A spot just opened up for <strong>${escapeHtml(data.eventTitle)}</strong>. We've reserved it for you.`,
        cta: "Confirm my spot",
        deadline: `This offer expires on <strong>${expires}</strong>. After that we'll pass it to the next person in line.`,
        bye: "See you there!",
      }
    : {
        subject: `Si è liberato un posto — ${data.eventTitle}`,
        preheader: "Conferma il tuo posto entro 24 ore.",
        hi: (n?: string) => `Ciao ${n ? escapeHtml(n) : ""}`.trim() + ",",
        intro: `Si è liberato un posto per <strong>${escapeHtml(data.eventTitle)}</strong>. Lo abbiamo riservato per te.`,
        cta: "Conferma il posto",
        deadline: `L'offerta scade il <strong>${expires}</strong>. Dopo passeremo al prossimo in coda.`,
        bye: "Ci vediamo!",
      };
  const body = `<h1 style="margin:0 0 16px;font-size:22px">${S.hi(data.nome)}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${S.intro}</p>
    <p style="margin:24px 0"><a href="${escapeHtml(data.acceptUrl)}" style="display:inline-block;background:${BRAND.accent};color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:700">${S.cta}</a></p>
    <p style="margin:0 0 12px;font-size:14px;color:${BRAND.muted};line-height:1.5">${S.deadline}</p>
    <p style="margin:24px 0 0;font-size:14px;color:#555">${S.bye}</p>`;
  return {
    subject: S.subject,
    html: renderLayout(body, { preheader: S.preheader, title: S.subject, locale }),
    text: `${S.hi(data.nome)}\n\n${S.intro.replace(/<[^>]+>/g, "")}\n\n${data.acceptUrl}\n\n${S.deadline.replace(/<[^>]+>/g, "")}\n\n${S.bye}`,
  };
}

export function renderTemplate(
  name: TemplateName,
  data: Record<string, unknown>,
): { subject: string; html: string; text: string } {
  switch (name) {
    case "registration-confirmation":
      return registrationConfirmationEmail(data as RegistrationConfirmationData);
    case "booking-confirmation":
      return bookingConfirmationEmail(data as BookingConfirmationData);
    case "event-reminder":
      return eventReminderEmail(data as EventReminderData);
    case "booking-qr-code":
      return bookingQrCodeEmail(data as BookingQrCodeData);
    case "waitlist-joined":
      return waitlistJoinedEmail(data as unknown as WaitlistJoinedData);
    case "waitlist-offer":
      return waitlistOfferEmail(data as unknown as WaitlistOfferData);
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unknown template: ${_exhaustive}`);
    }
  }
}
