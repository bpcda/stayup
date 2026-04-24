import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export type SiteSettings = Record<string, string>;

const DEFAULTS: SiteSettings = {
  contact_phone: "",
  contact_email: "",
  contact_whatsapp: "",
  contact_instagram: "",
};

let cache: SiteSettings | null = null;
let inflight: Promise<SiteSettings> | null = null;

const fetchAll = async (): Promise<SiteSettings> => {
  if (!isSupabaseConfigured) return { ...DEFAULTS };
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error || !data) return { ...DEFAULTS };
  const map: SiteSettings = { ...DEFAULTS };
  for (const row of data as { key: string; value: string | null }[]) {
    map[row.key] = row.value ?? "";
  }
  return map;
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(cache ?? DEFAULTS);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    if (!inflight) inflight = fetchAll();
    inflight.then((s) => {
      cache = s;
      setSettings(s);
      setLoading(false);
    });
  }, []);

  return { settings, loading };
};

export const invalidateSiteSettings = () => {
  cache = null;
  inflight = null;
};
