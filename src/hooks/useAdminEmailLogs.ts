import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export interface EmailLogRow {
  id: string;
  to_email: string;
  subject: string;
  template: string | null;
  status: string;
  error_message: string | null;
  provider_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export type TimeRange = "24h" | "7d" | "30d";

const rangeStart = (r: TimeRange) => {
  const map = { "24h": 1, "7d": 7, "30d": 30 } as const;
  return new Date(Date.now() - map[r] * 86400000).toISOString();
};

export const useAdminEmailLogs = () => {
  const [range, setRange] = useState<TimeRange>("7d");
  const [template, setTemplate] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("email_logs")
        .select("id, to_email, subject, template, status, error_message, provider_id, sent_at, created_at")
        .gte("created_at", rangeStart(range))
        .order("created_at", { ascending: false })
        .limit(500);
      if (template) q = q.eq("template", template);
      if (status) q = q.eq("status", status);
      const { data, error: err } = await q;
      if (err) throw err;
      setRows((data as EmailLogRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento email logs");
    } finally {
      setLoading(false);
    }
  }, [range, template, status]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.from("email_logs").select("template").not("template", "is", null).limit(1000)
      .then(({ data }) => {
        const set = new Set<string>();
        (data as { template: string | null }[] | null)?.forEach((r) => r.template && set.add(r.template));
        setTemplates(Array.from(set).sort());
      });
  }, []);

  const stats = useMemo(() => {
    const acc = { total: rows.length, sent: 0, failed: 0, bounced: 0 };
    rows.forEach((r) => {
      if (r.status === "sent") acc.sent++;
      else if (r.status === "failed") acc.failed++;
      else if (r.status === "bounced" || r.status === "complained") acc.bounced++;
    });
    return acc;
  }, [rows]);

  return { rows, templates, range, setRange, template, setTemplate, status, setStatus, loading, error, stats, refresh: fetchRows };
};
