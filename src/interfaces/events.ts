export interface EventRow {
  id: string;
  slug?: string | null;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_public: boolean;
  has_shuttle: boolean;
  price_one_way: number;
  price_round_trip: number;
  cover_image_url: string | null;
  created_at?: string;
}

export interface EventParticipation {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  created_at?: string;
}
