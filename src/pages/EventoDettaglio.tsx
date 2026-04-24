import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, Share2, MapPin, ChevronDown, ChevronUp, ExternalLink, Calendar, Clock } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type EventDetail = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  is_public: boolean;
};



const formatDateLong = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
};
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

const EventoDettaglio = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (!slug || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("id, slug, title, description, location, starts_at, ends_at, cover_image_url, is_active, is_public")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !data) {
        setEvent(null);
        setLoading(false);
        return;
      }
      setEvent(data as EventDetail);

      if (user) {
        const { data: part } = await supabase
          .from("event_participations")
          .select("id")
          .eq("event_id", (data as EventDetail).id)
          .eq("user_id", user.id)
          .maybeSingle();
        setRegistered(!!part);
      }
      setLoading(false);
    })();
  }, [slug, user]);

  const isPast = useMemo(
    () => (event?.starts_at ? new Date(event.starts_at).getTime() < Date.now() : false),
    [event?.starts_at]
  );

  const register = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!event) return;
    setBusy(true);
    const { error } = await supabase
      .from("event_participations")
      .insert({ event_id: event.id, user_id: user.id, status: "registered" });
    setBusy(false);
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Iscrizione confermata" });
    setRegistered(true);
  };

  const unregister = async () => {
    if (!user || !event) return;
    setBusy(true);
    const { error } = await supabase
      .from("event_participations")
      .delete()
      .eq("event_id", event.id)
      .eq("user_id", user.id);
    setBusy(false);
    if (error) { toast({ title: "Errore", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Iscrizione annullata" });
    setRegistered(false);
  };

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

  if (loading) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Caricamento…</div>;
  }
  if (!event) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">Evento non trovato.</p>
        <Button asChild variant="outline"><Link to="/eventi">Torna agli eventi</Link></Button>
      </div>
    );
  }

  const description = event.description ?? "";
  const isLong = description.length > 220;
  const shownDescription = !isLong || showMore ? description : description.slice(0, 220).trimEnd() + "…";

  const mapsQuery = encodeURIComponent(event.location ?? event.title);
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const mapsEmbed = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

  return (
    <div className="pb-28">
      {/* HERO con immagine e azioni floating */}
      <section className="relative">
        <div className="relative w-full aspect-[3/4] sm:aspect-[16/9] max-h-[80vh] overflow-hidden bg-secondary">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary" />
          )}
          {/* sfumatura inferiore per fondersi col contenuto */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
        </div>

        {/* azioni floating */}
        <div
          className="absolute top-4 inset-x-0 px-4 flex items-center justify-between"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label="Indietro"
            className="h-11 w-11 rounded-full bg-background/95 text-foreground shadow-md flex items-center justify-center hover:bg-background transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <a
              href={`tel:${CONTACT_PHONE}`}
              aria-label="Chiama"
              className="h-11 w-11 rounded-full bg-background/95 text-primary shadow-md flex items-center justify-center hover:bg-background transition"
            >
              <Phone className="h-5 w-5" />
            </a>
            <button
              onClick={share}
              aria-label="Condividi"
              className="h-11 w-11 rounded-full bg-background/95 text-primary shadow-md flex items-center justify-center hover:bg-background transition"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* CONTENUTO */}
      <section className="container max-w-3xl mx-auto px-4 -mt-4 relative">
        {event.starts_at && (
          <p className="text-primary font-bold tracking-wide text-sm">
            {formatDateLong(event.starts_at)} / {formatTime(event.starts_at)}
          </p>
        )}
        <h1 className="text-3xl md:text-4xl font-bold mt-2 uppercase leading-tight">
          {event.title}
        </h1>
        {event.location && (
          <p className="mt-3 flex items-start gap-2 text-foreground/90 font-semibold uppercase text-sm">
            <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span>{event.location}</span>
          </p>
        )}

        <div className="flex gap-2 mt-4">
          {registered && <Badge>Iscritto</Badge>}
          {isPast && <Badge variant="outline">Concluso</Badge>}
        </div>

        {/* Informazioni */}
        {description && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">Informazioni</h2>
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
              {shownDescription}
            </p>
            {isLong && (
              <button
                onClick={() => setShowMore((v) => !v)}
                className="mt-3 inline-flex items-center gap-1 text-primary font-medium"
              >
                {showMore ? "Mostra meno" : "Altre informazioni"}
                {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}

        {/* Location + mappa */}
        {event.location && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">Location</h2>
            <p className="text-muted-foreground mb-4">{event.location}</p>
            <div className="rounded-xl overflow-hidden border border-border aspect-[16/10] bg-secondary">
              <iframe
                title={`Mappa ${event.title}`}
                src={mapsEmbed}
                className="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-primary font-medium"
            >
              Apri su mappe <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Orari */}
        {(event.starts_at || event.ends_at) && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">Orari</h2>
            <div className="space-y-2 text-muted-foreground">
              {event.starts_at && (
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Data e Ora inizio:{" "}
                  <span className="text-foreground font-medium">
                    {formatDateLong(event.starts_at)} / {formatTime(event.starts_at)}
                  </span>
                </p>
              )}
              {event.ends_at && (
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Data e Ora chiusura:{" "}
                  <span className="text-foreground font-medium">
                    {formatDateLong(event.ends_at)} / {formatTime(event.ends_at)}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* CTA fissa in basso */}
      {!isPast && (
        <div
          className="fixed inset-x-0 bottom-0 md:bottom-0 z-30 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 pb-4 px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          <div className="container max-w-3xl mx-auto md:pb-0 pb-16">
            {registered ? (
              <Button
                onClick={unregister}
                disabled={busy}
                variant="outline"
                size="lg"
                className="w-full h-14 text-base font-bold uppercase rounded-full"
              >
                {busy ? "..." : "Annulla iscrizione"}
              </Button>
            ) : (
              <Button
                onClick={register}
                disabled={busy}
                size="lg"
                className="w-full h-14 text-base font-bold uppercase rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {busy ? "..." : "Accreditati ora"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventoDettaglio;
