/**
 * Resend client — SERVER SIDE ONLY.
 *
 * Calls the Resend REST API directly (https://api.resend.com) using your own
 * Resend account key. This module must never be imported from browser code:
 * Vite would inline `RESEND_API_KEY` into the client bundle and expose it.
 *
 * Intended call sites:
 *   - Supabase Edge Functions (Deno) — secrets injected via `Deno.env`.
 *   - Node scripts / serverless API routes — secrets injected via `process.env`.
 *
 * Required environment variables (configure in Vercel, NOT in the repo):
 *   - RESEND_API_KEY      Resend account API key (secret).
 *   - RESEND_FROM_EMAIL   Default sender, e.g. `StayUp <notify@domain.tld>`.
 */

const RESEND_API_URL = "https://api.resend.com/emails";

export interface SendEmailInput {
  /** Overrides RESEND_FROM_EMAIL when provided. */
  from?: string;
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
  const proc = (globalThis as { process?: { env?: Record<string, string> } })
    .process?.env;
  if (proc && proc[name]) return proc[name];
  const denoEnv = (globalThis as {
    Deno?: { env?: { get(k: string): string | undefined } };
  }).Deno?.env;
  return denoEnv?.get(name);
}

/**
 * Send an email through the Resend REST API.
 *
 * Throws if `RESEND_API_KEY` is missing, or if `from` is not provided either
 * via the input or the `RESEND_FROM_EMAIL` env var.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = readEnv("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const from = input.from ?? readEnv("RESEND_FROM_EMAIL");
  if (!from) {
    throw new Error(
      "Missing sender: pass `from` or set RESEND_FROM_EMAIL in the server environment",
    );
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...input, from }),
  });

  const json = (await res.json().catch(() => ({}))) as SendEmailResult & {
    message?: string;
    name?: string;
  };
  if (!res.ok) {
    throw new Error(
      `Resend API error ${res.status}: ${json?.message ?? json?.name ?? JSON.stringify(json)}`,
    );
  }
  return json;
}
