import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PRIVACY_POLICY_VERSION } from "@/lib/consent";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  privacy_version: string | null;
  privacy_accepted_at: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
};

const SELECT_COLS =
  "id, first_name, last_name, phone, city, privacy_version, privacy_accepted_at, marketing_consent, marketing_consent_at";

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
      .select(SELECT_COLS)
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
          privacy_version: null,
          privacy_accepted_at: null,
          marketing_consent: false,
          marketing_consent_at: null,
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

  /** Aggiorna il consenso marketing e registra l'evento nel log audit. */
  const setMarketingConsent = async (granted: boolean) => {
    if (!user) return { error: "Not authenticated" };
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        marketing_consent: granted,
        marketing_consent_at: granted ? now : null,
      })
      .eq("id", user.id);
    if (error) return { error: error.message };

    await supabase.from("consent_log").insert({
      user_id: user.id,
      consent_type: "marketing",
      granted,
      policy_version: PRIVACY_POLICY_VERSION,
      source: "profile",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    setProfile((p) =>
      p ? { ...p, marketing_consent: granted, marketing_consent_at: granted ? now : null } : p
    );
    return { error: null };
  };

  return { profile, loading, error, reload: load, update, setMarketingConsent };
};
