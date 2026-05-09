import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { GIORNI } from "@/lib/shuttleHelpers";
import { downloadReturnPassengerList } from "@/lib/shuttleHelpers";

interface ShuttleRitornoManagerProps {
  returnFilterGiorno: string;
  setReturnFilterGiorno: (v: string) => void;
  returnFilterRiempimento: string;
  setReturnFilterRiempimento: (v: string) => void;
  filteredReturnSlotStats: any[];
  openEditSlot: (type: "ritorno", s: any) => void;
  deleteSlot: (type: "ritorno", id: string) => void;
  bookings: any[];
}

export const ShuttleRitornoManager = ({
  returnFilterGiorno, setReturnFilterGiorno,
  returnFilterRiempimento, setReturnFilterRiempimento,
  filteredReturnSlotStats, openEditSlot, deleteSlot, bookings
}: ShuttleRitornoManagerProps) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1">
        <Label className="text-xs">Giorno</Label>
        <Select value={returnFilterGiorno} onValueChange={setReturnFilterGiorno}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {GIORNI.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Riempimento</Label>
        <Select value={returnFilterRiempimento} onValueChange={setReturnFilterRiempimento}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="disponibile">Disponibili</SelectItem>
            <SelectItem value="quasi_pieno">Quasi pieni (≤5)</SelectItem>
            <SelectItem value="pieno">Pieni</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    {filteredReturnSlotStats.length === 0 ? (
      <p className="text-muted-foreground text-sm">Nessuno slot trovato.</p>
    ) : (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Giorno</TableHead>
              <TableHead>Orario Ritorno</TableHead>
              <TableHead className="text-center">Capienza</TableHead>
              <TableHead className="text-center" title="Totale prenotazioni (anche non pagate)">Prenotati</TableHead>
              <TableHead className="text-center" title="Solo pagati">Occupati</TableHead>
              <TableHead className="text-center">Rimanenti</TableHead>
              <TableHead className="text-center">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReturnSlotStats.map((s) => (
              <TableRow key={s.id} className={s.nascosto ? "opacity-60" : ""}>
                <TableCell>{s.giorno}</TableCell>
                <TableCell>
                  {s.orario}
                  {s.nascosto && <span className="ml-2 text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Nascosto</span>}
                </TableCell>
                <TableCell className="text-center">{s.capienza}</TableCell>
                <TableCell className="text-center text-muted-foreground">{s.prenotati}</TableCell>
                <TableCell className="text-center font-medium">{s.occupati}</TableCell>
                <TableCell className="text-center">
                  <span className={s.rimanenti <= 0 ? "text-red-400 font-bold" : s.rimanenti <= 5 ? "text-yellow-400 font-medium" : ""}>
                    {s.rimanenti}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-1 justify-center">
                    <Button size="sm" variant="outline" onClick={() => downloadReturnPassengerList(s, bookings)} disabled={s.occupati === 0}>⬇ Excel</Button>
                    <Button size="sm" variant="outline" onClick={() => openEditSlot("ritorno", s)}>✏️</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteSlot("ritorno", s.id)}>🗑</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )}
  </div>
);
