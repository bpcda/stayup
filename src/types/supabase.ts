/**
 * Manually-curated Supabase schema types — minimal scaffold so the new service
 * layer compiles. Replace this file by running the Supabase CLI once the
 * migration moves forward:
 *
 *   supabase gen types typescript --project-id <ref> --schema public > src/types/supabase.ts
 *
 * Until then, keep these definitions aligned with `migrations/*.sql` and
 * the v2 schema migrations under `migrations/`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "admin" | "moderator" | "user";

export type TripType = "andata" | "ritorno" | "andata_ritorno";

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
        };
        Insert: { id?: string; user_id: string; role: AppRole };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          title: string;
          slug: string | null;
          description: string | null;
          location: string | null;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          is_public: boolean;
          has_shuttle: boolean;
          price_one_way: number | null;
          price_round_trip: number | null;
          cover_image_url: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Relationships: [];
      };
      shuttle_slots: {
        Row: {
          id: string;
          event_id: string;
          giorno: string;
          fermata: string;
          orario: string;
          capienza: number;
          trip_group_id: string | null;
          nascosto: boolean;
          price_override: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["shuttle_slots"]["Row"],
          "id" | "created_at" | "nascosto"
        > & { id?: string; created_at?: string; nascosto?: boolean };
        Update: Partial<Database["public"]["Tables"]["shuttle_slots"]["Row"]>;
        Relationships: [];
      };
      shuttle_return_slots: {
        Row: {
          id: string;
          event_id: string;
          giorno: string;
          orario: string;
          capienza: number;
          nascosto: boolean;
          price_override: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["shuttle_return_slots"]["Row"],
          "id" | "created_at" | "nascosto"
        > & { id?: string; created_at?: string; nascosto?: boolean };
        Update: Partial<
          Database["public"]["Tables"]["shuttle_return_slots"]["Row"]
        >;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          event_id: string | null;
          user_id: string | null;
          nome: string;
          email: string;
          telefono: string;
          tipo_viaggio: TripType;
          giorno: string | null;
          fermata: string | null;
          orario: string | null;
          orario_ritorno: string | null;
          stato: BookingStatus;
          pagato: boolean;
          price_paid: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["bookings"]["Row"],
          "id" | "created_at" | "stato" | "pagato"
        > & {
          id?: string;
          created_at?: string;
          stato?: BookingStatus;
          pagato?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Row"]>;
        Relationships: [];
      };
      event_participations: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["event_participations"]["Row"],
          "id" | "created_at" | "status"
        > & { id?: string; created_at?: string; status?: string };
        Update: Partial<
          Database["public"]["Tables"]["event_participations"]["Row"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: AppRole };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
      trip_type: TripType;
      booking_status: BookingStatus;
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
