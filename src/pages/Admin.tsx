import { useState, useEffect, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
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
  giorno: string;
  fermata: string;
  orario: string;
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

// Demo data
const DEMO_BOOKINGS: Booking[] = [
  { id: "1", nome: "Mario Rossi", email: "mario@test.com", telefono: "+39 333 1111111", giorno: "25 Aprile", fermata: "Università Cattolica", orario: "14:00", stato: "pending", pagato: false, created_at: new Date().toISOString() },
  { id: "2", nome: "Luca Bianchi", email: "luca@test.com", telefono: "+39 333 2222222", giorno: "25 Aprile", fermata: "Cheope", orario: "14:15", stato: "pending", pagato: true, created_at: new Date().toISOString() },
  { id: "3", nome: "Anna Verdi", email: "anna@test.com", telefono: "+39 333 3333333", giorno: "26 Aprile", fermata: "Università Cattolica", orario: "17:00", stato: "pending", pagato: false, created_at: new Date().toISOString() },
];

const DEMO_SLOTS: ShuttleSlot[] = [
  { id: "s1", giorno: "25 Aprile", fermata: "Università Cattolica", orario: "12:30", capienza: 50 },
  { id: "s2", giorno: "25 Aprile", fermata: "Università Cattolica", orario: "14:00", capienza: 50 },
  { id: "s3", giorno: "25 Aprile", fermata: "Università Cattolica", orario: "15:30", capienza: 50 },
  { id: "s4", giorno: "25 Aprile", fermata: "Cheope", orario: "12:45", capienza: 50 },
  { id: "s5", giorno: "25 Aprile", fermata: "Cheope", orario: "14:15", capienza: 50 },
  { id: "s6", giorno: "26 Aprile", fermata: "Università Cattolica", orario: "17:00", capienza: 50 },
  { id: "s7", giorno: "26 Aprile", fermata: "Cheope", orario: "17:15", capienza: 50 },
];

const STOPS = ["Università Cattolica", "Cheope"];
const TIMES: Record<string, string[]> = {
  "Università Cattolica": ["12:30", "14:00", "15:30", "17:00", "18:30", "21:00", "Mi serve solo ritorno"],
  "Cheope": ["12:45", "14:15", "15:45", "17:15", "18:45", "21:15", "Mi serve solo ritorno"],
};

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterGiorno, setFilterGiorno] = useState("all");
  const [filterFermata, setFilterFermata] = useState("all");
  const [filterPagato, setFilterPagato] = useState("all");

  // Shuttle filters
  const [slotFilterGiorno, setSlotFilterGiorno] = useState("all");
  const [slotFilterFermata, setSlotFilterFermata] = useState("all");
  const [slotFilterRiempimento, setSlotFilterRiempimento] = useState("all");

  // Move dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newFermata, setNewFermata] = useState("");
  const [newOrario, setNewOrario] = useState("");

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
      setBookings(DEMO_BOOKINGS);
      setSlots(DEMO_SLOTS);
      setLoading(false);
      return;
    }
    try {
      const [bRes, sRes] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("shuttle_slots").select("*"),
      ]);
      if (bRes.error) throw bRes.error;
      if (sRes.error) throw sRes.error;
      setBookings(bRes.data || []);
      setSlots(sRes.data || []);
    } catch (err) {
      console.error(err);
      toast({ title: "Errore", description: "Impossibile caricare i dati.", variant: "destructive" });
    }
    setLoading(false);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (filterGiorno !== "all" && b.giorno !== filterGiorno) return false;
      if (filterFermata !== "all" && b.fermata !== filterFermata) return false;
      if (filterPagato === "pagato" && !b.pagato) return false;
      if (filterPagato === "non_pagato" && b.pagato) return false;
      return true;
    });
  }, [bookings, filterGiorno, filterFermata, filterPagato]);

  // Shuttle management: count bookings per slot
  const slotStats = useMemo(() => {
    return slots.map((slot) => {
      const count = bookings.filter(
        (b) => b.giorno === slot.giorno && b.fermata === slot.fermata && b.orario === slot.orario
      ).length;
      return { ...slot, occupati: count, rimanenti: slot.capienza - count };
    });
  }, [slots, bookings]);

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
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, pagato: newPagato, stato: newPagato ? "confirmed" : "pending" } : b))
    );
    toast({ title: "Aggiornato", description: `${booking.nome} → ${newPagato ? "Pagato" : "Non pagato"}` });
  };

  const openMoveDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setNewFermata(booking.fermata);
    setNewOrario(booking.orario);
    setMoveDialogOpen(true);
  };

  const handleMove = async () => {
    if (!selectedBooking || !newFermata || !newOrario) return;

    // Check capacity
    const targetSlot = slotStats.find(
      (s) => s.giorno === selectedBooking.giorno && s.fermata === newFermata && s.orario === newOrario
    );
    if (targetSlot && targetSlot.rimanenti <= 0) {
      toast({ title: "Errore", description: "Nessun posto disponibile su questa navetta.", variant: "destructive" });
      return;
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from("bookings")
        .update({ fermata: newFermata, orario: newOrario })
        .eq("id", selectedBooking.id);
      if (error) {
        toast({ title: "Errore", description: "Spostamento fallito.", variant: "destructive" });
        return;
      }
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === selectedBooking.id ? { ...b, fermata: newFermata, orario: newOrario } : b))
    );
    setMoveDialogOpen(false);
    toast({ title: "Spostato", description: `${selectedBooking.nome} → ${newFermata} ${newOrario}` });
  };

  const sendConfirmEmail = async (booking: Booking) => {
    if (!isSupabaseConfigured) {
      toast({ title: "Demo", description: `Email di conferma simulata a ${booking.email}` });
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("send-booking-email", {
        body: {
          nome: booking.nome,
          email: booking.email,
          telefono: booking.telefono,
          giorno: booking.giorno,
          fermata: booking.fermata,
          orario: booking.orario,
          confirmed: true,
        },
      });
      if (error) throw error;
      toast({ title: "Inviata", description: `Email di conferma inviata a ${booking.email}` });
    } catch {
      toast({ title: "Errore", description: "Invio email fallito.", variant: "destructive" });
    }
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Link to="/">
              <img src={stayupLogo} alt="StayUp" className="w-20 h-auto mx-auto mb-2" />
            </Link>
            <CardTitle className="font-heading">Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci password"
                  required
                />
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
            <Button variant="outline" size="sm" asChild>
              <Link to="/">← Home</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAuthenticated(false)}>Logout</Button>
          </div>
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
                    <SelectItem value="25 Aprile">25 Aprile</SelectItem>
                    <SelectItem value="26 Aprile">26 Aprile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fermata</Label>
                <Select value={filterFermata} onValueChange={setFilterFermata}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    <SelectItem value="Università Cattolica">Università Cattolica</SelectItem>
                    <SelectItem value="Cheope">Cheope</SelectItem>
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
                      <TableHead>Giorno</TableHead>
                      <TableHead>Fermata</TableHead>
                      <TableHead>Orario</TableHead>
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
                        <TableCell>{b.giorno}</TableCell>
                        <TableCell>{b.fermata}</TableCell>
                        <TableCell>{b.orario}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            b.pagato
                              ? "bg-green-900/30 text-green-400"
                              : "bg-red-900/30 text-red-400"
                          }`}>
                            {b.pagato ? "Pagato" : "Non pagato"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => togglePagato(b)}>
                              {b.pagato ? "↩ Annulla" : "✓ Pagato"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openMoveDialog(b)}>
                              Sposta
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => sendConfirmEmail(b)}>
                              ✉ Email
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

        {/* Shuttle Management */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Gestione Navette</CardTitle></CardHeader>
          <CardContent>
            {slotStats.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nessuno slot configurato.</p>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slotStats.map((s) => (
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
            <DialogHeader>
              <DialogTitle>Sposta {selectedBooking?.nome}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                <Label>Orario</Label>
                <Select value={newOrario} onValueChange={setNewOrario}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(TIMES[newFermata] || []).map((t) => {
                      const slot = slotStats.find(
                        (s) => s.giorno === selectedBooking?.giorno && s.fermata === newFermata && s.orario === t
                      );
                      const isFull = slot ? slot.rimanenti <= 0 : false;
                      return (
                        <SelectItem key={t} value={t} disabled={isFull}>
                          {t} {slot ? `(${slot.rimanenti} posti)` : ""} {isFull ? "— PIENO" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>Annulla</Button>
              <Button onClick={handleMove} disabled={!newOrario}>Conferma spostamento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;
