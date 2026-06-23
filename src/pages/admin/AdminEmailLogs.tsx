import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { TimeRange, useAdminEmailLogs } from "@/hooks/useAdminEmailLogs";

const RANGES: { v: TimeRange; l: string }[] = [
  { v: "24h", l: "Ultime 24h" },
  { v: "7d", l: "7 giorni" },
  { v: "30d", l: "30 giorni" },
];

const STATUSES = ["queued", "sent", "failed", "bounced", "complained"];

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "sent") return "default";
  if (s === "failed" || s === "bounced" || s === "complained") return "destructive";
  return "secondary";
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
    <CardContent className="text-2xl font-bold">{value}</CardContent>
  </Card>
);

const AdminEmailLogs = () => {
  const { rows, templates, range, setRange, template, setTemplate, status, setStatus, loading, error, stats } = useAdminEmailLogs();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-6">
      <AdminPageHeader title="Email logs" description="Storico invii email transazionali Resend." />

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Button key={r.v} size="sm" variant={range === r.v ? "default" : "outline"} onClick={() => setRange(r.v)}>
            {r.l}
          </Button>
        ))}
        <Select value={template ?? "all"} onValueChange={(v) => setTemplate(v === "all" ? null : v)}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Template" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i template</SelectItem>
            {templates.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status ?? "all"} onValueChange={(v) => setStatus(v === "all" ? null : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Totale" value={stats.total} />
        <Stat label="Sent" value={stats.sent} />
        <Stat label="Failed" value={stats.failed} />
        <Stat label="Bounced/Compl." value={stats.bounced} />
      </div>

      {error && <Card className="border-destructive/40"><CardContent className="py-3 text-sm text-destructive">{error}</CardContent></Card>}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Oggetto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Errore</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Caricamento…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Nessuna email nel range selezionato.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-mono">{r.template ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.to_email}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-sm">{r.subject}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="max-w-[260px] truncate text-xs text-destructive">{r.error_message ?? ""}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("it-IT")}
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

export default AdminEmailLogs;
