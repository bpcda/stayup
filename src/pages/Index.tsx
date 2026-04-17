import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import stayupLogo from "@/assets/stayup-logo.png";

const Index = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-md">
        <img src={stayupLogo} alt="StayUp Logo" className="w-48 md:w-64 h-auto" />

        <p className="text-muted-foreground text-lg tracking-widest uppercase font-light">
          {t("index.wip")}
        </p>

        <Button variant="hero" size="lg" asChild>
          <Link to="/grill-contest">{t("index.cta")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
