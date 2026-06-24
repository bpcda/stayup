import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hourglass, Mail } from "lucide-react";
import { useMyWaitlist } from "@/hooks/useWaitlist";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Sezione profilo: lista d'attesa attiva dell'utente.
 * Mostra posizione, stato (in attesa / offerta inviata) e link all'evento.
 */
const MyWaitlist = () => {
  const { entries, loading } = useMyWaitlist();
  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hourglass className="h-5 w-5 text-primary" /> Liste d'attesa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{e.event?.title ?? "Evento"}</p>
              <p className="text-xs text-muted-foreground">
                {e.event?.starts_at ? fmt(e.event.starts_at) : ""}
              </p>
              {e.status === "offered" && e.offer_expires_at && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Offerta valida fino al {fmt(e.offer_expires_at)}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {e.status === "offered" ? (
                <Badge variant="default">Offerta inviata</Badge>
              ) : (
                <Badge variant="secondary">Posizione #{e.position}</Badge>
              )}
              {e.status === "offered" && e.offer_token ? (
                <Button asChild size="sm">
                  <Link to={`/waitlist/accept?token=${e.offer_token}`}>Conferma</Link>
                </Button>
              ) : e.event?.slug ? (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/eventi/${e.event.slug}`}>Vedi evento</Link>
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MyWaitlist;
