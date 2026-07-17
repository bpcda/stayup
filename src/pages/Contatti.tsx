import { Mail, Phone, MapPin, Instagram } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const items = [
  { icon: Mail, labelKey: "contact.email", value: "info@example.com", href: "mailto:info@example.com" },
  { icon: Phone, labelKey: "contact.phone", value: "+39 000 000 0000", href: "tel:+390000000000" },
  { icon: MapPin, labelKey: "contact.location", valueKey: "contact.locationPlaceholder" },
  { icon: Instagram, labelKey: "contact.instagram", value: "@stayup", href: "https://instagram.com/" },
];

const Contatti = () => {
  const { t } = useTranslation();

  return (
    <div className="container max-w-4xl mx-auto px-4 py-10 md:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">{t("contact.title")}</h1>
        <p className="text-muted-foreground text-lg">
          {t("contact.subtitle")}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => {
          const Icon = it.icon;
          const Body = (
            <Card className="h-full hover:border-primary/40 transition-colors">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <div className="rounded-lg bg-primary/10 text-primary p-2">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{t(it.labelKey)}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">{it.valueKey ? t(it.valueKey) : it.value}</CardContent>
            </Card>
          );
          return it.href ? (
            <a key={it.labelKey} href={it.href} target={it.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {Body}
            </a>
          ) : (
            <div key={it.labelKey}>{Body}</div>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t("contact.formTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          {t("contact.formBody")}
        </CardContent>
      </Card>
    </div>
  );
};

export default Contatti;
