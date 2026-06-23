/**
 * Shared HTML wrapper for all transactional emails.
 *
 * Intentionally minimal and inline-styled — email clients strip <style> and
 * external stylesheets. Keep brand colors here so templates stay consistent.
 */

export interface LayoutOptions {
  preheader?: string;
  title?: string;
}

const BRAND = {
  bg: "#ffffff",
  surface: "#f7f7f7",
  text: "#111111",
  muted: "#555555",
  accent: "#000000",
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
  const preheader = opts.preheader
    ? `<span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(
        opts.preheader,
      )}</span>`
    : "";
  return `<!doctype html>
<html lang="it">
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
                <p style="margin:0;font-size:12px;color:${BRAND.muted}">StayUp Piacenza — questa è una comunicazione automatica, non rispondere a questa email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
