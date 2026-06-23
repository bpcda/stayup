/**
 * Resend client — server-side only.
 *
 * Resend is invoked through the Lovable connector gateway (see
 * docs/standard_connectors). The browser must never see `RESEND_API_KEY` or
 * `LOVABLE_API_KEY`, so this module is intended for use inside Supabase
 * Edge Functions. Vite excludes `supabase/functions/**` from the client
 * bundle, so the same source can also be re-exported from there if useful.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export interface SendEmailInput {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  id?: string;
  [k: string]: unknown;
}

function readEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string> } })
    .process?.env;
  if (env && env[name]) return env[name];
  // Deno fallback
  const denoEnv = (globalThis as {
    Deno?: { env?: { get(k: string): string | undefined } };
  }).Deno?.env;
  return denoEnv?.get(name);
}

/**
 * Sends an email through the Resend connector gateway.
 *
 * Requires both `LOVABLE_API_KEY` and `RESEND_API_KEY` to be present in the
 * server environment (Edge Function secrets).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const lovableKey = readEnv("LOVABLE_API_KEY");
  const resendKey = readEnv("RESEND_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!resendKey) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify(input),
  });

  const json = (await res.json().catch(() => ({}))) as SendEmailResult & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      `Resend gateway error ${res.status}: ${json?.message ?? JSON.stringify(json)}`,
    );
  }
  return json;
}
