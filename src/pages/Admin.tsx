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
import { Link } from "react-router-dom";
import stayupLogo from "@/assets/stayup-logo.png";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";

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
}

interface ReturnSlot {
  id: string;
  giorno: string;
  orario: string;
  capienza: number;
}

const STOPS = ["Università Cattolica", "Cheope"];
const GIORNI = ["25 Aprile", "26 Aprile"];

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

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
  const [editSlotData, setEditSlotData] = useState<{ id: string; giorno: string; fermata: string; orario: string; capienza: number }>({ id: "", giorno: "", fermata: "", orario: "", capienza: 50 });

  // Add slot dialog
  const [addSlotDialog, setAddSlotDialog] = useState(false);
  const [addSlotType, setAddSlotType] = useState<"andata" | "ritorno">("andata");
  const [newSlotData, setNewSlotData] = useState({ giorno: "25 Aprile", fermata: "Università Cattolica", orario: "", capienza: 50 });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      fetchData();
    } else {
      toast({ title: "Errore", description: "Password non valida.", variant: "destructive" });
    }
  };

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
    const incasso = pagati * 6;
    const soloAndata = bookings.filter((b) => b.tipo_viaggio === "andata").length;
    const soloRitorno = bookings.filter((b) => b.tipo_viaggio === "ritorno").length;
    const andataRitorno = bookings.filter((b) => b.tipo_viaggio === "andata_ritorno").length;
    const oggi = new Date().toISOString().slice(0, 10);
    const iscrittiOggi = bookings.filter((b) => b.created_at?.slice(0, 10) === oggi).length;
    return { totale, pagati, nonPagati, incasso, soloAndata, soloRitorno, andataRitorno, iscrittiOggi };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (filterGiorno !== "all" && b.giorno !== filterGiorno) return false;
      if (filterFermata !== "all" && b.fermata !== filterFermata) return false;
      if (filterPagato === "pagato" && !b.pagato) return false;
      if (filterPagato === "non_pagato" && b.pagato) return false;
      return true;
    });
  }, [bookings, filterGiorno, filterFermata, filterPagato]);

  // Shuttle slot stats
  const slotStats = useMemo(() => {
    return slots.map((slot) => {
      const count = bookings.filter(
        (b) => b.giorno === slot.giorno && b.fermata === slot.fermata && b.orario === slot.orario
      ).length;
      return { ...slot, occupati: count, rimanenti: slot.capienza - count };
    });
  }, [slots, bookings]);

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

  // Return slot stats from DB
  const returnSlotStats = useMemo(() => {
    return returnSlots.map((slot) => {
      const count = bookings.filter(
        (b) =>
          b.giorno === slot.giorno &&
          b.orario_ritorno === slot.orario &&
          (b.tipo_viaggio === "ritorno" || b.tipo_viaggio === "andata_ritorno")
      ).length;
      return { ...slot, occupati: count, rimanenti: slot.capienza - count };
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
    const passengers = bookings.filter(
      (b) => b.giorno === slot.giorno && b.fermata === slot.fermata && b.orario === slot.orario && b.pagato
    );
    const data = passengers.map((p, i) => ({ "N.": i + 1, Nome: p.nome, Telefono: p.telefono, Email: p.email }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 30 }];
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
        },
      });
      if (error) throw error;
      toast({ title: "Inviata", description: `Email inviata a ${booking.email}` });
    } catch {
      toast({ title: "Errore", description: "Invio email fallito.", variant: "destructive" });
    }
  };

  // === SLOT MANAGEMENT ===
  const openEditSlot = (type: "andata" | "ritorno", slot: { id: string; giorno: string; fermata?: string; orario: string; capienza: number }) => {
    setEditSlotType(type);
    setEditSlotData({ id: slot.id, giorno: slot.giorno, fermata: (slot as any).fermata || "", orario: slot.orario, capienza: slot.capienza });
    setEditSlotDialog(true);
  };

  const saveEditSlot = async () => {
    const table = editSlotType === "andata" ? "shuttle_slots" : "shuttle_return_slots";
    const updatePayload: any = { giorno: editSlotData.giorno, orario: editSlotData.orario, capienza: editSlotData.capienza };
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
    const table = addSlotType === "andata" ? "shuttle_slots" : "shuttle_return_slots";
    const insertPayload: any = { giorno: newSlotData.giorno, orario: newSlotData.orario, capienza: newSlotData.capienza };
    if (addSlotType === "andata") insertPayload.fermata = newSlotData.fermata;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from(table).insert(insertPayload).select().single();
      if (error) {
        toast({ title: "Errore", description: "Inserimento fallito.", variant: "destructive" });
        return;
      }
      if (addSlotType === "andata") {
        setSlots((prev) => [...prev, data]);
      } else {
        setReturnSlots((prev) => [...prev, data]);
      }
    }
    setAddSlotDialog(false);
    toast({ title: "Aggiunto", description: "Nuovo slot creato." });
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Link to="/"><img src={stayupLogo} alt="StayUp" className="w-20 h-auto mx-auto mb-2" /></Link>
            <CardTitle className="font-heading">Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Inserisci password" required />
              </div>
              <Button type="submit" className="w-full">Accedi</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/"><img src={stayupLogo} alt="StayUp" className="w-16 h-auto" /></Link>
            <h1 className="text-2xl font-bold font-heading">Dashboard Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>↻ Aggiorna</Button>
            <Button variant="outline" size="sm" asChild><Link to="/">← Home</Link></Button>
            <Button variant="outline" size="sm" onClick={() => setAuthenticated(false)}>Logout</Button>
          </div>
        </div>

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
          <CardContent>
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
            <CardTitle className="text-lg">Lista Iscritti ({filteredBookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Caricamento...</p>
            ) : filteredBookings.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nessun iscritto trovato.</p>
            ) : (
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
                    {filteredBookings.map((b) => (
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
                      <TableHead className="text-center">Occupati</TableHead>
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
                        <TableCell className="text-center">{s.occupati}</TableCell>
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
                      <TableHead className="text-center">Occupati</TableHead>
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
                        <TableCell className="text-center">{s.occupati}</TableCell>
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
                <div className="space-y-2">
                  <Label>Fermata</Label>
                  <Select value={newSlotData.fermata} onValueChange={(v) => setNewSlotData((p) => ({ ...p, fermata: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STOPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Orario (HH:MM)</Label>
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
      </div>
    </div>
  );
};

export default Admin;
