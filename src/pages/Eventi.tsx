import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, AlertCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ----------------------------------------------------------------------------
// Tipi locali — la pagina parla solo con Supabase (schema v2),
// niente mock data. Forma allineata alla migration `20260623_stayup_v2_schema`.
// ----------------------------------------------------------------------------
type EventCategoryRef = { slug: string; name: string } | null;

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  cover_image_url: string | null;
  category_id: string | null;
  event_categories: EventCategoryRef;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
};

const periodFilters: { key: "upcoming" | "past" | "all"; label: string }[] = [
  { key: "upcoming", label: "Prossimi" },
  { key: "past", label: "Passati" },
  { key: "all", label: "Tutti" },
];

const Eventi = () => {
  const [period, setPeriod] = useState<"upcoming" | "past" | "all">("upcoming");
  const [categorySlug, setCategorySlug] = useState<string>("all");
  const [q, setQ] = useState("");

  const [events, setEvents] = useState<EventRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isSupabaseConfigured) {
        setError("Backend non configurato.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      const [eventsRes, categoriesRes] = await Promise.all([
        supabase
          .from("events")
          .select(
            "id, slug, title, description, location, starts_at, ends_at, cover_image_url, category_id, event_categories ( slug, name )",
          )
          .eq("status", "published")
          .order("starts_at", { ascending: true }),
        supabase
          .from("event_categories")
          .select("id, slug, name")
          .order("sort_order", { ascending: true }),
      ]);

      if (cancelled) return;

      if (eventsRes.error) {
        setError(eventsRes.error.message);
        setEvents([]);
      } else {
        setEvents((eventsRes.data as unknown as EventRow[]) ?? []);
      }

      if (!categoriesRes.error) {
        setCategories((categoriesRes.data as CategoryRow[]) ?? []);
      }

      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const list = useMemo(() => {
    const now = Date.now();
    const needle = q.trim().toLowerCase();

    return events.filter((e) => {
      const start = new Date(e.starts_at).getTime();

      if (period === "upcoming" && start < now) return false;
      if (period === "past" && start >= now) return false;

      if (categorySlug !== "all") {
        if (!e.event_categories || e.event_categories.slug !== categorySlug) return false;
      }

      if (needle) {
        const haystack = [
          e.title,
          e.description ?? "",
          e.location ?? "",
          e.event_categories?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  }, [events, period, categorySlug, q]);

  return (
    <div className="container max-w-6xl mx-auto px-4 py-10 md:py-16">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Eventi</h1>
        <p className="text-muted-foreground text-lg">Scopri gli eventi e iscriviti.</p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
          {periodFilters.map((f) => (
            <Button
              key={f.key}
              variant={period === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={categorySlug === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategorySlug("all")}
          >
            Tutte le categorie
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              variant={categorySlug === c.slug ? "default" : "outline"}
              size="sm"
              onClick={() => setCategorySlug(c.slug)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Caricamento eventi...</p>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-muted-foreground">
            Impossibile caricare gli eventi.
            <br />
            <span className="text-xs">{error}</span>
          </p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Riprova
          </Button>
        </div>
      ) : list.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nessun evento trovato.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => {
            const start = new Date(e.starts_at);
            const isPast = start.getTime() < Date.now();
            const href = `/eventi/${e.slug}`;
            return (
              <Link
                key={e.id}
                to={href}
                className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
              >
                <Card className="h-full overflow-hidden flex flex-col transition-all group-hover:border-primary/50 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
                    {e.cover_image_url ? (
                      <img
                        src={e.cover_image_url}
                        alt={e.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary" />
                    )}
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      {e.event_categories && (
                        <Badge variant="outline" className="bg-background/80 backdrop-blur">
                          {e.event_categories.name}
                        </Badge>
                      )}
                      {isPast && (
                        <Badge variant="outline" className="bg-background/80 backdrop-blur">
                          Concluso
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="flex-1 flex flex-col gap-3 p-4">
                    <p className="text-xs font-bold tracking-wide text-primary uppercase">
                      {start.toLocaleDateString("it-IT", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                      {" / "}
                      {start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <h3 className="font-bold text-lg leading-tight uppercase line-clamp-2">{e.title}</h3>
                    {e.location && (
                      <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{e.location}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Eventi;
