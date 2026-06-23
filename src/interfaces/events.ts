export type EventStatus =
  | "draft"
  | "published"
  | "cancelled"
  | "ended"
  | "archived";

export interface EventRow {
  id: string;
  slug?: string | null;
  title: string;
  short_description?: string | null;
  description: string | null;
  location: string | null;
  venue?: string | null;
  category_id?: string | null;
  capacity?: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status?: EventStatus;
  is_active: boolean;
  is_public: boolean;
  has_shuttle: boolean;
  price_one_way: number;
  price_round_trip: number;
  cover_image_url: string | null;
  gallery_urls?: string[] | null;
  sponsor_ids?: string[] | null;
  organizer_id?: string | null;
  created_at?: string;
  published_at?: string | null;
  // SEO
  seo_title?: string | null;
  seo_description?: string | null;
  og_image_url?: string | null;
  // UI-only: contatore iscritti confermati (non in DB)
  _booked_count?: number;
}

export interface EventParticipation {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  created_at?: string;
}

export interface EventCategoryRow {
  id: string;
  slug: string;
  name: string;
}

export interface SponsorRow {
  id: string;
  name: string;
  logo_url?: string | null;
  tier?: string | null;
  is_active?: boolean;
}
