import { useEffect, useState } from "react";
import { Calendar, MapPin } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Participation = {
  id: string;
  status: string;
  events: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    starts_at: string | null;
  } | null;
};

const MyEvents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user || !isSupabaseConfigured) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("event_participations")
      .select("id, status, events:event_id ( id, title, description, location, starts_at )")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      setItems((data as unknown as Participation[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const cancel = async (participationId: string) => {
    const { error } = await supabase
      .from("event_participations")
      .delete()
      .eq("id", participationId);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Iscrizione annullata" });
    setItems((prev) => prev.filter((p) => p.id !== participationId));
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Caricamento iscrizioni...</p>;
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nessuna iscrizione</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Vai alla sezione Eventi per iscriverti al prossimo evento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((p) => {
        const ev = p.events;
        if (!ev) return null;
        return (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">{ev.title}</CardTitle>
                <Badge variant="secondary">{p.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {ev.description && <p>{ev.description}</p>}
              {ev.starts_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(ev.starts_at).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {ev.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{ev.location}</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => cancel(p.id)}>
                Annulla iscrizione
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MyEvents;
