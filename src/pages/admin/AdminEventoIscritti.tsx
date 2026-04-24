import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

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
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  attended: boolean;
  attended_at: string | null;
  profiles?: ProfileLite | null;
};

const displayName = (p: Participant) => {
  const full = [p.profiles?.first_name, p.profiles?.last_name].filter(Boolean).join(" ").trim();
  return full || p.profiles?.email || `${p.user_id.slice(0, 8)}…`;
};

const AdminEventoIscritti = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
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

      // 1) Iscrizioni
      const { data: parts, error } = await supabase
        .from("event_participations")
        .select("id, user_id, status, created_at, attended, attended_at")
        .eq("event_id", id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
        setParticipants([]);
        setLoading(false);
        return;
      }

      const rows = (parts as Participant[]) ?? [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

      // 2) Profili in una query separata (più affidabile dell'embed)
      let profilesMap: Record<string, ProfileLite> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, phone, email")
          .in("id", userIds);
        (profs ?? []).forEach((p: { id: string } & ProfileLite) => {
          profilesMap[p.id] = {
            first_name: p.first_name,
            last_name: p.last_name,
            phone: p.phone,
            email: p.email,
          };
        });
      }

      setParticipants(rows.map((r) => ({ ...r, profiles: profilesMap[r.user_id] ?? null })));
      setLoading(false);
    })();
  }, [id, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) => {
      const hay = `${displayName(p)} ${p.profiles?.email ?? ""} ${p.profiles?.phone ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [participants, query]);

  const stats = useMemo(() => ({
    totale: participants.length,
    presenti: participants.filter((p) => p.attended).length,
  }), [participants]);

  const toggleAttended = async (p: Participant, value: boolean) => {
    setParticipants((prev) => prev.map((x) => x.id === p.id ? { ...x, attended: value, attended_at: value ? new Date().toISOString() : null } : x));
    const { error } = await supabase
      .from("event_participations")
      .update({ attended: value, attended_at: value ? new Date().toISOString() : null })
      .eq("id", p.id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      setParticipants((prev) => prev.map((x) => x.id === p.id ? { ...x, attended: !value } : x));
    }
  };

  const removeParticipant = async (pid: string) => {
    const { error } = await supabase.from("event_participations").delete().eq("id", pid);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    setParticipants((prev) => prev.filter((p) => p.id !== pid));
    toast({ title: "Iscrizione rimossa" });
  };

  const exportCsv = () => {
    if (!event || participants.length === 0) return;
    const rows = [
      ["Nome", "Cognome", "Email", "Telefono", "Stato", "Presente", "Iscritto il", "Check-in il"],
      ...participants.map((p) => [
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
    <div className="container max-w-6xl mx-auto px-4 py-10">
      <AdminPageHeader
        title={event ? `Iscritti — ${event.title}` : "Iscritti"}
        description={
          event?.starts_at
            ? `${new Date(event.starts_at).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}${event.location ? ` · ${event.location}` : ""}`
            : "Elenco partecipanti"
        }
        actions={
          <Button onClick={exportCsv} disabled={participants.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <Card><CardContent className="py-4"><div className="text-sm text-muted-foreground">Totale iscritti</div><div className="text-2xl font-bold">{stats.totale}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-sm text-muted-foreground">Presenti</div><div className="text-2xl font-bold">{stats.presenti}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-sm text-muted-foreground">Tasso presenza</div><div className="text-2xl font-bold">{stats.totale ? Math.round((stats.presenti / stats.totale) * 100) : 0}%</div></CardContent></Card>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cerca nome, email o telefono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
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
                  <TableHead>Iscritto il</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} className={p.attended ? "bg-muted/30" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={p.attended}
                        onCheckedChange={(v) => toggleAttended(p, !!v)}
                        aria-label="Segna come presente"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{displayName(p)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.profiles?.email ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.profiles?.phone ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("it-IT")}
                    </TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEventoIscritti;
