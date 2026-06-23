import { Link } from "react-router-dom";
import { Pencil, Trash2, Users, Calendar, MapPin, Eye, EyeOff, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EventRow, EventStatus } from "@/interfaces/events";

interface EventsTableProps {
  events: EventRow[];
  toggleField: (e: EventRow, field: "is_active" | "is_public") => void;
  openEdit: (e: EventRow) => void;
  setDeleteId: (id: string) => void;
}

const STATUS_META: Record<EventStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft:     { label: "Bozza",       variant: "secondary" },
  published: { label: "Pubblicato",  variant: "default"   },
  cancelled: { label: "Annullato",   variant: "destructive" },
  ended:     { label: "Concluso",    variant: "outline"   },
  archived:  { label: "Archiviato",  variant: "outline"   },
};

const fmtCapacity = (e: EventRow) => {
  const booked = e._booked_count ?? 0;
  if (e.capacity == null) return `${booked} iscritti`;
  const remaining = Math.max(0, e.capacity - booked);
  return `${booked}/${e.capacity}${remaining === 0 ? " · SOLD OUT" : ""}`;
};

export const EventsTable = ({ events, toggleField, openEdit, setDeleteId }: EventsTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titolo</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Luogo</TableHead>
          <TableHead>Posti</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => {
          const status = (e.status ?? "draft") as EventStatus;
          const meta = STATUS_META[status] ?? STATUS_META.draft;
          const soldOut = e.capacity != null && (e._booked_count ?? 0) >= e.capacity;
          return (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.title}</TableCell>
              <TableCell>
                {e.starts_at ? (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {new Date(e.starts_at).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                ) : <span className="text-muted-foreground text-sm">—</span>}
              </TableCell>
              <TableCell>
                {e.location ? (
                  <div className="flex items-center gap-1.5 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />{e.location}
                  </div>
                ) : <span className="text-muted-foreground text-sm">—</span>}
              </TableCell>
              <TableCell>
                <span className={`text-sm ${soldOut ? "text-destructive font-semibold" : ""}`}>
                  {fmtCapacity(e)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  {!e.is_public && <Badge variant="outline">Privato</Badge>}
                  {!e.is_active && status !== "draft" && <Badge variant="outline">Nascosto</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" title={e.is_active ? "Nascondi" : "Mostra"} onClick={() => toggleField(e, "is_active")}>
                    {e.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  {e.has_shuttle && (
                    <Button size="icon" variant="ghost" title="Gestisci Navette" asChild>
                      <Link to={`/admin/eventi/${e.id}/shuttle`}>
                        <Bus className="h-4 w-4 text-primary" />
                      </Link>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Iscritti" asChild>
                    <Link to={`/admin/eventi/${e.id}/iscritti`}><Users className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="icon" variant="ghost" title="Modifica" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Elimina" onClick={() => setDeleteId(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
