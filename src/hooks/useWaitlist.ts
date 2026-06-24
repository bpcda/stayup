import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type EventCapacityStatus = {
  capacity: number | null;
  confirmed_count: number;
  sold_out: boolean;
  waitlist_count: number;
  my_position: number | null;
  my_status: "waiting" | "offered" | null;
};

/**
 * Carica lo stato capienza/waitlist per un evento.
 * Ritorna null finché non risolto. `reload` per re-fetch dopo azioni.
 */
export const useEventCapacityStatus = (eventId: string | null | undefined) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<EventCapacityStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!eventId || !isSupabaseConfigured) { setStatus(null); return; }
    setLoading(true);
    const { data, error } = await supabase
      .rpc("event_capacity_status", { _event_id: eventId });
    if (!error && Array.isArray(data) && data.length > 0) {
      setStatus(data[0] as EventCapacityStatus);
    } else {
      setStatus(null);
    }
    setLoading(false);
  }, [eventId, user?.id]);

  useEffect(() => { void load(); }, [load]);
  return { status, loading, reload: load };
};

/** Lista delle waitlist dell'utente loggato (tutti gli stati). */
export type MyWaitlistStatus = "waiting" | "offered" | "accepted" | "expired" | "cancelled";
export type MyWaitlistEntry = {
  id: string;
  event_id: string;
  position: number;
  status: MyWaitlistStatus;
  offer_expires_at: string | null;
  offer_token: string | null;
  created_at: string;
  event: { title: string; slug: string; starts_at: string | null } | null;
};

export const useMyWaitlist = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MyWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user || !isSupabaseConfigured) { setEntries([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("waitlist")
      .select("id, event_id, position, status, offer_expires_at, offer_token, created_at, event:events(title, slug, starts_at)")
      .eq("user_id", user.id)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });
    setEntries((data ?? []) as unknown as MyWaitlistEntry[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);
  return { entries, loading, reload: load };
};

/** Annulla una propria iscrizione waitlist (RPC con controllo permessi). */
export const cancelMyWaitlist = async (waitlistId: string) => {
  const { error } = await supabase.rpc("cancel_waitlist_entry", { _waitlist_id: waitlistId });
  if (error) throw error;
};
