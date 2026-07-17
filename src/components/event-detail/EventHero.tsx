import { ArrowLeft, Phone, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EventRow } from "@/interfaces/events";
import { useTranslation } from "react-i18next";
import { pickLocalized } from "@/lib/localized";

interface EventHeroProps {
  event: EventRow;
  contactPhone: string;
  share: () => void;
}

export const EventHero = ({ event, contactPhone, share }: EventHeroProps) => {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const title = pickLocalized(event, "title", i18n.language) ?? event.title;

  return (
    <section className="relative">
      {/* Cover image */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[16/9] max-h-[88vh] overflow-hidden bg-[#0A0A0A]">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-[#050505]" />
        )}

        {/* Aggressive bottom-to-top overlay so title bleeds over */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, #050505 0%, rgba(5,5,5,0.55) 45%, rgba(5,5,5,0.05) 100%)",
          }}
        />
      </div>

      {/* Action buttons — top bar */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-4"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back")}
          className="h-11 w-11 rounded-full flex items-center justify-center transition-colors"
          style={{
            backgroundColor: "rgba(0,0,0,0.65)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.85)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.65)")}
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>

        <div className="flex items-center gap-2">
          {contactPhone && (
            <a
              href={`tel:${contactPhone}`}
              aria-label={t("eventDetail.call")}
              className="h-11 w-11 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: "rgba(0,0,0,0.65)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <Phone className="h-5 w-5 text-primary" />
            </a>
          )}
          <button
            onClick={share}
            aria-label={t("eventDetail.share")}
            className="h-11 w-11 rounded-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.85)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.65)")}
          >
            <Share2 className="h-5 w-5 text-primary" />
          </button>
        </div>
      </div>
    </section>
  );
};
