import { Link } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { useEventDetail } from "@/hooks/useEventDetail";
import { EventHero } from "@/components/event-detail/EventHero";
import { EventContent } from "@/components/event-detail/EventContent";

const formatDateLong = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
};

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

const EventoDettaglio = () => {
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  const [shuttleSubmitted, setShuttleSubmitted] = useState(false);
  const contactPhone = settings.contact_phone?.replace(/\s+/g, "") || "";
  const { event, loading, registered, busy, register, unregister, isPast } = useEventDetail();

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: event?.title, url }); return; } catch { /* cancel */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiato" });
    } catch {
      toast({ title: "Impossibile condividere", variant: "destructive" });
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Caricamento…</div>;
  if (!event) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">Evento non trovato.</p>
        <Button asChild variant="outline"><Link to="/eventi">Torna agli eventi</Link></Button>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <EventHero event={event} contactPhone={contactPhone} share={share} />
      <EventContent 
        event={event} 
        registered={registered} 
        isPast={isPast} 
        formatDateLong={formatDateLong} 
        formatTime={formatTime} 
        onShuttleSuccess={() => setShuttleSubmitted(true)}
        shuttleSubmitted={shuttleSubmitted}
      />

      {!isPast && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 pb-4 px-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          <div className="container max-w-3xl mx-auto md:pb-0 pb-16">
            <Button onClick={registered ? unregister : register} disabled={busy} variant={registered ? "outline" : "default"} size="lg" className={`w-full h-14 text-base font-bold uppercase rounded-full ${!registered ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}`}>
              {busy ? "..." : registered ? "Annulla iscrizione" : "Accreditati ora"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventoDettaglio;
