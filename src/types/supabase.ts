/**
 * Supabase schema types — derived from the SQL migrations under
 * `migrations/*.sql` (StayUp v2 + extensions). Manually curated to mirror the
 * real `public` schema deployed on Lovable Cloud / Supabase.
 *
 * To regenerate from the live database run:
 *   supabase gen types typescript --project-id <ref> --schema public \
 *     > src/types/supabase.ts
 *
 * Keep this file in sync with new migrations or replace it with the CLI
 * output. Last hand-update: 2026-06-24 (Fase 2 audit).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------- Enums ----------

export type AppRole = "admin" | "organizer" | "user";
export type EventStatus =
  | "draft"
  | "published"
  | "cancelled"
  | "archived"
  | "ended";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "refunded";
export type EmailStatus =
  | "queued"
  | "sent"
  | "failed"
  | "bounced"
  | "complained";
export type NewsletterStatus = "pending" | "confirmed" | "unsubscribed";
export type SponsorTier =
  | "platinum"
  | "gold"
  | "silver"
  | "bronze"
  | "partner";
/**
 * `trip_type` is a CHECK constraint on `shuttle_bookings.tipo_viaggio`,
 * not a real PG enum, but treat it as a closed union from the TS side.
 */
export type TripType = "andata" | "ritorno" | "andata_ritorno";

// ---------- Helpers ----------

type Timestamp = string;
type UUID = string;

type BaseTable<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

// ---------- Rows ----------

interface UserRoleRow {
  id: UUID;
  user_id: UUID;
  role: AppRole;
  created_at: Timestamp;
}

interface ProfileRow {
  id: UUID;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  birthdate: string | null;
  city: string | null;
  marketing_opt_in: boolean;
  // consent_management migration
  privacy_accepted_at: Timestamp | null;
  privacy_version: string | null;
  marketing_consent: boolean;
  marketing_consent_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface EventCategoryRow {
  id: UUID;
  slug: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface EventRow {
  id: UUID;
  slug: string;
  title: string;
  description: string | null;
  short_description: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  sponsor_ids: UUID[];
  location: string | null;
  venue: string | null;
  category_id: UUID | null;
  organizer_id: UUID | null;
  starts_at: Timestamp;
  ends_at: Timestamp | null;
  capacity: number | null;
  price_cents: number;
  currency: string;
  status: EventStatus;
  published_at: Timestamp | null;
  // Legacy shuttle/admin fields added by 20260623_stayup_v2_shuttle.sql
  is_active: boolean;
  is_public: boolean;
  has_shuttle: boolean;
  price_one_way: number;
  price_round_trip: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface BookingRow {
  id: UUID;
  event_id: UUID;
  user_id: UUID;
  status: BookingStatus;
  quantity: number;
  total_cents: number;
  currency: string;
  notes: string | null;
  reference_code: string | null;
  qr_token: string | null;
  booked_at: Timestamp;
  cancelled_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface CheckinRow {
  id: UUID;
  booking_id: UUID;
  event_id: UUID;
  user_id: UUID;
  checked_in_at: Timestamp;
  checked_in_by: UUID | null;
  method: string;
  notes: string | null;
  created_at: Timestamp;
}

interface EmailLogRow {
  id: UUID;
  to_email: string;
  from_email: string | null;
  subject: string;
  template: string | null;
  status: EmailStatus;
  provider_id: string | null;
  error_message: string | null;
  related_user_id: UUID | null;
  related_event_id: UUID | null;
  related_booking_id: UUID | null;
  payload: Json | null;
  sent_at: Timestamp | null;
  created_at: Timestamp;
}

interface NewsletterSubscriberRow {
  id: UUID;
  email: string;
  status: NewsletterStatus;
  source: string | null;
  user_id: UUID | null;
  confirmation_token: string | null;
  confirmed_at: Timestamp | null;
  unsubscribed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface SponsorRow {
  id: UUID;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  tier: SponsorTier;
  is_active: boolean;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface UserInterestRow {
  id: UUID;
  user_id: UUID;
  category_id: UUID;
  created_at: Timestamp;
}

interface SiteSettingRow {
  id: UUID;
  key: string;
  value: Json;
  description: string | null;
  is_public: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface ConsentLogRow {
  id: UUID;
  user_id: UUID;
  consent_type: "privacy" | "marketing";
  granted: boolean;
  policy_version: string | null;
  source: string | null;
  user_agent: string | null;
  created_at: Timestamp;
}

interface ShuttleSlotRow {
  id: UUID;
  event_id: UUID | null;
  giorno: string;
  fermata: string;
  orario: string;
  capienza: number;
  trip_group_id: UUID | null;
  price_override: number | null;
  nascosto: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface ShuttleReturnSlotRow {
  id: UUID;
  event_id: UUID | null;
  giorno: string;
  orario: string;
  capienza: number;
  price_override: number | null;
  nascosto: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface ShuttleBookingRow {
  id: UUID;
  event_id: UUID | null;
  user_id: UUID | null;
  nome: string;
  email: string;
  telefono: string;
  tipo_viaggio: TripType;
  giorno: string;
  fermata: string | null;
  orario: string | null;
  orario_ritorno: string | null;
  stato: string;
  pagato: boolean;
  price_paid: number;
  reference_code: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface EventParticipationRow {
  id: UUID;
  event_id: UUID;
  user_id: UUID;
  status: string;
  created_at: Timestamp;
}

// ---------- Database ----------

export interface Database {
  public: {
    Tables: {
      user_roles: BaseTable<UserRoleRow>;
      profiles: BaseTable<ProfileRow>;
      event_categories: BaseTable<EventCategoryRow>;
      events: BaseTable<EventRow>;
      bookings: BaseTable<BookingRow>;
      checkins: BaseTable<CheckinRow>;
      email_logs: BaseTable<EmailLogRow>;
      newsletter_subscribers: BaseTable<NewsletterSubscriberRow>;
      sponsors: BaseTable<SponsorRow>;
      user_interests: BaseTable<UserInterestRow>;
      site_settings: BaseTable<SiteSettingRow>;
      consent_log: BaseTable<ConsentLogRow>;
      shuttle_slots: BaseTable<ShuttleSlotRow>;
      shuttle_return_slots: BaseTable<ShuttleReturnSlotRow>;
      shuttle_bookings: BaseTable<ShuttleBookingRow>;
      event_participations: BaseTable<EventParticipationRow>;
    };
    Views: Record<string, never>;
    Functions: {
      has_role: {
        Args: { _user_id: UUID; _role: AppRole };
        Returns: boolean;
      };
      create_event_booking: {
        Args: { p_event_id: UUID };
        Returns: BookingRow;
      };
    };
    Enums: {
      app_role: AppRole;
      event_status: EventStatus;
      booking_status: BookingStatus;
      email_status: EmailStatus;
      newsletter_status: NewsletterStatus;
      sponsor_tier: SponsorTier;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
