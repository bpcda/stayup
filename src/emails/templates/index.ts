/**
 * Public re-exports for the email templates.
 *
 * Templates are plain functions that return `{ subject, html, text }`. They
 * have no React/JSX dependency so they can be imported from both the browser
 * bundle and Deno-based Supabase Edge Functions without extra tooling.
 *
 * Tutti i template sono bilingue IT/EN (parametro `locale: "it" | "en"`,
 * default "it").
 */
export {
  registrationConfirmationEmail,
  type RegistrationConfirmationData,
} from "./registration-confirmation";
export {
  bookingConfirmationEmail,
  type BookingConfirmationData,
} from "./booking-confirmation";
export {
  bookingPartialAvailabilityEmail,
  type BookingPartialAvailabilityData,
} from "./booking-partial-availability";
export {
  eventReminderEmail,
  type EventReminderData,
} from "./event-reminder";
export {
  bookingQrCodeEmail,
  type BookingQrCodeData,
} from "./booking-qr-code";
export type { Locale } from "../_layout";
