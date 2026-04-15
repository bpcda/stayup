import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Schedule {
  id: string;
  stop: string;
  time: string;
  day: string;
  capacity: number;
  booked_count: number;
}

interface ShuttleFormProps {
  onSuccess: () => void;
}

const DAYS = ["25 Aprile", "26 Aprile"];
const STOPS = ["Università Cattolica", "Cheope"];

const ShuttleForm = ({ onSuccess }: ShuttleFormProps) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [giorno, setGiorno] = useState("");
  const [fermata, setFermata] = useState("");
  const [orario, setOrario] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Fetch available schedules when day + stop change
  useEffect(() => {
    if (!giorno || !fermata) {
      setSchedules([]);
      setOrario("");
      return;
    }

    const fetchSchedules = async () => {
      setLoadingSchedules(true);
      setOrario("");
      const { data, error } = await supabase
        .from("shuttle_schedules")
        .select("*")
        .eq("day", giorno)
        .eq("stop", fermata);

      if (error) {
        console.error("Error fetching schedules:", error);
        setSchedules([]);
      } else {
        // Only show available slots (capacity > booked_count)
        setSchedules(
          (data || []).filter((s: Schedule) => s.capacity > s.booked_count)
        );
      }
      setLoadingSchedules(false);
    };

    fetchSchedules();
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
      // Save booking
      const { error: bookingError } = await supabase.from("bookings").insert({
        nome,
        email,
        telefono,
        giorno,
        fermata,
        orario,
        stato: "pending",
        pagato: false,
      });

      if (bookingError) throw bookingError;

      // Send email via edge function
      await supabase.functions.invoke("send-booking-email", {
        body: { nome, email, telefono, giorno, fermata, orario },
      });

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
      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="nome">Nome e Cognome *</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Mario Rossi"
          required
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="mario@email.com"
          required
        />
      </div>

      {/* Telefono */}
      <div className="space-y-2">
        <Label htmlFor="telefono">Telefono *</Label>
        <Input
          id="telefono"
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="+39 333 1234567"
          required
        />
      </div>

      {/* Giorno */}
      <div className="space-y-2">
        <Label>Giorno *</Label>
        <div className="grid grid-cols-2 gap-3">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setGiorno(d)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                giorno === d
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-foreground hover:border-muted-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Fermata */}
      <div className="space-y-2">
        <Label>Fermata di partenza *</Label>
        <div className="grid grid-cols-2 gap-3">
          {STOPS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFermata(s)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                fermata === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-foreground hover:border-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Orario */}
      {giorno && fermata && (
        <div className="space-y-2">
          <Label>Orario *</Label>
          {loadingSchedules ? (
            <p className="text-muted-foreground text-sm">Caricamento orari...</p>
          ) : schedules.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nessun orario disponibile per questa combinazione.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {schedules.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setOrario(s.time)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    orario === s.time
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-foreground hover:border-muted-foreground"
                  }`}
                >
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        type="submit"
        variant="hero"
        size="lg"
        className="w-full mt-4"
        disabled={loading}
      >
        {loading ? "Invio in corso..." : "Prenota Navetta"}
      </Button>
    </form>
  );
};

export default ShuttleForm;
