import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { databases, functions, isAppwriteConfigured } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { ShuttleSlot, ReturnSlot, TipoViaggio } from "@/interfaces/shuttle";
import { EventRow } from "@/interfaces/events";
import { toast } from "@/hooks/use-toast";

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
const BOOKINGS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKINGS || '';
const SLOTS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_SHUTTLE_SLOTS || '';
const RETURN_SLOTS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_RETURN_SLOTS || '';

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

  // Fetch Event Data for pricing
  useEffect(() => {
    if (!eventId || !isAppwriteConfigured || !DB_ID) return;
    const fetchEvent = async () => {
      try {
        const res = await databases.getDocument(DB_ID, import.meta.env.VITE_APPWRITE_COLLECTION_EVENTS, eventId);
        setEventData({ ...res, id: res.$id } as any);
      } catch (err) { console.error("Error fetching event:", err); }
    };
    fetchEvent();
  }, [eventId]);

  // Fetch Andata Slots
  useEffect(() => {
    if (!needsAndata || !giorno || !fermata) {
      setSlots([]); setBookingCounts({}); setOrario(""); return;
    }

    if (!isAppwriteConfigured || !DB_ID) {
      const times = FALLBACK_SCHEDULES[fermata] || [];
      setSlots(times.map((time, i) => ({ id: `fallback-${i}`, fermata, orario: time, giorno, capienza: 50 })));
      setBookingCounts({}); setOrario(""); return;
    }

    const fetchSlots = async () => {
      setLoadingSchedules(true); setOrario("");
      try {
        const queries = [Query.equal("giorno", giorno), Query.equal("fermata", fermata)];
        if (eventId) queries.push(Query.equal("event_id", eventId));

        const [slotsRes, bookingsRes] = await Promise.all([
          databases.listDocuments(DB_ID, SLOTS_ID, queries),
          databases.listDocuments(DB_ID, BOOKINGS_ID, [...queries, Query.equal("pagato", true)]),
        ]);

        const counts: Record<string, number> = {};
        bookingsRes.documents.forEach((b: any) => { counts[b.orario] = (counts[b.orario] || 0) + 1; });

        const mappedSlots = slotsRes.documents.map((d: any) => ({ ...d, id: d.$id })) as any as (ShuttleSlot & { nascosto?: boolean })[];
        
        setSlots(mappedSlots.filter(s => !s.nascosto).filter(s => s.capienza > (counts[s.orario] || 0)));
        setBookingCounts(counts);
      } catch (err) {
        console.error("Error fetching slots:", err);
        const times = FALLBACK_SCHEDULES[fermata] || [];
        setSlots(times.map((time, i) => ({ id: `fallback-${i}`, fermata, orario: time, giorno, capienza: 50 })));
        setBookingCounts({});
      }
      setLoadingSchedules(false);
    };
    fetchSlots();
  }, [giorno, fermata, needsAndata]);

  // Fetch Ritorno Slots
  useEffect(() => {
    if (!needsRitorno || !giorno) {
      setReturnSlots([]); setReturnCounts({}); setOrarioRitorno(""); return;
    }

    if (!isAppwriteConfigured || !DB_ID) {
      setReturnSlots(FALLBACK_RETURN_TIMES.map((time, i) => ({ id: `fr-${i}`, giorno, orario: time, capienza: 50 })));
      setReturnCounts({}); return;
    }

    const fetchReturnSlots = async () => {
      setLoadingReturnSlots(true); setOrarioRitorno("");
      try {
        const queries = [Query.equal("giorno", giorno)];
        if (eventId) queries.push(Query.equal("event_id", eventId));

        const [slotsRes, bookingsRes] = await Promise.all([
          databases.listDocuments(DB_ID, RETURN_SLOTS_ID, queries),
          databases.listDocuments(DB_ID, BOOKINGS_ID, [...queries, Query.equal("pagato", true)]),
        ]);

        const counts: Record<string, number> = {};
        bookingsRes.documents.forEach((b: any) => { 
          if (b.orario_ritorno && (b.tipo_viaggio === "ritorno" || b.tipo_viaggio === "andata_ritorno")) {
            counts[b.orario_ritorno] = (counts[b.orario_ritorno] || 0) + 1; 
          }
        });

        const mappedSlots = slotsRes.documents.map((d: any) => ({ ...d, id: d.$id })) as any as (ReturnSlot & { nascosto?: boolean })[];
        
        setReturnSlots(mappedSlots.filter(s => !s.nascosto).filter(s => s.capienza > (counts[s.orario] || 0)));
        setReturnCounts(counts);
      } catch (err) {
        console.error("Error fetching return slots:", err);
        setReturnSlots(FALLBACK_RETURN_TIMES.map((time, i) => ({ id: `fr-${i}`, giorno, orario: time, capienza: 50 })));
        setReturnCounts({});
      }
      setLoadingReturnSlots(false);
    };
    fetchReturnSlots();
  }, [giorno, needsRitorno]);

  // Reset states when dependencies change
  useEffect(() => { setGiorno(""); setFermata(""); setOrario(""); setOrarioRitorno(""); }, [tipoViaggio]);
  useEffect(() => { if (orario && orarioRitorno && timeToMinutes(orarioRitorno) <= timeToMinutes(orario)) setOrarioRitorno(""); }, [orario, orarioRitorno]);

  const totalPrice = useMemo(() => {
    if (!tipoViaggio || !eventData) return 0;
    
    let base = tipoViaggio === "andata_ritorno" ? eventData.price_round_trip : eventData.price_one_way;
    
    // Check for slot overrides
    if (needsAndata && orario) {
      const slot = slots.find(s => s.orario === orario);
      if (slot?.price_override) base = slot.price_override;
    }
    // Note: If both have overrides, we might need a more complex sum logic, 
    // but for now let's assume override replaces the base trip price.
    
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
      
      if (isAppwriteConfigured && DB_ID) {
        const payload = {
          nome, email, telefono, tipo_viaggio: tipoViaggio, giorno,
          fermata: needsAndata ? fermata : null,
          orario: needsAndata ? orario : null,
          orario_ritorno: needsRitorno ? orarioRitorno : null,
          event_id: eventId || null,
          price_paid: totalPrice,
          testMode
        };

        const execution = await functions.createExecution(
          import.meta.env.VITE_APPWRITE_FUNCTION_CREATE_BOOKING, 
          JSON.stringify(payload)
        );

        const result = JSON.parse(execution.responseBody);
        if (result.error) throw new Error(result.error);

        if (result.bumped) {
          toast({ 
            title: "Orario Modificato", 
            description: "Uno degli slot scelti era pieno. Sei stato spostato all'orario disponibile più vicino.",
            variant: "default" 
          });
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

  return {
    nome, setNome, email, setEmail, telefono, setTelefono,
    tipoViaggio, setTipoViaggio, giorno, setGiorno, fermata, setFermata,
    orario, setOrario, orarioRitorno, setOrarioRitorno,
    slots, returnSlots,
    loading, loadingSchedules, loadingReturnSlots,
    accettaTermini, setAccettaTermini, accettaPagamento, setAccettaPagamento, accettaRimborso, setAccettaRimborso,
    needsAndata, needsRitorno,
    totalPrice,
    handleSubmit
  };
};
