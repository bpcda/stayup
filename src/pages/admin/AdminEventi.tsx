import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Users, Calendar, MapPin, Eye, EyeOff, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_public: boolean;
  created_at?: string;
};

type Participant = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  attended: boolean;
  attended_at: string | null;
  profiles?: { first_name: string | null; last_name: string | null; phone: string | null; email: string | null } | null;
};

const displayName = (p: Participant) => {
  const full = [p.profiles?.first_name, p.profiles?.last_name].filter(Boolean).join(" ").trim();
  return full || p.profiles?.email || `${p.user_id.slice(0, 8)}…`;
};

const empty = (): Partial<EventRow> => ({
  title: "",
  description: "",
  location: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
  is_public: true,
});

// "2026-04-25T18:30" <-> ISO
const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

const AdminEventi = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<EventRow> | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [partOpen, setPartOpen] = useState(false);
  const [partEvent, setPartEvent] = useState<EventRow | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [partLoading, setPartLoading] = useState(false);

  const load = async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, location, starts_at, ends_at, is_active, is_public, created_at")
      .order("starts_at", { ascending: false, nullsFirst: false });
    if (error) toast({ title: "Errore", description: error.message, variant: "destructive" });
    else setEvents((data as EventRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      total: events.length,
      upcoming: events.filter(e => e.starts_at && new Date(e.starts_at).getTime() >= now).length,
      active: events.filter(e => e.is_active).length,
    };
  }, [events]);

  const openCreate = () => { setEditing(empty()); setEditOpen(true); };
  const openEdit = (e: EventRow) => { setEditing({ ...e, starts_at: toLocalInput(e.starts_at), ends_at: toLocalInput(e.ends_at) }); setEditOpen(true); };

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast({ title: "Titolo obbligatorio", variant: "destructive" });
      return;
    }
    const slugify = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "evento";
    const payload: Record<string, unknown> = {
      title: editing.title!.trim(),
      slug: slugify(editing.title!.trim()) + "-" + Math.random().toString(36).slice(2, 7),
      description: editing.description?.toString().trim() || null,
      location: editing.location?.toString().trim() || null,
      starts_at: fromLocalInput((editing.starts_at as string) || ""),
      ends_at: fromLocalInput((editing.ends_at as string) || ""),
      is_active: !!editing.is_active,
      is_public: !!editing.is_public,
    };
    let error;
    if (editing.id) {
      const { slug: _omit, ...updatePayload } = payload as { slug?: string };
      ({ error } = await supabase.from("events").update(updatePayload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("events").insert(payload));
    }
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Evento aggiornato" : "Evento creato" });
    setEditOpen(false);
    setEditing(null);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Evento eliminato" });
      setEvents(prev => prev.filter(e => e.id !== deleteId));
    }
    setDeleteId(null);
  };

  const toggleField = async (e: EventRow, field: "is_active" | "is_public") => {
    const next = !e[field];
    setEvents(prev => prev.map(x => x.id === e.id ? { ...x, [field]: next } : x));
    const { error } = await supabase.from("events").update({ [field]: next }).eq("id", e.id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      setEvents(prev => prev.map(x => x.id === e.id ? { ...x, [field]: !next } : x));
    }
  };

  const openParticipants = async (e: EventRow) => {
    setPartEvent(e);
    setPartOpen(true);
    setPartLoading(true);
    const { data, error } = await supabase
      .from("event_participations")
      .select("id, user_id, status, created_at, attended, attended_at, profiles:profiles!event_participations_user_id_fkey(first_name, last_name, phone, email)")
      .eq("event_id", e.id)
      .order("created_at", { ascending: false });
    if (error) {
      // fallback senza join se la FK non è dichiarata
      const { data: d2 } = await supabase
        .from("event_participations")
        .select("id, user_id, status, created_at, attended, attended_at")
        .eq("event_id", e.id)
        .order("created_at", { ascending: false });
      setParticipants((d2 as Participant[]) ?? []);
    } else {
      setParticipants((data as unknown as Participant[]) ?? []);
    }
    setPartLoading(false);
  };

  const removeParticipant = async (id: string) => {
    const { error } = await supabase.from("event_participations").delete().eq("id", id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    setParticipants(prev => prev.filter(p => p.id !== id));
    toast({ title: "Iscrizione rimossa" });
  };

  const toggleAttended = async (p: Participant, value: boolean) => {
    setParticipants(prev => prev.map(x => x.id === p.id ? { ...x, attended: value, attended_at: value ? new Date().toISOString() : null } : x));
    const { error } = await supabase
      .from("event_participations")
      .update({ attended: value, attended_at: value ? new Date().toISOString() : null })
      .eq("id", p.id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      setParticipants(prev => prev.map(x => x.id === p.id ? { ...x, attended: !value } : x));
    }
  };

  const exportCsv = () => {
    if (!partEvent || participants.length === 0) return;
    const rows = [
      ["Nome", "Cognome", "Email", "Telefono", "Stato", "Presente", "Iscritto il", "Check-in il"],
      ...participants.map(p => [
        p.profiles?.first_name ?? "",
        p.profiles?.last_name ?? "",
        p.profiles?.email ?? "",
        p.profiles?.phone ?? "",
        p.status,
        p.attended ? "Sì" : "No",
        new Date(p.created_at).toLocaleString("it-IT"),
        p.attended_at ? new Date(p.attended_at).toLocaleString("it-IT") : "",
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iscritti_${partEvent.title.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-10">
      <AdminPageHeader
        title="Eventi"
        description="Crea, modifica e gestisci gli iscritti agli eventi."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo evento
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Totale</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{counts.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Prossimi</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{counts.upcoming}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Attivi</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{counts.active}</CardContent></Card>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Caricamento...</p>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Nessun evento ancora creato.</p>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Crea il primo evento</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titolo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Luogo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => {
                  const isPast = e.starts_at ? new Date(e.starts_at).getTime() < Date.now() : false;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell>
                        {e.starts_at ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {new Date(e.starts_at).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {e.location ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />{e.location}
                          </div>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {e.is_active ? <Badge variant="default">Attivo</Badge> : <Badge variant="secondary">Bozza</Badge>}
                          {e.is_public ? <Badge variant="outline">Pubblico</Badge> : <Badge variant="outline">Privato</Badge>}
                          {isPast && <Badge variant="outline">Concluso</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title={e.is_active ? "Disattiva" : "Attiva"} onClick={() => toggleField(e, "is_active")}>
                            {e.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" title="Iscritti" onClick={() => openParticipants(e)}>
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Modifica" onClick={() => openEdit(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Elimina" onClick={() => setDeleteId(e.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifica evento" : "Nuovo evento"}</DialogTitle>
            <DialogDescription>Compila i dettagli dell'evento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input id="title" value={editing?.title ?? ""} onChange={(e) => setEditing({ ...editing!, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea id="description" rows={4} value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Luogo</Label>
              <Input id="location" value={editing?.location ?? ""} onChange={(e) => setEditing({ ...editing!, location: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="starts_at">Inizio</Label>
                <Input id="starts_at" type="datetime-local" value={(editing?.starts_at as string) ?? ""} onChange={(e) => setEditing({ ...editing!, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends_at">Fine</Label>
                <Input id="ends_at" type="datetime-local" value={(editing?.ends_at as string) ?? ""} onChange={(e) => setEditing({ ...editing!, ends_at: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium text-sm">Attivo</p>
                <p className="text-xs text-muted-foreground">Se disattivato non è visibile lato sito.</p>
              </div>
              <Switch checked={!!editing?.is_active} onCheckedChange={(v) => setEditing({ ...editing!, is_active: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium text-sm">Pubblico</p>
                <p className="text-xs text-muted-foreground">Visibile a tutti, anche non iscritti.</p>
              </div>
              <Switch checked={!!editing?.is_public} onCheckedChange={(v) => setEditing({ ...editing!, is_public: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annulla</Button>
            <Button onClick={save}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Participants dialog */}
      <Dialog open={partOpen} onOpenChange={setPartOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Iscritti — {partEvent?.title}</DialogTitle>
            <DialogDescription>{participants.length} iscritti</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {partLoading ? (
              <p className="text-center text-muted-foreground py-8">Caricamento...</p>
            ) : participants.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nessun iscritto.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Iscritto il</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{[p.profiles?.first_name, p.profiles?.last_name].filter(Boolean).join(" ") || <span className="text-muted-foreground text-xs">{p.user_id.slice(0,8)}…</span>}</TableCell>
                      <TableCell>{p.profiles?.phone ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("it-IT")}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => removeParticipant(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartOpen(false)}>Chiudi</Button>
            <Button onClick={exportCsv} disabled={participants.length === 0}>
              <Download className="h-4 w-4 mr-2" />Esporta CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'evento?</AlertDialogTitle>
            <AlertDialogDescription>L'azione è irreversibile. Verranno rimosse anche tutte le iscrizioni collegate.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEventi;
