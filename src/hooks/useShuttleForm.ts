import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { ShuttleSlot, ReturnSlot, TipoViaggio } from "@/interfaces/shuttle";
import { EventRow } from "@/interfaces/events";
import { toast } from "@/hooks/use-toast";
import { createBooking } from "@/services/supabase/functions.service";

export const DAYS = ["25 Aprile", "26 Aprile"];
export const STOPS = ["Università Cattolica", "Cheope"];
export const TIPO_VALUES: TipoViaggio[] = ["andata_ritorno", "andata", "ritorno"];

const FALLBACK_SCHEDULES: Record<string, string[]> = {
  "Università Cattolica": ["12:30", "14:00", "15:30", "17:00", "18:30", "21:00"],
  "Cheope": ["12:45", "14:15", "15:45", "17:15", "18:45", "21:15"],
};
const FALLBACK_RETURN_TIMES = ["17:45", "19:15", "21:45", "23:00", "00:30", "2:00"];

export const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h < 6 ? (h + 24) * 60 + m : h * 60 + m;
};

export const useShuttleForm = (onSuccess: () => void, eventId?: string) => {
  const { t } = useTranslation();

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
  const [eventData, setEventData] = useState<EventRow | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingReturnSlots, setLoadingReturnSlots] = useState(false);

  const [accettaTermini, setAccettaTermini] = useState(false);
  const [accettaPagamento, setAccettaPagamento] = useState(false);
  const [accettaRimborso, setAccettaRimborso] = useState(false);

  const needsAndata = tipoViaggio === "andata" || tipoViaggio === "andata_ritorno";
  const needsRitorno = tipoViaggio === "ritorno" || tipoViaggio === "andata_ritorno";

  // Fetch evento per pricing
  useEffect(() => {
    if (!eventId || !isSupabaseConfigured) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventId)
          .maybeSingle();
        if (error) throw error;
        if (data) setEventData(data as unknown as EventRow);
      } catch (err) { console.error("Error fetching event:", err); }
    })();
  }, [eventId]);

  // Andata
  useEffect(() => {
    if (!needsAndata || !giorno || !fermata) {
      setSlots([]); setBookingCounts({}); setOrario(""); return;
    }

    if (!isSupabaseConfigured) {
      const times = FALLBACK_SCHEDULES[fermata] || [];
      setSlots(times.map((time, i) => ({ id: `fallback-${i}`, fermata, orario: time, giorno, capienza: 50 })));
      setBookingCounts({}); setOrario(""); return;
    }

    (async () => {
      setLoadingSchedules(true); setOrario("");
      try {
        let slotsQ = supabase
          .from("shuttle_slots")
          .select("*")
          .eq("giorno", giorno)
          .eq("fermata", fermata);
        if (eventId) slotsQ = slotsQ.eq("event_id", eventId);

        let bookingsQ = supabase
          .from("shuttle_bookings")
          .select("orario")
          .eq("giorno", giorno)
          .eq("fermata", fermata)
          .eq("pagato", true);
        if (eventId) bookingsQ = bookingsQ.eq("event_id", eventId);

        const [slotsRes, bookingsRes] = await Promise.all([slotsQ, bookingsQ]);
        if (slotsRes.error) throw slotsRes.error;

        const counts: Record<string, number> = {};
        (bookingsRes.data ?? []).forEach((b: { orario: string | null }) => {
          if (b.orario) counts[b.orario] = (counts[b.orario] || 0) + 1;
        });

        const all = (slotsRes.data ?? []) as unknown as (ShuttleSlot & { nascosto?: boolean })[];
        setSlots(all.filter(s => !s.nascosto).filter(s => s.capienza > (counts[s.orario] || 0)));
        setBookingCounts(counts);
      } catch (err) {
        console.error("Error fetching slots:", err);
        const times = FALLBACK_SCHEDULES[fermata] || [];
        setSlots(times.map((time, i) => ({ id: `fallback-${i}`, fermata, orario: time, giorno, capienza: 50 })));
        setBookingCounts({});
      }
      setLoadingSchedules(false);
    })();
  }, [giorno, fermata, needsAndata, eventId]);

  // Ritorno
  useEffect(() => {
    if (!needsRitorno || !giorno) {
      setReturnSlots([]); setReturnCounts({}); setOrarioRitorno(""); return;
    }

    if (!isSupabaseConfigured) {
      setReturnSlots(FALLBACK_RETURN_TIMES.map((time, i) => ({ id: `fr-${i}`, giorno, orario: time, capienza: 50 })));
      setReturnCounts({}); return;
    }

    (async () => {
      setLoadingReturnSlots(true); setOrarioRitorno("");
      try {
        let slotsQ = supabase
          .from("shuttle_return_slots")
          .select("*")
          .eq("giorno", giorno);
        if (eventId) slotsQ = slotsQ.eq("event_id", eventId);

        let bookingsQ = supabase
          .from("shuttle_bookings")
          .select("orario_ritorno, tipo_viaggio")
          .eq("giorno", giorno)
          .eq("pagato", true);
        if (eventId) bookingsQ = bookingsQ.eq("event_id", eventId);

        const [slotsRes, bookingsRes] = await Promise.all([slotsQ, bookingsQ]);
        if (slotsRes.error) throw slotsRes.error;

        const counts: Record<string, number> = {};
        (bookingsRes.data ?? []).forEach((b: { orario_ritorno: string | null; tipo_viaggio: string }) => {
          if (b.orario_ritorno && (b.tipo_viaggio === "ritorno" || b.tipo_viaggio === "andata_ritorno")) {
            counts[b.orario_ritorno] = (counts[b.orario_ritorno] || 0) + 1;
          }
        });

        const all = (slotsRes.data ?? []) as unknown as (ReturnSlot & { nascosto?: boolean })[];
        setReturnSlots(all.filter(s => !s.nascosto).filter(s => s.capienza > (counts[s.orario] || 0)));
        setReturnCounts(counts);
      } catch (err) {
        console.error("Error fetching return slots:", err);
        setReturnSlots(FALLBACK_RETURN_TIMES.map((time, i) => ({ id: `fr-${i}`, giorno, orario: time, capienza: 50 })));
        setReturnCounts({});
      }
      setLoadingReturnSlots(false);
    })();
  }, [giorno, needsRitorno, eventId]);

  useEffect(() => { setGiorno(""); setFermata(""); setOrario(""); setOrarioRitorno(""); }, [tipoViaggio]);
  useEffect(() => {
    if (orario && orarioRitorno && timeToMinutes(orarioRitorno) <= timeToMinutes(orario)) {
      setOrarioRitorno("");
    }
  }, [orario, orarioRitorno]);

  const totalPrice = useMemo(() => {
    if (!tipoViaggio || !eventData) return 0;
    let base = tipoViaggio === "andata_ritorno" ? eventData.price_round_trip : eventData.price_one_way;
    if (needsAndata && orario) {
      const slot = slots.find(s => s.orario === orario);
      if (slot?.price_override) base = slot.price_override;
    }
    return base;
  }, [tipoViaggio, eventData, orario, slots, needsAndata]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !telefono || !tipoViaggio) {
      toast({ title: t("common.confirm"), description: t("form.errors.required"), variant: "destructive" }); return;
    }
    if (needsAndata && (!giorno || !fermata || !orario)) {
      toast({ title: t("common.confirm"), description: t("form.errors.andataMissing"), variant: "destructive" }); return;
    }
    if (needsRitorno && (!giorno || !orarioRitorno)) {
      toast({ title: t("common.confirm"), description: t("form.errors.ritornoMissing"), variant: "destructive" }); return;
    }
    if (needsAndata && needsRitorno && orario && orarioRitorno && timeToMinutes(orarioRitorno) <= timeToMinutes(orario)) {
      toast({ title: t("common.confirm"), description: t("form.errors.returnBeforeDeparture"), variant: "destructive" }); return;
    }
    if (!accettaTermini || !accettaPagamento || !accettaRimborso) {
      toast({ title: t("common.confirm"), description: t("form.errors.consentMissing"), variant: "destructive" }); return;
    }

    setLoading(true);
    try {
      const testMode = typeof window !== "undefined" && localStorage.getItem("stayup_test_mode") === "1";

      if (isSupabaseConfigured) {
        const payload = {
          nome, email, telefono,
          tipo_viaggio: tipoViaggio,
          giorno,
          fermata: needsAndata ? fermata : null,
          orario: needsAndata ? orario : null,
          orario_ritorno: needsRitorno ? orarioRitorno : null,
          event_id: eventId || null,
          price_paid: totalPrice,
          testMode,
        };

        const { data, error } = await createBooking(payload);
        if (error) throw error;
        const result = data as { error?: string; bumped?: boolean };
        if (result?.error) throw new Error(result.error);

        if (result?.bumped) {
          toast({
            title: "Orario Modificato",
            description: "Uno degli slot scelti era pieno. Sei stato spostato all'orario disponibile più vicino.",
          });
        }
      } else {
        console.log("Demo mode — booking data:", { nome, email, telefono, tipoViaggio, giorno, fermata, orario, orarioRitorno });
      }
      onSuccess();
    } catch (err) {
      console.error("Submit error:", err);
      toast({ title: t("common.confirm"), description: t("form.errors.generic"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return {
    nome, setNome, email, setEmail, telefono, setTelefono,
    tipoViaggio, setTipoViaggio, giorno, setGiorno, fermata, setFermata,
    orario, setOrario, orarioRitorno, setOrarioRitorno,
    slots, returnSlots,
    loading, loadingSchedules, loadingReturnSlots,
    accettaTermini, setAccettaTermini, accettaPagamento, setAccettaPagamento, accettaRimborso, setAccettaRimborso,
    needsAndata, needsRitorno,
    totalPrice,
    handleSubmit,
  };
};
