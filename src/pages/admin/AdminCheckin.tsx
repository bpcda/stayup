import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { QrCode, Check } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminCheckins } from "@/hooks/useAdminCheckins";

const AdminCheckin = () => {
  const [eventId, setEventId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { events, todayList, loading, error, checkIn } = useAdminCheckins(eventId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await checkIn(query)) setQuery("");
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
      <AdminPageHeader title="Check-in" description="Registra presenze tramite reference code o email." />

      <Card>
        <CardHeader><CardTitle className="text-base">Evento</CardTitle></CardHeader>
        <CardContent>
          <Select value={eventId ?? ""} onValueChange={(v) => setEventId(v || null)}>
            <SelectTrigger className="w-full max-w-md"><SelectValue placeholder="Seleziona evento" /></SelectTrigger>
            <SelectContent>
              {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {eventId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4" /> Registra check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex gap-2 max-w-md">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Reference code o email…"
                autoFocus
              />
              <Button type="submit"><Check className="h-4 w-4 mr-1" /> Check-in</Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Compatibile con scanner QR (incolla/scansiona il reference code).
            </p>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {eventId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Check-in registrati ({todayList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Utente</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Ora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Caricamento…</TableCell></TableRow>
                ) : todayList.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nessun check-in.</TableCell></TableRow>
                ) : todayList.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.reference_code ?? c.booking_id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{c.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.email ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-xs">{c.method}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.checked_in_at).toLocaleString("it-IT")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminCheckin;
