import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { EventRow } from "@/interfaces/events";

/**
 * Carica il dettaglio evento via Supabase + stato iscrizione utente.
 * UI invariata: stessa firma di prima.
 */
export const useEventDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug || !isSupabaseConfigured) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      try {
        const { data: ev, error } = await supabase
          .from("events")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        if (!ev) { setEvent(null); setLoading(false); return; }

        setEvent(ev as unknown as EventRow);

        if (user) {
          const { data: parts } = await supabase
            .from("event_participations")
            .select("id")
            .eq("event_id", (ev as { id: string }).id)
            .eq("user_id", user.id)
            .limit(1);
          setRegistered(!!parts && parts.length > 0);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, [slug, user]);

  const register = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!event || !isSupabaseConfigured) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("event_participations")
        .insert({ event_id: event.id, user_id: user.id, status: "registered" });
      if (error) throw error;
      toast({ title: "Iscrizione confermata" });
      setRegistered(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Errore", description: message, variant: "destructive" });
    }
    setBusy(false);
  };

  const unregister = async () => {
    if (!user || !event || !isSupabaseConfigured) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("event_participations")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Iscrizione annullata" });
      setRegistered(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Errore", description: message, variant: "destructive" });
    }
    setBusy(false);
  };

  const isPast = useMemo(
    () => (event?.starts_at ? new Date(event.starts_at).getTime() < Date.now() : false),
    [event?.starts_at]
  );

  return { event, loading, registered, busy, register, unregister, isPast };
};
