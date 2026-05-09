import { MapPin, ChevronDown, ChevronUp, ExternalLink, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ShuttleForm from "@/components/ShuttleForm";
import { EventRow } from "@/interfaces/events";
import { useState } from "react";

interface EventContentProps {
  event: EventRow;
  registered: boolean;
  isPast: boolean;
  formatDateLong: (iso: string) => string;
  formatTime: (iso: string) => string;
  onShuttleSuccess: () => void;
  shuttleSubmitted: boolean;
}

export const EventContent = ({ event, registered, isPast, formatDateLong, formatTime, onShuttleSuccess, shuttleSubmitted }: EventContentProps) => {
  const [showMore, setShowMore] = useState(false);
  const description = event.description ?? "";
  const isLong = description.length > 220;
  const shownDescription = !isLong || showMore ? description : description.slice(0, 220).trimEnd() + "…";

  const mapsQuery = encodeURIComponent(event.location ?? event.title);
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const mapsEmbed = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

  return (
    <section className="container max-w-3xl mx-auto px-4 -mt-4 relative">
      {event.starts_at && (
        <p className="text-primary font-bold tracking-wide text-sm">
          {formatDateLong(event.starts_at)} / {formatTime(event.starts_at)}
        </p>
      )}
      <h1 className="text-3xl md:text-4xl font-bold mt-2 uppercase leading-tight">{event.title}</h1>
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

      {description && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-3">Informazioni</h2>
          <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{shownDescription}</p>
          {isLong && (
            <button onClick={() => setShowMore((v) => !v)} className="mt-3 inline-flex items-center gap-1 text-primary font-medium">
              {showMore ? "Mostra meno" : "Altre informazioni"}
              {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}

      {event.location && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-3">Location</h2>
          <p className="text-muted-foreground mb-4">{event.location}</p>
          <div className="rounded-xl overflow-hidden border border-border aspect-[16/10] bg-secondary">
            <iframe title={`Mappa ${event.title}`} src={mapsEmbed} className="w-full h-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-primary font-medium">
            Apri su mappe <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      {(event.starts_at || event.ends_at) && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-3">Orari</h2>
          <div className="space-y-2 text-muted-foreground">
            {event.starts_at && (
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Data e Ora inizio: <span className="text-foreground font-medium">{formatDateLong(event.starts_at)} / {formatTime(event.starts_at)}</span>
              </p>
            )}
            {event.ends_at && (
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Data e Ora chiusura: <span className="text-foreground font-medium">{formatDateLong(event.ends_at)} / {formatTime(event.ends_at)}</span>
              </p>
            )}
          </div>
        </div>
      )}
      {event.has_shuttle && !isPast && (
        <div className="mt-12 p-6 rounded-2xl border border-primary/20 bg-primary/5">
          <h2 className="text-xl font-bold mb-6 text-center">Servizio Navetta</h2>
          {shuttleSubmitted ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2">Prenotazione Inviata</h3>
              <p className="text-muted-foreground">Controlla la tua email per i dettagli del pagamento.</p>
            </div>
          ) : (
            <ShuttleForm eventId={event.id} onSuccess={onShuttleSuccess} />
          )}
        </div>
      )}
    </section>
  );
};
