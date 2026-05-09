import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Booking } from "@/interfaces/shuttle";
import { STOPS, GIORNI } from "@/lib/shuttleHelpers";

interface ShuttleModalsProps {
  // Move Dialog
  moveDialogOpen: boolean;
  setMoveDialogOpen: (v: boolean) => void;
  selectedBooking: Booking | null;
  newFermata: string;
  setNewFermata: (v: string) => void;
  newOrario: string;
  setNewOrario: (v: string) => void;
  newOrarioRitorno: string;
  setNewOrarioRitorno: (v: string) => void;
  slotStats: any[];
  returnSlotStats: any[];
  handleMove: () => void;

  // Edit Slot
  editSlotDialog: boolean;
  setEditSlotDialog: (v: boolean) => void;
  editSlotType: "andata" | "ritorno";
  editSlotData: any;
  setEditSlotData: React.Dispatch<React.SetStateAction<any>>;
  saveEditSlot: () => void;

  // Add Slot
  addSlotDialog: boolean;
  setAddSlotDialog: (v: boolean) => void;
  addSlotType: "andata" | "ritorno";
  newSlotData: any;
  setNewSlotData: React.Dispatch<React.SetStateAction<any>>;
  saveAddSlot: () => void;

  // Delete Booking
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (v: boolean) => void;
  bookingToDelete: Booking | null;
  confirmDeleteBooking: () => void;
}

export const ShuttleModals = (props: ShuttleModalsProps) => {
  return (
    <>
      <Dialog open={props.moveDialogOpen} onOpenChange={props.setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sposta {props.selectedBooking?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {(props.selectedBooking?.tipo_viaggio === "andata" || props.selectedBooking?.tipo_viaggio === "andata_ritorno") && (
              <>
                <p className="text-sm font-medium text-muted-foreground">Andata</p>
                <div className="space-y-2">
                  <Label>Fermata</Label>
                  <Select value={props.newFermata} onValueChange={(v) => { props.setNewFermata(v); props.setNewOrario(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STOPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orario Andata</Label>
                  <Select value={props.newOrario} onValueChange={props.setNewOrario}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {props.slotStats
                        .filter((s) => s.giorno === props.selectedBooking?.giorno && s.fermata === props.newFermata)
                        .map((s) => (
                          <SelectItem key={s.orario} value={s.orario} disabled={s.rimanenti <= 0}>
                            {s.orario} ({s.rimanenti} posti) {s.rimanenti <= 0 ? "— PIENO" : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {(props.selectedBooking?.tipo_viaggio === "ritorno" || props.selectedBooking?.tipo_viaggio === "andata_ritorno") && (
              <>
                <p className="text-sm font-medium text-muted-foreground">Ritorno</p>
                <div className="space-y-2">
                  <Label>Orario Ritorno</Label>
                  <Select value={props.newOrarioRitorno} onValueChange={props.setNewOrarioRitorno}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {props.returnSlotStats
                        .filter((s) => s.giorno === props.selectedBooking?.giorno)
                        .map((s) => (
                          <SelectItem key={s.orario} value={s.orario} disabled={s.rimanenti <= 0}>
                            {s.orario} ({s.rimanenti} posti) {s.rimanenti <= 0 ? "— PIENO" : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => props.setMoveDialogOpen(false)}>Annulla</Button>
            <Button onClick={props.handleMove}>Conferma spostamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={props.editSlotDialog} onOpenChange={props.setEditSlotDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifica Slot {props.editSlotType === "andata" ? "Andata" : "Ritorno"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Giorno</Label>
              <Select value={props.editSlotData.giorno} onValueChange={(v) => props.setEditSlotData((p: any) => ({ ...p, giorno: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GIORNI.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {props.editSlotType === "andata" && (
              <div className="space-y-2">
                <Label>Fermata</Label>
                <Select value={props.editSlotData.fermata} onValueChange={(v) => props.setEditSlotData((p: any) => ({ ...p, fermata: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STOPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Orario (HH:MM)</Label>
              <Input value={props.editSlotData.orario} onChange={(e) => props.setEditSlotData((p: any) => ({ ...p, orario: e.target.value }))} placeholder="14:00" />
            </div>
            <div className="space-y-2">
              <Label>Capienza</Label>
              <Input type="number" value={props.editSlotData.capienza} onChange={(e) => props.setEditSlotData((p: any) => ({ ...p, capienza: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="nascosto-slot"
                checked={props.editSlotData.nascosto}
                onCheckedChange={(v) => props.setEditSlotData((p: any) => ({ ...p, nascosto: v === true }))}
              />
              <Label htmlFor="nascosto-slot" className="cursor-pointer">
                Nascondi questo slot dal form pubblico
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => props.setEditSlotDialog(false)}>Annulla</Button>
            <Button onClick={props.saveEditSlot}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={props.addSlotDialog} onOpenChange={props.setAddSlotDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo Slot {props.addSlotType === "andata" ? "Andata" : "Ritorno"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Giorno</Label>
              <Select value={props.newSlotData.giorno} onValueChange={(v) => props.setNewSlotData((p: any) => ({ ...p, giorno: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GIORNI.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {props.addSlotType === "andata" && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                La navetta è unica: parte dall'<strong>Università Cattolica</strong> e 15 minuti dopo passa dal <strong>Cheope</strong>.
              </div>
            )}
            <div className="space-y-2">
              <Label>{props.addSlotType === "andata" ? "Orario partenza Università (HH:MM)" : "Orario (HH:MM)"}</Label>
              <Input value={props.newSlotData.orario} onChange={(e) => props.setNewSlotData((p: any) => ({ ...p, orario: e.target.value }))} placeholder="14:00" />
            </div>
            <div className="space-y-2">
              <Label>Capienza</Label>
              <Input type="number" value={props.newSlotData.capienza} onChange={(e) => props.setNewSlotData((p: any) => ({ ...p, capienza: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => props.setAddSlotDialog(false)}>Annulla</Button>
            <Button onClick={props.saveAddSlot}>Aggiungi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={props.deleteDialogOpen} onOpenChange={props.setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminare {props.bookingToDelete?.nome}?</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 text-sm">
            <p className="text-muted-foreground">
              Stai per eliminare definitivamente questa prenotazione. L'azione non è reversibile.
            </p>
            {props.bookingToDelete && (
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                <p><strong>{props.bookingToDelete.nome}</strong> — {props.bookingToDelete.email}</p>
                <p className="text-muted-foreground text-xs">
                  {props.bookingToDelete.giorno} · {props.bookingToDelete.fermata || "—"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => props.setDeleteDialogOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={props.confirmDeleteBooking}>Elimina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
