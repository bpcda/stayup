import type { ComponentProps } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Check, X, CalendarDays, Mail, Ticket } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { AdminBookingRow, useAdminBookings } from "@/hooks/useAdminBookings";

const STATUSES = ["pending", "confirmed", "cancelled"];

const statusLabel = (status: string) => {
  if (status === "confirmed") return "Confermata";
  if (status === "cancelled") return "Annullata";
  if (status === "pending") return "In attesa";
  return status;
};

const statusVariant = (status: string) => (
  status === "confirmed" ? "default" : status === "cancelled" ? "destructive" : "secondary"
) as ComponentProps<typeof Badge>["variant"];

const money = (b: AdminBookingRow) => `${(b.total_cents / 100).toFixed(2)} ${b.currency}`;
const bookedDate = (b: AdminBookingRow) => new Date(b.booked_at).toLocaleDateString("it-IT");
const reference = (b: AdminBookingRow) => b.reference_code ?? b.id.slice(0, 8);

const AdminPrenotazioni = () => {
  const { rows, events, filters, setFilters, loading, error, updateStatus, exportCsv } = useAdminBookings();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-5 sm:py-8">
      <AdminPageHeader
        title="Prenotazioni"
        description={`${rows.length} prenotazioni visualizzate.`}
        actions={
          <Button onClick={exportCsv} variant="outline" size="sm" disabled={rows.length === 0} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" /> Esporta CSV
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-3 sm:grid-cols-[minmax(220px,1fr)_220px_180px] sm:p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Cerca</Label>
            <Input
              placeholder="Reference, email o nome..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Evento</Label>
            <Select
              value={filters.eventId ?? "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, eventId: v === "all" ? null : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Tutti gli eventi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli eventi</SelectItem>
                {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Stato</Label>
            <Select
              value={filters.status ?? "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? null : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Tutti gli stati" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && <Card className="border-destructive/40 mb-4"><CardContent className="py-3 text-sm text-destructive">{error}</CardContent></Card>}

      <div className="space-y-3 md:hidden">
        {loading ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Caricamento...</CardContent></Card>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nessuna prenotazione.</CardContent></Card>
        ) : rows.map((b) => (
          <Card key={b.id} className="overflow-hidden">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{b.profile?.full_name ?? "Senza nome"}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{b.profile?.email ?? "Email non disponibile"}</span>
                  </div>
                </div>
                <Badge variant={statusVariant(b.status)} className="shrink-0">{statusLabel(b.status)}</Badge>
              </div>

              <div className="space-y-2 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm">
                <div className="flex items-start gap-2">
                  <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{b.event?.title ?? "Evento non disponibile"}</div>
                    <div className="text-xs text-muted-foreground">Ref. {reference(b)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{bookedDate(b)}</span>
                  <span>{b.quantity} posti · {money(b)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={b.status === "confirmed" ? "secondary" : "default"}
                  disabled={b.status === "confirmed"}
                  onClick={() => updateStatus(b.id, "confirmed")}
                >
                  <Check className="mr-2 h-4 w-4" /> Conferma
                </Button>
                <Button
                  size="sm"
                  variant={b.status === "cancelled" ? "secondary" : "outline"}
                  disabled={b.status === "cancelled"}
                  onClick={() => updateStatus(b.id, "cancelled")}
                >
                  <X className="mr-2 h-4 w-4" /> Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden md:block">
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
                  <TableCell>{money(b)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(b.status)}>{statusLabel(b.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{bookedDate(b)}</TableCell>
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
