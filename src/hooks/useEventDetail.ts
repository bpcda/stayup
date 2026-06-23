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
          const { data: bk } = await supabase
            .from("bookings")
            .select("id, status")
            .eq("event_id", (ev as { id: string }).id)
            .eq("user_id", user.id)
            .in("status", ["pending", "confirmed"])
            .limit(1);
          setRegistered(!!bk && bk.length > 0);
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
      const { data, error } = await supabase.functions.invoke("create-event-booking", {
        body: { event_id: event.id },
      });
      if (error) {
        // L'edge function ritorna status non-200 con { error, message }
        const ctx = (error as { context?: { error?: string; message?: string } }).context;
        const code = ctx?.error ?? "";
        const msg = ctx?.message ?? error.message ?? "Errore durante la prenotazione";
        if (code === "sold_out") {
          toast({ title: "Posti esauriti", description: msg, variant: "destructive" });
        } else {
          toast({ title: "Errore", description: msg, variant: "destructive" });
        }
        return;
      }
      const emailStatus = (data as { email?: { status: string } } | null)?.email?.status;
      toast({
        title: "Prenotazione confermata",
        description: emailStatus === "sent"
          ? "Ti abbiamo inviato l'email con il QR code."
          : "La trovi nel tuo profilo. L'email potrebbe arrivare a breve.",
      });
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
        .from("bookings")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("event_id", event.id)
        .eq("user_id", user.id)
        .in("status", ["pending", "confirmed"]);
      if (error) throw error;
      toast({ title: "Prenotazione annullata" });
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
