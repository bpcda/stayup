import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const LanguageSwitcher = ({ className = "" }: { className?: string }) => {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "it").slice(0, 2);

  const toggle = () => {
    const next = current === "it" ? "en" : "it";
    i18n.changeLanguage(next);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className={`h-8 px-2 text-xs font-medium ${className}`}
      aria-label="Change language"
    >
      <span className={current === "it" ? "text-primary" : "text-muted-foreground"}>IT</span>
      <span className="mx-1 text-muted-foreground">/</span>
      <span className={current === "en" ? "text-primary" : "text-muted-foreground"}>EN</span>
    </Button>
  );
};

export default LanguageSwitcher;
