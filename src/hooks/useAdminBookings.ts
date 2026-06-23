import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AdminBookingRow {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  quantity: number;
  total_cents: number;
  currency: string;
  reference_code: string | null;
  booked_at: string;
  notes: string | null;
  event?: { id: string; title: string; starts_at: string | null } | null;
  profile?: { id: string; email: string | null; full_name: string | null; phone: string | null } | null;
}

export interface BookingFilters {
  eventId: string | null;
  status: string | null;
  search: string;
}

export const useAdminBookings = () => {
  const [rows, setRows] = useState<AdminBookingRow[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [filters, setFilters] = useState<BookingFilters>({ eventId: null, status: null, search: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.from("events").select("id, title").order("starts_at", { ascending: false });
    setEvents((data as { id: string; title: string }[]) ?? []);
  }, []);

  const fetchRows = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("bookings")
        .select("id, event_id, user_id, status, quantity, total_cents, currency, reference_code, booked_at, notes")
        .order("booked_at", { ascending: false })
        .limit(500);
      if (filters.eventId) q = q.eq("event_id", filters.eventId);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error: err } = await q;
      if (err) throw err;
      const bookings = (data as AdminBookingRow[]) ?? [];

      const userIds = Array.from(new Set(bookings.map((b) => b.user_id)));
      const eventIds = Array.from(new Set(bookings.map((b) => b.event_id)));
      const [profilesRes, eventsRes] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id, email, full_name, phone").in("id", userIds)
          : Promise.resolve({ data: [] as AdminBookingRow["profile"][] }),
        eventIds.length
          ? supabase.from("events").select("id, title, starts_at").in("id", eventIds)
          : Promise.resolve({ data: [] as AdminBookingRow["event"][] }),
      ]);
      const profMap = new Map<string, AdminBookingRow["profile"]>();
      (profilesRes.data as AdminBookingRow["profile"][] | null)?.forEach((p) => p && profMap.set(p.id, p));
      const evMap = new Map<string, AdminBookingRow["event"]>();
      (eventsRes.data as AdminBookingRow["event"][] | null)?.forEach((e) => e && evMap.set(e.id, e));

      let enriched = bookings.map((b) => ({
        ...b,
        profile: profMap.get(b.user_id) ?? null,
        event: evMap.get(b.event_id) ?? null,
      }));

      if (filters.search.trim()) {
        const s = filters.search.toLowerCase();
        enriched = enriched.filter(
          (b) =>
            b.reference_code?.toLowerCase().includes(s) ||
            b.profile?.email?.toLowerCase().includes(s) ||
            b.profile?.full_name?.toLowerCase().includes(s)
        );
      }
      setRows(enriched);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento prenotazioni");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchRows(); }, [fetchRows]);

  const updateStatus = async (id: string, status: string) => {
    if (!isSupabaseConfigured) return;
    const patch: Record<string, unknown> = { status };
    if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
    const { error: err } = await supabase.from("bookings").update(patch).eq("id", id);
    if (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } else {
      toast({ title: "Prenotazione aggiornata" });
      fetchRows();
    }
  };

  const exportCsv = () => {
    const header = ["reference", "evento", "utente", "email", "telefono", "status", "quantita", "totale_eur", "data"];
    const lines = rows.map((b) => [
      b.reference_code ?? "",
      b.event?.title ?? "",
      b.profile?.full_name ?? "",
      b.profile?.email ?? "",
      b.profile?.phone ?? "",
      b.status,
      String(b.quantity),
      (b.total_cents / 100).toFixed(2),
      new Date(b.booked_at).toISOString(),
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `prenotazioni-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return { rows, events, filters, setFilters, loading, error, updateStatus, exportCsv, refresh: fetchRows };
};
