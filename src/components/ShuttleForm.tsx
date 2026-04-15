import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface ShuttleSlot {
  id: string;
  giorno: string;
  fermata: string;
  orario: string;
  capienza: number;
}

interface ShuttleFormProps {
  onSuccess: () => void;
}

const DAYS = ["25 Aprile", "26 Aprile"];
const STOPS = ["Università Cattolica", "Cheope"];

// Fallback schedules when Supabase is not configured
const FALLBACK_SCHEDULES: Record<string, string[]> = {
  "Università Cattolica": ["12:30", "14:00", "15:30", "17:00", "18:30", "21:00", "Mi serve solo ritorno"],
  "Cheope": ["12:45", "14:15", "15:45", "17:15", "18:45", "21:15", "Mi serve solo ritorno"],
};

const ShuttleForm = ({ onSuccess }: ShuttleFormProps) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [giorno, setGiorno] = useState("");
  const [fermata, setFermata] = useState("");
  const [orario, setOrario] = useState("");
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  useEffect(() => {
    if (!giorno || !fermata) {
      setSlots([]);
      setBookingCounts({});
      setOrario("");
      return;
    }

    if (!isSupabaseConfigured) {
      const times = FALLBACK_SCHEDULES[fermata] || [];
      setSlots(
        times.map((t, i) => ({
          id: `fallback-${i}`,
          fermata,
          orario: t,
          giorno,
          capienza: 50,
        }))
      );
      setBookingCounts({});
      setOrario("");
      return;
    }

    const fetchSlots = async () => {
      setLoadingSchedules(true);
      setOrario("");

      const [slotsRes, bookingsRes] = await Promise.all([
        supabase.from("shuttle_slots").select("*").eq("giorno", giorno).eq("fermata", fermata),
        supabase.from("bookings").select("orario").eq("giorno", giorno).eq("fermata", fermata),
      ]);

      if (slotsRes.error) {
        console.error("Error fetching slots:", slotsRes.error);
        const times = FALLBACK_SCHEDULES[fermata] || [];
        setSlots(times.map((t, i) => ({ id: `fallback-${i}`, fermata, orario: t, giorno, capienza: 50 })));
        setBookingCounts({});
      } else {
        const counts: Record<string, number> = {};
        (bookingsRes.data || []).forEach((b: { orario: string }) => {
          counts[b.orario] = (counts[b.orario] || 0) + 1;
        });
        setSlots((slotsRes.data || []).filter((s: ShuttleSlot) => s.capienza > (counts[s.orario] || 0)));
        setBookingCounts(counts);
      }
      setLoadingSchedules(false);
    };

    fetchSlots();
  }, [giorno, fermata]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !email || !telefono || !giorno || !fermata || !orario) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Save booking to Supabase if configured
      if (isSupabaseConfigured) {
        const { error: bookingError } = await supabase.from("bookings").insert({
          nome, email, telefono, giorno, fermata, orario,
          stato: "pending",
          pagato: false,
        });
        if (bookingError) throw bookingError;

        // Send email (non-blocking, fail silently)
        supabase.functions
          .invoke("send-booking-email", {
            body: { nome, email, telefono, giorno, fermata, orario },
          })
          .catch((err) => console.warn("Email send failed (non-critical):", err));
      } else {
        console.log("Demo mode — booking data:", { nome, email, telefono, giorno, fermata, orario });
      }

      onSuccess();
    } catch (err: any) {
      console.error("Submit error:", err);
      toast({
        title: "Errore",
        description: "Si è verificato un errore. Riprova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome e Cognome *</Label>
        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Mario Rossi" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mario@email.com" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefono">Telefono *</Label>
        <Input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+39 333 1234567" required />
      </div>

      <div className="space-y-2">
        <Label>Giorno *</Label>
        <div className="grid grid-cols-2 gap-3">
          {DAYS.map((d) => (
            <button key={d} type="button" onClick={() => setGiorno(d)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                giorno === d ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground hover:border-muted-foreground"
              }`}>{d}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Fermata di partenza *</Label>
        <div className="grid grid-cols-2 gap-3">
          {STOPS.map((s) => (
            <button key={s} type="button" onClick={() => setFermata(s)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                fermata === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground hover:border-muted-foreground"
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {giorno && fermata && (
        <div className="space-y-2">
          <Label>Orario *</Label>
          {loadingSchedules ? (
            <p className="text-muted-foreground text-sm">Caricamento orari...</p>
          ) : slots.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nessun orario disponibile per questa combinazione.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button key={s.id} type="button" onClick={() => setOrario(s.orario)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    orario === s.orario ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground hover:border-muted-foreground"
                  }`}>{s.orario}</button>
              ))}
            </div>
          )}
        </div>
      )}

      <Button type="submit" variant="hero" size="lg" className="w-full mt-4" disabled={loading}>
        {loading ? "Invio in corso..." : "Prenota Navetta"}
      </Button>
    </form>
  );
};

export default ShuttleForm;
