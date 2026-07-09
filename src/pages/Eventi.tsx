import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, AlertCircle, RefreshCw } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
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
  { key: "past",     label: "Passati"  },
  { key: "all",      label: "Tutti"    },
];

// ── FilterPill ────────────────────────────────────────────────────────────────
const FilterPill = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border transition-all",
      active
        ? "bg-primary text-black border-primary"
        : "text-[#8A8A8A] border-white/10 hover:border-white/20 hover:text-white"
    )}
  >
    {children}
  </button>
);

// ── EventCard ─────────────────────────────────────────────────────────────────
const EventCard = ({ e }: { e: EventRow }) => {
  const start = new Date(e.starts_at);
  const isPast = start.getTime() < Date.now();

  const dateStr = start.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const timeStr = start.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      to={`/eventi/${e.slug}`}
      className="event-card group block rounded-2xl overflow-hidden border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
      style={{
        backgroundColor: "#111111",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {/* Cover */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#1A1A1A]">
        {e.cover_image_url ? (
          <img
            src={e.cover_image_url}
            alt={e.title}
            loading="lazy"
            className="event-card-img absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-[#0A0A0A]" />
        )}

        {/* Dark overlay — always present */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {/* Category badge */}
        {e.event_categories && (
          <div className="absolute top-3 left-3">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border"
              style={{
                backgroundColor: "rgba(0,0,0,0.7)",
                borderColor: "rgba(255,255,255,0.15)",
                color: "#D0D0D0",
              }}
            >
              {e.event_categories.name}
            </span>
          </div>
        )}

        {/* Past badge */}
        {isPast && (
          <div className="absolute top-3 right-3">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border"
              style={{
                backgroundColor: "rgba(0,0,0,0.7)",
                borderColor: "rgba(255,255,255,0.1)",
                color: "#8A8A8A",
              }}
            >
              Concluso
            </span>
          </div>
        )}

        {/* Text over image — bottom */}
        <div className="absolute bottom-0 inset-x-0 p-4 space-y-1.5">
          <p className="text-[11px] font-bold tracking-widest text-primary uppercase">
            {dateStr} · {timeStr}
          </p>
          <h3 className="font-bold text-xl leading-tight text-white uppercase line-clamp-2">
            {e.title}
          </h3>
          {e.location && (
            <div className="flex items-center gap-1.5 text-[#D0D0D0] text-xs">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="line-clamp-1">{e.location}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

// ── Events Page ───────────────────────────────────────────────────────────────
const Eventi = () => {
  const [period, setPeriod]           = useState<"upcoming" | "past" | "all">("upcoming");
  const [categorySlug, setCategorySlug] = useState<string>("all");
  const [q, setQ]                     = useState("");

  const [events, setEvents]           = useState<EventRow[]>([]);
  const [categories, setCategories]   = useState<CategoryRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

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
    return () => { cancelled = true; };
  }, []);

  const list = useMemo(() => {
    const now    = Date.now();
    const needle = q.trim().toLowerCase();

    return events.filter((e) => {
      const start = new Date(e.starts_at).getTime();
      if (period === "upcoming" && start < now) return false;
      if (period === "past"     && start >= now) return false;
      if (categorySlug !== "all") {
        if (!e.event_categories || e.event_categories.slug !== categorySlug) return false;
      }
      if (needle) {
        const haystack = [
          e.title,
          e.description ?? "",
          e.location ?? "",
          e.event_categories?.name ?? "",
        ].join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [events, period, categorySlug, q]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
      {/* Page header */}
      <header className="mb-10 text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          Eventi
        </h1>
        <p className="text-[#8A8A8A] text-base">
          Scopri gli eventi e iscriviti.
        </p>
      </header>

      {/* Search + period filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
          <input
            placeholder="Cerca evento..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl text-sm text-white placeholder-[#8A8A8A] border outline-none focus:border-white/20 transition-colors"
            style={{
              backgroundColor: "#151515",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {periodFilters.map((f) => (
            <FilterPill
              key={f.key}
              active={period === f.key}
              onClick={() => setPeriod(f.key)}
            >
              {f.label}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <FilterPill active={categorySlug === "all"} onClick={() => setCategorySlug("all")}>
            Tutte
          </FilterPill>
          {categories.map((c) => (
            <FilterPill
              key={c.id}
              active={categorySlug === c.slug}
              onClick={() => setCategorySlug(c.slug)}
            >
              {c.name}
            </FilterPill>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden border"
              style={{ backgroundColor: "#111111", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <Skeleton className="aspect-[4/5] w-full rounded-none bg-white/5" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-3 w-24 bg-white/5" />
                <Skeleton className="h-5 w-3/4 bg-white/5" />
                <Skeleton className="h-3 w-1/2 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-[#8A8A8A]">
            Impossibile caricare gli eventi.
            <br />
            <span className="text-xs">{error}</span>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm text-[#D0D0D0] hover:text-white transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          >
            <RefreshCw className="h-4 w-4" /> Riprova
          </button>
        </div>
      ) : list.length === 0 ? (
        <p className="text-center text-[#8A8A8A] py-16">Nessun evento trovato.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Eventi;
