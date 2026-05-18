import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, Ticket } from "lucide-react";
import ShuttleForm from "@/components/ShuttleForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import stayupLogo from "@/assets/stayup-logo.png";

const XCEED_URL =
  "https://xceed.me/en/piacenza/event/tao-experience-afterclass-x-stayuppc/231048/channel/afterclass-cr";

const TaoExperience = () => {
  const [submitted, setSubmitted] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen px-4 py-8 md:py-16">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            ← {t("common.home")}
          </Link>
          <LanguageSwitcher />
        </div>

        <section className="text-center mb-10">
          <Link to="/" aria-label="StayUp" className="block mb-6">
            <img
              src={stayupLogo}
              alt="StayUp"
              className="w-32 md:w-40 h-auto mx-auto"
            />
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
            {t("tao.title")}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-lg mx-auto">
            {t("tao.description")}
          </p>
        </section>

        {/* Step 1 — Xceed ticket */}
        <section className="bg-card rounded-2xl p-6 md:p-8 border border-border mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-sm font-semibold flex items-center justify-center">
              1
            </div>
            <h2 className="text-lg font-semibold font-heading">
              {t("tao.ticketTitle")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("tao.ticketDescription")}
          </p>
          <Button asChild variant="hero" className="w-full">
            <a
              href={XCEED_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2"
            >
              <Ticket className="w-4 h-4" />
              {t("tao.ticketCta")}
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </Button>
        </section>

        {/* Step 2 — Shuttle */}
        <section className="bg-card rounded-2xl p-6 md:p-8 border border-border">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-sm font-semibold flex items-center justify-center">
              2
            </div>
            <h2 className="text-lg font-semibold font-heading">
              {t("tao.shuttleTitle")}
            </h2>
          </div>

          {submitted ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2">
                {t("grill.successTitle")}
              </h3>
              <p className="text-muted-foreground">
                {t("grill.successMessage")}
              </p>
            </div>
          ) : (
            <ShuttleForm onSuccess={() => setSubmitted(true)} />
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default TaoExperience;
