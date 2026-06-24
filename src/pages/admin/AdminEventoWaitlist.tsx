import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Hourglass, Mail, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

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
  offered:   { label: "Offerta",     variant: "default" },
  accepted:  { label: "Accettata",   variant: "outline" },
  expired:   { label: "Scaduta",     variant: "destructive" },
  cancelled: { label: "Cancellata",  variant: "destructive" },
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const AdminEventoWaitlist = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [event, setEvent] = useState<{ title: string; capacity: number | null } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || !isSupabaseConfigured) return;
    void (async () => {
      setLoading(true);
      const [ev, wl] = await Promise.all([
        supabase.from("events").select("title, capacity").eq("id", eventId).maybeSingle(),
        supabase
          .from("waitlist")
          .select("id, position, status, created_at, offered_at, offer_expires_at, user_id, profile:profiles!waitlist_user_id_fkey(full_name, email)")
          .eq("event_id", eventId)
          .order("status", { ascending: true })
          .order("position", { ascending: true }),
      ]);
      setEvent((ev.data as { title: string; capacity: number | null } | null) ?? null);
      setRows((wl.data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, [eventId]);

  const active = rows.filter((r) => r.status === "waiting" || r.status === "offered");

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={`/admin/eventi/${eventId}/iscritti`}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Iscritti evento
        </Link>
      </Button>
      <AdminPageHeader
        title={`Lista d'attesa${event ? ` — ${event.title}` : ""}`}
        description={event?.capacity ? `Capienza evento: ${event.capacity} posti.` : "Evento senza limite di capienza."}
      />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Hourglass className="h-5 w-5 text-primary" />
            <div>
              <div className="text-2xl font-bold">{active.length}</div>
              <div className="text-xs text-muted-foreground">In attesa di un posto</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Mail className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-2xl font-bold">{rows.filter((r) => r.status === "offered").length}</div>
              <div className="text-xs text-muted-foreground">Offerte in corso (24h)</div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                return (
                  <li key={r.id} className="px-4 py-3 flex items-center gap-3">
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
                    <Badge variant={badge.variant}>
                      {r.status === "accepted" ? <CheckCircle2 className="h-3 w-3 mr-1" /> :
                       r.status === "expired"  ? <XCircle className="h-3 w-3 mr-1" /> : null}
                      {badge.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEventoWaitlist;
