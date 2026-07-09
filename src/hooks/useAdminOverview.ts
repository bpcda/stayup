import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export interface OverviewKpi {
  users: number;
  activeEvents: number;
  upcomingEvents: number;
  confirmedBookings30d: number;
  checkinsToday: number;
  emailsSent7d: number;
  emailsBounced7d: number;
}

export interface OverviewEvent {
  id: string;
  title: string;
  starts_at: string | null;
  location: string | null;
}

export interface OverviewBooking {
  id: string;
  status: string;
  booked_at: string;
  reference_code: string | null;
  event_id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
}


export const useAdminOverview = () => {
  const [kpi, setKpi] = useState<OverviewKpi>({
    users: 0,
    activeEvents: 0,
    upcomingEvents: 0,
    confirmedBookings30d: 0,
    checkinsToday: 0,
    emailsSent7d: 0,
    emailsBounced7d: 0,
  });
  const [upcoming, setUpcoming] = useState<OverviewEvent[]>([]);
  const [recentBookings, setRecentBookings] = useState<OverviewBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const now = new Date();
        const iso30 = new Date(now.getTime() - 30 * 86400000).toISOString();
        const iso7 = new Date(now.getTime() - 7 * 86400000).toISOString();
        const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
        const isoToday = startToday.toISOString();
        const nowIso = now.toISOString();

        const [
          users, activeEvents, upcomingCount, confirmed30, checkinsT, sent7, bounced7,
          upcomingList, recentList,
        ] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("events").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("events").select("id", { count: "exact", head: true }).gte("starts_at", nowIso),
          supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed").gte("booked_at", iso30),
          supabase.from("checkins").select("id", { count: "exact", head: true }).gte("checked_in_at", isoToday),
          supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", iso7),
          supabase.from("email_logs").select("id", { count: "exact", head: true }).in("status", ["bounced", "failed"]).gte("created_at", iso7),
          supabase.from("events").select("id, title, starts_at, location").gte("starts_at", nowIso).order("starts_at", { ascending: true }).limit(5),
          supabase.from("bookings").select("id, status, booked_at, reference_code, event_id, user_id").order("booked_at", { ascending: false }).limit(10),
        ]);

        if (cancelled) return;
        setKpi({
          users: users.count ?? 0,
          activeEvents: activeEvents.count ?? 0,
          upcomingEvents: upcomingCount.count ?? 0,
          confirmedBookings30d: confirmed30.count ?? 0,
          checkinsToday: checkinsT.count ?? 0,
          emailsSent7d: sent7.count ?? 0,
          emailsBounced7d: bounced7.count ?? 0,
        });
        setUpcoming((upcomingList.data as OverviewEvent[]) ?? []);

        const bookingsRaw = (recentList.data as Array<{
          id: string; status: string; booked_at: string;
          reference_code: string | null; event_id: string; user_id: string | null;
        }>) ?? [];
        const userIds = Array.from(new Set(bookingsRaw.map((b) => b.user_id).filter((x): x is string => !!x)));
        const profMap = new Map<string, { full_name: string | null; email: string | null }>();
        if (userIds.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);
          (profs as Array<{ id: string; full_name: string | null; email: string | null }> | null)?.forEach((p) =>
            profMap.set(p.id, { full_name: p.full_name, email: p.email }),
          );
        }
        setRecentBookings(
          bookingsRaw.map((b) => ({
            ...b,
            full_name: b.user_id ? profMap.get(b.user_id)?.full_name ?? null : null,
            email: b.user_id ? profMap.get(b.user_id)?.email ?? null : null,
          })),
        );

      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Errore caricamento");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { kpi, upcoming, recentBookings, loading, error };
};
