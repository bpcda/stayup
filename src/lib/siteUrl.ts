/**
 * Resolve the public base URL of the site.
 *
 * Priority:
 *   1. `VITE_SITE_URL`  → must be the canonical production/preview origin
 *      (e.g. `https://stayup.example.com` or the Vercel preview URL).
 *   2. `window.location.origin` → safe fallback in the browser (localhost,
 *      Lovable preview, ad-hoc deploys without env var set).
 *
 * Always returns an origin **without** a trailing slash so callers can append
 * `/auth/callback`, `/reset-password`, etc. without doubling the slash.
 */
export function getSiteUrl(): string {
  const fromEnv = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
