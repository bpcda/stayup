import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hourglass, Mail, X } from "lucide-react";
import { useMyWaitlist, cancelMyWaitlist, type MyWaitlistStatus } from "@/hooks/useWaitlist";
import { useToast } from "@/hooks/use-toast";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_LABEL: Record<MyWaitlistStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  waiting:   { label: "In attesa",     variant: "secondary" },
  offered:   { label: "Posto offerto", variant: "default" },
  accepted:  { label: "Confermata",    variant: "outline" },
  expired:   { label: "Scaduta",       variant: "destructive" },
  cancelled: { label: "Annullata",     variant: "destructive" },
};

/**
 * Profilo utente — lista d'attesa.
 * Mostra tutti gli stati richiesti (waiting/offered/accepted/expired/cancelled).
 */
const MyWaitlist = () => {
  const { entries, loading, reload } = useMyWaitlist();
  const { toast } = useToast();
  if (loading) return null;
  if (entries.length === 0) return null;

  const onCancel = async (id: string) => {
    if (!confirm("Annullare l'iscrizione alla lista d'attesa?")) return;
    try {
      await cancelMyWaitlist(id);
      toast({ title: "Iscrizione annullata" });
      void reload();
    } catch (e) {
      toast({ title: "Errore", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hourglass className="h-5 w-5 text-primary" /> Liste d'attesa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((e) => {
          const meta = STATUS_LABEL[e.status];
          const active = e.status === "waiting" || e.status === "offered";
          return (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{e.event?.title ?? "Evento"}</p>
                <p className="text-xs text-muted-foreground">
                  {e.event?.starts_at ? fmt(e.event.starts_at) : ""}
                  {active && <> · Posizione #{e.position}</>}
                </p>
                {e.status === "offered" && e.offer_expires_at && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Offerta valida fino al {fmt(e.offer_expires_at)}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={meta.variant}>{meta.label}</Badge>
                {e.status === "offered" && e.offer_token ? (
                  <Button asChild size="sm">
                    <Link to={`/waitlist/accept?token=${e.offer_token}`}>Conferma</Link>
                  </Button>
                ) : active && e.event?.slug ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/eventi/${e.event.slug}`}>Vedi evento</Link>
                  </Button>
                ) : null}
                {active && (
                  <Button size="sm" variant="ghost" onClick={() => onCancel(e.id)}>
                    <X className="h-4 w-4 mr-1" /> Annulla
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default MyWaitlist;
