/**
 * Public re-exports for the email templates.
 *
 * Templates are plain functions that return `{ subject, html, text }`. They
 * have no React/JSX dependency so they can be imported from both the browser
 * bundle and Deno-based Supabase Edge Functions without extra tooling.
 */
export {
  bookingConfirmationEmail,
  type BookingConfirmationData,
} from "./booking-confirmation";
export {
  bookingPartialAvailabilityEmail,
  type BookingPartialAvailabilityData,
} from "./booking-partial-availability";
