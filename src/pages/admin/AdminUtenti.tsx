import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Role, useAdminUsers } from "@/hooks/useAdminUsers";

const ALL_ROLES: Role[] = ["admin", "organizer", "user"];

const AdminUtenti = () => {
  const { rows, search, setSearch, loading, error, grantRole, revokeRole } = useAdminUsers();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <AdminPageHeader title="Utenti" description="Gestisci utenti e ruoli applicativi." />

      <div className="mb-4">
        <Input
          placeholder="Cerca per email o nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {error && <Card className="border-destructive/40 mb-4"><CardContent className="py-3 text-sm text-destructive">{error}</CardContent></Card>}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utente</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Città</TableHead>
                <TableHead>Ruoli</TableHead>
                <TableHead>Prenotazioni</TableHead>
                <TableHead>Registrato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Caricamento…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Nessun utente.</TableCell></TableRow>
              ) : rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{u.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{u.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm">{u.city ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? <span className="text-xs text-muted-foreground">—</span>
                        : u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell>{u.bookingsCount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("it-IT")}</TableCell>
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
