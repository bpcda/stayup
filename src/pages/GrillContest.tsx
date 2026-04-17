import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ShuttleForm from "@/components/ShuttleForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Footer from "@/components/Footer";
import eventLogo from "@/assets/loghi-evento.png";

const GrillContest = () => {
  const [submitted, setSubmitted] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen px-4 py-8 md:py-16">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            ← {t("common.home")}
          </Link>
          <LanguageSwitcher />
        </div>

        <section className="text-center mb-12">
          <Link to="/" aria-label="Grill Contest × StayUp" className="block mb-6">
            <img
              src={eventLogo}
              alt="Grill Contest × StayUp"
              className="w-full max-w-[min(100%,32rem)] h-auto mx-auto"
            />
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
            {t("grill.title")}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-lg mx-auto">
            {t("grill.description")}
          </p>
        </section>

        <section className="bg-card rounded-2xl p-6 md:p-8 border border-border">
          <h2 className="text-xl font-semibold mb-6 font-heading text-center">
            {t("grill.shuttleTitle")}
          </h2>

          {submitted ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2">{t("grill.successTitle")}</h3>
              <p className="text-muted-foreground">{t("grill.successMessage")}</p>
            </div>
          ) : (
            <ShuttleForm onSuccess={() => setSubmitted(true)} />
          )}
        </section>
      </div>
    </div>
  );
};

export default GrillContest;
