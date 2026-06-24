import { MapPin, ChevronDown, ChevronUp, ExternalLink, Calendar, Clock } from "lucide-react";
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

export const EventContent = ({
  event,
  registered,
  isPast,
  formatDateLong,
  formatTime,
  onShuttleSuccess,
  shuttleSubmitted,
}: EventContentProps) => {
  const [showMore, setShowMore] = useState(false);
  const description = event.description ?? "";
  const isLong = description.length > 220;
  const shownDescription =
    !isLong || showMore ? description : description.slice(0, 220).trimEnd() + "…";

  const mapsQuery = encodeURIComponent(event.location ?? event.title);
  const mapsLink  = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const mapsEmbed = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

  return (
    <section className="max-w-3xl mx-auto px-4 -mt-6 relative pb-12">
      {/* Date */}
      {event.starts_at && (
        <p className="text-primary text-xs font-bold tracking-[0.15em] uppercase mb-3">
          {formatDateLong(event.starts_at)} · {formatTime(event.starts_at)}
        </p>
      )}

      {/* Title */}
      <h1 className="text-3xl md:text-5xl font-bold uppercase leading-tight text-white">
        {event.title}
      </h1>

      {/* Location */}
      {event.location && (
        <p className="mt-4 flex items-start gap-2 font-semibold uppercase text-sm text-white/80">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>{event.location}</span>
        </p>
      )}

      {/* Status badges */}
      <div className="flex gap-2 mt-4">
        {registered && (
          <span
            className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border"
            style={{
              color: "#4ade80",
              backgroundColor: "rgba(74,222,128,0.08)",
              borderColor: "rgba(74,222,128,0.25)",
            }}
          >
            Iscritto
          </span>
        )}
        {isPast && (
          <span
            className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border"
            style={{
              color: "#8A8A8A",
              backgroundColor: "rgba(138,138,138,0.08)",
              borderColor: "rgba(138,138,138,0.2)",
            }}
          >
            Concluso
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="mt-8 mb-8 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* Description */}
      {description && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white uppercase tracking-wider">
            Informazioni
          </h2>
          <p className="text-[#D0D0D0] whitespace-pre-line leading-relaxed text-sm">
            {shownDescription}
          </p>
          {isLong && (
            <button
              onClick={() => setShowMore((v) => !v)}
              className="inline-flex items-center gap-1.5 text-primary text-sm font-medium hover:opacity-80 transition-opacity"
            >
              {showMore ? "Mostra meno" : "Continua a leggere"}
              {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}

      {/* Orari */}
      {(event.starts_at || event.ends_at) && (
        <div className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-white uppercase tracking-wider">Orari</h2>
          <div className="space-y-2 text-sm text-[#D0D0D0]">
            {event.starts_at && (
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                Inizio:{" "}
                <span className="text-white font-medium">
                  {formatDateLong(event.starts_at)} · {formatTime(event.starts_at)}
                </span>
              </p>
            )}
            {event.ends_at && (
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                Chiusura:{" "}
                <span className="text-white font-medium">
                  {formatDateLong(event.ends_at)} · {formatTime(event.ends_at)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Location map */}
      {event.location && (
        <div className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-white uppercase tracking-wider">Location</h2>
          <div
            className="rounded-2xl overflow-hidden border aspect-[16/10] bg-[#0A0A0A]"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
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
            className="inline-flex items-center gap-1.5 text-primary text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Apri su Google Maps <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* Shuttle */}
      {event.has_shuttle && !isPast && (
        <div
          className="mt-10 p-6 rounded-2xl border"
          style={{
            borderColor: "rgba(255,159,0,0.2)",
            backgroundColor: "rgba(255,159,0,0.04)",
          }}
        >
          <h2 className="text-base font-semibold text-white uppercase tracking-wider mb-6 text-center">
            Servizio Navetta
          </h2>
          {shuttleSubmitted ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-4xl">✅</div>
              <h3 className="text-lg font-semibold text-white">Prenotazione Inviata</h3>
              <p className="text-[#8A8A8A] text-sm">
                Controlla la tua email per i dettagli del pagamento.
              </p>
            </div>
          ) : (
            <ShuttleForm eventId={event.id} onSuccess={onShuttleSuccess} />
          )}
        </div>
      )}
    </section>
  );
};
