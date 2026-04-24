import { Mail, Phone, MapPin, Instagram } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const items = [
  { icon: Mail, label: "Email", value: "info@example.com", href: "mailto:info@example.com" },
  { icon: Phone, label: "Telefono", value: "+39 000 000 0000", href: "tel:+390000000000" },
  { icon: MapPin, label: "Sede", value: "[Indirizzo placeholder]" },
  { icon: Instagram, label: "Instagram", value: "@stayup", href: "https://instagram.com/" },
];

const Contatti = () => {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-10 md:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Contatti</h1>
        <p className="text-muted-foreground text-lg">
          Scrivici, chiamaci o passa a trovarci. Siamo qui per aiutarti.
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
                <CardTitle className="text-base">{it.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">{it.value}</CardContent>
            </Card>
          );
          return it.href ? (
            <a key={it.label} href={it.href} target={it.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {Body}
            </a>
          ) : (
            <div key={it.label}>{Body}</div>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Form contatti</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          [Placeholder] Qui inseriremo un form di contatto collegato al backend per ricevere messaggi via email.
        </CardContent>
      </Card>
    </div>
  );
};

export default Contatti;
