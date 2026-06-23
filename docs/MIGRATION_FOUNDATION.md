# Supabase + Resend foundation

This document describes the technical foundation added alongside the existing
Appwrite codebase. Nothing here is wired into the UI yet — see
`MIGRATION_PLAN.md` for the full migration plan.

## What was added

```
src/lib/supabase/
  client.ts          # typed browser client (singleton)
  server.ts          # service-role helper for server contexts
  index.ts           # public re-exports

src/lib/resend/
  client.ts          # sendEmail() — Resend via Lovable connector gateway
  index.ts

src/services/supabase/
  auth.service.ts        # signUp / signIn / signOut / session / profile
  events.service.ts      # CRUD on public.events
  shuttle.service.ts     # slots, return slots, bookings, invokeCreateBooking
  storage.service.ts     # event-covers bucket helpers
  functions.service.ts   # typed wrappers around supabase.functions.invoke()
  index.ts

src/types/
  supabase.ts        # hand-curated Database types (replace with `supabase gen types`)

src/emails/
  _layout.ts                                  # shared HTML shell + escapeHtml
  templates/booking-confirmation.ts
  templates/booking-partial-availability.ts
  templates/index.ts
  README.md
```

## Environment variables

The backend is an **external Supabase Cloud project** plus **Resend** called
directly. No Lovable-managed backend, no connector gateway. Secrets live in
Vercel → Project → Settings → Environment Variables.

### Browser (Vite — public, shipped in the bundle)

| Name | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | `https://<ref>.supabase.co` of your external Supabase project. |
| `VITE_SUPABASE_ANON_KEY` | yes | Public anon key. Protect data with RLS. |
| `VITE_SUPABASE_PROJECT_ID` | optional | Convenience for building Edge Function URLs. |
| `VITE_SITE_URL` | yes | Absolute site URL used in email links and OAuth redirects. |

### Server / Edge Functions (secrets — NEVER prefix with `VITE_`)

| Name | Required for | Notes |
|---|---|---|
| `SUPABASE_URL` | Edge Functions | Same value as `VITE_SUPABASE_URL`. |
| `SUPABASE_SERVICE_ROLE_KEY` | admin Edge Functions / scripts | Bypasses RLS. Server only. |
| `RESEND_API_KEY` | any email send | Your Resend account key. Server only. |
| `RESEND_FROM_EMAIL` | any email send | Default sender, e.g. `StayUp <notify@domain.tld>`. |
| `SITE_URL` | optional | Server-side mirror of `VITE_SITE_URL`. |

The legacy `VITE_APPWRITE_*` and `APPWRITE_API_KEY` block is left untouched in
`.env.example` so the current Appwrite-backed code keeps working until cutover.

## How to use (forthcoming, not wired yet)

```ts
import { authService, shuttleService } from "@/services/supabase";

const { data, error } = await authService.signInWithPassword({ email, password });
const { data: slots } = await shuttleService.listAndataSlots(eventId);
```

```ts
// Inside a Supabase Edge Function (Deno):
import { sendEmail } from "../../../src/lib/resend/client.ts"; // or copy into _shared/
import { bookingConfirmationEmail } from "../../../src/emails/templates/booking-confirmation.ts";

const tpl = bookingConfirmationEmail({ nome, eventTitle, tipoViaggio, ... });
await sendEmail({ to: email, ...tpl }); // `from` falls back to RESEND_FROM_EMAIL
```

(For Edge Functions it's usually cleaner to copy the template + layout files
into `supabase/functions/_shared/` so Deno resolves them without reaching into
`src/`. That move is scheduled for the cutover, not now.)

## Next steps

1. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SITE_URL` in
   Vercel (Production / Preview / Development).
2. Set `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`
   as secrets in Vercel and as Edge Function secrets in Supabase.
3. Run `supabase gen types typescript` and replace `src/types/supabase.ts`.
4. Audit `migrations/*.sql` against `scripts/setup-appwrite.js` for column/grant
   parity (MIGRATION_PLAN.md, Fase 0 step 2).
5. Add `user_roles` table + `has_role()` function if missing.
6. Begin Fase 3: rewrite `useAuth` to consume `services/supabase/auth.service.ts`.
