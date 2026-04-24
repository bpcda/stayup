import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Search } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

const filters: { key: "all" | "upcoming" | "past"; label: string }[] = [
  { key: "all", label: "Tutti" },
  { key: "upcoming", label: "Prossimi" },
  { key: "past", label: "Passati" },
];

const Eventi = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [q, setQ] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: ev, error } = await supabase
      .from("events")
      .select("id, title, description, location, starts_at, ends_at")
      .eq("is_active", true)
      .eq("is_public", true)
      .order("starts_at", { ascending: true });

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      setEvents((ev as EventRow[]) ?? []);
    }

    if (user) {
      const { data: parts } = await supabase
        .from("event_participations")
        .select("event_id")
        .eq("user_id", user.id);
      setRegisteredIds(new Set((parts ?? []).map((p: { event_id: string }) => p.event_id)));
    } else {
      setRegisteredIds(new Set());
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const list = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => {
        if (filter === "all") return true;
        const start = e.starts_at ? new Date(e.starts_at).getTime() : 0;
        return filter === "upcoming" ? start >= now : start < now;
      })
      .filter((e) =>
        q
          ? (e.title + " " + (e.location ?? "")).toLowerCase().includes(q.toLowerCase())
          : true
      );
  }, [events, filter, q]);

  const register = async (eventId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setBusyId(eventId);
    const { error } = await supabase
      .from("event_participations")
      .insert({ event_id: eventId, user_id: user.id, status: "registered" });
    setBusyId(null);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Iscrizione confermata" });
    setRegisteredIds((s) => new Set(s).add(eventId));
  };

  const unregister = async (eventId: string) => {
    if (!user) return;
    setBusyId(eventId);
    const { error } = await supabase
      .from("event_participations")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Iscrizione annullata" });
    setRegisteredIds((s) => {
      const next = new Set(s);
      next.delete(eventId);
      return next;
    });
  };

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

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Caricamento eventi...</p>
      ) : list.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nessun evento trovato.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => {
            const isPast = e.starts_at ? new Date(e.starts_at).getTime() < Date.now() : false;
            const isRegistered = registeredIds.has(e.id);
            return (
              <Card key={e.id} className="hover:border-primary/40 transition-colors flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {isRegistered && <Badge>Iscritto</Badge>}
                    {isPast && <Badge variant="outline">Concluso</Badge>}
                  </div>
                  <CardTitle className="text-lg">{e.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 text-sm text-muted-foreground">
                  {e.description && <p className="flex-1">{e.description}</p>}
                  {e.starts_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(e.starts_at).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {e.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{e.location}</span>
                    </div>
                  )}
                  {!isPast && (
                    <div className="pt-2">
                      {isRegistered ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === e.id}
                          onClick={() => unregister(e.id)}
                        >
                          {busyId === e.id ? "..." : "Annulla iscrizione"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={busyId === e.id}
                          onClick={() => register(e.id)}
                        >
                          {busyId === e.id ? "..." : "Iscriviti"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Eventi;
