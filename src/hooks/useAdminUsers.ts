import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type Role = "admin" | "organizer" | "user";

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
  roles: Role[];
  bookingsCount: number;
}

export const useAdminUsers = () => {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState("");
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
        .limit(500);
      if (pErr) throw pErr;
      const ids = (profiles ?? []).map((p) => p.id);
      const [rolesRes, bookingsRes] = await Promise.all([
        ids.length ? supabase.from("user_roles").select("user_id, role").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string; role: Role }[] }),
        ids.length ? supabase.from("bookings").select("user_id").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string }[] }),
      ]);
      const roleMap = new Map<string, Role[]>();
      (rolesRes.data as { user_id: string; role: Role }[] | null)?.forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role); roleMap.set(r.user_id, arr);
      });
      const bookingMap = new Map<string, number>();
      (bookingsRes.data as { user_id: string }[] | null)?.forEach((b) => {
        bookingMap.set(b.user_id, (bookingMap.get(b.user_id) ?? 0) + 1);
      });
      setRows((profiles ?? []).map((p) => ({
        ...p,
        roles: roleMap.get(p.id) ?? [],
        bookingsCount: bookingMap.get(p.id) ?? 0,
      })));
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
      toast({ title: "Errore", description: err.message, variant: "destructive" });
      return;
    }
    toast({ title: `Ruolo ${role} assegnato` });
    fetchRows();
  };

  const revokeRole = async (userId: string, role: Role) => {
    if (!isSupabaseConfigured) return;
    const { error: err } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
      return;
    }
    toast({ title: `Ruolo ${role} revocato` });
    fetchRows();
  };

  const filtered = search.trim()
    ? rows.filter((r) => {
        const s = search.toLowerCase();
        return r.email?.toLowerCase().includes(s) || r.full_name?.toLowerCase().includes(s);
      })
    : rows;

  return { rows: filtered, search, setSearch, loading, error, grantRole, revokeRole, refresh: fetchRows };
};
