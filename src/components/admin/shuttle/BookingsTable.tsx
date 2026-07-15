import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Booking } from "@/interfaces/shuttle";

interface BookingsTableProps {
  bookings: Booking[];
  loading: boolean;
  pageSafe: number;
  totalPages: number;
  pageSize: number;
  totalFiltered: number;
  setCurrentPage: (p: number | ((prev: number) => number)) => void;
  togglePagato: (b: Booking) => void;
  openMoveDialog: (b: Booking) => void;
  sendConfirmEmail: (b: Booking) => void;
  askDeleteBooking: (b: Booking) => void;
}

export const BookingsTable = ({
  bookings, loading, pageSafe, totalPages, pageSize, totalFiltered,
  setCurrentPage, togglePagato, openMoveDialog, sendConfirmEmail, askDeleteBooking
}: BookingsTableProps) => {
  if (loading) return <p className="text-muted-foreground text-sm">Caricamento...</p>;
  if (bookings.length === 0) return <p className="text-muted-foreground text-sm">Nessun iscritto trovato.</p>;

  return (
    <>
      <div className="space-y-3 md:hidden">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{b.nome}</div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{b.email}</div>
                <div className="truncate text-xs text-muted-foreground">{b.telefono}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                b.pagato ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
              }`}>
                {b.pagato ? "Pagato" : "Non pagato"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs">
              <div><span className="text-muted-foreground">Tipo</span><div className="capitalize">{b.tipo_viaggio?.replace("_", " + ") || "—"}</div></div>
              <div><span className="text-muted-foreground">Giorno</span><div>{b.giorno || "/"}</div></div>
              <div><span className="text-muted-foreground">Fermata</span><div className="truncate">{b.fermata || "/"}</div></div>
              <div><span className="text-muted-foreground">Orari</span><div>{b.orario || "/"} · {b.orario_ritorno || "/"}</div></div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => togglePagato(b)}>
                {b.pagato ? "Annulla pagamento" : "Segna pagato"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => openMoveDialog(b)}>Sposta</Button>
              <Button size="sm" variant="outline" onClick={() => sendConfirmEmail(b)}>
                {b.pagato ? "Riepilogo" : "Pagamento"}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => askDeleteBooking(b)}>Elimina</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Giorno</TableHead>
              <TableHead>Fermata</TableHead>
              <TableHead>Andata</TableHead>
              <TableHead>Ritorno</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.nome}</TableCell>
                <TableCell>{b.email}</TableCell>
                <TableCell>{b.telefono}</TableCell>
                <TableCell className="capitalize">{b.tipo_viaggio?.replace("_", " + ") || "—"}</TableCell>
                <TableCell>{b.giorno || "/"}</TableCell>
                <TableCell>{b.fermata || "/"}</TableCell>
                <TableCell>{b.orario || "/"}</TableCell>
                <TableCell>{b.orario_ritorno || "/"}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    b.pagato ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                  }`}>
                    {b.pagato ? "Pagato" : "Non pagato"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => togglePagato(b)}>
                      {b.pagato ? "↩ Annulla" : "✓ Pagato"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openMoveDialog(b)}>Sposta</Button>
                    <Button size="sm" variant="outline" onClick={() => sendConfirmEmail(b)}>
                      {b.pagato ? "✉ Riepilogo" : "✉ Pagamento"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => askDeleteBooking(b)}>🗑 Elimina</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-4 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Mostrando {(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, totalFiltered)} di {totalFiltered}
          </p>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={pageSafe === 1}>«</Button>
            <Button size="sm" variant="outline" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={pageSafe === 1}>‹ Prec</Button>
            <span className="px-3 text-sm font-medium">{pageSafe} / {totalPages}</span>
            <Button size="sm" variant="outline" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe === totalPages}>Succ ›</Button>
            <Button size="sm" variant="outline" onClick={() => setCurrentPage(totalPages)} disabled={pageSafe === totalPages}>»</Button>
          </div>
        </div>
      )}
    </>
  );
};
