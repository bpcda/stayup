import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
};

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, phone, city")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      setError(error.message);
    } else {
      setProfile(
        (data as Profile) ?? {
          id: user.id,
          first_name: null,
          last_name: null,
          phone: null,
          city: null,
        }
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (patch: Partial<Omit<Profile, "id">>) => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...patch }, { onConflict: "id" });
    if (!error) {
      setProfile((p) => (p ? { ...p, ...patch } : { id: user.id, ...patch } as Profile));
    }
    return { error: error?.message ?? null };
  };

  return { profile, loading, error, reload: load, update };
};
