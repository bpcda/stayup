import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import stayupLogo from "@/assets/stayup-logo.png";

const Index = () => {
  const { t } = useTranslation();

  return (
    <div
      className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ backgroundColor: "#050505" }}
    >
      {/* Subtle radial glow behind logo — minimal, not gaming */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 45%, rgba(255,159,0,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Top decorative line */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,159,0,0.3), transparent)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-10 text-center max-w-lg">
        {/* Logo */}
        <img
          src={stayupLogo}
          alt="StayUp"
          className="w-40 md:w-56 h-auto"
          draggable={false}
        />

        {/* Tagline */}
        <div className="space-y-3">
          <p
            className="text-xs font-semibold tracking-[0.3em] uppercase"
            style={{ color: "#FF9F00" }}
          >
            {t("index.wip")}
          </p>
          <p className="text-[#8A8A8A] text-sm leading-relaxed max-w-xs mx-auto">
            La piattaforma per scoprire e vivere gli eventi della notte.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/eventi"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              backgroundColor: "#FF9F00",
              color: "#050505",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FFB733")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FF9F00")}
          >
            Scopri gli eventi
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            to="/grill-contest"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm border transition-all text-[#D0D0D0] hover:text-white"
            style={{ borderColor: "rgba(255,255,255,0.12)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
          >
            {t("index.cta")}
          </Link>
        </div>
      </div>

      {/* Bottom decorative line */}
      <div
        className="absolute bottom-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)" }}
      />
    </div>
  );
};

export default Index;
