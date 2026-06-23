import { useEffect, useState } from "react";
import { Calendar, MapPin, QrCode } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
};

const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" => {
  if (s === "confirmed") return "default";
  if (s === "cancelled" || s === "refunded") return "destructive";
  return "secondary";
};

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
    } else {
      setItems((data as unknown as Booking[]) ?? []);
    }
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

  if (loading) return <p className="text-muted-foreground text-sm">Caricamento prenotazioni…</p>;

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

  return (
    <>
      <div className="grid gap-4">
        {items.map((b) => {
          const ev = b.events;
          if (!ev) return null;
          const isActive = b.status === "confirmed" || b.status === "pending";
          return (
            <Card key={b.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{ev.title}</CardTitle>
                  <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {ev.short_description && <p>{ev.short_description}</p>}
                {ev.starts_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(ev.starts_at).toLocaleString("it-IT", {
                        day: "2-digit", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
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
                {b.reference_code && (
                  <p className="text-xs font-mono tracking-widest text-foreground/70">
                    Codice: {b.reference_code}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {isActive && b.qr_token && (
                    <Button variant="default" size="sm" onClick={() => setQrOpen(b)}>
                      <QrCode className="h-4 w-4 mr-2" /> Mostra QR
                    </Button>
                  )}
                  {isActive && (
                    <Button variant="outline" size="sm" onClick={() => cancel(b.id)}>
                      Annulla prenotazione
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
