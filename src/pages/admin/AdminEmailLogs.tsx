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
    <CardHeader className="px-3 pb-1 pt-3 sm:pb-2"><CardTitle className="text-xs text-muted-foreground sm:text-sm">{label}</CardTitle></CardHeader>
    <CardContent className="px-3 pb-3 text-xl font-bold sm:text-2xl">{value}</CardContent>
  </Card>
);

const AdminEmailLogs = () => {
  const { rows, templates, range, setRange, template, setTemplate, status, setStatus, loading, error, stats } = useAdminEmailLogs();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-5 sm:py-8 space-y-4 sm:space-y-6">
      <AdminPageHeader title="Email logs" description="Storico invii email transazionali Resend." />

      <div className="grid gap-2 sm:flex sm:flex-wrap">
        {RANGES.map((r) => (
          <Button key={r.v} size="sm" variant={range === r.v ? "default" : "outline"} onClick={() => setRange(r.v)}>
            {r.l}
          </Button>
        ))}
        <Select value={template ?? "all"} onValueChange={(v) => setTemplate(v === "all" ? null : v)}>
          <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Template" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i template</SelectItem>
            {templates.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status ?? "all"} onValueChange={(v) => setStatus(v === "all" ? null : v)}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Stat label="Totale" value={stats.total} />
        <Stat label="Sent" value={stats.sent} />
        <Stat label="Failed" value={stats.failed} />
        <Stat label="Bounced/Compl." value={stats.bounced} />
      </div>

      {error && <Card className="border-destructive/40"><CardContent className="py-3 text-sm text-destructive">{error}</CardContent></Card>}

      <div className="space-y-3 md:hidden">
        {loading ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Caricamento...</CardContent></Card>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nessuna email nel range selezionato.</CardContent></Card>
        ) : rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{r.subject || "Senza oggetto"}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">{r.to_email}</div>
                </div>
                <Badge variant={statusVariant(r.status)} className="shrink-0">{r.status}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate font-mono">{r.template ?? "—"}</span>
                <span className="shrink-0">{new Date(r.created_at).toLocaleString("it-IT")}</span>
              </div>
              {r.error_message && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  {r.error_message}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden md:block">
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
