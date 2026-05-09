import { useState, useEffect, useMemo } from "react";
import { databases, functions, isAppwriteConfigured } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Booking, ShuttleSlot, ReturnSlot } from "@/interfaces/shuttle";
import { toast } from "@/hooks/use-toast";
import { computeStats, computeSlotGroupMembers, computeSlotStats, computeReturnSlotStats } from "@/lib/shuttleStats";

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
const BOOKINGS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKINGS || '';
const SLOTS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_SHUTTLE_SLOTS || '';
const RETURN_SLOTS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_RETURN_SLOTS || '';

export const useAdminShuttleData = (testMode: boolean, eventId?: string) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [returnSlots, setReturnSlots] = useState<ReturnSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const mapDoc = (doc: any) => ({ ...doc, id: doc.$id, created_at: doc.$createdAt });

  const fetchData = async () => {
    setLoading(true);
    if (!isAppwriteConfigured || !DB_ID) {
      setBookings([]); setSlots([]); setReturnSlots([]); setLoading(false); return;
    }
    try {
      const queries = eventId ? [Query.equal("event_id", eventId)] : [];
      const [bRes, sRes, rRes] = await Promise.all([
        databases.listDocuments(DB_ID, BOOKINGS_ID, [...queries, Query.orderDesc("$createdAt")]),
        databases.listDocuments(DB_ID, SLOTS_ID, [...queries, Query.orderAsc("orario")]),
        databases.listDocuments(DB_ID, RETURN_SLOTS_ID, [...queries, Query.orderAsc("orario")]),
      ]);
      setBookings(bRes.documents.map(mapDoc) as any);
      setSlots(sRes.documents.map(mapDoc) as any);
      setReturnSlots(rRes.documents.map(mapDoc) as any);
    } catch (err) {
      console.error(err);
      toast({ title: "Errore", description: "Impossibile caricare i dati da Appwrite.", variant: "destructive" });
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
    if (isAppwriteConfigured && DB_ID) {
      try {
        await databases.updateDocument(DB_ID, BOOKINGS_ID, booking.id, {
          pagato: newPagato, stato: newPagato ? "confirmed" : "pending"
        });
        if (newPagato) {
          // Placeholder for Appwrite Function Execution
          // functions.createExecution('send-booking-email', JSON.stringify({ ... }))
        }
      } catch (err) {
        toast({ title: "Errore", description: "Aggiornamento fallito.", variant: "destructive" });
        return;
      }
    }
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, pagato: newPagato, stato: newPagato ? "confirmed" : "pending" } : b)));
    toast({ title: "Aggiornato", description: `${booking.nome} → ${newPagato ? "Pagato" : "Non pagato"}${testMode && newPagato ? " (TEST: nessuna mail)" : ""}` });
  };

  const deleteBooking = async (id: string) => {
    if (isAppwriteConfigured && DB_ID) {
      try {
        await databases.deleteDocument(DB_ID, BOOKINGS_ID, id);
      } catch (err) {
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

    const updateData: Record<string, any> = {};
    if (hasAndata) { updateData.fermata = newFermata; updateData.orario = newOrario; }
    if (hasRitorno) { updateData.orario_ritorno = newOrarioRitorno; }

    if (isAppwriteConfigured && DB_ID) {
      try {
        await databases.updateDocument(DB_ID, BOOKINGS_ID, selectedBooking.id, updateData);
      } catch (err) {
        toast({ title: "Errore", description: "Spostamento fallito.", variant: "destructive" });
        return false;
      }
    }
    setBookings((prev) => prev.map((b) => (b.id === selectedBooking.id ? { ...b, ...updateData } : b)));
    return true;
  };

  const sendConfirmEmail = async (booking: Booking) => {
    if (!isAppwriteConfigured || !DB_ID) {
      toast({ title: "Demo", description: `Email simulata a ${booking.email}` });
      return;
    }
    try {
      // Placeholder for Appwrite Function Execution
      // await functions.createExecution('send-booking-email', JSON.stringify({ ... }));
      toast({ title: "Inviata", description: `Email inviata a ${booking.email} (Mock Appwrite Function)` });
    } catch {
      toast({ title: "Errore", description: "Invio email fallito.", variant: "destructive" });
    }
  };

  return {
    bookings, slots, returnSlots, loading, fetchData,
    stats, slotGroupMembers, slotStats, returnSlotStats,
    togglePagato, deleteBooking, moveBooking, sendConfirmEmail,
    setSlots, setReturnSlots
  };
};
