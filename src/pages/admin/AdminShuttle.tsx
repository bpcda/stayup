import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import stayupLogo from "@/assets/stayup-logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useAdminShuttleData } from "@/hooks/useAdminShuttleData";
import { ShuttleStats } from "@/components/admin/shuttle/ShuttleStats";
import { ShuttleFilters } from "@/components/admin/shuttle/ShuttleFilters";
import { BookingsTable } from "@/components/admin/shuttle/BookingsTable";
import { ShuttleAndataManager } from "@/components/admin/shuttle/ShuttleAndataManager";
import { ShuttleRitornoManager } from "@/components/admin/shuttle/ShuttleRitornoManager";
import { ShuttleModals } from "@/components/admin/shuttle/ShuttleModals";
import { Booking } from "@/interfaces/shuttle";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SLOTS_TABLE = "shuttle_slots";
const RETURN_SLOTS_TABLE = "shuttle_return_slots";

const AdminShuttle = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { signOut, user } = useAuth();

  const [testMode, setTestMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("stayup_test_mode") === "1";
  });
  useEffect(() => { localStorage.setItem("stayup_test_mode", testMode ? "1" : "0"); }, [testMode]);

  const data = useAdminShuttleData(testMode, eventId);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGiorno, setFilterGiorno] = useState("all");
  const [filterFermata, setFilterFermata] = useState("all");
  const [filterPagato, setFilterPagato] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  const [slotFilterGiorno, setSlotFilterGiorno] = useState("all");
  const [slotFilterFermata, setSlotFilterFermata] = useState("all");
  const [slotFilterRiempimento, setSlotFilterRiempimento] = useState("all");

  const [returnFilterGiorno, setReturnFilterGiorno] = useState("all");
  const [returnFilterRiempimento, setReturnFilterRiempimento] = useState("all");

  // Filter Bookings
  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.bookings.filter((b) => {
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
  }, [data.bookings, filterGiorno, filterFermata, filterPagato, searchQuery]);

  useEffect(() => { setCurrentPage(1); }, [filterGiorno, filterFermata, filterPagato, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const pageSafe = Math.min(currentPage, totalPages);
  const paginatedBookings = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, pageSafe]);

  const filteredSlotStats = useMemo(() => {
    return data.slotStats.filter((s) => {
      if (slotFilterGiorno !== "all" && s.giorno !== slotFilterGiorno) return false;
      if (slotFilterFermata !== "all" && s.fermata !== slotFilterFermata) return false;
      if (slotFilterRiempimento === "pieno" && s.rimanenti > 0) return false;
      if (slotFilterRiempimento === "disponibile" && s.rimanenti <= 0) return false;
      if (slotFilterRiempimento === "quasi_pieno" && (s.rimanenti <= 0 || s.rimanenti > 5)) return false;
      return true;
    });
  }, [data.slotStats, slotFilterGiorno, slotFilterFermata, slotFilterRiempimento]);

  const filteredReturnSlotStats = useMemo(() => {
    return data.returnSlotStats.filter((s) => {
      if (returnFilterGiorno !== "all" && s.giorno !== returnFilterGiorno) return false;
      if (returnFilterRiempimento === "pieno" && s.rimanenti > 0) return false;
      if (returnFilterRiempimento === "disponibile" && s.rimanenti <= 0) return false;
      if (returnFilterRiempimento === "quasi_pieno" && (s.rimanenti <= 0 || s.rimanenti > 5)) return false;
      return true;
    });
  }, [data.returnSlotStats, returnFilterGiorno, returnFilterRiempimento]);

  // Modal States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newFermata, setNewFermata] = useState("");
  const [newOrario, setNewOrario] = useState("");
  const [newOrarioRitorno, setNewOrarioRitorno] = useState("");

  const [editSlotDialog, setEditSlotDialog] = useState(false);
  const [editSlotType, setEditSlotType] = useState<"andata" | "ritorno">("andata");
  const [editSlotData, setEditSlotData] = useState<any>({ id: "", giorno: "", fermata: "", orario: "", capienza: 50, nascosto: false });

  const [addSlotDialog, setAddSlotDialog] = useState(false);
  const [addSlotType, setAddSlotType] = useState<"andata" | "ritorno">("andata");
  const [newSlotData, setNewSlotData] = useState<any>({ giorno: "25 Aprile", fermata: "Università Cattolica", orario: "", capienza: 50 });

  // Handlers
  const askDeleteBooking = (b: Booking) => { setBookingToDelete(b); setDeleteDialogOpen(true); };
  const confirmDeleteBooking = async () => {
    if (bookingToDelete && await data.deleteBooking(bookingToDelete.id)) {
      setDeleteDialogOpen(false); setBookingToDelete(null);
      toast({ title: "Eliminato", description: `${bookingToDelete.nome} rimosso dalla tabella.` });
    }
  };

  const openMoveDialog = (b: Booking) => {
    setSelectedBooking(b); setNewFermata(b.fermata || ""); setNewOrario(b.orario || ""); setNewOrarioRitorno(b.orario_ritorno || "");
    setMoveDialogOpen(true);
  };
  const handleMove = async () => {
    if (selectedBooking && await data.moveBooking(selectedBooking, newFermata, newOrario, newOrarioRitorno)) {
      setMoveDialogOpen(false);
    }
  };

  const openEditSlot = (type: "andata" | "ritorno", slot: any) => {
    setEditSlotType(type); setEditSlotData({ ...slot }); setEditSlotDialog(true);
  };
  const saveEditSlot = async () => {
    const table = editSlotType === "andata" ? SLOTS_TABLE : RETURN_SLOTS_TABLE;
    const updatePayload: Record<string, unknown> = {
      giorno: editSlotData.giorno,
      orario: editSlotData.orario,
      capienza: editSlotData.capienza,
      nascosto: editSlotData.nascosto,
    };
    if (editSlotType === "andata") updatePayload.fermata = editSlotData.fermata;
    if (eventId) updatePayload.event_id = eventId;

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from(table).update(updatePayload).eq("id", editSlotData.id);
        if (error) throw error;
      } catch {
        toast({ title: "Errore", description: "Salvataggio fallito.", variant: "destructive" }); return;
      }
    }

    if (editSlotType === "andata") data.setSlots((p) => p.map((s) => s.id === editSlotData.id ? { ...s, ...updatePayload } as typeof s : s));
    else data.setReturnSlots((p) => p.map((s) => s.id === editSlotData.id ? { ...s, ...updatePayload } as typeof s : s));
    setEditSlotDialog(false); toast({ title: "Salvato", description: "Slot aggiornato." });
  };


  const deleteSlot = async (type: "andata" | "ritorno", id: string) => {
    const table = type === "andata" ? SLOTS_TABLE : RETURN_SLOTS_TABLE;
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;
      } catch {
        toast({ title: "Errore", description: "Eliminazione fallita.", variant: "destructive" }); return;
      }
    }
    if (type === "andata") data.setSlots((p) => p.filter((s) => s.id !== id));
    else data.setReturnSlots((p) => p.filter((s) => s.id !== id));
    toast({ title: "Eliminato", description: "Slot rimosso." });
  };


  const openAddSlot = (type: "andata" | "ritorno") => {
    setAddSlotType(type); setNewSlotData({ giorno: "25 Aprile", fermata: "Università Cattolica", orario: "", capienza: 50 });
    setAddSlotDialog(true);
  };
  const saveAddSlot = async () => {
    if (!newSlotData.orario) { toast({ title: "Errore", description: "Inserisci un orario.", variant: "destructive" }); return; }

    if (addSlotType === "ritorno") {
      const payload: Record<string, unknown> = { giorno: newSlotData.giorno, orario: newSlotData.orario, capienza: newSlotData.capienza, nascosto: false };
      if (eventId) payload.event_id = eventId;
      if (isSupabaseConfigured) {
        try {
          const { data: inserted, error } = await supabase.from(RETURN_SLOTS_TABLE).insert(payload).select().single();
          if (error) throw error;
          if (inserted) data.setReturnSlots((p) => [...p, inserted as typeof p[number]]);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          toast({ title: "Errore", description: message, variant: "destructive" }); return;
        }
      }
      setAddSlotDialog(false); toast({ title: "Aggiunto", description: "Nuovo slot ritorno creato." });
      return;
    }

    const uniOrario = newSlotData.orario.trim();
    const match = uniOrario.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) { toast({ title: "Errore", description: "Formato orario non valido (HH:MM).", variant: "destructive" }); return; }
    const h = parseInt(match[1], 10), m = parseInt(match[2], 10);
    if (h > 23 || m > 59) { toast({ title: "Errore", description: "Orario non valido.", variant: "destructive" }); return; }
    const totalMin = h * 60 + m + 15;
    const cheopeOrario = `${String(Math.floor(totalMin / 60) % 24).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;

    if (isSupabaseConfigured) {
      try {
        const tripGroupId = crypto.randomUUID();
        const row1: Record<string, unknown> = { giorno: newSlotData.giorno, fermata: "Università Cattolica", orario: uniOrario, capienza: newSlotData.capienza, trip_group_id: tripGroupId, nascosto: false };
        const row2: Record<string, unknown> = { giorno: newSlotData.giorno, fermata: "Cheope", orario: cheopeOrario, capienza: newSlotData.capienza, trip_group_id: tripGroupId, nascosto: false };
        if (eventId) { row1.event_id = eventId; row2.event_id = eventId; }

        const { data: inserted, error } = await supabase.from(SLOTS_TABLE).insert([row1, row2]).select();
        if (error) throw error;
        if (inserted) data.setSlots((p) => [...p, ...(inserted as typeof p)]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast({ title: "Errore", description: message, variant: "destructive" }); return;
      }
    }
    setAddSlotDialog(false); toast({ title: "Aggiunto", description: `Navetta creata: Università ${uniOrario} → Cheope ${cheopeOrario}` });
  };


  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/"><img src={stayupLogo} alt="StayUp" className="w-16 h-auto" /></Link>
            <h1 className="text-2xl font-bold font-heading">Dashboard Admin</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant={testMode ? "default" : "outline"} size="sm" onClick={() => setTestMode((v) => !v)} className={testMode ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}>
              {testMode ? "🧪 TEST ON" : "🧪 TEST OFF"}
            </Button>
            <Button variant="outline" size="sm" onClick={data.fetchData}>↻ Aggiorna</Button>
            <Button variant="outline" size="sm" asChild><Link to="/admin">← Dashboard</Link></Button>
            {user?.email && <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>}
            <Button variant="outline" size="sm" onClick={signOut}>Logout</Button>
          </div>
        </div>

        {testMode && (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300">
            <strong>Modalità TEST attiva:</strong> tutte le operazioni scrivono sul database, ma <em>nessuna email viene inviata</em>.
          </div>
        )}

        <ShuttleStats stats={data.stats} />

        <Card>
          <CardHeader><CardTitle className="text-lg">Filtri</CardTitle></CardHeader>
          <CardContent>
            <ShuttleFilters
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              filterGiorno={filterGiorno} setFilterGiorno={setFilterGiorno}
              filterFermata={filterFermata} setFilterFermata={setFilterFermata}
              filterPagato={filterPagato} setFilterPagato={setFilterPagato}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Lista Iscritti ({filteredBookings.length})
              {filteredBookings.length > PAGE_SIZE && <span className="ml-2 text-sm font-normal text-muted-foreground">— pag. {pageSafe}/{totalPages}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BookingsTable
              bookings={paginatedBookings} loading={data.loading}
              pageSafe={pageSafe} totalPages={totalPages} pageSize={PAGE_SIZE} totalFiltered={filteredBookings.length}
              setCurrentPage={setCurrentPage} togglePagato={data.togglePagato} openMoveDialog={openMoveDialog}
              sendConfirmEmail={data.sendConfirmEmail} askDeleteBooking={askDeleteBooking}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Gestione Navette Andata</CardTitle>
              <Button size="sm" onClick={() => openAddSlot("andata")}>+ Aggiungi Slot</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ShuttleAndataManager
              slotFilterGiorno={slotFilterGiorno} setSlotFilterGiorno={setSlotFilterGiorno}
              slotFilterFermata={slotFilterFermata} setSlotFilterFermata={setSlotFilterFermata}
              slotFilterRiempimento={slotFilterRiempimento} setSlotFilterRiempimento={setSlotFilterRiempimento}
              filteredSlotStats={filteredSlotStats} openEditSlot={openEditSlot} deleteSlot={deleteSlot}
              bookings={data.bookings} slotGroupMembers={data.slotGroupMembers}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Gestione Navette Ritorno</CardTitle>
              <Button size="sm" onClick={() => openAddSlot("ritorno")}>+ Aggiungi Slot</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ShuttleRitornoManager
              returnFilterGiorno={returnFilterGiorno} setReturnFilterGiorno={setReturnFilterGiorno}
              returnFilterRiempimento={returnFilterRiempimento} setReturnFilterRiempimento={setReturnFilterRiempimento}
              filteredReturnSlotStats={filteredReturnSlotStats} openEditSlot={openEditSlot} deleteSlot={deleteSlot}
              bookings={data.bookings}
            />
          </CardContent>
        </Card>

        <ShuttleModals
          moveDialogOpen={moveDialogOpen} setMoveDialogOpen={setMoveDialogOpen} selectedBooking={selectedBooking}
          newFermata={newFermata} setNewFermata={setNewFermata} newOrario={newOrario} setNewOrario={setNewOrario}
          newOrarioRitorno={newOrarioRitorno} setNewOrarioRitorno={setNewOrarioRitorno}
          slotStats={data.slotStats} returnSlotStats={data.returnSlotStats} handleMove={handleMove}
          editSlotDialog={editSlotDialog} setEditSlotDialog={setEditSlotDialog} editSlotType={editSlotType}
          editSlotData={editSlotData} setEditSlotData={setEditSlotData} saveEditSlot={saveEditSlot}
          addSlotDialog={addSlotDialog} setAddSlotDialog={setAddSlotDialog} addSlotType={addSlotType}
          newSlotData={newSlotData} setNewSlotData={setNewSlotData} saveAddSlot={saveAddSlot}
          deleteDialogOpen={deleteDialogOpen} setDeleteDialogOpen={setDeleteDialogOpen}
          bookingToDelete={bookingToDelete} confirmDeleteBooking={confirmDeleteBooking}
        />
      </div>
    </div>
  );
};

export default AdminShuttle;
