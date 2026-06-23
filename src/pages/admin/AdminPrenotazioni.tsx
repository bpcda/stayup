import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Check, X } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminBookings } from "@/hooks/useAdminBookings";

const STATUSES = ["pending", "confirmed", "cancelled"];

const AdminPrenotazioni = () => {
  const { rows, events, filters, setFilters, loading, error, updateStatus, exportCsv } = useAdminBookings();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <AdminPageHeader
        title="Prenotazioni"
        description="Gestisci, conferma o annulla le prenotazioni eventi."
        actions={
          <Button onClick={exportCsv} variant="outline">
            <Download className="h-4 w-4 mr-2" /> Esporta CSV
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Cerca reference, email o nome…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="max-w-xs"
        />
        <Select
          value={filters.eventId ?? "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, eventId: v === "all" ? null : v }))}
        >
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Tutti gli eventi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli eventi</SelectItem>
            {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? null : v }))}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tutti gli stati" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && <Card className="border-destructive/40 mb-4"><CardContent className="py-3 text-sm text-destructive">{error}</CardContent></Card>}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Utente</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Totale</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">Caricamento…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">Nessuna prenotazione.</TableCell></TableRow>
              ) : rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.reference_code ?? b.id.slice(0, 8)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{b.event?.title ?? "—"}</TableCell>
                  <TableCell>
                    <div className="text-sm">{b.profile?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{b.profile?.email ?? "—"}</div>
                  </TableCell>
                  <TableCell>{b.quantity}</TableCell>
                  <TableCell>{(b.total_cents / 100).toFixed(2)} {b.currency}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(b.booked_at).toLocaleDateString("it-IT")}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {b.status !== "confirmed" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(b.id, "confirmed")}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {b.status !== "cancelled" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(b.id, "cancelled")}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPrenotazioni;
