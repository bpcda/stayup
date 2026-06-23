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

### Browser (Vite — committed in `.env.example`)

| Name | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | yes | Public anon key — safe in the browser bundle. |
| `VITE_SUPABASE_PROJECT_ID` | optional | Used to build Edge Function URLs manually if needed. |

### Server / Edge Functions (managed as Lovable Cloud secrets)

| Name | Required for | Notes |
|---|---|---|
| `SUPABASE_URL` | every Edge Function | Injected automatically by Lovable Cloud. |
| `SUPABASE_ANON_KEY` | Edge Functions that proxy user-context calls | Injected automatically. |
| `SUPABASE_SERVICE_ROLE_KEY` | `delete-account`, `create-booking` capacity write, admin tasks | Bypasses RLS — server only. |
| `LOVABLE_API_KEY` | Resend gateway calls | Provided by Lovable; rotate with `rotate_lovable_api_key`. |
| `RESEND_API_KEY` | Resend gateway calls | Injected when the Resend connector is linked. |

The legacy `VITE_APPWRITE_*` and `APPWRITE_API_KEY` block is left untouched in
`.env.example` so the current Appwrite-backed code keeps working.

## How to use (forthcoming, not wired yet)

```ts
import { authService, shuttleService } from "@/services/supabase";

const { data, error } = await authService.signInWithPassword({ email, password });

const { data: slots } = await shuttleService.listAndataSlots(eventId);
```

```ts
// Inside a Supabase Edge Function:
import { sendEmail } from "../../../src/lib/resend/client.ts"; // or copy into _shared/
import { bookingConfirmationEmail } from "../../../src/emails/templates/booking-confirmation.ts";

const { subject, html, text } = bookingConfirmationEmail({ nome, eventTitle, tipoViaggio, ... });
await sendEmail({ from: "StayUp <notify@stayuppiacenza.it>", to: email, subject, html, text });
```

(For Edge Functions it's usually cleaner to copy the template+layout files into
`supabase/functions/_shared/` so Deno resolves them without reaching into
`src/`. That move is scheduled for the cutover, not now.)

## Next steps

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the project env.
2. Run `supabase gen types typescript` and replace `src/types/supabase.ts` with
   the generated file (current file is a minimal hand-curated stub).
3. Link the Resend connector so `RESEND_API_KEY` becomes available to Edge
   Functions (or switch to Lovable Emails — see MIGRATION_PLAN.md §Rischi).
4. Audit `migrations/*.sql` against `scripts/setup-appwrite.js` for column/grant
   parity (MIGRATION_PLAN.md, Fase 0 step 2).
5. Add `user_roles` table + `has_role()` function if missing.
6. Begin Fase 3 of the migration: rewrite `useAuth` to consume
   `services/supabase/auth.service.ts`. Keep Appwrite hook in place behind a
   feature flag until parity is verified.
