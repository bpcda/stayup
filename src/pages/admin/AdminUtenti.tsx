import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, MoreVertical } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Role, useAdminUsers } from "@/hooks/useAdminUsers";

const ALL_ROLES: Role[] = ["admin", "organizer", "user"];

const AdminUtenti = () => {
  const {
    rows, total, categories, filters, setFilters,
    loading, error, grantRole, revokeRole, exportCsv,
  } = useAdminUsers();

  const update = <K extends keyof typeof filters>(k: K, v: (typeof filters)[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <AdminPageHeader
        title="CRM Utenti"
        description={`${rows.length} di ${total} utenti dopo i filtri.`}
        actions={
          <Button onClick={exportCsv} variant="outline" size="sm" disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Esporta CSV
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Cerca</Label>
            <Input
              placeholder="Email o nome…"
              value={filters.search}
              onChange={(e) => update("search", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Attività ultimi</Label>
            <Select value={filters.activity} onValueChange={(v) => update("activity", v as typeof filters.activity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli utenti</SelectItem>
                <SelectItem value="30">30 giorni</SelectItem>
                <SelectItem value="90">90 giorni</SelectItem>
                <SelectItem value="180">180 giorni</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Categoria interesse</Label>
            <Select value={filters.categoryId} onValueChange={(v) => update("categoryId", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Segmenti</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center justify-between gap-2 text-sm">
                <span>Con prenotazione</span>
                <Switch checked={filters.hasBooking} onCheckedChange={(v) => update("hasBooking", v)} />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm">
                <span>Presente ad almeno un evento</span>
                <Switch checked={filters.hasCheckin} onCheckedChange={(v) => update("hasCheckin", v)} />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm">
                <span>No-show</span>
                <Switch checked={filters.noShow} onCheckedChange={(v) => update("noShow", v)} />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 mb-4">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utente</TableHead>
                <TableHead>Ruoli</TableHead>
                <TableHead className="text-right">Pren.</TableHead>
                <TableHead className="text-right">Check-in</TableHead>
                <TableHead className="text-right">No-show</TableHead>
                <TableHead>Interessi</TableHead>
                <TableHead>Ultima attività</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">Caricamento…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">Nessun utente con questi filtri.</TableCell></TableRow>
              ) : rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{u.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                    {u.city && <div className="text-xs text-muted-foreground">{u.city}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? <span className="text-xs text-muted-foreground">—</span>
                        : u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{u.bookingsCount}</TableCell>
                  <TableCell className="text-right">{u.checkinsCount}</TableCell>
                  <TableCell className="text-right">
                    {u.noShowCount > 0 ? (
                      <Badge variant="destructive">{u.noShowCount}</Badge>
                    ) : <span className="text-muted-foreground">0</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {u.categoryNames.length === 0
                        ? <span className="text-xs text-muted-foreground">—</span>
                        : u.categoryNames.map((n) => <Badge key={n} variant="outline" className="text-xs">{n}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.lastActivityAt ? new Date(u.lastActivityAt).toLocaleDateString("it-IT") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {ALL_ROLES.map((r) => (
                          u.roles.includes(r)
                            ? <DropdownMenuItem key={r} onClick={() => revokeRole(u.id, r)}>Revoca {r}</DropdownMenuItem>
                            : <DropdownMenuItem key={r} onClick={() => grantRole(u.id, r)}>Promuovi a {r}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

export default AdminUtenti;
