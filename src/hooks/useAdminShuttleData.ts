import { useState, useEffect, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Booking, ShuttleSlot, ReturnSlot } from "@/interfaces/shuttle";
import { toast } from "@/hooks/use-toast";
import { computeStats, computeSlotGroupMembers, computeSlotStats, computeReturnSlotStats } from "@/lib/shuttleStats";
import { sendEmail } from "@/services/supabase/functions.service";

export const useAdminShuttleData = (testMode: boolean, eventId?: string) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [returnSlots, setReturnSlots] = useState<ReturnSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setBookings([]); setSlots([]); setReturnSlots([]); setLoading(false); return;
    }
    try {
      let bQ = supabase.from("shuttle_bookings").select("*").order("created_at", { ascending: false });
      let sQ = supabase.from("shuttle_slots").select("*").order("orario", { ascending: true });
      let rQ = supabase.from("shuttle_return_slots").select("*").order("orario", { ascending: true });
      if (eventId) {
        bQ = bQ.eq("event_id", eventId);
        sQ = sQ.eq("event_id", eventId);
        rQ = rQ.eq("event_id", eventId);
      }
      const [bRes, sRes, rRes] = await Promise.all([bQ, sQ, rQ]);
      if (bRes.error) throw bRes.error;
      if (sRes.error) throw sRes.error;
      if (rRes.error) throw rRes.error;

      setBookings((bRes.data ?? []) as unknown as Booking[]);
      setSlots((sRes.data ?? []) as unknown as ShuttleSlot[]);
      setReturnSlots((rRes.data ?? []) as unknown as ReturnSlot[]);
    } catch (err) {
      console.error(err);
      toast({ title: "Errore", description: "Impossibile caricare i dati.", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const stats = useMemo(() => computeStats(bookings), [bookings]);
  const slotGroupMembers = useMemo(() => computeSlotGroupMembers(slots), [slots]);
  const slotStats = useMemo(() => computeSlotStats(slots, bookings, slotGroupMembers), [slots, bookings, slotGroupMembers]);
  const returnSlotStats = useMemo(() => computeReturnSlotStats(returnSlots, bookings), [returnSlots, bookings]);

  const togglePagato = async (booking: Booking) => {
    const newPagato = !booking.pagato;
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from("shuttle_bookings")
          .update({ pagato: newPagato, stato: newPagato ? "confirmed" : "pending" })
          .eq("id", booking.id);
        if (error) throw error;

        if (newPagato && !testMode) {
          // Invio email di conferma via Resend (Edge Function send-email)
          try {
            const body = {
                template: "booking-confirmation",
                to: booking.email,
                locale: "it",
                data: {
                  nome: booking.nome,
                  giorno: booking.giorno,
                  fermata: booking.fermata,
                  orario: booking.orario,
                  orario_ritorno: booking.orario_ritorno,
                  tipo_viaggio: booking.tipo_viaggio,
                  referenceCode: booking.id,
                },
                related: { booking_id: booking.id, event_id: booking.event_id ?? undefined },
              };

            await sendEmail(body);
          } catch (mailErr) {
            console.warn("send-email invoke failed:", mailErr);
          }
        }
      } catch (err) {
        console.error(err);
        toast({ title: "Errore", description: "Aggiornamento fallito.", variant: "destructive" });
        return;
      }
    }
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, pagato: newPagato, stato: newPagato ? "confirmed" : "pending" } : b)));
    toast({ title: "Aggiornato", description: `${booking.nome} → ${newPagato ? "Pagato" : "Non pagato"}${testMode && newPagato ? " (TEST: nessuna mail)" : ""}` });
  };

  const deleteBooking = async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("shuttle_bookings").delete().eq("id", id);
        if (error) throw error;
      } catch (err) {
        console.error(err);
        toast({ title: "Errore", description: "Eliminazione fallita.", variant: "destructive" });
        return false;
      }
    }
    setBookings((prev) => prev.filter((b) => b.id !== id));
    return true;
  };

  const moveBooking = async (selectedBooking: Booking, newFermata: string, newOrario: string, newOrarioRitorno: string) => {
    const hasAndata = selectedBooking.tipo_viaggio === "andata" || selectedBooking.tipo_viaggio === "andata_ritorno";
    const hasRitorno = selectedBooking.tipo_viaggio === "ritorno" || selectedBooking.tipo_viaggio === "andata_ritorno";

    if (hasAndata && (!newFermata || !newOrario)) return false;
    if (hasRitorno && !newOrarioRitorno) return false;

    if (hasAndata && (newFermata !== selectedBooking.fermata || newOrario !== selectedBooking.orario)) {
      const targetSlot = slotStats.find((s) => s.giorno === selectedBooking.giorno && s.fermata === newFermata && s.orario === newOrario);
      if (targetSlot && targetSlot.rimanenti <= 0) {
        toast({ title: "Errore", description: "Nessun posto disponibile su questa navetta.", variant: "destructive" });
        return false;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (hasAndata) { updateData.fermata = newFermata; updateData.orario = newOrario; }
    if (hasRitorno) { updateData.orario_ritorno = newOrarioRitorno; }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("shuttle_bookings").update(updateData).eq("id", selectedBooking.id);
        if (error) throw error;
      } catch (err) {
        console.error(err);
        toast({ title: "Errore", description: "Spostamento fallito.", variant: "destructive" });
        return false;
      }
    }
    setBookings((prev) => prev.map((b) => (b.id === selectedBooking.id ? { ...b, ...updateData } as Booking : b)));
    return true;
  };

  const sendConfirmEmail = async (booking: Booking) => {
    if (!isSupabaseConfigured) {
      toast({ title: "Demo", description: `Email simulata a ${booking.email}` });
      return;
    }
    try {
      const body = {
          template: "booking-confirmation",
          to: booking.email,
          locale: "it",
          data: {
            nome: booking.nome,
            giorno: booking.giorno,
            fermata: booking.fermata,
            orario: booking.orario,
            orario_ritorno: booking.orario_ritorno,
            tipo_viaggio: booking.tipo_viaggio,
            referenceCode: booking.id,
          },
          related: { booking_id: booking.id, event_id: booking.event_id ?? undefined },
        };
      const { error } = await sendEmail(body);
      if (error) throw error;
      toast({ title: "Inviata", description: `Email inviata a ${booking.email}` });
    } catch (err) {
      console.error(err);
      toast({ title: "Errore", description: "Invio email fallito.", variant: "destructive" });
    }
  };

  return {
    bookings, slots, returnSlots, loading, fetchData,
    stats, slotGroupMembers, slotStats, returnSlotStats,
    togglePagato, deleteBooking, moveBooking, sendConfirmEmail,
    setSlots, setReturnSlots,
  };
};
