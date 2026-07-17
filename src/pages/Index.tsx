import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();

  return (
    <div
      className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ backgroundColor: "#050505" }}
    >
      {/* Texture / Noise in background (simulated via subtle radial gradient) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,159,0,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-3xl">
        
        {/* Accent / Subtitle */}
        <p
          className="text-xs md:text-sm font-semibold tracking-[0.3em] uppercase"
          style={{ color: "#FF9F00" }}
        >
          {t("index.eyebrow")}
        </p>

        {/* Main Title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
          {t("index.titleLine1")}<br />{t("index.titleLine2")}
        </h1>

        {/* Primary CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            to="/eventi"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm md:text-base transition-all"
            style={{
              backgroundColor: "#FF9F00",
              color: "#050505",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FFB733")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FF9F00")}
          >
            {t("index.eventsCta")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
