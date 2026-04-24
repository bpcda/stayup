import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
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

interface ReturnSlot {
  id: string;
  giorno: string;
  orario: string;
  capienza: number;
}

interface ShuttleFormProps {
  onSuccess: () => void;
}

type TipoViaggio = "andata" | "ritorno" | "andata_ritorno";

const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h < 6 ? (h + 24) * 60 + m : h * 60 + m;
};

// Legacy fallback only — actual list is fetched dynamically below
const DAYS_FALLBACK = ["25 Aprile", "26 Aprile"];
const STOPS = ["Università Cattolica", "Cheope"];

const FALLBACK_SCHEDULES: Record<string, string[]> = {
  "Università Cattolica": ["12:30", "14:00", "15:30", "17:00", "18:30", "21:00"],
  "Cheope": ["12:45", "14:15", "15:45", "17:15", "18:45", "21:15"],
};

const FALLBACK_RETURN_TIMES = ["17:45", "19:15", "21:45", "23:00", "00:30", "2:00"];

const TIPO_VALUES: TipoViaggio[] = ["andata_ritorno", "andata", "ritorno"];

const ShuttleForm = ({ onSuccess }: ShuttleFormProps) => {
  const { t } = useTranslation();
  const tipoLabels: Record<TipoViaggio, string> = {
    andata: t("form.tripOnewayOut"),
    ritorno: t("form.tripOnewayBack"),
    andata_ritorno: t("form.tripRound"),
  };
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoViaggio, setTipoViaggio] = useState<TipoViaggio | "">("");
  const [giorno, setGiorno] = useState("");
  const [fermata, setFermata] = useState("");
  const [orario, setOrario] = useState("");
  const [orarioRitorno, setOrarioRitorno] = useState("");
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [returnSlots, setReturnSlots] = useState<ReturnSlot[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [returnCounts, setReturnCounts] = useState<Record<string, number>>({});
  const [availableDays, setAvailableDays] = useState<string[]>(DAYS_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingReturnSlots, setLoadingReturnSlots] = useState(false);
  const [accettaTermini, setAccettaTermini] = useState(false);
  const [accettaPagamento, setAccettaPagamento] = useState(false);
  const [accettaRimborso, setAccettaRimborso] = useState(false);

  const needsAndata = tipoViaggio === "andata" || tipoViaggio === "andata_ritorno";
  const needsRitorno = tipoViaggio === "ritorno" || tipoViaggio === "andata_ritorno";

  // Fetch andata slots
  useEffect(() => {
    if (!needsAndata || !giorno || !fermata) {
      setSlots([]);
      setBookingCounts({});
      setOrario("");
      return;
    }

    if (!isSupabaseConfigured) {
      const times = FALLBACK_SCHEDULES[fermata] || [];
      setSlots(times.map((t, i) => ({ id: `fallback-${i}`, fermata, orario: t, giorno, capienza: 50 })));
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
        const times = FALLBACK_SCHEDULES[fermata] || [];
        setSlots(times.map((t, i) => ({ id: `fallback-${i}`, fermata, orario: t, giorno, capienza: 50 })));
        setBookingCounts({});
      } else {
        const counts: Record<string, number> = {};
        (bookingsRes.data || []).forEach((b: { orario: string }) => {
          counts[b.orario] = (counts[b.orario] || 0) + 1;
        });
        setSlots(
          (slotsRes.data || [])
            .filter((s: ShuttleSlot & { nascosto?: boolean }) => !s.nascosto)
            .filter((s: ShuttleSlot) => s.capienza > (counts[s.orario] || 0))
        );
        setBookingCounts(counts);
      }
      setLoadingSchedules(false);
    };

    fetchSlots();
  }, [giorno, fermata, needsAndata]);

  // Fetch return slots from DB
  useEffect(() => {
    if (!needsRitorno || !giorno) {
      setReturnSlots([]);
      setReturnCounts({});
      setOrarioRitorno("");
      return;
    }

    if (!isSupabaseConfigured) {
      setReturnSlots(FALLBACK_RETURN_TIMES.map((t, i) => ({ id: `fr-${i}`, giorno, orario: t, capienza: 50 })));
      setReturnCounts({});
      return;
    }

    const fetchReturnSlots = async () => {
      setLoadingReturnSlots(true);
      setOrarioRitorno("");

      const [slotsRes, bookingsRes] = await Promise.all([
        supabase.from("shuttle_return_slots").select("*").eq("giorno", giorno),
        supabase
          .from("bookings")
          .select("orario_ritorno")
          .eq("giorno", giorno)
          .eq("pagato", true)
          .in("tipo_viaggio", ["ritorno", "andata_ritorno"]),
      ]);

      if (slotsRes.error) {
        setReturnSlots(FALLBACK_RETURN_TIMES.map((t, i) => ({ id: `fr-${i}`, giorno, orario: t, capienza: 50 })));
        setReturnCounts({});
      } else {
        const counts: Record<string, number> = {};
        (bookingsRes.data || []).forEach((b: { orario_ritorno: string }) => {
          if (b.orario_ritorno) counts[b.orario_ritorno] = (counts[b.orario_ritorno] || 0) + 1;
        });
        // Filter out hidden + full return slots
        setReturnSlots(
          (slotsRes.data || [])
            .filter((s: ReturnSlot & { nascosto?: boolean }) => !s.nascosto)
            .filter((s: ReturnSlot) => s.capienza > (counts[s.orario] || 0))
        );
        setReturnCounts(counts);
      }
      setLoadingReturnSlots(false);
    };

    fetchReturnSlots();
  }, [giorno, needsRitorno]);

  // Fetch the list of distinct days that have at least one visible slot.
  // Sorted by `data` (timestamptz) when available, otherwise by giorno text.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAvailableDays(DAYS_FALLBACK);
      return;
    }
    const fetchDays = async () => {
      const [aRes, rRes] = await Promise.all([
        supabase.from("shuttle_slots").select("giorno, data, nascosto"),
        supabase.from("shuttle_return_slots").select("giorno, data, nascosto"),
      ]);
      const map = new Map<string, number>();
      const collect = (rows: any[] | null) => {
        (rows || []).forEach((r) => {
          if (r.nascosto) return;
          if (!r.giorno) return;
          const ts = r.data ? new Date(r.data).getTime() : Number.POSITIVE_INFINITY;
          const prev = map.get(r.giorno);
          if (prev === undefined || ts < prev) map.set(r.giorno, ts);
        });
      };
      collect(aRes.data);
      collect(rRes.data);
      const arr = Array.from(map.entries()).sort((a, b) => a[1] - b[1]).map(([l]) => l);
      setAvailableDays(arr.length ? arr : DAYS_FALLBACK);
    };
    fetchDays().catch(() => setAvailableDays(DAYS_FALLBACK));
  }, []);


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
      toast({ title: t("common.confirm"), description: t("form.errors.required"), variant: "destructive" });
      return;
    }

    if (needsAndata && (!giorno || !fermata || !orario)) {
      toast({ title: t("common.confirm"), description: t("form.errors.andataMissing"), variant: "destructive" });
      return;
    }

    if (needsRitorno && (!giorno || !orarioRitorno)) {
      toast({ title: t("common.confirm"), description: t("form.errors.ritornoMissing"), variant: "destructive" });
      return;
    }

    if (needsAndata && needsRitorno && orario && orarioRitorno && timeToMinutes(orarioRitorno) <= timeToMinutes(orario)) {
      toast({ title: t("common.confirm"), description: t("form.errors.returnBeforeDeparture"), variant: "destructive" });
      return;
    }

    if (!accettaTermini || !accettaPagamento || !accettaRimborso) {
      toast({ title: t("common.confirm"), description: t("form.errors.consentMissing"), variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const testMode = typeof window !== "undefined" && localStorage.getItem("stayup_test_mode") === "1";
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
            testMode,
          },
        });

        if (error) throw error;
        if (data?.error) {
          toast({ title: t("common.confirm"), description: data.error, variant: "destructive" });
          setLoading(false);
          return;
        }

        if (data?.bumped) {
          const msgs: string[] = [];
          if (data.finalOrario && data.finalOrario !== orario) {
            msgs.push(t("form.bumped.andata", { time: data.finalOrario }));
          }
          if (data.finalOrarioRitorno && data.finalOrarioRitorno !== orarioRitorno) {
            msgs.push(t("form.bumped.ritorno", { time: data.finalOrarioRitorno }));
          }
          if (msgs.length > 0) {
            toast({
              title: t("form.bumped.title"),
              description: msgs.join(". ") + ". " + t("form.bumped.checkEmail"),
            });
          }
        }
      } else {
        console.log("Demo mode — booking data:", { nome, email, telefono, tipoViaggio, giorno, fermata, orario, orarioRitorno });
      }

      onSuccess();
    } catch (err: any) {
      console.error("Submit error:", err);
      toast({ title: t("common.confirm"), description: t("form.errors.generic"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Personal data */}
      <div className="space-y-2">
        <Label htmlFor="nome">{t("form.name")} *</Label>
        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t("form.namePlaceholder")} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t("form.email")} *</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("form.emailPlaceholder")} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefono">{t("form.phone")} *</Label>
        <Input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder={t("form.phonePlaceholder")} required />
      </div>

      {/* Trip type */}
      <div className="space-y-2">
        <Label>{t("form.tripType")} *</Label>
        <div className="grid grid-cols-3 gap-2">
          {TIPO_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTipoViaggio(value)}
              className={`px-3 py-3 rounded-lg border text-sm font-medium transition-all ${
                tipoViaggio === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-foreground hover:border-muted-foreground"
              }`}
            >
              {tipoLabels[value]}
            </button>
          ))}
        </div>
      </div>

      {/* Andata fields */}
      {needsAndata && (
        <>
          <div className="space-y-2">
            <Label>{t("form.departureDay")} *</Label>
            <div className="grid grid-cols-2 gap-3">
              {availableDays.map((d) => (
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
            <Label>{t("form.stop")} *</Label>
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
              <Label>{t("form.departureTime")} *</Label>
              {loadingSchedules ? (
                <p className="text-muted-foreground text-sm">{t("form.loadingTimes")}</p>
              ) : slots.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("form.noTimes")}</p>
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
          <Label>{t("form.returnDay")} *</Label>
          <div className="grid grid-cols-2 gap-3">
            {availableDays.map((d) => (
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

      {/* Ritorno time selection — now from DB */}
      {needsRitorno && giorno && (
        <div className="space-y-2">
          <Label>{t("form.returnTime")} *</Label>
          {loadingReturnSlots ? (
            <p className="text-muted-foreground text-sm">{t("form.loadingTimes")}</p>
          ) : returnSlots.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("form.noReturnTimes")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {returnSlots.map((rs) => {
                const disabled = needsAndata && orario ? timeToMinutes(rs.orario) <= timeToMinutes(orario) : false;
                return (
                  <button
                    key={rs.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setOrarioRitorno(rs.orario)}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      disabled
                        ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        : orarioRitorno === rs.orario
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {rs.orario}
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
          <p className="text-sm font-medium text-foreground pt-2">{t("form.beforeBooking")}</p>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="pagamento"
              checked={accettaPagamento}
              onCheckedChange={(checked) => setAccettaPagamento(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="pagamento" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              <Trans i18nKey="form.consentPayment" components={{ strong: <strong className="text-foreground" /> }} />
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
              {t("form.consentRefund")}
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
              <Trans
                i18nKey="form.consentTerms"
                components={{
                  termsLink: <Link to="/termini" target="_blank" className="text-primary underline hover:text-primary/80" />,
                  privacyLink: <Link to="/privacy" target="_blank" className="text-primary underline hover:text-primary/80" />,
                }}
              />
            </label>
          </div>
        </div>
      )}

      <Button type="submit" variant="hero" size="lg" className="w-full mt-4" disabled={loading || !accettaTermini || !accettaPagamento || !accettaRimborso}>
        {loading ? t("form.submitting") : t("form.submitBtn")}
      </Button>
    </form>
  );
};

export default ShuttleForm;
