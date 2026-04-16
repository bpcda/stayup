import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

type TipoViaggio = "andata" | "ritorno" | "andata_ritorno";

/** Convert "HH:MM" to minutes since midnight; handles times like "00:30" and "2:00" as next-day. */
const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  // Times <= 6:00 are considered next-day (after midnight)
  return h < 6 ? (h + 24) * 60 + m : h * 60 + m;
};


const DAYS = ["25 Aprile", "26 Aprile"];
const STOPS = ["Università Cattolica", "Cheope"];

const FALLBACK_SCHEDULES: Record<string, string[]> = {
  "Università Cattolica": ["12:30", "14:00", "15:30", "17:00", "18:30", "21:00"],
  "Cheope": ["12:45", "14:15", "15:45", "17:15", "18:45", "21:15"],
};

const RETURN_TIMES = ["17:45", "19:15", "21:45", "23:00", "00:30", "2:00"];

const TIPO_OPTIONS: { value: TipoViaggio; label: string }[] = [
  { value: "andata", label: "Solo Andata" },
  { value: "ritorno", label: "Solo Ritorno" },
  { value: "andata_ritorno", label: "Andata e Ritorno" },
];

const ShuttleForm = ({ onSuccess }: ShuttleFormProps) => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoViaggio, setTipoViaggio] = useState<TipoViaggio | "">("");
  const [giorno, setGiorno] = useState("");
  const [fermata, setFermata] = useState("");
  const [orario, setOrario] = useState("");
  const [orarioRitorno, setOrarioRitorno] = useState("");
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [returnCounts, setReturnCounts] = useState<Record<string, number>>({});
  const [loadingReturnSlots, setLoadingReturnSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [accettaTermini, setAccettaTermini] = useState(false);
  const [accettaPagamento, setAccettaPagamento] = useState(false);
  const [accettaRimborso, setAccettaRimborso] = useState(false);

  const needsAndata = tipoViaggio === "andata" || tipoViaggio === "andata_ritorno";
  const needsRitorno = tipoViaggio === "ritorno" || tipoViaggio === "andata_ritorno";

  useEffect(() => {
    if (!needsAndata || !giorno || !fermata) {
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
        supabase.from("bookings").select("orario").eq("giorno", giorno).eq("fermata", fermata).eq("pagato", true),
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
  }, [giorno, fermata, needsAndata]);

  // Fetch return slot counts
  useEffect(() => {
    if (!needsRitorno || !giorno) {
      setReturnCounts({});
      setOrarioRitorno("");
      return;
    }
    if (!isSupabaseConfigured) {
      setReturnCounts({});
      return;
    }
    const fetchReturnCounts = async () => {
      setLoadingReturnSlots(true);
      setOrarioRitorno("");
      const { data } = await supabase
        .from("bookings")
        .select("orario_ritorno")
        .eq("giorno", giorno)
        .eq("pagato", true)
        .in("tipo_viaggio", ["ritorno", "andata_ritorno"]);
      const counts: Record<string, number> = {};
      (data || []).forEach((b: { orario_ritorno: string }) => {
        if (b.orario_ritorno) counts[b.orario_ritorno] = (counts[b.orario_ritorno] || 0) + 1;
      });
      setReturnCounts(counts);
      setLoadingReturnSlots(false);
    };
    fetchReturnCounts();
  }, [giorno, needsRitorno]);

  // Reset dependent fields when tipo changes
  useEffect(() => {
    setGiorno("");
    setFermata("");
    setOrario("");
    setOrarioRitorno("");
  }, [tipoViaggio]);

  // Reset return time if it becomes invalid after changing departure time
  useEffect(() => {
    if (orario && orarioRitorno && timeToMinutes(orarioRitorno) <= timeToMinutes(orario)) {
      setOrarioRitorno("");
    }
  }, [orario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !email || !telefono || !tipoViaggio) {
      toast({ title: "Errore", description: "Compila tutti i campi obbligatori.", variant: "destructive" });
      return;
    }

    if (needsAndata && (!giorno || !fermata || !orario)) {
      toast({ title: "Errore", description: "Seleziona giorno, fermata e orario per l'andata.", variant: "destructive" });
      return;
    }

    if (needsRitorno && (!giorno || !orarioRitorno)) {
      toast({ title: "Errore", description: "Seleziona giorno e orario di ritorno.", variant: "destructive" });
      return;
    }

    if (needsAndata && needsRitorno && orario && orarioRitorno && timeToMinutes(orarioRitorno) <= timeToMinutes(orario)) {
      toast({ title: "Errore", description: "L'orario di ritorno deve essere successivo a quello di andata.", variant: "destructive" });
      return;
    }

    if (!accettaTermini || !accettaPagamento || !accettaRimborso) {
      toast({ title: "Errore", description: "Devi accettare tutte le condizioni per procedere.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.functions.invoke("create-booking", {
          body: {
            nome,
            email,
            telefono,
            tipo_viaggio: tipoViaggio,
            giorno,
            fermata: needsAndata ? fermata : null,
            orario: needsAndata ? orario : null,
            orario_ritorno: needsRitorno ? orarioRitorno : null,
          },
        });

        if (error) throw error;
        if (data?.error) {
          toast({ title: "Errore", description: data.error, variant: "destructive" });
          setLoading(false);
          return;
        }

        if (data?.bumped) {
          const msgs: string[] = [];
          if (data.finalOrario && data.finalOrario !== orario) {
            msgs.push(`Andata spostata alle ${data.finalOrario}`);
          }
          if (data.finalOrarioRitorno && data.finalOrarioRitorno !== orarioRitorno) {
            msgs.push(`Ritorno spostato alle ${data.finalOrarioRitorno}`);
          }
          if (msgs.length > 0) {
            toast({
              title: "Slot pieno — spostamento automatico",
              description: msgs.join(". ") + ". Controlla la mail per i dettagli.",
            });
          }
        }
      } else {
        console.log("Demo mode — booking data:", { nome, email, telefono, tipoViaggio, giorno, fermata, orario, orarioRitorno });
      }

      onSuccess();
    } catch (err: any) {
      console.error("Submit error:", err);
      toast({ title: "Errore", description: "Si è verificato un errore. Riprova.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Personal data */}
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

      {/* Trip type */}
      <div className="space-y-2">
        <Label>Cosa ti serve? *</Label>
        <div className="grid grid-cols-3 gap-2">
          {TIPO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTipoViaggio(opt.value)}
              className={`px-3 py-3 rounded-lg border text-sm font-medium transition-all ${
                tipoViaggio === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-foreground hover:border-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Andata fields */}
      {needsAndata && (
        <>
          <div className="space-y-2">
            <Label>Giorno di andata *</Label>
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

          {giorno && fermata && (
            <div className="space-y-2">
              <Label>Orario di partenza *</Label>
              {loadingSchedules ? (
                <p className="text-muted-foreground text-sm">Caricamento orari...</p>
              ) : slots.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nessun orario disponibile per questa combinazione.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setOrario(s.orario)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        orario === s.orario
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary text-foreground hover:border-muted-foreground"
                      }`}
                    >
                      {s.orario}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Giorno selector for solo ritorno */}
      {needsRitorno && !needsAndata && (
        <div className="space-y-2">
          <Label>Giorno di ritorno *</Label>
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
      )}

      {/* Ritorno time selection */}
      {needsRitorno && giorno && (
        <div className="space-y-2">
          <Label>Orario di ritorno *</Label>
          {loadingReturnSlots ? (
            <p className="text-muted-foreground text-sm">Caricamento orari...</p>
          ) : (
          <div className="grid grid-cols-3 gap-2">
            {RETURN_TIMES.filter((t) => (returnCounts[t] || 0) < 50).map((t) => {
              const disabled = needsAndata && orario ? timeToMinutes(t) <= timeToMinutes(orario) : false;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={disabled}
                  onClick={() => setOrarioRitorno(t)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    disabled
                      ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                      : orarioRitorno === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary text-foreground hover:border-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* Acceptance checkboxes */}
      {tipoViaggio && (
        <div className="space-y-3 pt-2 border-t border-border mt-2">
          <p className="text-sm font-medium text-foreground pt-2">Prima di prenotare, conferma di aver letto:</p>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="pagamento"
              checked={accettaPagamento}
              onCheckedChange={(checked) => setAccettaPagamento(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="pagamento" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              La navetta costa <strong className="text-foreground">6€</strong> da pagare tramite PayPal "Beni e Servizi". La prenotazione è valida <strong className="text-foreground">solo dopo il pagamento</strong>. Non è possibile pagare in contanti o sul bus. *
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="rimborso"
              checked={accettaRimborso}
              onCheckedChange={(checked) => setAccettaRimborso(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="rimborso" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              Il rimborso è possibile solo se l'organizzazione non sarà in grado di garantire il servizio. L'organizzazione si riserva la facoltà di selezione alla salita e di variare gli orari. *
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="termini"
              checked={accettaTermini}
              onCheckedChange={(checked) => setAccettaTermini(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="termini" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              Accetto i{" "}
              <Link to="/termini" target="_blank" className="text-primary underline hover:text-primary/80">
                Termini e Condizioni
              </Link>{" "}
              e l'{" "}
              <Link to="/privacy" target="_blank" className="text-primary underline hover:text-primary/80">
                Informativa sulla Privacy
              </Link>{" "}
              *
            </label>
          </div>
        </div>
      )}

      <Button type="submit" variant="hero" size="lg" className="w-full mt-4" disabled={loading || !accettaTermini || !accettaPagamento || !accettaRimborso}>
        {loading ? "Invio in corso..." : "Prenota Navetta"}
      </Button>
    </form>
  );
};

export default ShuttleForm;
