import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const ChiSiamo = () => {
  const { t } = useTranslation();

  return (
    <div className="container max-w-4xl mx-auto px-4 py-10 md:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">{t("about.title")}</h1>
        <p className="text-muted-foreground text-lg">
          {t("about.subtitle")}
        </p>
      </header>

      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("about.storyTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            {t("about.storyBody")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("about.whatTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            {t("about.whatBody")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("about.teamTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            {t("about.teamBody")}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default ChiSiamo;
