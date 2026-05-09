import { ArrowLeft, Phone, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EventRow } from "@/interfaces/events";

interface EventHeroProps {
  event: EventRow;
  contactPhone: string;
  share: () => void;
}

export const EventHero = ({ event, contactPhone, share }: EventHeroProps) => {
  const navigate = useNavigate();
  return (
    <section className="relative">
      <div className="relative w-full aspect-[3/4] sm:aspect-[16/9] max-h-[80vh] overflow-hidden bg-secondary">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="absolute top-4 inset-x-0 px-4 flex items-center justify-between" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button onClick={() => navigate(-1)} className="h-11 w-11 rounded-full bg-background/95 text-foreground shadow-md flex items-center justify-center hover:bg-background transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {contactPhone && (
            <a href={`tel:${contactPhone}`} className="h-11 w-11 rounded-full bg-background/95 text-primary shadow-md flex items-center justify-center hover:bg-background transition">
              <Phone className="h-5 w-5" />
            </a>
          )}
          <button onClick={share} className="h-11 w-11 rounded-full bg-background/95 text-primary shadow-md flex items-center justify-center hover:bg-background transition">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
};
