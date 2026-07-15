import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { WaitlistPanel } from "@/pages/admin/AdminEventoWaitlist";

type EventRow = {
  id: string;
  title: string;
  starts_at: string | null;
  location: string | null;
};

type ProfileLite = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
};

type Participant = {
  /** booking.id */
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  reference_code: string | null;
  /** checkin id se presente */
  checkin_id: string | null;
  checked_in_at: string | null;
  profiles?: ProfileLite | null;
};

const displayName = (p: Participant) => {
  const full = [p.profiles?.first_name, p.profiles?.last_name].filter(Boolean).join(" ").trim();
  return full || p.profiles?.email || `${p.user_id.slice(0, 8)}…`;
};

const AdminEventoIscritti = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: ev } = await supabase
        .from("events")
        .select("id, title, starts_at, location")
        .eq("id", id)
        .maybeSingle();
      setEvent((ev as EventRow) ?? null);

      // 1) Prenotazioni dell'evento (modello v2: bookings)
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, user_id, status, created_at, reference_code")
        .eq("event_id", id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
        setParticipants([]);
        setLoading(false);
        return;
      }

      const rows = (bookings as Array<{
        id: string; user_id: string; status: string; created_at: string; reference_code: string | null;
      }>) ?? [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const bookingIds = rows.map((r) => r.id);

      // 2) Profili + 3) Check-in registrati (parallelo)
      const [profsRes, chkRes] = await Promise.all([
        userIds.length
          ? supabase
              .from("profiles")
              .select("id, first_name, last_name, phone, email")
              .in("id", userIds)
          : Promise.resolve({ data: [] as Array<{ id: string } & ProfileLite> }),
        bookingIds.length
          ? supabase
              .from("checkins")
              .select("id, booking_id, checked_in_at")
              .in("booking_id", bookingIds)
          : Promise.resolve({ data: [] as Array<{ id: string; booking_id: string; checked_in_at: string }> }),
      ]);

      const profilesMap: Record<string, ProfileLite> = {};
      ((profsRes.data ?? []) as Array<{ id: string } & ProfileLite>).forEach((p) => {
        profilesMap[p.id] = {
          first_name: p.first_name,
          last_name: p.last_name,
          phone: p.phone,
          email: p.email,
        };
      });

      const checkinMap = new Map<string, { id: string; checked_in_at: string }>();
      ((chkRes.data ?? []) as Array<{ id: string; booking_id: string; checked_in_at: string }>).forEach((c) => {
        checkinMap.set(c.booking_id, { id: c.id, checked_in_at: c.checked_in_at });
      });

      setParticipants(rows.map((r) => {
        const c = checkinMap.get(r.id);
        return {
          id: r.id,
          user_id: r.user_id,
          status: r.status,
          created_at: r.created_at,
          reference_code: r.reference_code,
          checkin_id: c?.id ?? null,
          checked_in_at: c?.checked_in_at ?? null,
          profiles: profilesMap[r.user_id] ?? null,
        };
      }));
      setLoading(false);
    })();
  }, [id, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) => {
      const hay = `${displayName(p)} ${p.profiles?.email ?? ""} ${p.profiles?.phone ?? ""} ${p.reference_code ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [participants, query]);

  const stats = useMemo(() => ({
    totale: participants.length,
    presenti: participants.filter((p) => p.checkin_id !== null).length,
  }), [participants]);

  const toggleAttended = async (p: Participant, value: boolean) => {
    if (!id || !user) return;
    // optimistic
    setParticipants((prev) => prev.map((x) =>
      x.id === p.id
        ? { ...x, checkin_id: value ? "pending" : null, checked_in_at: value ? new Date().toISOString() : null }
        : x,
    ));

    if (value) {
      const { data, error } = await supabase
        .from("checkins")
        .insert({
          booking_id: p.id,
          event_id: id,
          user_id: p.user_id,
          checked_in_by: user.id,
          method: "manual",
        })
        .select("id, checked_in_at")
        .maybeSingle();
      if (error || !data) {
        toast({ title: "Errore", description: error?.message ?? "Impossibile registrare", variant: "destructive" });
        setParticipants((prev) => prev.map((x) => x.id === p.id ? { ...x, checkin_id: null, checked_in_at: null } : x));
        return;
      }
      const row = data as { id: string; checked_in_at: string };
      setParticipants((prev) => prev.map((x) => x.id === p.id ? { ...x, checkin_id: row.id, checked_in_at: row.checked_in_at } : x));
    } else {
      if (!p.checkin_id) return;
      const { error } = await supabase.from("checkins").delete().eq("booking_id", p.id);
      if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
        setParticipants((prev) => prev.map((x) => x.id === p.id ? { ...x, checkin_id: p.checkin_id, checked_in_at: p.checked_in_at } : x));
      }
    }
  };

  const removeParticipant = async (pid: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", pid);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    setParticipants((prev) => prev.filter((p) => p.id !== pid));
    toast({ title: "Prenotazione rimossa" });
  };

  const exportCsv = () => {
    if (!event || participants.length === 0) return;
    const rows = [
      ["Nome", "Cognome", "Email", "Telefono", "Codice", "Stato", "Presente", "Iscritto il", "Check-in il"],
      ...participants.map((p) => [
        p.profiles?.first_name ?? "",
        p.profiles?.last_name ?? "",
        p.profiles?.email ?? "",
        p.profiles?.phone ?? "",
        p.reference_code ?? "",
        p.status,
        p.checkin_id ? "Sì" : "No",
        new Date(p.created_at).toLocaleString("it-IT"),
        p.checked_in_at ? new Date(p.checked_in_at).toLocaleString("it-IT") : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iscritti_${event.title.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-5 sm:py-10">
      <AdminPageHeader
        title={event ? `Iscritti — ${event.title}` : "Iscritti"}
        description={
          event?.starts_at
            ? `${new Date(event.starts_at).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}${event.location ? ` · ${event.location}` : ""}`
            : "Elenco partecipanti"
        }
        actions={
          <Button onClick={exportCsv} disabled={participants.length === 0} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Card><CardContent className="px-3 py-3"><div className="text-xs text-muted-foreground sm:text-sm">Iscritti</div><div className="text-xl font-bold sm:text-2xl">{stats.totale}</div></CardContent></Card>
        <Card><CardContent className="px-3 py-3"><div className="text-xs text-muted-foreground sm:text-sm">Presenti</div><div className="text-xl font-bold sm:text-2xl">{stats.presenti}</div></CardContent></Card>
        <Card><CardContent className="px-3 py-3"><div className="text-xs text-muted-foreground sm:text-sm">Presenza</div><div className="text-xl font-bold sm:text-2xl">{stats.totale ? Math.round((stats.presenti / stats.totale) * 100) : 0}%</div></CardContent></Card>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cerca nome, email, telefono o codice…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="prenotati">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="prenotati">Prenotati</TabsTrigger>
          <TabsTrigger value="waitlist">Lista d'attesa</TabsTrigger>
        </TabsList>
        <TabsContent value="prenotati" className="mt-4">
          <div className="space-y-3 md:hidden">
            {loading ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Caricamento...</CardContent></Card>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{participants.length === 0 ? "Nessun iscritto." : "Nessun risultato per la ricerca."}</CardContent></Card>
            ) : filtered.map((p) => {
              const present = p.checkin_id !== null;
              return (
                <Card key={p.id} className={present ? "border-primary/40 bg-primary/5" : ""}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={present}
                        onCheckedChange={(v) => toggleAttended(p, !!v)}
                        aria-label="Segna come presente"
                        className="mt-1 h-5 w-5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{displayName(p)}</div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{p.profiles?.email ?? "Email non disponibile"}</div>
                        {p.profiles?.phone && <div className="truncate text-xs text-muted-foreground">{p.profiles.phone}</div>}
                      </div>
                      <Button size="icon" variant="ghost" className="shrink-0" onClick={() => removeParticipant(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-muted-foreground">
                      <span className="font-mono">{p.reference_code ?? "—"}</span>
                      <span>{new Date(p.created_at).toLocaleDateString("it-IT")}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="hidden md:block">
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <p className="text-center text-muted-foreground py-12">Caricamento...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  {participants.length === 0 ? "Nessun iscritto." : "Nessun risultato per la ricerca."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Pres.</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Codice</TableHead>
                      <TableHead>Iscritto il</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const present = p.checkin_id !== null;
                      return (
                        <TableRow key={p.id} className={present ? "bg-muted/30" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={present}
                              onCheckedChange={(v) => toggleAttended(p, !!v)}
                              aria-label="Segna come presente"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{displayName(p)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.profiles?.email ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.profiles?.phone ?? "—"}</TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">{p.reference_code ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("it-IT")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => removeParticipant(p.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="waitlist" className="mt-4">
          {id ? <WaitlistPanel eventId={id} /> : null}
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default AdminEventoIscritti;
