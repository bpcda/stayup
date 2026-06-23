import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface CheckinRow {
  id: string;
  booking_id: string;
  user_id: string;
  checked_in_at: string;
  method: string;
  reference_code?: string | null;
  full_name?: string | null;
  email?: string | null;
}

export const useAdminCheckins = (eventId: string | null) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<{ id: string; title: string; starts_at: string | null }[]>([]);
  const [todayList, setTodayList] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.from("events")
      .select("id, title, starts_at")
      .order("starts_at", { ascending: false })
      .then(({ data }) => setEvents((data as { id: string; title: string; starts_at: string | null }[]) ?? []));
  }, []);

  const fetchList = useCallback(async () => {
    if (!isSupabaseConfigured || !eventId) { setTodayList([]); return; }
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("checkins")
        .select("id, booking_id, user_id, checked_in_at, method")
        .eq("event_id", eventId)
        .order("checked_in_at", { ascending: false })
        .limit(200);
      if (err) throw err;
      const checkins = (data as CheckinRow[]) ?? [];
      const userIds = Array.from(new Set(checkins.map((c) => c.user_id)));
      const bookingIds = Array.from(new Set(checkins.map((c) => c.booking_id)));
      const [profilesRes, bookingsRes] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("id, email, full_name").in("id", userIds) : Promise.resolve({ data: [] }),
        bookingIds.length ? supabase.from("bookings").select("id, reference_code").in("id", bookingIds) : Promise.resolve({ data: [] }),
      ]);
      const profMap = new Map<string, { email: string | null; full_name: string | null }>();
      (profilesRes.data as { id: string; email: string | null; full_name: string | null }[]).forEach((p) => profMap.set(p.id, p));
      const bMap = new Map<string, string | null>();
      (bookingsRes.data as { id: string; reference_code: string | null }[]).forEach((b) => bMap.set(b.id, b.reference_code));
      setTodayList(checkins.map((c) => ({
        ...c,
        full_name: profMap.get(c.user_id)?.full_name ?? null,
        email: profMap.get(c.user_id)?.email ?? null,
        reference_code: bMap.get(c.booking_id) ?? null,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const checkIn = async (query: string): Promise<boolean> => {
    if (!isSupabaseConfigured || !eventId || !user) return false;
    const term = query.trim();
    if (!term) return false;
    let bookingQ = supabase
      .from("bookings")
      .select("id, user_id, event_id, status, reference_code")
      .eq("event_id", eventId)
      .limit(5);
    if (term.includes("@")) {
      const { data: profs } = await supabase.from("profiles").select("id").ilike("email", term).limit(1);
      const pid = (profs as { id: string }[] | null)?.[0]?.id;
      if (!pid) { toast({ title: "Utente non trovato", variant: "destructive" }); return false; }
      bookingQ = bookingQ.eq("user_id", pid);
    } else {
      bookingQ = bookingQ.eq("reference_code", term);
    }
    const { data: bookings, error: bErr } = await bookingQ;
    if (bErr) { toast({ title: "Errore", description: bErr.message, variant: "destructive" }); return false; }
    const booking = (bookings as { id: string; user_id: string; event_id: string; status: string }[] | null)?.[0];
    if (!booking) { toast({ title: "Prenotazione non trovata", variant: "destructive" }); return false; }
    if (booking.status === "cancelled") { toast({ title: "Prenotazione cancellata", variant: "destructive" }); return false; }

    const { error: insErr } = await supabase.from("checkins").insert({
      booking_id: booking.id,
      event_id: booking.event_id,
      user_id: booking.user_id,
      checked_in_by: user.id,
      method: "manual",
    });
    if (insErr) {
      if (insErr.message.includes("duplicate")) toast({ title: "Già registrato", variant: "destructive" });
      else toast({ title: "Errore", description: insErr.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Check-in registrato" });
    fetchList();
    return true;
  };

  return { events, todayList, loading, error, checkIn, refresh: fetchList };
};
