import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type Role = "admin" | "organizer" | "user";

export type ActivityWindow = "all" | "30" | "90" | "180";

export interface CrmFilters {
  search: string;
  activity: ActivityWindow;
  hasBooking: boolean;
  hasCheckin: boolean;
  noShow: boolean;
  categoryId: string | "all";
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
  roles: Role[];
  bookingsCount: number;
  checkinsCount: number;
  noShowCount: number;
  lastActivityAt: string | null;
  categoryIds: string[];
  categoryNames: string[];
}

interface BookingLite { user_id: string; event_id: string; status: string; booked_at: string }
interface CheckinLite { user_id: string; event_id: string; checked_in_at: string }
interface EventLite { id: string; category_id: string | null; ends_at: string | null; starts_at: string | null }
interface CategoryLite { id: string; name: string }

const DAYS = (n: string) => {
  const d = new Date(); d.setDate(d.getDate() - parseInt(n, 10)); return d.toISOString();
};

export const useAdminUsers = () => {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [filters, setFilters] = useState<CrmFilters>({
    search: "", activity: "all", hasBooking: false, hasCheckin: false, noShow: false, categoryId: "all",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, city, created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (pErr) throw pErr;
      const ids = (profiles ?? []).map((p) => p.id);

      const [rolesRes, bookingsRes, checkinsRes, eventsRes, catsRes] = await Promise.all([
        ids.length ? supabase.from("user_roles").select("user_id, role").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string; role: Role }[] }),
        ids.length ? supabase.from("bookings").select("user_id, event_id, status, booked_at").in("user_id", ids) : Promise.resolve({ data: [] as BookingLite[] }),
        ids.length ? supabase.from("checkins").select("user_id, event_id, checked_in_at").in("user_id", ids) : Promise.resolve({ data: [] as CheckinLite[] }),
        supabase.from("events").select("id, category_id, ends_at, starts_at"),
        supabase.from("event_categories").select("id, name").order("name"),
      ]);

      const roleMap = new Map<string, Role[]>();
      (rolesRes.data as { user_id: string; role: Role }[] | null)?.forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? []; arr.push(r.role); roleMap.set(r.user_id, arr);
      });

      const eventMap = new Map<string, EventLite>();
      ((eventsRes.data as EventLite[] | null) ?? []).forEach((e) => eventMap.set(e.id, e));

      const cats = (catsRes.data as CategoryLite[] | null) ?? [];
      setCategories(cats);
      const catNameMap = new Map(cats.map((c) => [c.id, c.name]));

      const bookings = (bookingsRes.data as BookingLite[] | null) ?? [];
      const checkins = (checkinsRes.data as CheckinLite[] | null) ?? [];

      // checkin set keyed by user|event
      const checkinKeys = new Set(checkins.map((c) => `${c.user_id}|${c.event_id}`));
      const now = new Date().toISOString();

      const perUser = new Map<string, {
        bookings: number; checkins: number; noShow: number;
        last: string | null; cats: Set<string>;
      }>();
      const ensure = (uid: string) => {
        let v = perUser.get(uid);
        if (!v) { v = { bookings: 0, checkins: 0, noShow: 0, last: null, cats: new Set() }; perUser.set(uid, v); }
        return v;
      };
      const bump = (uid: string, when: string | null) => {
        const v = ensure(uid);
        if (when && (!v.last || when > v.last)) v.last = when;
      };

      bookings.forEach((b) => {
        const v = ensure(b.user_id);
        v.bookings += 1;
        bump(b.user_id, b.booked_at);
        const ev = eventMap.get(b.event_id);
        if (ev?.category_id) v.cats.add(ev.category_id);
        // no-show: confirmed booking on past event with no checkin
        if (b.status === "confirmed" && ev?.ends_at && ev.ends_at < now && !checkinKeys.has(`${b.user_id}|${b.event_id}`)) {
          v.noShow += 1;
        }
      });
      checkins.forEach((c) => {
        const v = ensure(c.user_id);
        v.checkins += 1;
        bump(c.user_id, c.checked_in_at);
      });

      setRows((profiles ?? []).map((p) => {
        const v = perUser.get(p.id);
        const last = v?.last ?? p.created_at;
        const catIds = v ? Array.from(v.cats) : [];
        return {
          ...p,
          roles: roleMap.get(p.id) ?? [],
          bookingsCount: v?.bookings ?? 0,
          checkinsCount: v?.checkins ?? 0,
          noShowCount: v?.noShow ?? 0,
          lastActivityAt: last,
          categoryIds: catIds,
          categoryNames: catIds.map((id) => catNameMap.get(id) ?? "").filter(Boolean),
        };
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento utenti");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const grantRole = async (userId: string, role: Role) => {
    if (!isSupabaseConfigured) return;
    const { error: err } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (err && !err.message.includes("duplicate")) {
      toast({ title: "Errore", description: err.message, variant: "destructive" }); return;
    }
    toast({ title: `Ruolo ${role} assegnato` });
    fetchRows();
  };

  const revokeRole = async (userId: string, role: Role) => {
    if (!isSupabaseConfigured) return;
    const { error: err } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (err) { toast({ title: "Errore", description: err.message, variant: "destructive" }); return; }
    toast({ title: `Ruolo ${role} revocato` });
    fetchRows();
  };

  const filtered = useMemo(() => {
    const s = filters.search.trim().toLowerCase();
    const minIso = filters.activity === "all" ? null : DAYS(filters.activity);
    return rows.filter((r) => {
      if (s && !(r.email?.toLowerCase().includes(s) || r.full_name?.toLowerCase().includes(s))) return false;
      if (minIso && (!r.lastActivityAt || r.lastActivityAt < minIso)) return false;
      if (filters.hasBooking && r.bookingsCount === 0) return false;
      if (filters.hasCheckin && r.checkinsCount === 0) return false;
      if (filters.noShow && r.noShowCount === 0) return false;
      if (filters.categoryId !== "all" && !r.categoryIds.includes(filters.categoryId)) return false;
      return true;
    });
  }, [rows, filters]);

  const exportCsv = useCallback(() => {
    const headers = [
      "id", "email", "full_name", "phone", "city", "created_at",
      "roles", "bookings", "checkins", "no_show", "last_activity_at", "categories",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      lines.push([
        r.id, r.email ?? "", r.full_name ?? "", r.phone ?? "", r.city ?? "", r.created_at,
        r.roles.join("|"), r.bookingsCount, r.checkinsCount, r.noShowCount,
        r.lastActivityAt ?? "", r.categoryNames.join("|"),
      ].map(escape).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-utenti-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return {
    rows: filtered,
    total: rows.length,
    categories,
    filters,
    setFilters,
    loading,
    error,
    grantRole,
    revokeRole,
    refresh: fetchRows,
    exportCsv,
  };
};
