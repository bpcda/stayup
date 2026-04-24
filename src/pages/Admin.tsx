import { useState, useEffect, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import stayupLogo from "@/assets/stayup-logo.png";
import { useAuth } from "@/hooks/useAuth";

interface Booking {
  id: string;
  nome: string;
  email: string;
  telefono: string;
  tipo_viaggio: string;
  giorno: string;
  fermata: string;
  orario: string;
  orario_ritorno: string;
  stato: string;
  pagato: boolean;
  created_at: string;
}

interface ShuttleSlot {
  id: string;
  giorno: string;
  fermata: string;
  orario: string;
  capienza: number;
  trip_group_id: string | null;
  nascosto?: boolean;
}

interface ReturnSlot {
  id: string;
  giorno: string;
  orario: string;
  capienza: number;
  nascosto?: boolean;
}

const STOPS = ["Università Cattolica", "Cheope"];
const GIORNI = ["25 Aprile", "26 Aprile"];

const Admin = () => {
  const { signOut, user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [returnSlots, setReturnSlots] = useState<ReturnSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // TEST mode: persistito in localStorage, condiviso con form pubblico
  const [testMode, setTestMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("stayup_test_mode") === "1";
  });
  useEffect(() => {
    localStorage.setItem("stayup_test_mode", testMode ? "1" : "0");
  }, [testMode]);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);

  // Filters
  const [filterGiorno, setFilterGiorno] = useState("all");
  const [filterFermata, setFilterFermata] = useState("all");
  const [filterPagato, setFilterPagato] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  // Shuttle filters
  const [slotFilterGiorno, setSlotFilterGiorno] = useState("all");
  const [slotFilterFermata, setSlotFilterFermata] = useState("all");
  const [slotFilterRiempimento, setSlotFilterRiempimento] = useState("all");

  // Return shuttle filters
  const [returnFilterGiorno, setReturnFilterGiorno] = useState("all");
  const [returnFilterRiempimento, setReturnFilterRiempimento] = useState("all");

  // Move dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newFermata, setNewFermata] = useState("");
  const [newOrario, setNewOrario] = useState("");
  const [newOrarioRitorno, setNewOrarioRitorno] = useState("");

  // Slot edit dialog
  const [editSlotDialog, setEditSlotDialog] = useState(false);
  const [editSlotType, setEditSlotType] = useState<"andata" | "ritorno">("andata");
  const [editSlotData, setEditSlotData] = useState<{ id: string; giorno: string; fermata: string; orario: string; capienza: number; nascosto: boolean }>({ id: "", giorno: "", fermata: "", orario: "", capienza: 50, nascosto: false });

  // Add slot dialog
  const [addSlotDialog, setAddSlotDialog] = useState(false);
  const [addSlotType, setAddSlotType] = useState<"andata" | "ritorno">("andata");
  const [newSlotData, setNewSlotData] = useState({ giorno: "25 Aprile", fermata: "Università Cattolica", orario: "", capienza: 50 });

  // Auto-fetch on mount (AdminGuard ensures we are admin & authed)
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setBookings([]);
      setSlots([]);
      setReturnSlots([]);
      setLoading(false);
      return;
    }
    try {
      const [bRes, sRes, rRes] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("shuttle_slots").select("*").order("orario"),
        supabase.from("shuttle_return_slots").select("*").order("orario"),
      ]);
      if (bRes.error) throw bRes.error;
      if (sRes.error) throw sRes.error;
      if (rRes.error) throw rRes.error;
      setBookings(bRes.data || []);
      setSlots(sRes.data || []);
      setReturnSlots(rRes.data || []);
    } catch (err) {
      console.error(err);
      toast({ title: "Errore", description: "Impossibile caricare i dati.", variant: "destructive" });
    }
    setLoading(false);
  };

  // === STATISTICS ===
  const stats = useMemo(() => {
    const totale = bookings.length;
    const pagati = bookings.filter((b) => b.pagato).length;
    const nonPagati = totale - pagati;
    const incasso = (pagati * 5.45).toFixed(2);
    const soloAndata = bookings.filter((b) => b.tipo_viaggio === "andata").length;
    const soloRitorno = bookings.filter((b) => b.tipo_viaggio === "ritorno").length;
    const andataRitorno = bookings.filter((b) => b.tipo_viaggio === "andata_ritorno").length;
    const oggi = new Date().toISOString().slice(0, 10);
    const iscrittiOggi = bookings.filter((b) => b.created_at?.slice(0, 10) === oggi).length;
    return { totale, pagati, nonPagati, incasso, soloAndata, soloRitorno, andataRitorno, iscrittiOggi };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      if (filterGiorno !== "all" && b.giorno !== filterGiorno) return false;
      if (filterFermata !== "all" && b.fermata !== filterFermata) return false;
      if (filterPagato === "pagato" && !b.pagato) return false;
      if (filterPagato === "non_pagato" && b.pagato) return false;
      if (q) {
        const hay = `${b.nome ?? ""} ${b.email ?? ""} ${b.telefono ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, filterGiorno, filterFermata, filterPagato, searchQuery]);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterGiorno, filterFermata, filterPagato, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const pageSafe = Math.min(currentPage, totalPages);
  const paginatedBookings = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, pageSafe]);

  // Helper: per ogni slot di andata, ricava i membri del suo trip_group (entrambe fermate)
  // così capienza/occupati/prenotati sono CONDIVISI fra Università e Cheope.
  const slotGroupMembers = useMemo(() => {
    const map: Record<string, { fermata: string; orario: string }[]> = {};
    slots.forEach((s) => {
      if (!s.trip_group_id) return;
      if (!map[s.trip_group_id]) map[s.trip_group_id] = [];
      map[s.trip_group_id].push({ fermata: s.fermata, orario: s.orario });
    });
    return map;
  }, [slots]);

  // Shuttle slot stats — capacity counts ONLY paid bookings, condiviso sul trip_group
  const slotStats = useMemo(() => {
    return slots.map((slot) => {
      const members = slot.trip_group_id
        ? slotGroupMembers[slot.trip_group_id] || [{ fermata: slot.fermata, orario: slot.orario }]
        : [{ fermata: slot.fermata, orario: slot.orario }];
      const matches = (b: Booking) =>
        b.giorno === slot.giorno &&
        members.some((m) => m.fermata === b.fermata && m.orario === b.orario);
      const prenotati = bookings.filter(matches).length;
      const occupati = bookings.filter((b) => matches(b) && b.pagato).length;
      return { ...slot, prenotati, occupati, rimanenti: slot.capienza - occupati };
    });
  }, [slots, bookings, slotGroupMembers]);

  const filteredSlotStats = useMemo(() => {
    return slotStats.filter((s) => {
      if (slotFilterGiorno !== "all" && s.giorno !== slotFilterGiorno) return false;
      if (slotFilterFermata !== "all" && s.fermata !== slotFilterFermata) return false;
      if (slotFilterRiempimento === "pieno" && s.rimanenti > 0) return false;
      if (slotFilterRiempimento === "disponibile" && s.rimanenti <= 0) return false;
      if (slotFilterRiempimento === "quasi_pieno" && (s.rimanenti <= 0 || s.rimanenti > 5)) return false;
      return true;
    });
  }, [slotStats, slotFilterGiorno, slotFilterFermata, slotFilterRiempimento]);

  // Return slot stats — capacity counts ONLY paid bookings
  const returnSlotStats = useMemo(() => {
    return returnSlots.map((slot) => {
      const matches = (b: Booking) =>
        b.giorno === slot.giorno &&
        b.orario_ritorno === slot.orario &&
        (b.tipo_viaggio === "ritorno" || b.tipo_viaggio === "andata_ritorno");
      const prenotati = bookings.filter(matches).length;
      const occupati = bookings.filter((b) => matches(b) && b.pagato).length;
      return { ...slot, prenotati, occupati, rimanenti: slot.capienza - occupati };
    });
  }, [returnSlots, bookings]);

  const filteredReturnSlotStats = useMemo(() => {
    return returnSlotStats.filter((s) => {
      if (returnFilterGiorno !== "all" && s.giorno !== returnFilterGiorno) return false;
      if (returnFilterRiempimento === "pieno" && s.rimanenti > 0) return false;
      if (returnFilterRiempimento === "disponibile" && s.rimanenti <= 0) return false;
      if (returnFilterRiempimento === "quasi_pieno" && (s.rimanenti <= 0 || s.rimanenti > 5)) return false;
      return true;
    });
  }, [returnSlotStats, returnFilterGiorno, returnFilterRiempimento]);

  const downloadPassengerList = (slot: typeof slotStats[0]) => {
    const members = slot.trip_group_id
      ? slotGroupMembers[slot.trip_group_id] || [{ fermata: slot.fermata, orario: slot.orario }]
      : [{ fermata: slot.fermata, orario: slot.orario }];
    const passengers = bookings.filter(
      (b) => b.giorno === slot.giorno && b.pagato && members.some((m) => m.fermata === b.fermata && m.orario === b.orario)
    );
    const data = passengers.map((p, i) => ({
      "N.": i + 1, Nome: p.nome, Telefono: p.telefono, Email: p.email, Fermata: p.fermata, Orario: p.orario,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 30 }, { wch: 22 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Passeggeri");
    XLSX.writeFile(wb, `andata_${slot.giorno.replace(/\s/g, "_")}_${slot.fermata.replace(/\s/g, "_")}_${slot.orario}.xlsx`);
  };

  const downloadReturnPassengerList = (slot: typeof returnSlotStats[0]) => {
    const passengers = bookings.filter(
      (b) =>
        b.giorno === slot.giorno &&
        b.orario_ritorno === slot.orario &&
        (b.tipo_viaggio === "ritorno" || b.tipo_viaggio === "andata_ritorno") &&
        b.pagato
    );
    const data = passengers.map((p, i) => ({ "N.": i + 1, Nome: p.nome, Telefono: p.telefono, Email: p.email }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Passeggeri");
    XLSX.writeFile(wb, `ritorno_${slot.giorno.replace(/\s/g, "_")}_${slot.orario.replace(":", "")}.xlsx`);
  };

  const togglePagato = async (booking: Booking) => {
    const newPagato = !booking.pagato;
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from("bookings")
        .update({ pagato: newPagato, stato: newPagato ? "confirmed" : "pending" })
        .eq("id", booking.id);
      if (error) {
        toast({ title: "Errore", description: "Aggiornamento fallito.", variant: "destructive" });
        return;
      }
      // Invio automatico email di conferma pagamento
      if (newPagato) {
        supabase.functions
          .invoke("send-booking-email", {
            body: {
              nome: booking.nome, email: booking.email, telefono: booking.telefono,
              giorno: booking.giorno || "/", fermata: booking.fermata || "/",
              orario_andata: booking.orario || "/", orario_ritorno: booking.orario_ritorno || "/",
              confirmed: true,
              testMode,
            },
          })
          .catch((err) => console.warn("Confirm email failed:", err));
      }
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, pagato: newPagato, stato: newPagato ? "confirmed" : "pending" } : b))
    );
    toast({ title: "Aggiornato", description: `${booking.nome} → ${newPagato ? "Pagato" : "Non pagato"}${testMode && newPagato ? " (TEST: nessuna mail)" : ""}` });
  };

  const askDeleteBooking = (booking: Booking) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    if (isSupabaseConfigured) {
      const { error } = await supabase.from("bookings").delete().eq("id", bookingToDelete.id);
      if (error) {
        toast({ title: "Errore", description: "Eliminazione fallita.", variant: "destructive" });
        return;
      }
    }
    setBookings((prev) => prev.filter((b) => b.id !== bookingToDelete.id));
    setDeleteDialogOpen(false);
    setBookingToDelete(null);
    toast({ title: "Eliminato", description: `${bookingToDelete.nome} rimosso dalla tabella.` });
  };

  const openMoveDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setNewFermata(booking.fermata || "");
    setNewOrario(booking.orario || "");
    setNewOrarioRitorno(booking.orario_ritorno || "");
    setMoveDialogOpen(true);
  };

  const handleMove = async () => {
    if (!selectedBooking) return;
    const hasAndata = selectedBooking.tipo_viaggio === "andata" || selectedBooking.tipo_viaggio === "andata_ritorno";
    const hasRitorno = selectedBooking.tipo_viaggio === "ritorno" || selectedBooking.tipo_viaggio === "andata_ritorno";
    if (hasAndata && (!newFermata || !newOrario)) return;
    if (hasRitorno && !newOrarioRitorno) return;

    if (hasAndata && (newFermata !== selectedBooking.fermata || newOrario !== selectedBooking.orario)) {
      const targetSlot = slotStats.find(
        (s) => s.giorno === selectedBooking.giorno && s.fermata === newFermata && s.orario === newOrario
      );
      if (targetSlot && targetSlot.rimanenti <= 0) {
        toast({ title: "Errore", description: "Nessun posto disponibile su questa navetta.", variant: "destructive" });
        return;
      }
    }

    const updateData: Record<string, string | null> = {};
    if (hasAndata) { updateData.fermata = newFermata; updateData.orario = newOrario; }
    if (hasRitorno) { updateData.orario_ritorno = newOrarioRitorno; }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from("bookings").update(updateData).eq("id", selectedBooking.id);
      if (error) {
        toast({ title: "Errore", description: "Spostamento fallito.", variant: "destructive" });
        return;
      }
      supabase.functions
        .invoke("send-booking-email", {
          body: {
            nome: selectedBooking.nome,
            email: selectedBooking.email,
            telefono: selectedBooking.telefono,
            giorno: selectedBooking.giorno || "/",
            fermata: hasAndata ? newFermata : (selectedBooking.fermata || "/"),
            orario_andata: hasAndata ? newOrario : (selectedBooking.orario || "/"),
            orario_ritorno: hasRitorno ? newOrarioRitorno : (selectedBooking.orario_ritorno || "/"),
            spostamento: true,
            confirmed: selectedBooking.pagato,
            testMode,
          },
        })
        .catch((err) => console.warn("Move notification email failed:", err));
    }

    setBookings((prev) => prev.map((b) => (b.id === selectedBooking.id ? { ...b, ...updateData } : b)));
    setMoveDialogOpen(false);
    toast({ title: "Spostato", description: `${selectedBooking.nome} spostato con successo.` });
  };

  const sendConfirmEmail = async (booking: Booking) => {
    if (!isSupabaseConfigured) {
      toast({ title: "Demo", description: `Email simulata a ${booking.email}` });
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("send-booking-email", {
        body: {
          nome: booking.nome, email: booking.email, telefono: booking.telefono,
          giorno: booking.giorno || "/", fermata: booking.fermata || "/",
          orario_andata: booking.orario || "/", orario_ritorno: booking.orario_ritorno || "/",
          confirmed: booking.pagato,
          testMode,
        },
      });
      if (error) throw error;
      toast({ title: "Inviata", description: `Email inviata a ${booking.email}` });
    } catch {
      toast({ title: "Errore", description: "Invio email fallito.", variant: "destructive" });
    }
  };

  // === SLOT MANAGEMENT ===
  const openEditSlot = (type: "andata" | "ritorno", slot: { id: string; giorno: string; fermata?: string; orario: string; capienza: number; nascosto?: boolean }) => {
    setEditSlotType(type);
    setEditSlotData({ id: slot.id, giorno: slot.giorno, fermata: (slot as any).fermata || "", orario: slot.orario, capienza: slot.capienza, nascosto: !!slot.nascosto });
    setEditSlotDialog(true);
  };

  const saveEditSlot = async () => {
    const table = editSlotType === "andata" ? "shuttle_slots" : "shuttle_return_slots";
    const updatePayload: any = { giorno: editSlotData.giorno, orario: editSlotData.orario, capienza: editSlotData.capienza, nascosto: editSlotData.nascosto };
    if (editSlotType === "andata") updatePayload.fermata = editSlotData.fermata;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from(table).update(updatePayload).eq("id", editSlotData.id);
      if (error) {
        toast({ title: "Errore", description: "Salvataggio fallito.", variant: "destructive" });
        return;
      }
    }

    if (editSlotType === "andata") {
      setSlots((prev) => prev.map((s) => (s.id === editSlotData.id ? { ...s, ...updatePayload } : s)));
    } else {
      setReturnSlots((prev) => prev.map((s) => (s.id === editSlotData.id ? { ...s, ...updatePayload } : s)));
    }
    setEditSlotDialog(false);
    toast({ title: "Salvato", description: "Slot aggiornato." });
  };

  const deleteSlot = async (type: "andata" | "ritorno", id: string) => {
    const table = type === "andata" ? "shuttle_slots" : "shuttle_return_slots";
    if (isSupabaseConfigured) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) {
        toast({ title: "Errore", description: "Eliminazione fallita.", variant: "destructive" });
        return;
      }
    }
    if (type === "andata") {
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } else {
      setReturnSlots((prev) => prev.filter((s) => s.id !== id));
    }
    toast({ title: "Eliminato", description: "Slot rimosso." });
  };

  const openAddSlot = (type: "andata" | "ritorno") => {
    setAddSlotType(type);
    setNewSlotData({ giorno: "25 Aprile", fermata: "Università Cattolica", orario: "", capienza: 50 });
    setAddSlotDialog(true);
  };

  const saveAddSlot = async () => {
    if (!newSlotData.orario) {
      toast({ title: "Errore", description: "Inserisci un orario.", variant: "destructive" });
      return;
    }

    // RITORNO: comportamento invariato (singola riga)
    if (addSlotType === "ritorno") {
      const insertPayload: any = { giorno: newSlotData.giorno, orario: newSlotData.orario, capienza: newSlotData.capienza };
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("shuttle_return_slots").insert(insertPayload).select().single();
        if (error) {
          toast({ title: "Errore", description: error.message, variant: "destructive" });
          return;
        }
        setReturnSlots((prev) => [...prev, data]);
      }
      setAddSlotDialog(false);
      toast({ title: "Aggiunto", description: "Nuovo slot ritorno creato." });
      return;
    }

    // ANDATA: la navetta è UNA sola — parte dall'Università, +15 min al Cheope
    // L'admin inserisce solo l'orario di partenza dall'università.
    const uniOrario = newSlotData.orario.trim();
    const match = uniOrario.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      toast({ title: "Errore", description: "Formato orario non valido (HH:MM).", variant: "destructive" });
      return;
    }
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h > 23 || m > 59) {
      toast({ title: "Errore", description: "Orario non valido.", variant: "destructive" });
      return;
    }
    // Calcola Cheope = Uni + 15 min
    const totalMin = h * 60 + m + 15;
    const ch = Math.floor(totalMin / 60) % 24;
    const cm = totalMin % 60;
    const cheopeOrario = `${String(ch).padStart(2, "0")}:${String(cm).padStart(2, "0")}`;

    if (isSupabaseConfigured) {
      const tripGroupId = crypto.randomUUID();
      const rows = [
        { giorno: newSlotData.giorno, fermata: "Università Cattolica", orario: uniOrario, capienza: newSlotData.capienza, trip_group_id: tripGroupId },
        { giorno: newSlotData.giorno, fermata: "Cheope", orario: cheopeOrario, capienza: newSlotData.capienza, trip_group_id: tripGroupId },
      ];
      const { data, error } = await supabase.from("shuttle_slots").insert(rows).select();
      if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
        return;
      }
      setSlots((prev) => [...prev, ...(data || [])]);
    }
    setAddSlotDialog(false);
    toast({ title: "Aggiunto", description: `Navetta creata: Università ${uniOrario} → Cheope ${cheopeOrario}` });
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/"><img src={stayupLogo} alt="StayUp" className="w-16 h-auto" /></Link>
            <h1 className="text-2xl font-bold font-heading">Dashboard Admin</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={testMode ? "default" : "outline"}
              size="sm"
              onClick={() => setTestMode((v) => !v)}
              className={testMode ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}
              title="Quando attivo, nessuna mail viene inviata. Le scritture su DB avvengono normalmente."
            >
              {testMode ? "🧪 TEST ON" : "🧪 TEST OFF"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData}>↻ Aggiorna</Button>
            <Button variant="outline" size="sm" asChild><Link to="/">← Home</Link></Button>
            {user?.email && (
              <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
            )}
            <Button variant="outline" size="sm" onClick={signOut}>Logout</Button>
          </div>
        </div>

        {testMode && (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300">
            <strong>Modalità TEST attiva:</strong> tutte le operazioni scrivono sul database, ma <em>nessuna email viene inviata</em> (né dalle azioni admin né dalle nuove prenotazioni dal sito pubblico).
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{stats.totale}</p>
              <p className="text-sm text-muted-foreground">Totale iscritti</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-green-400">{stats.pagati}</p>
              <p className="text-sm text-muted-foreground">Pagati</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-red-400">{stats.nonPagati}</p>
              <p className="text-sm text-muted-foreground">Non pagati</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">€{stats.incasso}</p>
              <p className="text-sm text-muted-foreground">Incasso totale</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{stats.soloAndata}</p>
              <p className="text-xs text-muted-foreground">Solo Andata</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{stats.soloRitorno}</p>
              <p className="text-xs text-muted-foreground">Solo Ritorno</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{stats.andataRitorno}</p>
              <p className="text-xs text-muted-foreground">Andata + Ritorno</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{stats.iscrittiOggi}</p>
              <p className="text-xs text-muted-foreground">Iscritti oggi</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Filtri</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Cerca (nome, email, telefono)</Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca iscritti..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Giorno</Label>
                <Select value={filterGiorno} onValueChange={setFilterGiorno}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    {GIORNI.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fermata</Label>
                <Select value={filterFermata} onValueChange={setFilterFermata}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    {STOPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pagamento</Label>
                <Select value={filterPagato} onValueChange={setFilterPagato}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="pagato">Pagato</SelectItem>
                    <SelectItem value="non_pagato">Non pagato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Lista Iscritti ({filteredBookings.length})
              {filteredBookings.length > PAGE_SIZE && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — pag. {pageSafe}/{totalPages}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Caricamento...</p>
            ) : filteredBookings.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nessun iscritto trovato.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefono</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Giorno</TableHead>
                        <TableHead>Fermata</TableHead>
                        <TableHead>Andata</TableHead>
                        <TableHead>Ritorno</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.nome}</TableCell>
                          <TableCell>{b.email}</TableCell>
                          <TableCell>{b.telefono}</TableCell>
                          <TableCell className="capitalize">{b.tipo_viaggio?.replace("_", " + ") || "—"}</TableCell>
                          <TableCell>{b.giorno || "/"}</TableCell>
                          <TableCell>{b.fermata || "/"}</TableCell>
                          <TableCell>{b.orario || "/"}</TableCell>
                          <TableCell>{b.orario_ritorno || "/"}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              b.pagato ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                            }`}>
                              {b.pagato ? "Pagato" : "Non pagato"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => togglePagato(b)}>
                                {b.pagato ? "↩ Annulla" : "✓ Pagato"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openMoveDialog(b)}>Sposta</Button>
                              <Button size="sm" variant="outline" onClick={() => sendConfirmEmail(b)}>
                                {b.pagato ? "✉ Riepilogo" : "✉ Pagamento"}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => askDeleteBooking(b)}>🗑 Elimina</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-2 pt-4 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      Mostrando {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filteredBookings.length)} di {filteredBookings.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(1)}
                        disabled={pageSafe === 1}
                      >
                        «
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={pageSafe === 1}
                      >
                        ‹ Prec
                      </Button>
                      <span className="px-3 text-sm font-medium">
                        {pageSafe} / {totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={pageSafe === totalPages}
                      >
                        Succ ›
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={pageSafe === totalPages}
                      >
                        »
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Shuttle Andata Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Gestione Navette Andata</CardTitle>
              <Button size="sm" onClick={() => openAddSlot("andata")}>+ Aggiungi Slot</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Giorno</Label>
                <Select value={slotFilterGiorno} onValueChange={setSlotFilterGiorno}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    {GIORNI.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fermata</Label>
                <Select value={slotFilterFermata} onValueChange={setSlotFilterFermata}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    {STOPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Riempimento</Label>
                <Select value={slotFilterRiempimento} onValueChange={setSlotFilterRiempimento}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="disponibile">Disponibili</SelectItem>
                    <SelectItem value="quasi_pieno">Quasi pieni (≤5)</SelectItem>
                    <SelectItem value="pieno">Pieni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredSlotStats.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nessuno slot trovato.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Giorno</TableHead>
                      <TableHead>Fermata</TableHead>
                      <TableHead>Orario</TableHead>
                      <TableHead className="text-center">Capienza</TableHead>
                      <TableHead className="text-center" title="Totale prenotazioni (anche non pagate)">Prenotati</TableHead>
                      <TableHead className="text-center" title="Solo pagati">Occupati</TableHead>
                      <TableHead className="text-center">Rimanenti</TableHead>
                      <TableHead className="text-center">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSlotStats.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.giorno}</TableCell>
                        <TableCell>{s.fermata}</TableCell>
                        <TableCell>{s.orario}</TableCell>
                        <TableCell className="text-center">{s.capienza}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{s.prenotati}</TableCell>
                        <TableCell className="text-center font-medium">{s.occupati}</TableCell>
                        <TableCell className="text-center">
                          <span className={s.rimanenti <= 0 ? "text-red-400 font-bold" : s.rimanenti <= 5 ? "text-yellow-400 font-medium" : ""}>
                            {s.rimanenti}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="outline" onClick={() => downloadPassengerList(s)} disabled={s.occupati === 0}>⬇ Excel</Button>
                            <Button size="sm" variant="outline" onClick={() => openEditSlot("andata", s)}>✏️</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteSlot("andata", s.id)}>🗑</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Return Shuttle Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Gestione Navette Ritorno</CardTitle>
              <Button size="sm" onClick={() => openAddSlot("ritorno")}>+ Aggiungi Slot</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Giorno</Label>
                <Select value={returnFilterGiorno} onValueChange={setReturnFilterGiorno}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    {GIORNI.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Riempimento</Label>
                <Select value={returnFilterRiempimento} onValueChange={setReturnFilterRiempimento}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="disponibile">Disponibili</SelectItem>
                    <SelectItem value="quasi_pieno">Quasi pieni (≤5)</SelectItem>
                    <SelectItem value="pieno">Pieni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredReturnSlotStats.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nessuno slot trovato.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Giorno</TableHead>
                      <TableHead>Orario Ritorno</TableHead>
                      <TableHead className="text-center">Capienza</TableHead>
                      <TableHead className="text-center" title="Totale prenotazioni (anche non pagate)">Prenotati</TableHead>
                      <TableHead className="text-center" title="Solo pagati">Occupati</TableHead>
                      <TableHead className="text-center">Rimanenti</TableHead>
                      <TableHead className="text-center">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturnSlotStats.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.giorno}</TableCell>
                        <TableCell>{s.orario}</TableCell>
                        <TableCell className="text-center">{s.capienza}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{s.prenotati}</TableCell>
                        <TableCell className="text-center font-medium">{s.occupati}</TableCell>
                        <TableCell className="text-center">
                          <span className={s.rimanenti <= 0 ? "text-red-400 font-bold" : s.rimanenti <= 5 ? "text-yellow-400 font-medium" : ""}>
                            {s.rimanenti}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="outline" onClick={() => downloadReturnPassengerList(s)} disabled={s.occupati === 0}>⬇ Excel</Button>
                            <Button size="sm" variant="outline" onClick={() => openEditSlot("ritorno", s)}>✏️</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteSlot("ritorno", s.id)}>🗑</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Move Dialog */}
        <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Sposta {selectedBooking?.nome}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              {(selectedBooking?.tipo_viaggio === "andata" || selectedBooking?.tipo_viaggio === "andata_ritorno") && (
                <>
                  <p className="text-sm font-medium text-muted-foreground">Andata</p>
                  <div className="space-y-2">
                    <Label>Fermata</Label>
                    <Select value={newFermata} onValueChange={(v) => { setNewFermata(v); setNewOrario(""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STOPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Orario Andata</Label>
                    <Select value={newOrario} onValueChange={setNewOrario}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {slotStats
                          .filter((s) => s.giorno === selectedBooking?.giorno && s.fermata === newFermata)
                          .map((s) => (
                            <SelectItem key={s.orario} value={s.orario} disabled={s.rimanenti <= 0}>
                              {s.orario} ({s.rimanenti} posti) {s.rimanenti <= 0 ? "— PIENO" : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {(selectedBooking?.tipo_viaggio === "ritorno" || selectedBooking?.tipo_viaggio === "andata_ritorno") && (
                <>
                  <p className="text-sm font-medium text-muted-foreground">Ritorno</p>
                  <div className="space-y-2">
                    <Label>Orario Ritorno</Label>
                    <Select value={newOrarioRitorno} onValueChange={setNewOrarioRitorno}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {returnSlotStats
                          .filter((s) => s.giorno === selectedBooking?.giorno)
                          .map((s) => (
                            <SelectItem key={s.orario} value={s.orario} disabled={s.rimanenti <= 0}>
                              {s.orario} ({s.rimanenti} posti) {s.rimanenti <= 0 ? "— PIENO" : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>Annulla</Button>
              <Button onClick={handleMove}>Conferma spostamento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Slot Dialog */}
        <Dialog open={editSlotDialog} onOpenChange={setEditSlotDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Modifica Slot {editSlotType === "andata" ? "Andata" : "Ritorno"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Giorno</Label>
                <Select value={editSlotData.giorno} onValueChange={(v) => setEditSlotData((p) => ({ ...p, giorno: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GIORNI.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {editSlotType === "andata" && (
                <div className="space-y-2">
                  <Label>Fermata</Label>
                  <Select value={editSlotData.fermata} onValueChange={(v) => setEditSlotData((p) => ({ ...p, fermata: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STOPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Orario (HH:MM)</Label>
                <Input value={editSlotData.orario} onChange={(e) => setEditSlotData((p) => ({ ...p, orario: e.target.value }))} placeholder="14:00" />
              </div>
              <div className="space-y-2">
                <Label>Capienza</Label>
                <Input type="number" value={editSlotData.capienza} onChange={(e) => setEditSlotData((p) => ({ ...p, capienza: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="nascosto-slot"
                  checked={editSlotData.nascosto}
                  onCheckedChange={(v) => setEditSlotData((p) => ({ ...p, nascosto: v === true }))}
                />
                <Label htmlFor="nascosto-slot" className="cursor-pointer">
                  Nascondi questo slot dal form pubblico
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditSlotDialog(false)}>Annulla</Button>
              <Button onClick={saveEditSlot}>Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Slot Dialog */}
        <Dialog open={addSlotDialog} onOpenChange={setAddSlotDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuovo Slot {addSlotType === "andata" ? "Andata" : "Ritorno"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Giorno</Label>
                <Select value={newSlotData.giorno} onValueChange={(v) => setNewSlotData((p) => ({ ...p, giorno: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GIORNI.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {addSlotType === "andata" && (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  La navetta è unica: parte dall'<strong>Università Cattolica</strong> e 15 minuti dopo passa dal <strong>Cheope</strong>. Verranno create automaticamente entrambe le fermate con capienza condivisa.
                </div>
              )}
              <div className="space-y-2">
                <Label>{addSlotType === "andata" ? "Orario partenza Università (HH:MM)" : "Orario (HH:MM)"}</Label>
                <Input value={newSlotData.orario} onChange={(e) => setNewSlotData((p) => ({ ...p, orario: e.target.value }))} placeholder="14:00" />
              </div>
              <div className="space-y-2">
                <Label>Capienza</Label>
                <Input type="number" value={newSlotData.capienza} onChange={(e) => setNewSlotData((p) => ({ ...p, capienza: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddSlotDialog(false)}>Annulla</Button>
              <Button onClick={saveAddSlot}>Aggiungi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Booking Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminare {bookingToDelete?.nome}?</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2 text-sm">
              <p className="text-muted-foreground">
                Stai per eliminare definitivamente questa prenotazione dalla tabella. L'azione non è reversibile.
              </p>
              {bookingToDelete && (
                <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                  <p><strong>{bookingToDelete.nome}</strong> — {bookingToDelete.email}</p>
                  <p className="text-muted-foreground text-xs">
                    {bookingToDelete.giorno} · {bookingToDelete.fermata || "—"} · Andata {bookingToDelete.orario || "—"} · Ritorno {bookingToDelete.orario_ritorno || "—"}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annulla</Button>
              <Button variant="destructive" onClick={confirmDeleteBooking}>Elimina definitivamente</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;
