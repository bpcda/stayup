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

  const lookupBooking = async (term: string) => {
    if (!eventId) return null;
    // QR token: stringa esadecimale di 48 char dalla RPC
    const looksLikeToken = /^[a-f0-9]{32,}$/i.test(term);
    let q = supabase
      .from("bookings")
      .select("id, user_id, event_id, status, reference_code, qr_token")
      .limit(1);
    if (looksLikeToken) {
      q = q.eq("qr_token", term);
    } else if (term.includes("@")) {
      const { data: profs } = await supabase.from("profiles").select("id").ilike("email", term).limit(1);
      const pid = (profs as { id: string }[] | null)?.[0]?.id;
      if (!pid) return { error: "Utente non trovato" } as const;
      q = q.eq("user_id", pid).eq("event_id", eventId);
    } else {
      q = q.eq("reference_code", term).eq("event_id", eventId);
    }
    const { data, error: bErr } = await q;
    if (bErr) return { error: bErr.message } as const;
    const booking = (data as { id: string; user_id: string; event_id: string; status: string; reference_code: string | null; qr_token: string | null }[] | null)?.[0];
    if (!booking) return { error: "Prenotazione non trovata" } as const;
    if (booking.event_id !== eventId) return { error: "QR per un altro evento" } as const;
    if (booking.status === "cancelled" || booking.status === "refunded") {
      return { error: "Prenotazione annullata" } as const;
    }
    return { booking } as const;
  };

  const performCheckin = async (
    booking: { id: string; user_id: string; event_id: string; reference_code: string | null },
    method: "manual" | "qr",
  ) => {
    if (!user) return { error: "Sessione non valida" } as const;

    // Pre-check: blocco doppio check-in con messaggio chiaro
    const { data: existing } = await supabase
      .from("checkins")
      .select("id, checked_in_at")
      .eq("booking_id", booking.id)
      .limit(1);
    if ((existing as { id: string }[] | null)?.length) {
      return { error: "Già registrato" } as const;
    }

    const { error: insErr } = await supabase.from("checkins").insert({
      booking_id: booking.id,
      event_id: booking.event_id,
      user_id: booking.user_id,
      checked_in_by: user.id,
      method,
    });
    if (insErr) {
      if (insErr.message.toLowerCase().includes("duplicate")) {
        return { error: "Già registrato" } as const;
      }
      return { error: insErr.message } as const;
    }
    return { ok: true as const, reference_code: booking.reference_code };
  };

  const checkIn = async (query: string): Promise<boolean> => {
    if (!isSupabaseConfigured || !eventId || !user) return false;
    const term = query.trim();
    if (!term) return false;
    const lookup = await lookupBooking(term);
    if ("error" in lookup) {
      toast({ title: lookup.error, variant: "destructive" });
      return false;
    }
    const result = await performCheckin(lookup.booking, "manual");
    if ("error" in result) {
      toast({ title: result.error, variant: "destructive" });
      return false;
    }
    toast({ title: "Check-in registrato" });
    fetchList();
    return true;
  };

  const checkInByToken = async (token: string): Promise<
    | { ok: true; name: string | null; reference_code: string | null }
    | { ok: false; error: string }
  > => {
    if (!isSupabaseConfigured || !eventId || !user) return { ok: false, error: "Non pronto" };
    const lookup = await lookupBooking(token.trim());
    if ("error" in lookup) return { ok: false, error: lookup.error };
    const res = await performCheckin(lookup.booking, "qr");
    if ("error" in res) return { ok: false, error: res.error };

    // Recupera nome per feedback visivo
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", lookup.booking.user_id)
      .maybeSingle();
    fetchList();
    const p = prof as { full_name: string | null; email: string | null } | null;
    return { ok: true, name: p?.full_name ?? p?.email ?? null, reference_code: lookup.booking.reference_code };
  };

  return { events, todayList, loading, error, checkIn, checkInByToken, refresh: fetchList };
};

