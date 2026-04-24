import { useMemo, useState } from "react";
import { Calendar, MapPin, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type EventStatus = "upcoming" | "past";
type MockEvent = {
  id: string;
  title: string;
  date: string; // ISO
  location: string;
  status: EventStatus;
  tag: string;
  description: string;
};

const MOCK: MockEvent[] = [
  {
    id: "grill-2026",
    title: "Grill Contest Rivergaro 2026",
    date: "2026-06-20",
    location: "Rivergaro (PC)",
    status: "upcoming",
    tag: "BBQ",
    description: "Il festival BBQ più atteso lungo il Trebbia: food truck, DJ set e gara barbecue.",
  },
  {
    id: "placeholder-1",
    title: "[Placeholder] Evento futuro",
    date: "2026-09-12",
    location: "Da definire",
    status: "upcoming",
    tag: "Festa",
    description: "Descrizione placeholder dell'evento.",
  },
  {
    id: "placeholder-past",
    title: "[Placeholder] Edizione 2025",
    date: "2025-06-21",
    location: "Rivergaro (PC)",
    status: "past",
    tag: "BBQ",
    description: "Edizione passata dell'evento.",
  },
];

const filters: { key: "all" | EventStatus; label: string }[] = [
  { key: "all", label: "Tutti" },
  { key: "upcoming", label: "Prossimi" },
  { key: "past", label: "Passati" },
];

const Eventi = () => {
  const [filter, setFilter] = useState<"all" | EventStatus>("upcoming");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    return MOCK.filter((e) => (filter === "all" ? true : e.status === filter)).filter((e) =>
      q ? (e.title + " " + e.tag + " " + e.location).toLowerCase().includes(q.toLowerCase()) : true
    );
  }, [filter, q]);

  return (
    <div className="container max-w-6xl mx-auto px-4 py-10 md:py-16">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Eventi</h1>
        <p className="text-muted-foreground text-lg">Scopri gli eventi e iscriviti.</p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca evento..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nessun evento trovato.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <Card key={e.id} className="hover:border-primary/40 transition-colors flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="secondary">{e.tag}</Badge>
                  {e.status === "past" && <Badge variant="outline">Concluso</Badge>}
                </div>
                <CardTitle className="text-lg">{e.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 text-sm text-muted-foreground">
                <p className="flex-1">{e.description}</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(e.date).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{e.location}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Eventi;
