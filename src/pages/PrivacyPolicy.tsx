import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen px-4 py-8 md:py-16">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← {t("common.home")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="text-3xl font-bold mb-8 font-heading">{t("privacy.title")}</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("privacy.s1Title")}</h2>
            <p>{t("privacy.s1Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("privacy.s2Title")}</h2>
            <p>{t("privacy.s2Body")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("privacy.s2L1")}</li>
              <li>{t("privacy.s2L2")}</li>
              <li>{t("privacy.s2L3")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("privacy.s3Title")}</h2>
            <p>{t("privacy.s3Body")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("privacy.s3L1")}</li>
              <li>{t("privacy.s3L2")}</li>
              <li>{t("privacy.s3L3")}</li>
              <li>{t("privacy.s3L4")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("privacy.s4Title")}</h2>
            <p>{t("privacy.s4Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("privacy.s5Title")}</h2>
            <p>{t("privacy.s5Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("privacy.s6Title")}</h2>
            <p>{t("privacy.s6Body")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("privacy.s6L1")}</li>
              <li>{t("privacy.s6L2")}</li>
              <li>{t("privacy.s6L3")}</li>
              <li>{t("privacy.s6L4")}</li>
              <li>{t("privacy.s6L5")}</li>
              <li>{t("privacy.s6L6")}</li>
            </ul>
            <p className="mt-2">{t("privacy.s6Contact")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("privacy.s7Title")}</h2>
            <p>{t("privacy.s7Body")}</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
