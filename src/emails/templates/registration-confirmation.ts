import { escapeHtml, renderButton, renderLayout, type Locale } from "../_layout";

export interface RegistrationConfirmationData {
  nome?: string;
  confirmUrl?: string;
  locale?: Locale;
}

const STRINGS = {
  it: {
    subject: "Benvenuto su StayUp — conferma il tuo account",
    preheader: "Conferma la tua email per attivare l'account",
    hi: (n: string) => `Ciao ${n},`,
    intro:
      "grazie per esserti registrato su StayUp Piacenza. Per completare la registrazione conferma la tua email cliccando sul pulsante qui sotto.",
    cta: "Conferma email",
    fallback:
      "Se il pulsante non funziona, copia e incolla questo link nel browser:",
    noLink:
      "L'attivazione del tuo account avverrà al primo accesso. Se non ti sei registrato tu, ignora questa email.",
    bye: "A presto,\nIl team StayUp",
  },
  en: {
    subject: "Welcome to StayUp — confirm your account",
    preheader: "Confirm your email to activate your account",
    hi: (n: string) => `Hi ${n},`,
    intro:
      "thanks for signing up on StayUp Piacenza. To complete the registration please confirm your email by clicking the button below.",
    cta: "Confirm email",
    fallback: "If the button doesn't work, copy and paste this link into your browser:",
    noLink:
      "Your account will be activated at first sign-in. If you didn't sign up, please ignore this email.",
    bye: "See you soon,\nThe StayUp team",
  },
} as const;

export function registrationConfirmationEmail(data: RegistrationConfirmationData = {}) {
  const locale: Locale = data.locale ?? "it";
  const s = STRINGS[locale];
  const nome = data.nome?.trim() || (locale === "it" ? "iscritto" : "there");
  const subject = s.subject;

  const ctaBlock = data.confirmUrl
    ? `${renderButton(data.confirmUrl, s.cta)}
       <p style="margin:0 0 8px;font-size:13px;color:#555">${s.fallback}</p>
       <p style="margin:0;font-size:12px;word-break:break-all"><a href="${escapeHtml(data.confirmUrl)}">${escapeHtml(data.confirmUrl)}</a></p>`
    : `<p style="margin:16px 0 0;font-size:14px;color:#555">${s.noLink}</p>`;

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(s.hi(nome))}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapeHtml(s.intro)}</p>
    ${ctaBlock}
    <p style="margin:24px 0 0;font-size:14px;color:#555;white-space:pre-line">${escapeHtml(s.bye)}</p>
  `;

  const html = renderLayout(body, { preheader: s.preheader, title: subject, locale });
  const text =
    `${s.hi(nome)}\n\n${s.intro}\n\n` +
    (data.confirmUrl ? `${s.cta}: ${data.confirmUrl}\n\n` : `${s.noLink}\n\n`) +
    s.bye;

  return { subject, html, text };
}
