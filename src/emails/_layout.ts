/**
 * Shared HTML wrapper for all transactional emails.
 *
 * Intentionally minimal and inline-styled — email clients strip <style> and
 * external stylesheets. Keep brand colors here so templates stay consistent.
 *
 * Supports bilingual IT/EN footers via the `locale` option.
 */

export type Locale = "it" | "en";

export interface LayoutOptions {
  preheader?: string;
  title?: string;
  locale?: Locale;
}

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

export function renderLayout(bodyHtml: string, opts: LayoutOptions = {}): string {
  const locale: Locale = opts.locale ?? "it";
  const preheader = opts.preheader
    ? `<span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(
        opts.preheader,
      )}</span>`
    : "";
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(opts.title ?? "StayUp")}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.text}">
    ${preheader}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg}">
      <tr>
        <td align="center" style="padding:32px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.surface};border-radius:12px">
            <tr>
              <td style="padding:32px">
                ${bodyHtml}
                <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0" />
                <p style="margin:0;font-size:12px;color:${BRAND.muted}">${FOOTER[locale]}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Inline button helper used by multiple templates. */
export function renderButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr><td style="background:${BRAND.accent};border-radius:8px">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

/** Renders a key/value table dropping empty values. */
export function renderRows(rows: Array<[string, string | undefined | null]>): string {
  return rows
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#555">${escapeHtml(k)}</td><td style="padding:6px 0;text-align:right"><strong>${escapeHtml(String(v))}</strong></td></tr>`,
    )
    .join("");
}
