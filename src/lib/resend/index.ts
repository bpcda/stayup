export { sendEmail } from "./client";
export type { SendEmailInput, SendEmailResult } from "./client";
export {
  bookingConfirmationEmail,
  bookingPartialAvailabilityEmail,
  type BookingConfirmationData,
  type BookingPartialAvailabilityData,
} from "@/emails/templates";
