import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, MapPin, QrCode, XCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type Booking = {
  id: string;
  status: string;
  reference_code: string | null;
  qr_token: string | null;
  booked_at: string;
  events: {
    id: string;
    title: string;
    short_description: string | null;
    location: string | null;
    starts_at: string | null;
  } | null;
  /** Iniettato lato client dopo lookup su public.checkins */
  checked_in_at?: string | null;
};

const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" => {
  if (s === "confirmed") return "default";
  if (s === "cancelled" || s === "refunded") return "destructive";
  return "secondary";
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const MyEvents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState<Booking | null>(null);

  const load = async () => {
    if (!user || !isSupabaseConfigured) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("id, status, reference_code, qr_token, booked_at, events:event_id ( id, title, short_description, location, starts_at )")
      .eq("user_id", user.id)
      .order("booked_at", { ascending: false });

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const bookings = (data as unknown as Booking[]) ?? [];

    // Storico partecipazioni: join lato client con public.checkins
    // (RLS "checkins user read own" consente all'utente di leggere i propri checkin).
    const ids = bookings.map((b) => b.id);
    if (ids.length > 0) {
      const { data: checkins } = await supabase
        .from("checkins")
        .select("booking_id, checked_in_at")
        .in("booking_id", ids);
      const map = new Map<string, string>();
      (checkins as { booking_id: string; checked_in_at: string }[] | null)?.forEach((c) =>
        map.set(c.booking_id, c.checked_in_at),
      );
      bookings.forEach((b) => { b.checked_in_at = map.get(b.id) ?? null; });
    }

    setItems(bookings);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const cancel = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", bookingId);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Prenotazione annullata" });
    setItems((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "cancelled" } : b));
  };

  // Split prossimi / passati in base a events.starts_at
  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: Booking[] = [];
    const ps: Booking[] = [];
    for (const b of items) {
      const ts = b.events?.starts_at ? new Date(b.events.starts_at).getTime() : null;
      if (ts !== null && ts < now) ps.push(b);
      else up.push(b);
    }
    // Passati: i più recenti prima (per data evento)
    ps.sort((a, z) =>
      new Date(z.events?.starts_at ?? 0).getTime() - new Date(a.events?.starts_at ?? 0).getTime(),
    );
    // Prossimi: il più vicino prima
    up.sort((a, z) =>
      new Date(a.events?.starts_at ?? 0).getTime() - new Date(z.events?.starts_at ?? 0).getTime(),
    );
    return { upcoming: up, past: ps };
  }, [items]);

  if (loading) return (
    <div className="grid gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader><Skeleton className="h-6 w-2/3" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Nessuna prenotazione</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Vai alla sezione Eventi per prenotare il prossimo evento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderCard = (b: Booking, variant: "upcoming" | "past") => {
    const ev = b.events;
    if (!ev) return null;
    const isActive = b.status === "confirmed" || b.status === "pending";
    const attended = !!b.checked_in_at;

    return (
      <Card key={b.id}>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg">{ev.title}</CardTitle>
            <div className="flex items-center gap-2">
              {variant === "past" && (
                attended ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Partecipato
                  </Badge>
                ) : isActive ? (
                  <Badge variant="outline" className="gap-1">
                    <XCircle className="h-3 w-3" /> Non partecipato
                  </Badge>
                ) : null
              )}
              <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {ev.short_description && <p>{ev.short_description}</p>}
          {ev.starts_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{fmtDateTime(ev.starts_at)}</span>
            </div>
          )}
          {ev.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{ev.location}</span>
            </div>
          )}
          {b.reference_code && (
            <p className="text-xs font-mono tracking-widest text-foreground/70">
              Codice: {b.reference_code}
            </p>
          )}
          {attended && b.checked_in_at && (
            <p className="text-xs text-foreground/70">
              Check-in: {fmtDateTime(b.checked_in_at)}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {variant === "upcoming" && isActive && b.qr_token && (
              <Button variant="default" size="sm" onClick={() => setQrOpen(b)}>
                <QrCode className="h-4 w-4 mr-2" /> Mostra QR
              </Button>
            )}
            {variant === "upcoming" && isActive && (
              <Button variant="outline" size="sm" onClick={() => cancel(b.id)}>
                Annulla prenotazione
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const attendedCount = past.filter((b) => b.checked_in_at).length;

  return (
    <>
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">
            Prossimi {upcoming.length > 0 && `(${upcoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="past">
            Passati {past.length > 0 && `(${past.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nessuna prenotazione futura.
            </p>
          ) : (
            <div className="grid gap-4">{upcoming.map((b) => renderCard(b, "upcoming"))}</div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nessun evento passato.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Hai partecipato a <span className="font-semibold text-foreground">{attendedCount}</span>{" "}
                {attendedCount === 1 ? "evento" : "eventi"} su {past.length}.
              </p>
              <div className="grid gap-4">{past.map((b) => renderCard(b, "past"))}</div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!qrOpen} onOpenChange={(o) => !o && setQrOpen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{qrOpen?.events?.title ?? "QR Code"}</DialogTitle>
            <DialogDescription>Mostra questo QR all'ingresso per il check-in.</DialogDescription>
          </DialogHeader>
          {qrOpen?.qr_token && (
            <div className="flex flex-col items-center gap-3 bg-white rounded-md p-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(qrOpen.qr_token)}`}
                alt="QR prenotazione"
                width={260}
                height={260}
              />
              {qrOpen.reference_code && (
                <p className="text-xs font-mono tracking-widest text-black/70">
                  {qrOpen.reference_code}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyEvents;
