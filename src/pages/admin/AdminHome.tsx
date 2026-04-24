import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus, Calendar, FileText, Users, ArrowRight, Settings } from "lucide-react";

const sections = [
  {
    to: "/admin/eventi",
    title: "Eventi",
    description: "Crea e gestisci eventi, visibilità e iscrizioni.",
    icon: Calendar,
  },
  {
    to: "/admin/shuttle",
    title: "Shuttle",
    description: "Prenotazioni, slot di andata e ritorno, esportazioni.",
    icon: Bus,
  },
  {
    to: "/admin/impostazioni",
    title: "Impostazioni",
    description: "Telefono, email, social: dati globali del sito.",
    icon: Settings,
  },
  {
    to: "/admin/utenti",
    title: "Utenti & ruoli",
    description: "Lista utenti, promozione admin, gestione account.",
    icon: Users,
    disabled: true,
  },
  {
    to: "/admin/cms",
    title: "CMS contenuti",
    description: "Modifica testi e immagini delle pagine pubbliche (Sanity).",
    icon: FileText,
    disabled: true,
  },
];

const AdminHome = () => {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-10 md:py-16">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard Admin</h1>
        <p className="text-muted-foreground">Scegli una sezione per iniziare.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const Icon = s.icon;
          const card = (
            <Card
              className={`h-full transition-colors ${
                s.disabled ? "opacity-60" : "hover:border-primary/50 hover:shadow-md cursor-pointer"
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  {!s.disabled && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                </div>
                <CardTitle className="text-xl mt-4">{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {s.disabled && (
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    In arrivo
                  </span>
                )}
              </CardContent>
            </Card>
          );
          return s.disabled ? (
            <div key={s.to}>{card}</div>
          ) : (
            <Link key={s.to} to={s.to}>
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default AdminHome;
