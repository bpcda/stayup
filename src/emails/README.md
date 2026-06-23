# Email templates

Plain-function HTML email templates. No React / JSX so they import cleanly
from both the browser bundle and Supabase Edge Functions (Deno).

Each template returns `{ subject, html, text }` and is sent through
`src/lib/resend/client.ts` (`sendEmail`), which calls the Resend REST API
directly using `RESEND_API_KEY` and `RESEND_FROM_EMAIL` from the server
environment (configured in Vercel, never committed).

## Files

- `_layout.ts` — shared HTML wrapper + `escapeHtml` helper.
- `templates/booking-confirmation.ts` — sent after a successful shuttle booking.
- `templates/booking-partial-availability.ts` — sent when only one leg
  (andata or ritorno) is available for the booking.

## Adding a template

1. Create `templates/<name>.ts` exporting `<name>Email(data) => { subject, html, text }`.
2. Use `renderLayout(bodyHtml, { preheader, title })` for the shell.
3. Re-export from `templates/index.ts`.
4. Invoke from a Supabase Edge Function with `sendEmail({ to, ...template })`
   (the `from` falls back to `RESEND_FROM_EMAIL`).

## Not used yet

These templates are wired by the migration only once
`supabase/functions/send-booking-email/index.ts` is switched from the legacy
sender to `sendEmail()` (see MIGRATION_PLAN.md §7).
