import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Hourglass, Mail, CheckCircle2, XCircle, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

type Row = {
  id: string;
  position: number;
  status: "waiting" | "offered" | "accepted" | "expired" | "cancelled";
  created_at: string;
  offered_at: string | null;
  offer_expires_at: string | null;
  user_id: string;
  profile: { full_name: string | null; email: string | null } | null;
};

const STATUS_BADGE: Record<Row["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  waiting:   { label: "In attesa",   variant: "secondary" },
  offered:   { label: "Posto offerto", variant: "default" },
  accepted:  { label: "Confermata",  variant: "outline" },
  expired:   { label: "Scaduta",     variant: "destructive" },
  cancelled: { label: "Annullata",   variant: "destructive" },
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Componente riusabile (pagina + tab dentro iscritti).
 * Mostra coda, statistiche e azione "annulla waitlist".
 */
export const WaitlistPanel = ({ eventId, showCapacity = true }: { eventId: string; showCapacity?: boolean }) => {
  const { toast } = useToast();
  const [capacity, setCapacity] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!eventId || !isSupabaseConfigured) return;
    setLoading(true);
    const [ev, wl] = await Promise.all([
      supabase.from("events").select("capacity").eq("id", eventId).maybeSingle(),
      supabase
        .from("waitlist")
        .select("id, position, status, created_at, offered_at, offer_expires_at, user_id")
        .eq("event_id", eventId)
        .order("status", { ascending: true })
        .order("position", { ascending: true }),
    ]);
    setCapacity(((ev.data as { capacity: number | null } | null)?.capacity) ?? null);
    const wlRows = (wl.data ?? []) as Array<Omit<Row, "profile">>;
    const userIds = Array.from(new Set(wlRows.map((r) => r.user_id)));
    let profileMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name, email").in("id", userIds);
      profileMap = new Map(
        (profs ?? []).map((p) => [p.id as string, { full_name: p.full_name ?? null, email: p.email ?? null }]),
      );
    }
    setRows(wlRows.map((r) => ({ ...r, profile: profileMap.get(r.user_id) ?? null })));
    setLoading(false);
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  const cancelEntry = async (id: string) => {
    if (!confirm("Annullare l'iscrizione alla lista d'attesa?")) return;
    const { error } = await supabase.rpc("cancel_waitlist_entry", { _waitlist_id: id });
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Iscrizione annullata" });
    void load();
  };

  const active = rows.filter((r) => r.status === "waiting" || r.status === "offered");
  const offered = rows.filter((r) => r.status === "offered").length;

  return (
    <div className="space-y-4">
      {showCapacity && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <Hourglass className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xl font-bold sm:text-2xl">{active.length}</div>
                <div className="text-xs text-muted-foreground">In attesa di un posto</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <Mail className="h-5 w-5 text-amber-500" />
              <div>
                <div className="text-xl font-bold sm:text-2xl">{offered}</div>
                <div className="text-xs text-muted-foreground">Offerte in corso</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Coda</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Caricamento…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nessuno in lista d'attesa.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const badge = STATUS_BADGE[r.status];
                const cancellable = r.status === "waiting" || r.status === "offered";
                return (
                  <li key={r.id} className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span className="text-sm font-mono w-8 text-muted-foreground">#{r.position}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {r.profile?.full_name ?? r.profile?.email ?? r.user_id}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Iscritto: {fmt(r.created_at)}
                        {r.status === "offered" && r.offer_expires_at && (
                          <> · Scade: {fmt(r.offer_expires_at)}</>
                        )}
                      </p>
                    </div>
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      <Badge variant={badge.variant}>
                        {r.status === "accepted" ? <CheckCircle2 className="h-3 w-3 mr-1" /> :
                         r.status === "expired"  ? <XCircle className="h-3 w-3 mr-1" /> : null}
                        {badge.label}
                      </Badge>
                      {cancellable && (
                        <Button size="sm" variant="outline" className="ml-auto sm:ml-0" onClick={() => cancelEntry(r.id)} title="Annulla waitlist">
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {capacity != null && showCapacity && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              Capienza evento: {capacity} posti.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const AdminEventoWaitlist = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !isSupabaseConfigured) return;
    void supabase.from("events").select("title").eq("id", eventId).maybeSingle()
      .then(({ data }) => setTitle((data as { title: string } | null)?.title ?? null));
  }, [eventId]);

  if (!eventId) return null;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={`/admin/eventi/${eventId}/iscritti`}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Iscritti evento
        </Link>
      </Button>
      <AdminPageHeader
        title={`Lista d'attesa${title ? ` — ${title}` : ""}`}
        description="Coda con promozione automatica dei prossimi quando si libera un posto."
      />
      <WaitlistPanel eventId={eventId} />
    </div>
  );
};

export default AdminEventoWaitlist;
