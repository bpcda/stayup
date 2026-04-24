import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const TermsConditions = () => {
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
        <h1 className="text-3xl font-bold mb-8 font-heading">{t("terms.title")}</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("terms.s1Title")}</h2>
            <p><Trans i18nKey="terms.s1B1" components={{ strong: <strong className="text-foreground" /> }} /></p>
            <p><Trans i18nKey="terms.s1B2" components={{ strong: <strong className="text-foreground" /> }} /></p>
            <p>{t("terms.s1B3")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("terms.s2Title")}</h2>
            <p>{t("terms.s2Body")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("terms.s2L1")}</li>
              <li>{t("terms.s2L2")}</li>
              <li>{t("terms.s2L3")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("terms.s3Title")}</h2>
            <p>{t("terms.s3Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("terms.s4Title")}</h2>
            <p>{t("terms.s4Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("terms.s5Title")}</h2>
            <p>{t("terms.s5Body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">{t("terms.s6Title")}</h2>
            <p><Trans i18nKey="terms.s6Body" components={{ strong: <strong className="text-foreground" /> }} /></p>
          </section>
        </div>
      </div>

    </div>
  );
};

export default TermsConditions;
